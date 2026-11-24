const {
    EmbedBuilder, AttachmentBuilder
} = require("discord.js");
const { ErrorEmbed } = require("../../utils/embedUtil");
const { RetrieveData, PermManager, DepartmentHQ, GuildHQz } = require("../../dataCrusher/Headquarters");
const { csvGenerator } = require("../../utils/csvGenerator");

module.exports = {
    configure(subcommand) {
        return subcommand
            .setName('view-fees')
            .setDescription('View (all) fees issued in the server.')
            .addBooleanOption(viewallOption =>
                viewallOption.setName('view-all')
                    .setDescription('View all issued fees for the server?'))
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

        await interaction.deferReply()

        const guildManager = new GuildHQ(interaction);

        const viewAll = interaction.options.getBoolean('view-all');
        const feesCollection = await Treasury.getFees({ raw: true }).catch(async err => {
            console.warn(err)
            await ErrorEmbed(this.interaction, err.message)
        });

        if (viewAll) {

            let collection = [{}]

            for (const fee of feesCollection) {
                let Department = await new DepartmentHQ(interaction, fee.department)
                const depName = await Department.getName()
                let client = await RetrieveData.userByIDENT(fee.client);
                client = await interaction.guild.members.fetch(client.id)
                let issuer = await RetrieveData.userByIDENT(fee.issuer)
                issuer = await interaction.guild.members.fetch(issuer.id)
                collection.push({ Department: depName, Client: client.user.username, Fee: fee.fee, Amount: fee.amount, Issuer: issuer.user.username })
            }

            const feeCSVcollection = await csvGenerator(['Department', 'Client', 'Fee', 'Amount', 'Issuer'], collection)
            const feesAttachment = new AttachmentBuilder(Buffer.from(feeCSVcollection), { name: `${interaction.guild.name}-Fees.csv` })

            const csvEmbed = new EmbedBuilder()
                .setTitle('\\✅ Attaching CSV file now.')
                .setTimestamp()
                .setColor('Green')
                .setFooter({
                    text: `${interaction.guild.name} Economy System`, iconURL: interaction.guild.iconURL(),
                });

            await interaction.editReply({ embeds: [csvEmbed] })
            interaction.followUp({ files: [feesAttachment] })

            return
        }

        let feesFileds = "``Department | Client | Fee | Amount | Issuer``\n";

        for (const fee of feesCollection) {
            let Department = await new DepartmentHQ(interaction, fee.department)
            const depName = await Department.getName()
            let client = await RetrieveData.userByIDENT(fee.client);
            client = await interaction.guild.members.fetch(client.id)
            let issuer = await RetrieveData.userByIDENT(fee.issuer)
            issuer = await interaction.guild.members.fetch(issuer.id)

            feesFileds = feesFileds + `${depName} | ${client.user.username} | ${fee.fee} | ${await guildManager.formatMoney(fee.amount)} | ${issuer.user.username}\n`
        }

        const feeEmbed = new EmbedBuilder()
            .setTitle(`${interaction.guild.name}'s Issued Fees`)
            .setDescription(feesFileds)
            .setColor('DarkGold')
            .setTimestamp()
            .setFooter({
                text: `${interaction.guild.name} Economy System`, iconURL: interaction.guild.iconURL(),
            });

        interaction.editReply({ embeds: [feeEmbed] })
    }
};