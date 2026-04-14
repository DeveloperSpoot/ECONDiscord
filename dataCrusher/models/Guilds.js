const { DataTypes} = require("sequelize");
const DB = require("../Server.js");

module.exports = DB.define("Guilds", {
    IDENT: {
        type: DataTypes.TEXT,
        primaryKey: true,
        allowNull: false
    },
    balance: {
        type: DataTypes.DECIMAL(20, 2),
        allowNull: false
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
    stipend: {
        type: DataTypes.DECIMAL(20, 2),
        allowNull: false,
        defaultValue: 0.00
    },
    stipendTimeout: {
        type: DataTypes.TEXT,
        allowNUll: false,
        defaultValue: "0"
    },
    budgetTimeout: {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: "0"
    },
    startingBalance: {
        type: DataTypes.DECIMAL(20, 2),
        allowNull: false,
        defaultValue: 0.00
    },
    customCurrency: {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue: "$"
    },
    payrollTax: {
      type: DataTypes.DECIMAL(20, 2),
      allowNull: true,
      defaultValue: null
    },
    payrollTaxType: {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue: null
    },
    salesTax: {
        type: DataTypes.DECIMAL(20, 2),
        allowNull: true,
        defaultValue: null
    },
    salesTaxType:{
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue: null
    },
    incomeTaxBrackets: {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue: null
    },
    cbBalance: {
        type: DataTypes.DECIMAL(20, 2),
        allowNull: false,
        defaultValue: 0.00
    },
    entanglement:{
        type: DataTypes.TEXT,
        allowNull: true
    },
    casinoEnabled:{
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    }
}, {
    freezeTableName: true
})


