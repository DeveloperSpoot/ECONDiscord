
const discord = require("discord.js");
const { RetrieveData, PermManager } = require("../../dataCrusher/Headquarters");
const { ErrorEmbed } = require("../../utils/embedUtil")

module.exports = {
    configure(subcommand) {
        return subcommand
            .setName('balance')
            .setDescription('View the Treasury account balance.')
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

        await interaction.deferReply();
        const Treasury = await RetrieveData.treasury(interaction.IDENT, true);
        const SusEmebed = new discord.EmbedBuilder()
            .setTitle(`Treasury Account`,)
            .setDescription('The Treasury account currently has a balance of ' + await guildManager.formatMoney(Treasury.balance) + '.')
            .setColor(discord.Colors['Green'])
            .setTimestamp()
            .setFooter({
                text: `${interaction.guild.name} Economy System`, iconURL: interaction.guild.iconURL(),
            })
        return interaction.editReply({ embeds: [SusEmebed] });
    }
};