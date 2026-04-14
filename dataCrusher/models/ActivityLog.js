const { DataTypes } = require("sequelize");
const DB = require("../Server.js");

module.exports = DB.define("ActivityLog", {
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
    date: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    messageCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    vcMinutes: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
    }
}, {
    freezeTableName: true,
    indexes: [
        {
            unique: true,
            fields: ["guild", "date"]
        }
    ]
});
