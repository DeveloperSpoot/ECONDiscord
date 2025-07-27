const {Op} = require("sequelize");
const { ErrorEmbed } = require("../../utils/embedUtil");
const SQL = require("../Server");
const {irsCache, currencyCache} = require("./cache");
const {colorEmbed} = require("../../customPackage/colorBar");

async function LogActivity(interaction, color, title, description, ...fields){
    if(interaction.guildId !== interaction.IDENT){return;}
    const [ColorEmbed] = await colorEmbed(interaction, color, title, description, ...fields)

    let GuildChannel =  (await SQL.models.Guilds.findByPk(String(interaction.IDENT), {raw: true}));

    if(GuildChannel.activityLogChannel != null && GuildChannel.activityLogChannel){
        try{
            GuildChannel =  await interaction.guild.channels.fetch(GuildChannel.activityLogChannel);
        }catch(err){
            return
        }
        await GuildChannel.send({embeds: [ColorEmbed]})
    }
}

    async function formatMoney(currency, amount) {

    let formatter = new Intl.NumberFormat('en-US');

    if(currency == null){
        return `$${formatter.format(amount)}`
    }

    return `${currency}${formatter.format(amount)}`
}

function IRS(interaction) {
    this.interaction = interaction;
    this.authorId = interaction.user.id
    this.IDENT = interaction.IDENT;
}

IRS.prototype = {
    calculatePayrollTax: async function(amountBT){
        let taxValue;
        let taxType;
        let taxProps = await irsCache.get(this.IDENT)

        amountBT = Number(amountBT);

        if(taxProps  && taxProps?.payrollTax !== null){
            taxValue = taxProps.payrollTax;
            taxType = taxProps.payrollType;
        }else{
            let guild = await SQL.models.Guilds.findByPk(this.IDENT, {raw: true});

            if(guild.payrollTax == null){
                taxValue = 0;
                taxType = 0;
            }else{
                taxValue = Number(guild.payrollTax);
                taxType = Number(guild.payrollTaxType);

                await irsCache.set(this.IDENT, {payrollTax: taxValue, payrollType: taxType, salesTax: guild.salesTax, salesType: guild.salesTaxType})
            }
        }

        if(taxType === "Flat"){
            return {total: amountBT-taxValue, tax: taxValue}
        }else{
            return {total: amountBT-((taxValue/100)*amountBT), tax: (taxValue/100)*amountBT}
        }
    },
    calculateSalesTax: async function(amountBT){
        let taxValue;
        let taxType;
        let taxProps = await irsCache.get(this.IDENT)

        if(taxProps && taxProps?.salesTax !== null){
            taxValue = taxProps.salesTax;
            taxType = taxProps.salesType;
        }else{
            let guild = await SQL.models.Guilds.findByPk(this.IDENT, {raw: true});


            if(guild.salesTax == null){
                taxValue = 0;
                taxType = 0
            }else {

                taxValue = guild.salesTax;
                taxType = guild.salesTaxType

                await irsCache.set(this.IDENT, {payrollTax: guild.payrollTax, payrollType: guild.payrollTaxType, salesTax: guild.salesTax, salesType: guild.salesTaxType})
            }
        }

        if(taxType === "Flat"){
            return {total: Number(taxValue)+Number(amountBT), tax: taxValue}
        }else{
            return {total: (1+(Number(taxValue)/100))*Number(amountBT), tax: (Number(taxValue)/100)*Number(amountBT)}
        }
    },
    filePayrollTax: async function(taxAmount, entity, entityType){
        let Treasury = await SQL.models.Guilds.findByPk(this.IDENT);

        taxAmount = Number(taxAmount)

        let newBalance = Number(Treasury.balance) + taxAmount;

        let entityName = await entity.getName();
        let entityBalance = await entity.getBalance();
        let newBal = Number(Number(entityBalance)-Number(taxAmount));

        if(entityType === "Accounts"){
            await SQL.models.Accounts.update({balance: newBal}, {where: {IDENT: entity.IDENT}});
        }else{
            await SQL.models.Department.update({balance: newBal}, {where: {IDENT: entity.IDENT}});
        }

        await SQL.models.Guilds.update({balance: newBalance}, {where: {IDENT: this.IDENT}});

        await SQL.models.AdvTransactionLogs.create({
            guild: this.interaction.IDENT,
            amount: taxAmount,
            creditAccount: entity.IDENT,
            debitAccount: this.interaction.guildId,
            creditType: entityType,
            debitType: 'Treasury',
            memo: String(`${entityName} Payroll Tax.`)
        });

        await LogActivity(this.interaction, "green", "Payroll Tax Paid", `${entityName} paid ${await formatMoney(Treasury.customCurrency, taxAmount)} in payroll tax.`)
    },
    fileSalesTax: async function(taxAmount, entity){
        let Treasury = await SQL.models.Guilds.findByPk(this.IDENT);

        taxAmount = Number(taxAmount)
        let newBalance = Number(Treasury.balance) + taxAmount;

        let entityName = await entity.getName();
        let entityBal = await entity.getBalance();
        let newBal = Number(Number(entityBal)-Number(taxAmount));

        await SQL.models.Accounts.update({balance: newBal}, {where: {IDENT: entity.IDENT}});

        await SQL.models.Guilds.update({balance: newBalance}, {where: {IDENT: this.IDENT}});

        await SQL.models.AdvTransactionLogs.create({
            guild: this.interaction.IDENT,
            amount: taxAmount,
            creditAccount: entity.IDENT,
            debitAccount: this.interaction.guildId,
            creditType: 'Account',
            debitType: 'Treasury',
            memo: String(`${entityName} Sales Tax.`)
        });

        await LogActivity(this.interaction, "green", "Sales Tax Paid", `${entityName} paid ${await formatMoney(Treasury.customCurrency, taxAmount)} in sales tax.`)
    }
}

module.exports = IRS;