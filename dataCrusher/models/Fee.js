const { DataTypes} = require("sequelize");
const DB = require("../Server.js");

const Fee = DB.define("Fee", {
    IDENT: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: DataTypes.UUIDV4
    },
    amount: {
        type: DataTypes.DECIMAL(20, 2),
        allowNull: false
    },
    fee: {
        type: DataTypes.STRING,
        allowNull: false
    },
    client: {
        type: DataTypes.UUID,
        allowNuLL: false,
        references: {
            model: "GuildMembers",
            key: "IDENT"
        }
    },
    issuer: {
        type: DataTypes.UUID,
        allowNuLL: false,
        references: {
            model: "GuildMembers",
            key: "IDENT"
        }
    },
    periodDays: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: null
    },
    lastChargedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: null
    },
    active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    }
}, {
    freezeTableName: true
})


Fee.belongsTo(DB.models.Guilds, {foreignKey: {name: 'guild'}});
Fee.belongsTo(DB.models.GuildMembers, {foreignKey: {name: 'violator'}});
Fee.belongsTo(DB.models.Department, {foreignKey: {name: 'department'}});

DB.models.Department.hasMany(Fee, {foreignKey: {name: 'department'}})
DB.models.GuildMembers.hasMany(Fee, {foreignKey: {name: 'violator'}})
DB.models.Guilds.hasMany(Fee, {foreignKey: {name: 'guild'}});
module.exports = Fee