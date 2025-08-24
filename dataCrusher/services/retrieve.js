const SQL = require("../Server")
const {Op} = require("sequelize")
const {ErrorEmbed}= require("../../utils/embedUtil");
const {leaderboards} = require("./cache");

async function getGuildMember(disID, guildID) {
    const options = {
        [Op.and]: [
            {guild: String(guildID)},
            {id: String(disID)}]
        }

    return await SQL.models.GuildMembers.findOne({ where: options, raw: true})
}


function sortByNumber(a, b){
    if(a.netWorth < b.netWorth) return 1;
    if(a.netWorth > b.netWorth) return -1;
    return 0;
}


module.exports = {
    guildMembers: async (guildID) => {
        const options = {
            guild: String(guildID)
        }
      return await SQL.models.GuildMembers.findAll({ where: options, raw: true})
    },
    userBasicAccounts: async (interaction, member)=>{
        const guild = interaction.IDENT;
        const user = await getGuildMember(member.id, guild);

        if(user === null){return {}}
        const options = {
            [Op.and]: [
                {guild: String(guild)},
                {owner: user.IDENT},
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
        data.forEach((account, index)=>{
            account.id = account.IDENT;
            if(account.type === "personal-bank"){
                accounts.bank = account
                return
            }

            accounts.wallet = account
        })
        return accounts;
    },
    userBasicAccountsByIDENT: async (memberIDENT)=>{

        const options = {
            [Op.and]: [
                {owner: memberIDENT},
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
        data.forEach((account, index)=>{
            account.id = account.IDENT;
            if(account.type === "personal-bank"){
                accounts.bank = account
                return
            }

            accounts.wallet = account
        })
        return accounts;
    },
    accountLedger: async(interaction, account)=>{
        const options = {
            where:{ [Op.or]: [
            {debitAccount: account},
            {creditAccount: account}
                ]},
            order: [['createdAt', 'DESC']],
            raw: true
        }
        return await SQL.models.TransactionLogs.findAll(options);
    },
    advAccountLedger: async(interaction, account) =>{
        const options = {
            where:{ [Op.or]: [
                    {debitAccount: account},
                    {creditAccount: account}
                ]},
            order: [['createdAt', 'DESC']],
            raw: true
        }
        return await SQL.models.AdvTransactionLogs.findAll(options)
    },
    account: async (interaction, accountIDENT) => {
        return await SQL.models.Accounts.findByPk(accountIDENT, {raw: true});
    },
    accountsByType: async (interaction, type) => {
        const options = {where: { [Op.and]: [{guild: String(interaction.IDENT)}, { type: type}]}, raw: true }
        return await SQL.models.Accounts.findAll(options)
    },
    user: async (interaction, userId) => {
        const options = {
            [Op.and]: [
                {guild: String(interaction.IDENT)},
                {id: (typeof userId === "string")?userId:String(userId)}]
        }

        return await SQL.models.GuildMembers.findOne({ where: options, raw: true})
    },
    treasury: async (guildId, isRaw) =>{
        if(isRaw ==null)isRaw=true;
      //OPTIMIZE Retrieve/Create.treasury is redundant, consider merging retrieve and create query's to findOrCreate.
        return await SQL.models.Guilds.findByPk(guildId, {raw: isRaw});
    },
    leaderboard: async (guildId) => {


        const BankAccounts = await SQL.models.Accounts.findAll({raw: true, where: {guild: String(guildId), type: "personal-bank"}, order: [["balance", "DESC"]]});
        const WalletAccounts = await SQL.models.Accounts.findAll({raw: true, where: {guild: String(guildId), type: "personal-wallet"}, order: [["balance", "DESC"]]});

        let netWorths = []
        const results = new Map();

        for (const account of BankAccounts){
            const pairdAccount = WalletAccounts.filter(i => i.owner === account.owner)[0]
            const netWorth = (Number(account.balance)+Number(pairdAccount.balance))
            const user = await SQL.models.GuildMembers.findByPk(account.owner);
            if(user.presence === 'INACTIVE'){continue}
            netWorths.push({id: user.id, netWorth: netWorth})
        }
        const sortedNet =  netWorths.sort(sortByNumber);
        sortedNet.map(async (user, index)=>{

            await results.set(user.id, {netWorth: user.netWorth, pos: index})
         })
        leaderboards[guildId] = results

        return results
    },
    userByIDENT: async function(userIDENT){
        return await SQL.models.GuildMembers.findByPk(userIDENT);
    },
    allGuilds: async function(){
        return await SQL.models.Guilds.findAll()
    }
}
