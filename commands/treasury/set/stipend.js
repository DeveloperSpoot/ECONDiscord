const {
 MessageFlags
} = require("discord.js");
const { ErrorEmbed } = require("../../../utils/embedUtil");
const discord = require("discord.js");
const { PermManager, UpdateData } = require("../../../dataCrusher/Headquarters");


module.exports = {
    configure(subcommand) {
        return subcommand
            .setName('stipend')
            .setDescription('Set the stipend that users are able to claim.')
            .addNumberOption((option) =>
                option
                    .setName('stipend')
                    .setDescription('The amount of money you would like to set as the stipend.')
                    .setRequired(true)
            )
            .addNumberOption((option) =>
                option
                    .setName('timeout')
                    .setDescription('The amount of HOURS you would like users to wait until claiming their next stipend.')
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

        const Stipend = interaction.options.getNumber('stipend');
        const Timeout = interaction.options.getNumber('timeout')

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        await UpdateData.treasuryStipend(interaction.IDENT, Stipend, Timeout).catch(async err => {
            console.error(err);
            await ErrorEmbed(interaction, `An error occurred: ${err.message}`, false, true)
        })
        const SuccessEmbed = new discord.EmbedBuilder()
            .setTitle(`Successfully Updated Stipend`,)
            .setColor(discord.Colors['Green'])
            .setTimestamp()
            .setFooter({
                text: `${interaction.guild.name} Economy System`, iconURL: interaction.guild.iconURL(),
            })
            .setDescription(`The stipend has been updated to $${Stipend}. Users are able to claim this stipend every ${Timeout} hours.`);
        interaction.editReply({ embeds: [SuccessEmbed] })

    }
};