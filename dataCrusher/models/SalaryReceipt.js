const { DataTypes } = require("sequelize");
const DB = require("../Server.js");

const SalaryReceipt = DB.define("SalaryReceipt", {
    IDENT: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: DataTypes.UUIDV4
    },
    salaryIDENT: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: "Salary",
            key: "IDENT"
        }
    },
    memberIDENT: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: "GuildMembers",
            key: "IDENT"
        }
    },
    lastPaidAt: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: null
    }
}, {
    freezeTableName: true
});

module.exports = SalaryReceipt;

SalaryReceipt.belongsTo(DB.models.Salary, { foreignKey: "salaryIDENT" });
DB.models.Salary.hasMany(SalaryReceipt, { foreignKey: "salaryIDENT" });
SalaryReceipt.belongsTo(DB.models.GuildMembers, { foreignKey: "memberIDENT" });
DB.models.GuildMembers.hasMany(SalaryReceipt, { foreignKey: "memberIDENT" });
