const { RetrieveData, CreateData, UpdateData, BusinessHQ } = require("../../../dataCrusher/Headquarters.js");
const {
    ActionRowBuilder,
    SelectMenuBuilder,
    Interaction,
    SlashCommandBuilder,
    ComponentType, EmbedBuilder, AttachmentBuilder,
    PermissionsBitField, MessageFlags
} = require("discord.js");
const { SimpleEmbed, ErrorEmbed } = require("../../../utils/embedUtil");
const discord = require("discord.js");
const { PermManager, DepartmentHQ, NotificationHQ, UserHQ, GuildHQ, EntanglementDrive } = require("../../../dataCrusher/Headquarters");
const { csvGenerator } = require("../../../utils/csvGenerator");
const { activeCleanUp } = require("../../../dataCrusher/Headquarters").CacheManager;


module.exports = {
    configure(subcommand) {
        return subcommand
            .setName('temp')
            .setDescription('temp desc');
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
    }
};