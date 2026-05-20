const { DataTypes } = require("sequelize");
const DB = require("../Server.js");

module.exports = DB.define("TreasuryBonds", {
    IDENT: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: DataTypes.UUIDV4
    },
    issuerGuild: {
        type: DataTypes.TEXT,
        allowNull: false,
        references: { model: "Guilds", key: "IDENT" }
    },
    holderType: {
        type: DataTypes.ENUM("user", "cb"),
        allowNull: true,
        defaultValue: null
    },
    holderGuild: {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue: null
    },
    holderMember: {
        type: DataTypes.UUID,
        allowNull: true,
        defaultValue: null,
        references: { model: "GuildMembers", key: "IDENT" }
    },
    faceValue: {
        type: DataTypes.DECIMAL(20, 2),
        allowNull: false
    },
    purchasePrice: {
        type: DataTypes.DECIMAL(20, 2),
        allowNull: false
    },
    yieldRate: {
        type: DataTypes.DECIMAL(5, 4),
        allowNull: false
    },
    issuedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: null
    },
    maturityDays: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    maturesAt: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: null
    },
    status: {
        type: DataTypes.ENUM("available", "active", "redeemed", "defaulted"),
        allowNull: false,
        defaultValue: "available"
    }
}, {
    freezeTableName: true
});
