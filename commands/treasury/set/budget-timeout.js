const {
    MessageFlags
} = require("discord.js");
const { ErrorEmbed } = require("../../../utils/embedUtil");
const discord = require("discord.js");
const { PermManager, UpdateData } = require("../../../dataCrusher/Headquarters");

module.exports = {
    configure(subcommand) {
        return subcommand
            .setName('budget-timeout')
            .setDescription('Set the amount of hours a department must wait before claiming their budget.')
            .addNumberOption((option) =>
                option
                    .setName('dep-timeout')
                    .setDescription('The amount of HOURS you would like departments to wait until claiming their next budget.')
                    .setRequired(true)
            )
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

        const Timeout = interaction.options.getNumber('dep-timeout')
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        await UpdateData.treasuryBudgetTimeout(interaction.IDENT, Timeout).catch(async err => {
            console.error(err);
            await ErrorEmbed(interaction, `An error occurred: ${err.message}`, false, true)
        })
        const SuccessEmbed = new discord.EmbedBuilder()
            .setTitle(`Successfully Updated Timeout`,)
            .setColor(discord.Colors['Green'])
            .setTimestamp()
            .setFooter({
                text: `${interaction.guild.name} Economy System`, iconURL: interaction.guild.iconURL(),
            })
            .setDescription(`The timeout for budget claiming has been updated to ${Timeout}.`);
        interaction.editReply({ embeds: [SuccessEmbed] })
    }
};