const { Op } = require("sequelize");
const SQL = require("../Server");
const { serverStrength } = require("../../utils/forexStrength");

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
    const E = await SQL.models.AdvTransactionLogs.count({
        where: {
            guild: guildId,
            createdAt: { [Op.gte]: since }
        }
    });

    // C: total money in circulation = sum of all account balances + treasury
    const accountSum = await SQL.models.Accounts.sum("balance", {
        where: { guild: guildId }
    });
    const departmentSum = await SQL.models.Department.sum("balance", {
        where: { GuildIDENT: guildId }
    }) ?? 0;
    const guildRecord = await SQL.models.Guilds.findByPk(guildId, { raw: true });
    const C = Number(accountSum ?? 0) + Number(departmentSum) + Number(guildRecord?.balance ?? 0);

    const strength = serverStrength(M, V, E, C);

    return { M, V, E, C, strength };
}

module.exports = { getGuildStrength };
