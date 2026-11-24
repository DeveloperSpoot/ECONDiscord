const {
    EmbedBuilder
} = require("discord.js");
const { ErrorEmbed } = require("../../../utils/embedUtil");
const { PermManager, DepartmentHQ, RetrieveData } = require("../../../dataCrusher/Headquarters");

module.exports = {
    configure(subcommand) {
        return subcommand
            .setName("remove")
            .setDescription("Remove a department from the database.")
            .addStringOption(option =>
                option
                    .setName('department')
                    .setRequired(true)
                    .setDescription('The department you wish to remove.')
                    .setAutocomplete(true))
    },

    async autocomplete(interaction) {
        if (await PermManager.Treasury.checkAuthorization(interaction, interaction.user) == null && interaction.user.id !== interaction.guild.ownerId) {
            return await interaction.respond([{
                name: "Error, You are not authorized manage the Treasury.",
                value: "Error"
            }]);
        }
        const focusedOption = interaction.options.getFocused(true);

        const Treasury = await RetrieveData.treasury(interaction.IDENT, false);

        switch (focusedOption.name) {

            case 'department': {
                const choices = await Treasury.getDepartments({ raw: true });
                if (choices.length === 0) {
                    return await interaction.respond([{
                        name: "Error, no departments exist in this economy.",
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

            const depIDENT = interaction.options.getString("department");
            const depManager = new DepartmentHQ(interaction, depIDENT);
            const depName = await depManager.getName();

            const resultEmbed = new EmbedBuilder()
                .setColor("Green");

            await depManager.dissolve();

            resultEmbed.setDescription(`Sucessfully removed ${depName}.`);

            await interaction.editReply({ embeds: [resultEmbed] });

        } catch (err) {
            console.log(err);

            return await ErrorEmbed(interaction, err.message, false, false)
        }
    }
};