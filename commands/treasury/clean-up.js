const {
    AttachmentBuilder
} = require("discord.js");
const { ErrorEmbed } = require("../../utils/embedUtil");
const { RetrieveData, UpdateData, PermManager } = require("../../dataCrusher/Headquarters");
const { csvGenerator } = require("../../utils/csvGenerator");
const { activeCleanUp } = require("../../dataCrusher/Headquarters").CacheManager;

module.exports = {
    configure(subcommand) {
        return subcommand
            .setName('clean-up')
            .setDescription('Cleans up all accounts of members who have left.')
    },

    async execute(interaction) {
        if (interaction.IDENT !== interaction.guildId) {
            return await ErrorEmbed(interaction, "Sub Servers of an Entanglement may not manage the treasury. Treasury settings changes and interactions must be conducted on the main server.")
        }

        if (await PermManager.Treasury.checkAuthorization(interaction, interaction.user) == null && interaction.user.id !== interaction.guild.ownerId) {
            return await ErrorEmbed(
                interaction,
                "You are not authorized manage the Treasury."
            );
        }

        await activeCleanUp.set(interaction.IDENT, true)

        await interaction.deferReply()

        const Members = await RetrieveData.guildMembers(interaction.IDENT).catch(async err => {
            console.warn(err)
            await ErrorEmbed(this.interaction, err.message)
        });

        let inactiveCollection = [];

        for (const member of Members) {
            try {
                await interaction.guild.members.fetch(String(member.id));
            } catch (err) {
                if (err.message === "Unknown Member") {
                    inactiveCollection.push(member)
                    continue
                }
                console.warn("CLEANUP ERROR | ", err.message)
            }
        }

        let amountToCollect = 0;
        let records = [{}]

        for (const inactee of inactiveCollection) {
            const inacteeAccounts = await RetrieveData.userBasicAccountsByIDENT(inactee.IDENT);
            const inacteeNet = Number(inacteeAccounts.bank.balance) + Number(inacteeAccounts.wallet.balance)
            amountToCollect = Number(amountToCollect) + Number(inacteeNet);
            records.push({ DiscordID: inactee.id, AmountCollected: inacteeNet, newTotal: amountToCollect, IDENT: inactee.IDENT })

            await UpdateData.inactivateMember(interaction, inactee.IDENT, inacteeAccounts)
        }

        const newTresBal = Number(Treasury.balance) + Number(amountToCollect);
        await UpdateData.treasuryBalance(interaction.IDENT, newTresBal)

        const csvCollection = await csvGenerator(["DiscordID", "AmountCollected", "newTotal", "IDENT"], records)
        const recordsAttachment = new AttachmentBuilder(Buffer.from(csvCollection), { name: `${interaction.guild.name}-CleanUpMembers.csv` })

        await activeCleanUp.set(interaction.IDENT, false)

        interaction.editReply(`The following attached member account's have been cleaned up.`)

        interaction.followUp({ files: [recordsAttachment] })
    }
};