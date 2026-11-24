const {
    EmbedBuilder
} = require("discord.js");
const { ErrorEmbed } = require("../../../utils/embedUtil");
const { PermManager, GuildHQ } = require("../../../dataCrusher/Headquarters");

module.exports = {
    configure(subcommand) {
        return subcommand
            .setName("set-currency")
            .setDescription("Allows you to change the default currency symbol to whatever you would like.")
            .addStringOption(stringOp =>
                stringOp.setName("symbol")
                    .setDescription("The \"Symbol\" you would like to use.")
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

        const guildManager = new GuildHQ(interaction);

        try {
            await guildManager.setCurrency(interaction.options.getString("symbol"))
        } catch (err) {
            console.error(err)
            return ErrorEmbed(interaction, err.message)
        }

        let sucessEmbed = new EmbedBuilder()
            .setDescription(`Successfully updated the server currency symbol to: ${interaction.options.getString("symbol")}`)
            .setColor("Green");

        interaction.reply({ embeds: [sucessEmbed] });

    }
};