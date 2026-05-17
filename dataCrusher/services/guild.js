const {Op} = require("sequelize");
const { ErrorEmbed } = require("../../utils/embedUtil");
const SQL = require("../Server");
const {treasuryStartingBalance} = require("./update");
const {activeDepartment, activeBusiness, preimumCache, currencyCache, irsCache} = require("./cache");
const fetch = require("node-fetch");
const {colorEmbed} = require("../../customPackage/colorBar");

async function getGuildMember(disID, guildID) {
    const options = {
        [Op.and]: [
            {guild: String(guildID)},
            {id: String(disID)}]
    }

    return await SQL.models.GuildMembers.findOne({where: options, raw: true})
}

async function LogGeneral(interaction, color, title, description, ...fields){
    try{
    if(interaction.guildId !== interaction.IDENT){return;}
    const [ColorEmbed] = await colorEmbed(interaction, color, title, description, ...fields)

    let GuildChannel =  (await SQL.models.Guilds.findByPk(String(interaction.IDENT), {raw: true}));

    if(GuildChannel.generalLogChannel != null && GuildChannel.generalLogChannel){
        try{
            GuildChannel =  await interaction.guild.channels.fetch(GuildChannel.generalLogChannel);
        }catch(err){
            return;
        }
        await GuildChannel.send({embeds: [ColorEmbed]})
    }
    }catch(err){
        console.log(err)
    }
}

function Guild(interaction) {
    this.interaction = interaction;
    this.authorId = interaction.user.id
    this.IDENT = interaction.IDENT;
}

