const { DataTypes } = require("sequelize");
const DB = require("../Server.js");

module.exports = DB.define("ForexReserves", {
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
    foreignGuild: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    amount: {
        type: DataTypes.DECIMAL(20, 2),
        allowNull: false,
        defaultValue: 0
    }
}, {
    freezeTableName: true,
    indexes: [
        {
            unique: true,
            fields: ["guild", "foreignGuild"]
        }
    ]
});
