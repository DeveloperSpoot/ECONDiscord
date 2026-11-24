const { RetrieveData, BusinessHQ } = require("../../../dataCrusher/Headquarters.js");
const {
    EmbedBuilder
} = require("discord.js");
const { ErrorEmbed } = require("../../../utils/embedUtil");

module.exports = {
    configure(subcommand) {
        return subcommand
            .setName("remove")
            .setDescription("Remove a business from the database.")
            .addStringOption(stringOp =>
                stringOp.setName('business')
                    .setDescription('The business you wish to remove.')
                    .setAutocomplete(true)
                    .setRequired(true)
            )
    },

    async autocomplete(interaction) {
        if (await PermManager.Treasury.checkAuthorization(interaction, interaction.user) == null && interaction.user.id !== interaction.guild.ownerId) {
            return await interaction.respond([{
                name: "Error, You are not authorized manage the Treasury.",
                value: "Error"
            }]);
        }
        const focusedOption = interaction.options.getFocused(true);

        switch (focusedOption.name) {

            case 'business': {
                const choices = await RetrieveData.accountsByType(interaction, 'business')
                if (choices.length === 0) {
                    return await interaction.respond([{
                        name: "Error, no businesses exist in this economy.",
                        value: "Error"
                    }]);
                }
                const filtered = choices.filter(choice => {
                    return choice.name.toLowerCase().startsWith(focusedOption.value.toLowerCase())
                });
                await interaction.respond(
                    filtered.map(choice => ({ name: choice.name, value: choice.IDENT })),
                );
            } break

        }

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

        try {

            await interaction.deferReply();
            const bussIDENT = interaction.options.getString("business");
            const resultEmbed = new EmbedBuilder()
                .setColor("Green");
            const businessManager = new BusinessHQ(interaction, bussIDENT);
            const busName = await businessManager.getName();

            await businessManager.dissolve();

            resultEmbed.setDescription(`Successfully removed ${busName}.`)

            await interaction.editReply({ embeds: [resultEmbed] });
        } catch (err) {
            console.log(err);
            return await ErrorEmbed(interaction, err.message, false, false);
        }

    }
};