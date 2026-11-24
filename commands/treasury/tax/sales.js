const {
    EmbedBuilder
} = require("discord.js");
const { ErrorEmbed } = require("../../../utils/embedUtil");
const { PermManager, GuildHQ } = require("../../../dataCrusher/Headquarters");

module.exports = {
    configure(subcommand) {
        return subcommand
            .setName("sales")
            .setDescription("Set the value that should be taxed from sales.")
            .addStringOption((stringOp) =>
                stringOp.setName("type")
                    .setDescription("Set the tax type, can be flat or a percentage.")
                    .addChoices(
                        { name: "Flat", value: `Flat` },
                        { name: "Percentage", value: "Percentage" }
                    )
                    .setRequired(true)
            )
            .addNumberOption((numOp) =>
                numOp.setName("value")
                    .setDescription("The value/percent that should be taxed.")
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

        let taxValue = interaction.options.getNumber("value");
        let taxType = interaction.options.getString("type")

        if (taxType !== "Flat" && taxType !== "Percentage") {
            return await ErrorEmbed(interaction, "The tax type must either be \"Flat\" or \"Percentage\".", false, false);
        }

        await interaction.deferReply();

        const guildManager = new GuildHQ(interaction);

        try {
            let displayValue;
            if (taxType === 'Flat') {
                displayValue = await guildManager.formatMoney(taxValue);
            } else {
                displayValue = `${taxValue}%`
            }

            await guildManager.setSalesTax(taxValue, taxType);

            let goodEmbed = new EmbedBuilder()
                .setDescription(`Successfully updated the sales tax to **${taxType}** with the value of **${displayValue}**.`)
                .setColor("Green");

            return interaction.editReply({ embeds: [goodEmbed] })
        } catch (e) {
            return await ErrorEmbed(interaction, e.message, false, false);
        }

    }
};