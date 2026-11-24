const {
    EmbedBuilder
} = require("discord.js");
const { ErrorEmbed } = require("../../utils/embedUtil");
const { RetrieveData, UpdateData, PermManager } = require("../../dataCrusher/Headquarters");

module.exports = {
    configure(subcommand) {
        return subcommand
            .setName('dismiss-fine')
            .setDescription('Dismiss/remove a fine.')
            .addStringOption(citationRecord =>
                citationRecord.setName('fine')
                    .setDescription('Search fine by character.')
                    .setAutocomplete(true)
                    .setRequired(true))
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
            case 'fine': {
                const choices = await Treasury.getCitations({ raw: true });
                if (choices.length === 0) {
                    return await interaction.respond([{
                        name: "Error, there are no active (unpaid) fines.",
                        value: "Error"
                    }]);
                }

                const filtered = choices.filter(choice => {
                    return choice.character.toLowerCase().startsWith(focusedOption.value.toLowerCase())
                });

                await interaction.respond(
                    filtered.map(choice => ({ name: `${choice.character} | ${choice.cadRecordID} | ${(choice.amount)}`, value: choice.IDENT })),
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
        
        const citation = interaction.options.getString('fine');

        await interaction.deferReply();

        await UpdateData.removeCitation(interaction, citation).catch(err => {
            return ErrorEmbed(interaction, err.message, false, true);
        })

        const susEmbed = new EmbedBuilder()
            .setColor("Green")
            .setTitle(`\\✅ Successfully dismissed fine.`)
            .setTimestamp()
            .setFooter({
                text: `${interaction.guild.name} Economy System`, iconURL: interaction.guild.iconURL(),
            });

        interaction.editReply({ embeds: [susEmbed] })
    }
};