const {
    Interaction,
    EmbedBuilder,
    SlashCommandBuilder,
    Colors,
    SelectMenuBuilder,
    ActionRowBuilder,
    ComponentType,
    ButtonBuilder,
    ButtonStyle,
    AttachmentBuilder,
    PermissionsBitField, MessageFlags
} = require("discord.js");
const { ErrorEmbed, SimpleEmbed } = require("../../../utils/embedUtil");
const { activeDepartment } =
    require("../../../dataCrusher/Headquarters").CacheManager;
const {
    RetrieveData,
    DepartmentHQ,
    PermManager,
    UserHQ,
    UpdateData,
    BusinessHQ,
    CreateData,
    NotificationHQ,
    GuildHQ,
} = require("../../../dataCrusher/Headquarters");
const discord = require("discord.js");
const { csvGenerator } = require("../../../utils/csvGenerator");
const getActiveEntity = require("../../../DRY/getActiveEntity");
module.exports = {
    configure(subcommand) {
        return subcommand
            .setName("fees")
            .setDescription("View (all) department fees issued.")
            .addBooleanOption((viewallOption) =>
                viewallOption
                    .setName("view-all")
                    .setDescription("View all department issued fees?")
            )
    },

    async execute(interaction) {

    }
};