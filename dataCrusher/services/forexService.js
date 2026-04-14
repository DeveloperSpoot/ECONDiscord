const { Op } = require("sequelize");
const SQL = require("../Server");
const { serverStrength, M_PER_MEMBER, E_PER_MEMBER } = require("../../utils/forexStrength");

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Gather the M, V, E, C metrics for a guild and compute its strength score.
 * @param {string} guildId - The guild IDENT
 * @returns {Promise<{M: number, V: number, E: number, C: number, strength: number}>}
 */
async function getGuildStrength(guildId) {
    const since = new Date(Date.now() - THIRTY_DAYS_MS);

    // M + V: sum activity log rows from last 30 days
    const activityRows = await SQL.models.ActivityLog.findAll({
        where: {
            guild: guildId,
            date: { [Op.gte]: since }
        },
        raw: true
    });

    let M = 0;
    let V = 0;
    for (const row of activityRows) {
        M += Number(row.messageCount ?? 0);
        V += Number(row.vcMinutes ?? 0);
    }

    // E: transaction count from last 30 days
    let E = await SQL.models.AdvTransactionLogs.count({
        where: {
            guild: guildId,
            createdAt: { [Op.gte]: since }
        }
    });

    // Cold-start fallback: if no activity has been recorded yet, estimate from member count
    const memberCount = await SQL.models.GuildMembers.count({ where: { guild: guildId } });
    if (M === 0) M = memberCount * M_PER_MEMBER;
    if (E === 0) E = memberCount * E_PER_MEMBER;
    // V stays 0 — no reasonable proxy exists

    // C: total money in circulation = sum of all account balances + treasury
    const accountSum = await SQL.models.Accounts.sum("balance", {
        where: { guild: guildId }
    });
    const departmentSum = await SQL.models.Department.sum("balance", {
        where: { GuildIDENT: guildId }
    }) ?? 0;
    const guildRecord = await SQL.models.Guilds.findByPk(guildId, { raw: true });
    const C = Number(accountSum ?? 0) + Number(departmentSum) + Number(guildRecord?.balance ?? 0) + Number(guildRecord?.cbBalance ?? 0);

    const strength = serverStrength(M, V, E, C);

    return { M, V, E, C, strength };
}

module.exports = { getGuildStrength };