Guild.prototype = {
    getCasinoStatus: async function(){
        return (await SQL.models.Guilds.findByPk(this.IDENT, {raw: true})).casinoEnabled
    },
    setCasinoEnbaled: async function(isEnabled){

        return await SQL.models.Guilds.update({casinoEnabled: isEnabled}, {where: {IDENT: this.IDENT}})
    },
    inflatePrices: async function(amountPercent){
        let items = await SQL.models.Items.findAll({where: {guild: this.IDENT}});

        items.forEach((item) => item.price = (1+(Number(amountPercent)/100))*Number(item.price))

        return items.forEach(async (item)=> await SQL.models.Items.update({price: item.price}, {where: {IDENT: item.IDENT}}));
    },
    deflatePrices: async function(amountPercent){
        let items = await SQL.models.Items.findAll({where: {guild: this.IDENT}});

        items.forEach((item) => item.price = Number(item.price)-(((Number(amountPercent)/100))*Number(item.price)))

        return items.forEach(async (item)=> await SQL.models.Items.update({price: item.price}, {where: {IDENT: item.IDENT}}));
    },
    setPayrollTax: async function(value, type){
        await irsCache.set(this.IDENT, null);

        try{
            await SQL.models.Guilds.update({payrollTax: value, payrolLTaxType: type}, {where: {IDENT: this.IDENT}})

            let displayValue;
            if(type === 'Flat'){
                displayValue = await this.formatMoney(value);
            }else{
                displayValue = `${value}%`
            }

            await LogGeneral(this.interaction, "blue", "Payroll Tax Updated.", `The Payroll tax has been updated by ${this.interaction.user}.`, {name: "Value", value: displayValue, inline: true}, {name: "Type", value: type, inline: true});
        }catch(e){
            await ErrorEmbed(this.interaction, e.message, false, true);
        }
    },
    setSalesTax: async function(value, type){
        await irsCache.set(this.IDENT, null);

        try{
            await SQL.models.Guilds.update({salesTax: value, salesTaxType: type}, {where: {IDENT: this.IDENT}})

            let displayValue;
            if(type === 'Flat'){
                displayValue = await this.formatMoney(value);
            }else{
                displayValue = `${value}%`
            }

            await LogGeneral(this.interaction, "blue", "Sales Tax Updated.", `The Sales tax has been updated by ${this.interaction.user}.`, {name: "Value", value: displayValue, inline: true}, {name: "Type", value: type, inline: true});

        }catch(e){
            await ErrorEmbed(this.interaction, e.message, false, true);
        }
    },
    formatMoney: async function(amount){
        let current = await currencyCache.get(this.IDENT)
        let formatter = new Intl.NumberFormat('en-US');
        if(current){
            return `${current}${formatter.format(amount)}`
        }

        let currentCurrency = await SQL.models.Guilds.findByPk(this.IDENT, {raw: true});
        await currencyCache.set(this.IDENT, currentCurrency.customCurrency);

        return `${currentCurrency.customCurrency}${formatter.format(amount)}`
    },
    setCurrency: async function(currency){
        await currencyCache.set(this.IDENT, currency);

        await SQL.models.Guilds.update({customCurrency: currency}, {where: {IDENT: this.IDENT}});

        await LogGeneral(this.interaction, "blue", "Currency Symbol Updated", `The Sales tax has been updated by ${this.interaction.user}. Symbol: ${currency}`);
    },
    setGeneralLog: async function(channel){
        return await SQL.models.Guilds.update({generalLogChannel: channel.id}, {where: {IDENT: this.IDENT}})
    },
    setActivityLog: async function(channel){
        return await SQL.models.Guilds.update({activityLogChannel: channel.id}, {where: {IDENT: this.IDENT}})

    },
    getPremiumStatus: async function(){
        let ownerID = this.interaction.guild.ownerId;

        let discordPremium = await this.interaction.entitlements.filter(sku => sku.guildId === this.interaction.guildId && sku.isActive() && sku.deleted === false && sku.skuId === "1260839276069785653");

        if(discordPremium.length !== 0){
           return true
        }


        if(await preimumCache.get(ownerID) !== null && (await preimumCache.get(ownerID)) === true){
            return true
        }else if (await preimumCache.get(ownerID) !== null && (await preimumCache.get(ownerID)) === false){
            return false
        }

        let response = null;
        let ownerIDs = null;
        let accessGranted = false;

        try{
            response = await fetch("http://localhost:5000/get-patreon-members");
            ownerIDs = await response.json();
        }catch(err){
            console.log(err)
        }

        if(response !== null && ownerIDs.includes(ownerID)){
            accessGranted = true;
            await preimumCache.set(ownerID,  true, 86400000)
        }else{
            accessGranted = false;
            await preimumCache.set(ownerID,  false, 86400000)
        }

        return accessGranted;
    },
    getStatsBasic: async function(){
        let accountsSum = await SQL.models.Accounts.sum("balance", {where: {guild: this.IDENT}});
        let departmentsSum = await SQL.models.Department.sum("balance", {where: {GuildIDENT: this.IDENT}});
        let treasuryBal = await SQL.models.Guilds.sum("balance", {where: {IDENT: this.IDENT}})
        let totalSum = Number(Number(accountsSum)+ Number(departmentsSum)+Number(treasuryBal));

        let prints = await SQL.models.MoneyPrints.findAll({where: {guild: this.IDENT}});
        let avgAmount = totalSum/prints.length;

        return {total: totalSum, average: avgAmount}
    },
    getStatsPremium: async function(){
        let accountsSum = await SQL.models.Accounts.sum("balance", {where: {guild: this.IDENT}});
        let departmentsSum = await SQL.models.Department.sum("balance", {where: {GuildIDENT: this.IDENT}});
        let treasuryBal = await SQL.models.Guilds.sum("balance", {where: {IDENT: this.IDENT}})
        let totalSum = Number(Number(accountsSum)+ Number(departmentsSum)+Number(treasuryBal));

        let prints = await SQL.models.MoneyPrints.findAll({where: {guild: this.IDENT}});
        let avgAmount = totalSum/prints.length;
        let recentSumTransaction  = await SQL.models.TransactionLogs.sum("amount", {where:{[Op.and]: [
                    {guild: this.IDENT},
                    {createdAt: {[Op.gt]: new Date() - (7*24 * 60 * 60 * 1000)}}
                ]}});
        let recentSumTransctionsMONTH = await SQL.models.TransactionLogs.sum("amount", {where:{[Op.and]: [
                    {guild: this.IDENT},
                    {createdAt: {[Op.gt]: new Date() - (30*24 * 60 * 60 * 1000)}}
                ]}});
        let recentSumADVTransaction  = await SQL.models.AdvTransactionLogs.sum("amount", {where:{[Op.and]: [
                    {guild: this.IDENT},
                    {createdAt: {[Op.gt]: new Date() - (7*24 * 60 * 60 * 1000)}}
                ]}});
        let recentSumADVTransctionsMONTH = await SQL.models.AdvTransactionLogs.sum("amount", {where:{[Op.and]: [
                    {guild: this.IDENT},
                    {createdAt: {[Op.gt]: new Date() - (30*24 * 60 * 60 * 1000)}}
                ]}});

        return {total: totalSum, average: avgAmount, sevenDays: (recentSumADVTransaction+recentSumTransaction), month: (recentSumADVTransctionsMONTH+recentSumTransctionsMONTH)}
    }
}

module.exports = Guild;
module.exports.LogGeneral = LogGeneral;