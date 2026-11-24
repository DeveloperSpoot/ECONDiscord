const {
    EmbedBuilder, MessageFlags
} = require("discord.js");
const { ErrorEmbed } = require("../../../utils/embedUtil");
const { PermManager, EntanglementDrive } = require("../../../dataCrusher/Headquarters");

module.exports = {
    configure(subcommand) {
        return subcommand
            .setName("add")
            .setDescription("Generates a one-time code to use on the server that is joining.")
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

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        let ETG = new EntanglementDrive(interaction);

        let ETG_Embed = new EmbedBuilder()
            .setColor("Yellow")
            .setTitle("Entnaglement Code")
            .setDescription(`The Following ETG CODE Must Be Entered Into The ETG Join Command On The Other Server: ||${await ETG.generateEntanglementCode()}||\n\n *One-Time Use, Expires In Two Minutes.*`)

        interaction.editReply({ embeds: [ETG_Embed] })

    }
};