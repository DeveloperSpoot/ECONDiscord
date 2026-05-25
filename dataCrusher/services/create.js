const {ErrorEmbed} = require("../../utils/embedUtil");
const {Op} = require("sequelize");
const SQL = require("../Server");
const {intersects} = require("sequelize/lib/utils");
const {colorEmbed} = require("../../customPackage/colorBar");

async function getGuildMember(disID, guildID) {
    const options = {
        [Op.and]: [
            {guild: String(guildID)},
            {id: String(disID)}]
    }

    return await SQL.models.GuildMembers.findOne({ where: options, raw: true})
}

async function LogGeneral(interaction, color, title, description, ...fields){
    if(interaction.guildId !== interaction.IDENT){return;}

    const [ColorEmbed] = await colorEmbed(interaction, color, title, description, ...fields)

    let GuildChannel =  (await SQL.models.Guilds.findByPk(interaction.IDENT, {raw: true}));



    if(GuildChannel.generalLogChannel != null && GuildChannel.generalLogChannel){
        GuildChannel =  await interaction.guild.channels.fetch(GuildChannel.generalLogChannel);

        await GuildChannel.send({embeds: [ColorEmbed]})

    }

}

module.exports = {
    user: async (interaction)=>{
        const user = interaction.user.id;
        const guild = String(interaction.IDENT);

        await SQL.models.Guilds.findOrCreate({
            where: {IDENT: guild},
            defaults: {IDENT: guild, balance: 0.00}
        });

       return await SQL.models.GuildMembers.create({
            guild: guild,
            id: user,
            netWorth: 0
        }).catch((err) => {
            return ErrorEmbed(interaction, err.message, false, true);
        });
    },
    basicAccount: async(interaction, type)=> {
        const user = await getGuildMember(interaction.user.id, interaction.IDENT);
        const guild = interaction.IDENT;
        return await SQL.models.Accounts.create({
            guild: `${guild}`,
            owner: user.IDENT,
            GuildMemberIDENT: user.IDENT,
            balance: 0.0,
            type: type
        }).catch((err) => {
            return console.error(err);
        });
    },

    businessAccount: async (interaction, name, description, ownerId, selfServed, role)=>{
        const Owner = await getGuildMember(ownerId, interaction.IDENT);
        const guild = interaction.IDENT;
        try {
            const result = await SQL.models.Accounts.create({
                guild: `${guild}`,
                balance: 0.00,
                owner: Owner.IDENT,
                GuildMemberIDENT: Owner.IDENT,
                type: "business",
                name: String(name),
                description: String(description),
                message: null,
                role: String(role),
                selfServed: selfServed
            }).catch((err) => {
                console.log(err)
                return ErrorEmbed(interaction, err.message);
            });
            await LogGeneral(interaction, 'Green', "New Business Created", description,
                {name: 'Name', value: String(name), inline: true},
                {name: 'OwnerID', value: `<@${ownerId}>`, inline: true},
                {name: 'SelfServed', value: `${selfServed}`, inline: true},
                {name: 'Role', value: `<@&${role}>`, inline: true})
        }catch(err){
            console.log(err)
            return ErrorEmbed(interaction, err);
        }
    },
    basicTransaction: async(interaction, debitAccount, creditAccount, amount, reason)=>{
        const guild = interaction.IDENT;
        return await SQL.models.TransactionLogs.create({
            guild: `${guild}`,
            amount: amount,
            creditAccount: creditAccount,
            debitAccount: debitAccount,
            memo: reason || "No reason provided."
        }).catch(err=>console.log(err))
    },
    AdvanceTransaction: async(interaction, debitAccount, creditAccount, CredType, DebType, amount, reason)=>{
        const guild = interaction.IDENT;
        return await SQL.models.TransactionLogs.create({
            guild: `${guild}`,
            amount: amount,
            creditAccount: creditAccount,
            debitAccount: debitAccount,
            creditType: CredType,
            debitType: DebType,
            memo: reason || "No reason provided."
        }).catch(err=>console.log(err))
    },
    inventoryItem: async(interaction, user, item, sellRecord, quantity, value)=>{
        return await SQL.models.Inventory.create({
            owner: user,
            item: item,
            sellRecord: sellRecord,
            quantity: quantity,
            value: value
        }).catch(err=>console.log(err))
    },
    sellRecord: async(interaction, transaction, quantity, amount, business, employee)=>{
        const guild = interaction.IDENT;
        return await SQL.models.SellRecords.create({
            guild: `${guild}`,
            transaction: transaction,
            quantity: quantity,
            amount: amount,
            business: business,
            employee: employee
        }).catch(err=>console.log(err))
    },
    treasury: async (guildId, startingFunds, payrollApproval)=>{
        return await SQL.models.Guilds.create({
         balance: 0.00,
         startingFunds: startingFunds,
         payrollApproval: payrollApproval,
         loggingChannel: null,
         IDENT: guildId
     }).catch(err => console.log(err))
    },
    treasuryPrint: async (interaction, amount, reason) =>{
        const authorizer = await getGuildMember(interaction.user.id, interaction.IDENT);
        console.warn("Authorizer", authorizer)
        const foundGuild = await SQL.models.Guilds.findByPk(interaction.IDENT, {raw: true});

        try{
            await LogGeneral(interaction, `Orange`, `Economy Inflated`, `<@${interaction.user.id}> has printed ${amount} and thus inflated the Economy.`, {name: 'Reason', value: reason})
        }catch(err){
            console.log(err)
            await ErrorEmbed(interaction, err.message)
        }

        return  await SQL.models.MoneyPrints.create({
            guild: `${interaction.IDENT}`,
            amount: amount,
            memo: reason,
            authorizer: authorizer.IDENT,
            newBalance: foundGuild.balance
        }).catch(async(err) => {
            return await ErrorEmbed(interaction, `An error occurred: ${err.message}`, false,true)
        });
    },
    department: async (interaction, name, head, member, description, budget, maxBal) =>{
        let MaxBAL = maxBal;

        if(typeof MaxBAL === 'undefined' || MaxBAL === null){MaxBAL = null}else{MaxBAL = Number(maxBal)}

        try {

            const dep = await SQL.models.Department.create({
                GuildIDENT: interaction.IDENT,
                name: String(name),
                headRole: String(head),
                memberRole: String(member),
                description: String(description),
                balance: 0,
                budget: Number(budget),
                maxBalance: MaxBAL
            }).catch(async err => {
                console.error(err);
                return await ErrorEmbed(interaction, `An error occurred: ${err.message}`, false, true)
            })
            await SQL.models.DepartmentRoles.create({
                GuildIDENT: interaction.IDENT,
                DepartmentIDENT: dep.IDENT,
                id: head,
                permissions: ['Department-Head', 'Member']
            }).catch(async err => {
                console.error(err);
                return await ErrorEmbed(interaction, `An error occurred: ${err.message}`, false, true)
            })
            const result = await SQL.models.DepartmentRoles.create({
                GuildIDENT: interaction.IDENT,
                DepartmentIDENT: dep.IDENT,
                id: member,
                permissions: ['Member']
            }).catch(async err => {
                console.error(err);
                return await ErrorEmbed(interaction, `An error occurred: ${err.message}`, false, true)
            })

            await LogGeneral(interaction, 'Green', 'New Department Created', description,
                {name: 'Name', value: name, inline:true},
                {name: 'Head Role', value: `<@&${head}>`, inline: true},
                {name: 'Member Role', value: `<@&${member}>`, inline: true},
                {name: 'Budget', value: `${budget}`, inline: true},
                {name: 'Max Balance', value: `${maxBal}`, inline: true})

            return result
        }catch(err){
            console.log(err)
            await ErrorEmbed(interaction, err.message)
        }
    },
    authorizedUser: async function(interaction, user, type = 'treasury'){
        const User = await getGuildMember(user.id, interaction.IDENT);
        if (!User) throw new Error('That user is not registered in this server\'s economy.');

        const result = await SQL.models.AuthorizedUsers.create({
            guild: interaction.IDENT,
            id: User.IDENT,
            type: type
        });

        await LogGeneral(interaction, 'Red', 'User Authorized',
            `<@${user.id}> has been Authorized to run Treasury Commands (This User Now Has ECON Admin perms for the server).`);

        return result;
    },
    cbAuthorizedUser: async function(interaction, user){
        return this.authorizedUser(interaction, user, 'centralbank');
    },
}
