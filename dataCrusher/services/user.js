const {Op} = require("sequelize");
const { ErrorEmbed } = require("../../utils/embedUtil");
const SQL = require("../Server");
const {treasuryStartingBalance} = require("./update");
const {activeDepartment, activeBusiness} = require("./cache");

async function getGuildMember(disID, guildID) {
    const options = {
        [Op.and]: [
            {guild: String(guildID)},
            {id: String(disID)}]
    }

    return await SQL.models.GuildMembers.findOne({where: options, raw: true})
}

function User(interaction, userID) {
    this.interaction = interaction;
    this.id = userID;
    this.IDENT = null;
}

async function LogGeneral(color, title, desc){
    return
    // let newLog = new logBuilder()
    // newLog.setColor(color)
    // newLog.setTitle(title)
    // newLog.setDisplayName(String(this.interaction.member.displayName))
    // newLog.setDescription(desc);
    // newLog = await newLog.getImage();
    //
    // let Channel = (await SQL.models.Accounts.findByPk(this.IDENT, {raw: true})).generalLogChannel;
    // Channel =  await this.interaction.guild.channels.fetch(Channel);
    //
    // let GuildChannel =  (await SQL.models.Guilds.findByPk(this.interaction.guild.id, {raw: true})).generalLogChannel;
    // GuildChannel =  await this.interaction.guild.channels.fetch(GuildChannel);
    //
    // await Channel.send({content: ` > <@${this.interaction.user.id}> | ${title}`, files: [newLog]})
    // await GuildChannel.send({content: ` > <@${this.interaction.user.id}> | ${title}`, files: [newLog]})
}

async function LogActivity(color, title, author, desc){
    return
    // let newLog = new logBuilder()
    // newLog.setColor(color)
    // newLog.setTitle(title)
    // newLog.setDisplayName(String(this.interaction.member.displayName))
    // newLog.setDescription(desc);
    // newLog = await newLog.getImage();
    //
    // let Channel = (await SQL.models.Accounts.findByPk(this.IDENT, {raw: true})).activityLogChannel;
    // Channel =  await this.interaction.guild.channels.fetch(Channel);
    //
    // let GuildChannel =  (await SQL.models.Guilds.findByPk(this.interaction.guild.id, {raw: true})).activityLogChannel;
    // GuildChannel =  await this.interaction.guild.channels.fetch(GuildChannel);
    //
    // await Channel.send({content: ` > <@${this.interaction.user.id}> | ${title}`, files: [newLog]})
    // await GuildChannel.send({content: ` > <@${this.interaction.user.id}> | ${title}`, files: [newLog]})
}


