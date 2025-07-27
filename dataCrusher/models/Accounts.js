const { DataTypes} = require("sequelize");
const DB = require("../Server.js");
const GuildMembers = require('./GuildMembers');
const Accounts = DB.define("Accounts", {
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
    owner:{
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: "GuildMembers",
            key: "IDENT"
        }
    },
    balance: {
        type: DataTypes.DECIMAL(20, 2),
        allowNull: false
    },
    type: {
        type: DataTypes.ENUM("personal-wallet", "personal-bank", "business", "department"),
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    name: {
        type: DataTypes.TEXT,
        allowNull: true,
        unique: false
    },
    message : {
        type: DataTypes.TEXT,
        allowNull: true
    },
    role: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    basePay: {
        type: DataTypes.DECIMAL(20, 2),
        allowNull: false,
        defaultValue: 0
    },
    generalLogChannel: {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue: null
    },
    activityLogChannel: {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue: null
    },
    selfServed: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    deletedAt: {
        type: 'TIMESTAMP',
        allowNull: true,
        defaultValue: null
    }
}, {
    freezeTableName: true,
    paranoid: true
});
module.exports = Accounts;
GuildMembers.hasMany(Accounts, {foreignKey: 'GuildMemberIDENT'})
Accounts.belongsTo(DB.models.GuildMembers)
