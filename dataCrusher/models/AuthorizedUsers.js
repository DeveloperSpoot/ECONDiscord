const { DataTypes} = require("sequelize");
const DB = require("../Server.js");

module.exports = DB.define("AuthorizedUsers", {
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
            key: "IDENT",
        }
    },
    id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: "GuildMembers",
            key: "IDENT"
        }
    },
    type: {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: 'treasury'
    }
}, {
    freezeTableName: true
})