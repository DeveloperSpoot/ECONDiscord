const SQL = require("../Server")
const {Op} = require("sequelize")
const {Round} = require("../../utils/mathUtils")
const {ErrorEmbed} = require("../../utils/embedUtil");
const {colorEmbed} = require("../../customPackage/colorBar");

async function getGuildMember(disID, guildID) {
    const options = {
        [Op.and]: [
            {guild: String(guildID)},
            {id: String(disID)}]
    }

    return await SQL.models.GuildMembers.findOne({ where: options, raw: false})
}

module.exports = {
    logChannel: async function(interaction, channel){
        try {
            await SQL.models.Guilds.update({generalLogChannel: channel.id, activityLogChannel: channel.id}, {where: {IDENT: interaction.guildId}})
        }catch(e){
            console.error(e)
            return ErrorEmbed(interaction, e.message)
        }
    },
    deleteServer: async function(guild){
    console.warn(guild)
        try {
            const GuildMembers = await SQL.models.GuildMembers.findAll({where: {guild: guild}, raw: true});

            for(const member of GuildMembers){
                await SQL.models.Inventory.destroy({where: {owner: member.IDENT}, force: true})
            }
            for(const member of GuildMembers){
                await SQL.models.SellRecords.destroy({where: {employee: member.IDENT}, force: true})
            }

            // await SQL.models.Inventory.destroy({where: {guild: guild}})
            await SQL.models.Items.destroy({where: {guild: guild}, force: true}) //GUILD
            // await SQL.models.SellRecords.destroy({where: {guild: guild}})
            await SQL.models.TransactionLogs.destroy({where: {guild: guild}, force: true}) //GUILD
            await SQL.models.Employees.destroy({where: {guild: guild}, force: true}) //GUILD
            await SQL.models.AdvTransactionLogs.destroy({where: {guild: guild}, force: true}) //GUILD
            await SQL.models.Accounts.destroy({where: {guild: guild}, force: true}) //GUILD
            await SQL.models.Citation.destroy({where: {guild: guild}, force: true}) //GUILD
            await SQL.models.Fee.destroy({where: {guild: guild}, force: true}) //GUILD
            await SQL.models.MoneyPrints.destroy({where: {guild: guild}, force: true}) //GUILD
            await SQL.models.Shift.destroy({where: {GuildIDENT: guild}, force: true})
            await SQL.models.RolePay.destroy({where: {GuildIDENT: guild}, force: true})
            await SQL.models.DepartmentMembers.destroy({where: {GuildIDENT: guild}, force: true})
            await SQL.models.DepartmentRoles.destroy({where: {GuildIDENT: guild}, force: true})
            await SQL.models.Department.destroy({where: {GuildIDENT: guild}, force: true})
            await SQL.models.AuthorizedUsers.destroy({where: {guild: guild}, force: true})//GUILD
            await SQL.models.GuildMembers.destroy({where: {guild: guild}, force: true})//GUILD
            await SQL.models.Guilds.destroy({where: {IDENT: guild}, force: true})
        }catch(e){
            console.error(e)
        }

},
    inactivateMember: async(interaction, memberIDENT, accs, member)=>{
        await SQL.models.GuildMembers.update({presence: 'INACTIVE'}, {where: {IDENT: memberIDENT}})

        await SQL.models.Accounts.update({balance: 0}, {where: {[Op.or]: [{IDENT: accs.bank.IDENT}, {IDENT: accs.wallet.IDENT}]}});

        await SQL.models.AdvTransactionLogs.create({
            guild: interaction?.IDENT,
            amount: accs.bank.balance,
            creditAccount: interaction?.IDENT,
            debitAccount: accs.bank.IDENT,
            creditType: "Treasury",
            debitType: "Account",
            memo: "INACTIVE ACCOUNT COLLECTED"
        }).catch(err=>console.log(err))
        return await SQL.models.AdvTransactionLogs.create({
            guild: interaction?.guild.id || member.guild.id,
            amount: accs.wallet.balance,
            creditAccount: interaction?.IDENT,
            debitAccount: accs.wallet.IDENT,
            creditType: "Treasury",
            debitType: "Account",
            memo: "INACTIVE ACCOUNT COLLECTED"
        }).catch(err=>console.log(err))
    },
    memberPresence: async (memberIDENT, status) => {
        return await SQL.models.GuildMembers.update({presence: status}, {where: {IDENT: memberIDENT}})
    },
    removeCitation: async (interaction, citationIDENT)=>{
        const Citation = await SQL.models.Citation.findByPk(citationIDENT);
        return await Citation.destroy().catch(err=>console.log("Remove-Citation", err))
    },
    accountBalance: async (interaction, debitAccount, creditAccount, amount) =>{
        const accountToDebit = await SQL.models.Accounts.findByPk(debitAccount, {raw: true});
        const accountToCredit = await SQL.models.Accounts.findByPk(creditAccount, {raw: true});
        const roundedAmount = amount;

        if(roundedAmount > Number(accountToCredit.balance)){ return "Insufficient Funds" }

        const debitOptions = {IDENT: debitAccount};
        const creditOptions = {IDENT: creditAccount};

        await SQL.models.Accounts.update({
            balance: Number(accountToCredit.balance) - Number(roundedAmount),
           netWorth: Number(accountToCredit.netWorth) - Number(roundedAmount)
        }, {where: creditOptions})

        await SQL.models.Accounts.update({
            balance: Number(accountToDebit.balance) + Number(roundedAmount),
           netWorth: Number(accountToDebit.netWorth) + Number(roundedAmount)
        }, {where: debitOptions})

        return "Success";
    },
    treasuryBalance: async (guildId, newBalance) => {
        const options = {IDENT: String(guildId)}
        // console.warn("New Balance", newBalance)
        return await SQL.models.Guilds.update({balance: newBalance}, {where: options});
    },
    treasuryStipend: async function (guild, stipend, timeout){
        const options = {IDENT: String(guild)}
        return await SQL.models.Guilds.update({stipend: stipend, stipendTimeout: timeout}, {where: options});
    },
    treasuryBudgetTimeout: async function(guild, timeout){
        const options = {IDENT: String(guild)}
        return await SQL.models.Guilds.update({budgetTimeout: timeout}, {where: options});
    },
    treasuryStartingBalance: async function(guild, amount){
        const options = {IDENT: String(guild)}
        return await SQL.models.Guilds.update({startingBalance: amount}, {where: options});
    },
    accountStipend: async function(interaction, user){
        const Time = new Date();
        const Guild = await SQL.models.Guilds.findByPk(interaction.IDENT, {raw: true});
        const accounts = await user.getBasicAccounts();
        const UserIDENT = await user.getIDENT();
        await SQL.models.AdvTransactionLogs.create({
            guild: interaction.IDENT,
            amount: Guild.stipend,
            creditAccount: interaction.IDENT,
            debitAccount: accounts.bank.id,
            creditType: "Treasury",
            debitType: "Account",
            memo: "Claimed Stipend."
        }).catch(err=>console.log(err))
        await SQL.models.Guilds.update({balance: (Number(Guild.balance)-Number(Guild.stipend))}, {where: {IDENT: interaction.IDENT}}).catch(err=>console.log(err))
        await SQL.models.Accounts.update({balance: (Number(accounts.bank.balance)+Number(Guild.stipend))}, {where: {IDENT: accounts.bank.id}}).catch(err=>console.log(err))
        return  await SQL.models.GuildMembers.update({stipendTimestamp: Time, netWorth: (Number(accounts.netWorth)+Number(Guild.stipend))}, {where:{IDENT: UserIDENT}}).catch(err=>console.error(err))

    },
    departmentBalance: async function(interaction, department, amount){
        const DepBal = await department.getBalance();
        const Treasury = await SQL.models.Guilds.findByPk(interaction.IDENT);
        const TreasBal = Treasury.balance;

        await SQL.models.Guilds.update({balance: (Number(TreasBal)-Number(amount))}, {where: {IDENT: interaction.IDENT}})
        await SQL.models.Department.update({balance: (Number(DepBal)+Number(amount))}, {where: {IDENT: department.IDENT}})

        return await SQL.models.AdvTransactionLogs.create({
            guild: interaction.IDENT,
            amount: amount,
            creditAccount: interaction.IDENT,
            debitAccount: department.IDENT,
            creditType: "Treasury",
            debitType: "Department",
            memo: "DEPARTMENT FUNDING."
        }).catch(err=>console.log(err))
    },
}
