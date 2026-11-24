const {
    EmbedBuilder
} = require("discord.js");
const { ErrorEmbed } = require("../../utils/embedUtil");
const { GuildHQ } = require("../../dataCrusher/Headquarters");

module.exports = {
    configure(subcommand) {
        return subcommand
            .setName("statistics")
            .setDescription("Displays statistical information about the treasury.")
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

        const premiumStatus = await guildManager.getPremiumStatus();

        if (premiumStatus === true) {

            const stats = await guildManager.getStatsPremium();

            const statsEmbed = new EmbedBuilder()
                .setTitle("Statistics (Premium)")
                .addFields(
                    { name: "Total Cicurlating", value: await guildManager.formatMoney(stats.total), inline: true },
                    { name: "Average Printed", value: await guildManager.formatMoney(stats.average), inline: true },
                    { name: "\u200b", value: "\u200b", inline: true },
                    { name: "Circulated (Last 7 Days)", value: await guildManager.formatMoney(stats.sevenDays), inline: true },
                    { name: "Circulated (Last 30 Days)", value: await guildManager.formatMoney(stats.month), inline: true }
                )
                .setColor("DarkGreen");
            await interaction.editReply({ embeds: [statsEmbed] })
            return;
        }

        const basicStats = await guildManager.getStatsBasic();
        const basicStatsEmbed = new EmbedBuilder()
            .setTitle("Statistics (Basic)")
            .addFields(
                { name: "Total Cicurlating", value: await guildManager.formatMoney(basicStats.total), inline: true },
                { name: "Average Printed", value: await guildManager.formatMoney(basicStats.average), inline: true })
            .setColor("DarkGreen");
        const preimumAd = new EmbedBuilder()
            .setColor("DarkBlue")
            .setDescription("ℹ️ Unlock More Stats With [Premium](https://discord.com/channels/901182775116300338/1077447346310357103/1244042799310045247).")

        await interaction.editReply({ embeds: [basicStatsEmbed, preimumAd] })
    }
};