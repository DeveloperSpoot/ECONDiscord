const { DataTypes } = require("sequelize");
const DB = require("../Server.js");

const Salary = DB.define("Salary", {
    IDENT: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: DataTypes.UUIDV4
    },
    guild: {
        type: DataTypes.TEXT,
        allowNull: false,
        references: {
            model: "Guilds",
            key: "IDENT"
        }
    },
    entityType: {
        type: DataTypes.ENUM("business", "department"),
        allowNull: false
    },
    entityIDENT: {
        type: DataTypes.UUID,
        allowNull: false
    },
    memberIDENT: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: "GuildMembers",
            key: "IDENT"
        }
    },
    roleId: {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue: null
    },
    amount: {
        type: DataTypes.DECIMAL(20, 2),
        allowNull: false
    },
    periodDays: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 7
    },
    lastPaidAt: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: null
    }
}, {
    freezeTableName: true
});

module.exports = Salary;

Salary.belongsTo(DB.models.Guilds, { foreignKey: "guild", targetKey: "IDENT" });
DB.models.Guilds.hasMany(Salary, { foreignKey: "guild" });
Salary.belongsTo(DB.models.GuildMembers, { foreignKey: "memberIDENT" });
DB.models.GuildMembers.hasMany(Salary, { foreignKey: "memberIDENT" });
