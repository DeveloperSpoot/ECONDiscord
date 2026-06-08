const { DataTypes } = require("sequelize");
const DB = require("../Server.js");

module.exports = DB.define("ForexPool", {
    IDENT: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: DataTypes.UUIDV4
    },
    guildA: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    guildB: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    balanceA: {
        type: DataTypes.DECIMAL(20, 2),
        allowNull: false,
        defaultValue: 0
    },
    balanceB: {
        type: DataTypes.DECIMAL(20, 2),
        allowNull: false,
        defaultValue: 0
    }
}, {
    freezeTableName: true,
    indexes: [
        {
            unique: true,
            fields: ["guildA", "guildB"]
        }
    ]
});