User.prototype = {
    claimCasinoWinnings: async function(amount){
        const Guild = await SQL.models.Guilds.findByPk(this.interaction.IDENT, {raw: true});
        const accounts = await this.getBasicAccounts();

        await SQL.models.AdvTransactionLogs.create({
            guild: this.interaction.IDENT,
            amount: amount,
            creditAccount: this.interaction.IDENT,
            debitAccount: accounts.wallet.id,
            creditType: "Treasury",
            debitType: "Account",
            memo: "Casino Payout."
        }).catch(err=>console.log(err))
        await SQL.models.Guilds.update({balance: (Number(Guild.balance)-Number(amount))}, {where: {IDENT: this.interaction.IDENT}}).catch(err=>console.log(err))
        await SQL.models.Accounts.update({balance: (Number(accounts.wallet.balance)+Number(amount))}, {where: {IDENT: accounts.wallet.id}}).catch(err=>console.log(err))
        return  
    },
    payCasino: async function(amount){
        const Guild = await SQL.models.Guilds.findByPk(this.interaction.IDENT, {raw: true});
        const accounts = await this.getBasicAccounts();
        
        await SQL.models.AdvTransactionLogs.create({
            guild: this.interaction.IDENT,
            amount: amount,
            creditAccount: accounts.wallet.id,
            debitAccount: this.interaction.IDENT,
            creditType: "Account",
            debitType: "Treasury",
            memo: "Casino Loss."
        }).catch(err=>console.log(err))
        await SQL.models.Guilds.update({balance: (Number(Guild.balance)+Number(amount))}, {where: {IDENT: this.interaction.IDENT}}).catch(err=>console.log(err))
        await SQL.models.Accounts.update({balance: (Number(accounts.wallet.balance)-Number(amount))}, {where: {IDENT: accounts.wallet.id}}).catch(err=>console.log(err))
        return  
    },
    depleteItem: async function(itemIDENT, amount, itemRe){
        if(itemRe.quantity < amount){ amount = itemRe.quanity}

        if(itemRe.quantity == amount){
            return await this.removeItemFromInventory(itemIDENT)
        }

        let mathStuff = Number(itemRe.quantity)-Number(amount)
        return SQL.models.Inventory.update({quantity: mathStuff}, {where: {IDENT: itemIDENT}})
    },
    getShifts: async function(sortBy){
        const USER =  await SQL.models.GuildMembers.findByPk(this.IDENT, {raw: false});
        if(typeof sortBy !== "undefined"){
            return await USER.getShifts({where: {entityIDENT: sortBy.IDENT}, raw: true})
        }

        return await USER.getShifts({raw: true});
    },
    getBusiness: async function(){
        let Bus = await activeBusiness.get(`${this.interaction.IDENT}-${this.interaction.user.id}`);

        // if(Bus === null || typeof Bus === "undefined"){
        //
        //     const IDENT = await this.getIDENT()
        //
        //     const USER =  await SQL.models.GuildMembers.findByPk(IDENT, {raw: true});
        //
        //     if(USER.defaultBusiness == null) return Bus;
        //
        //     await activeBusiness.set(this.interaction.user.id, USER.defaultBusiness)
        //     Bus = USER.defaultBusiness;
        // }
        return Bus;
    },
    getDepartment: async function(){
        let Dep = await activeDepartment.get(`${this.interaction.IDENT}-${this.interaction.user.id}`);

        // if(Dep === null || typeof Dep === "undefined"){
        //
        //     const IDENT = await this.getIDENT()
        //
        //     const USER =  await SQL.models.GuildMembers.findByPk(IDENT, {raw: true});
        //
        //     if(USER.defaultDepartment == null) return Dep;
        //     await activeDepartment.set(this.interaction.user.id, USER.defaultDepartment)
        //     Dep = USER.defaultDepartment
        // }
        return Dep;
    },
    setDefaultBusiness: async function(business){
        const IDENT = await this.getIDENT()
        return await SQL.models.GuildMembers.update({defaultBusiness: business},{where: {IDENT: IDENT}}).catch(async err=>{
            console.warn(err)
            await ErrorEmbed(this.interaction, err.message)
        })
    },
    setDefaultDepartment: async function(department){
        const IDENT = await this.getIDENT()
        return await SQL.models.GuildMembers.update({defaultDepartment: department},{where: {IDENT: IDENT}}).catch(async err=>{
            console.warn(err)
            await ErrorEmbed(this.interaction, err.message)
        })
    },
    getCitations: async function(){
        const USER =  await SQL.models.GuildMembers.findByPk(this.IDENT, {raw: false});
        return await USER.getCitations({raw: true});
    },
    payCitation: async function(citationIDENT, Account){
        let Citation = null;

        try{
            Citation = await SQL.models.Citation.findByPk(citationIDENT);
        }catch(e){
            console.log('Fine Pay Error | ', e)
        }

        if(Citation === null){
            return 'Invalid'
        }
      
        if((Number(Account.balance)-Number(Citation.amount))<0){
            return 'Insufficient Funds';
        }

        const Treasury = await SQL.models.Guilds.findByPk(this.interaction.IDENT);
        const Department = await Citation.getDepartment({raw: true});
        await SQL.models.AdvTransactionLogs.create({
            guild: this.interaction.IDENT,
            amount: Citation.amount,
            creditAccount: Account.IDENT,
            debitAccount: this.interaction.IDENT,
            creditType: 'Account',
            debitType: 'Treasury',
            memo: String(`Paid Fine ${Citation.cadRecordID} issued by ${Department.name} for ${Citation.character}`)
        })

        await SQL.models.Accounts.update({balance: (Number(Account.balance)-Number(Citation.amount))}, {where: {IDENT: Account.IDENT}}).catch(async err =>{
            return  await ErrorEmbed(this.interaction, err.message)
        });
        await SQL.models.Guilds.update({balance: (Number(Citation.amount)+Number(Treasury.balance))}, {where: {IDENT: this.interaction.IDENT}}).catch(async err=>{
            return  await ErrorEmbed(this.interaction, err.message)
        });

        await SQL.models.Citation.destroy({where: {IDENT: citationIDENT}});
        return Citation
    },
    getIDENT: async function () {
        if (this.IDENT === null) {
            this.IDENT = (await getGuildMember(this.id, this.interaction.IDENT)).IDENT
            return this.IDENT
        }
        return this.IDENT
    },
    getBasicAccounts: async function () {
        const guild = this.interaction.IDENT;
        const userIDENT = await this.getIDENT();

        const options = {
            [Op.and]: [
                {guild: guild},
                {owner: userIDENT},
            ],
            [Op.or]: [
                {type: "personal-bank"},
                {type: "personal-wallet"}
            ]
        }
        const data = await SQL.models.Accounts.findAll({
            where: options,
            raw: true
        });

        const accounts = {}
        data.forEach((account, index) => {
            account.id = account.IDENT;
            if (account.type === "personal-bank") {
                accounts.bank = account
                return
            }

            accounts.wallet = account
        })
        accounts.netWorth = Number(accounts.bank.balance) + Number(accounts.wallet.balance)
        return accounts;
    },
    addItemToInventory: async function (item, sellRecord, quantity, value) {
        const guild = this.interaction.IDENT;
        const userIDENT = await this.getIDENT();
        const options = {
            [Op.and]: [
                {item: item},
                {owner: userIDENT},
            ]
        }
        const Item = await SQL.models.Inventory.findOne({
            where: options
        }).catch(err=> console.error(err))

        if (Item !== null) {
            Item.quantity = (Number(Item.quantity) + Number(quantity));
            Item.value = (Number(Item.value) + Number(value));
            return Item.save().catch(err => console.log(err));
        }

        return await SQL.models.Inventory.create({
            owner: userIDENT, item, sellRecord, quantity, value
        }).catch(err=> console.error(err));
    },
    removeItemFromInventory: async function (item) {
        await (await SQL.models.Inventory.findByPk(item)).destroy();
    },
    getInventory: async function (getActualItems) {
        const userIDENT = await this.getIDENT();

        if(getActualItems){

            let inventoryItems = await SQL.models.Inventory.findAll({
                where: {
                    [Op.and]: [
                        {owner: userIDENT},
                    ],
                },
                raw:true
            }).catch(err=>console.log(err))

            for(let i = 0; i < inventoryItems.length; i++){
                let actItem = await this.getInventoryItem(inventoryItems[i].item);
                inventoryItems[i].name = actItem.name
            }

            return inventoryItems
        }else{
            return await SQL.models.Inventory.findAll({
                where: {
                    [Op.and]: [
                        {owner: userIDENT},
                    ],
                },
                raw:true
            }).catch(err=>console.log(err))
        }
    },
    findItemInInventory: async function(itemIDENT) {
      return SQL.models.Inventory.findOne({where: {item: itemIDENT}})
    },
    getItemInv: async function(itemIDent){
        return SQL.models.Inventory.findByPk(itemIDent, {raw: true, paranoid: false})
    },
    getInventoryItem: async function(itemIDENT){
        return SQL.models.Items.findByPk(itemIDENT, {raw: true, paranoid: false})
    },
    getInventoryValue: async function(){
        const Invenotry = await this.getInventory();
        let value = 0;
        for(const Item of Invenotry){
            value = Number(value)+Number(Item.value)
        }
        return value;
    },
    getStipendTimestamp: async function(){
        const Member = await getGuildMember(this.interaction.user.id, this.interaction.IDENT);
        return Member.stipendTimestamp || null;
    },
    getPresence: async function(){
        const Member = await getGuildMember(this.interaction.user.id, this.interaction.IDENT);
        return Member.presence
    },
    claimStartingBalance: async function(){
        const Treasury = await SQL.models.Guilds.findByPk(this.interaction.IDENT, {raw: true});
        const UAccounts = await this.getBasicAccounts();
        if(Treasury.startingBalance !== null && Treasury.startingBalance !== 0){
            await SQL.models.AdvTransactionLogs.create({
                guild: this.interaction.IDENT,
                amount: Treasury.startingBalance,
                creditAccount: this.interaction.IDENT,
                debitAccount: UAccounts.bank.IDENT,
                creditType: "Treasury",
                debitType: "Account",
                memo: "STARTING BALANCE DEPOSIT."
            }).catch(err=>console.log(err))
            await SQL.models.Guilds.update({balance: (Number(Treasury.balance)-Number(Treasury.startingBalance))}, {where: {IDENT: this.interaction.IDENT}})
            return await SQL.models.Accounts.update({balance: (Number(UAccounts.bank.balance)+Number(Treasury.startingBalance))}, {where: {IDENT: UAccounts.bank.IDENT}})
        }
    },
}

module.exports = User;
