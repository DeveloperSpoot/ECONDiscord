const { Op } = require("sequelize");
const SQL = require("../Server");

module.exports = {
    setSalary: async ({ guild, entityType, entityIDENT, memberIDENT, roleId, amount, periodDays }) => {
        const defaults = {
            guild: String(guild),
            entityType,
            entityIDENT,
            memberIDENT,
            roleId: roleId ?? null,
            amount: Number(amount),
            periodDays: periodDays ?? 7
        };
        const matchClause = memberIDENT
            ? { memberIDENT }
            : { roleId: roleId ?? null, memberIDENT: null };

        const [record, created] = await SQL.models.Salary.findOrCreate({
            where: {
                [Op.and]: [
                    { guild: String(guild) },
                    { entityType },
                    { entityIDENT },
                    matchClause
                ]
            },
            defaults
        });

        if (!created) {
            await record.update({
                amount: Number(amount),
                periodDays: periodDays ?? record.periodDays,
                memberIDENT,
                roleId: roleId ?? null
            });
        }

        return record;
    },
    removeSalary: async ({ guild, entityType, entityIDENT, memberIDENT, roleId }) => {
        const matchClause = memberIDENT
            ? { memberIDENT }
            : { roleId: roleId ?? null, memberIDENT: null };
        const where = {
            [Op.and]: [
                { guild: String(guild) },
                { entityType },
                { entityIDENT },
                matchClause
            ]
        };

        const rows = await SQL.models.Salary.findAll({ where, raw: true });
        if (rows.length === 0) {
            return 0;
        }
        const salaryIds = rows.map(row => row.IDENT);

        await SQL.models.SalaryReceipt.destroy({
            where: {
                [Op.and]: [
                    { salaryIDENT: { [Op.in]: salaryIds } }
                ]
            }
        });
        await SQL.models.Salary.destroy({ where });
        return rows.length;
    },
    listForEntity: async ({ guild, entityType, entityIDENT }) => {
        return SQL.models.Salary.findAll({
            where: {
                [Op.and]: [
                    { guild: String(guild) },
                    { entityType },
                    { entityIDENT }
                ]
            },
            raw: true
        });
    },
    listForMember: async ({ guild, memberIDENT, entityType }) => {
        const where = {
            [Op.and]: [
                { guild: String(guild) },
                {
                    [Op.or]: [
                        { memberIDENT },
                        { roleId: { [Op.not]: null } }
                    ]
                }
            ]
        };
        if (entityType && entityType !== "all") {
            where[Op.and].push({ entityType });
        }
        return SQL.models.Salary.findAll({ where, raw: true });
    },
    getReceipt: async (salaryIDENT, memberIDENT) => {
        const [receipt] = await SQL.models.SalaryReceipt.findOrCreate({
            where: {
                [Op.and]: [
                    { salaryIDENT },
                    { memberIDENT }
                ]
            },
            defaults: {
                salaryIDENT,
                memberIDENT
            }
        });
        return receipt;
    }
};
