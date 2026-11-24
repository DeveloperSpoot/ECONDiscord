const {
    EmbedBuilder
} = require("discord.js");
const { ErrorEmbed } = require("../../../utils/embedUtil");
const { PermManager, EntanglementDrive } = require("../../../dataCrusher/Headquarters");

module.exports = {
    configure(subcommand) {
        return subcommand
            .setName("disengage")
            .setDescription("Sever entanglement with all servers. This Restores The Treasury And Economy For This Server.")
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

        let ETG = new EntanglementDrive(interaction);
        
        await interaction.deferReply();

        try {
            await ETG.disengage();
            const susEmbed = new EmbedBuilder()
                .setColor("Green")
                .setTitle("Disengaged Entanglement")
                .setDescription("This Server Has Disengaged From All Entanglements. This Server Is Now Operating On It's Own Treasury and Economy.\n\n 🟢 ECON Logging Is Now Available For The Server.")
            interaction.editReply({ embeds: [susEmbed] });
        } catch (err) {
            console.log(err);
            await ErrorEmbed(interaction, `Disengagement Failed: ${err.message}`)
        }

    }
};