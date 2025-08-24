const { DataTypes} = require("sequelize");
const DB = require("../Server.js");
module.exports = DB.define("GuildMembers", {
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
    netWorth: {
        type: DataTypes.DECIMAL(20, 2),
        allowNull: false
    },
    id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    stipendTimestamp: {
        type: DataTypes.DATE,
        allowNull: true
    },
    defaultBusiness: {
        type: DataTypes.UUID,
        allowNull: true
    },
    defaultDepartment: {
        type: DataTypes.UUID,
        allowNull: true,
        defaultValue: null
    },
    presence: {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue: null
    }
}, {
    freezeTableName: true
})