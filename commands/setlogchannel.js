const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { ErrorEmbed } = require("../utils/embedUtil");
const { PermManager, GuildHQ } = require("../dataCrusher/Headquarters");
const SQL = require("../dataCrusher/Server");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setlogchannel')
        .setDescription('Set a single channel to receive all transaction and activity logs for this server.')
        .addChannelOption(opt =>
            opt.setName('channel')
                .setDescription('The channel to send all logs to.')
                .setRequired(true)),

    async execute(interaction) {
        await interaction.deferReply();

        const auth = await PermManager.Treasury.checkAuthorization(interaction, interaction.user);
        if (!auth) {
            return ErrorEmbed(interaction, "You are not authorized to manage server settings.");
        }

        const channel = interaction.options.getChannel('channel');
        const guildId = interaction.IDENT;

        // Verify bot can send messages in the channel
        const perms = channel.permissionsFor(interaction.client.user);
        if (!perms?.has(PermissionFlagsBits.SendMessages) || !perms?.has(PermissionFlagsBits.EmbedLinks)) {
            return interaction.editReply({
                embeds: [new EmbedBuilder().setColor("Red").setDescription(`I don't have permission to send messages or embeds in <#${channel.id}>. Please adjust the channel permissions and try again.`)]
            });
        }

        // Set guild-level log channels (covers all transactions)
        await SQL.models.Guilds.update(
            { generalLogChannel: channel.id, activityLogChannel: channel.id },
            { where: { IDENT: guildId } }
        );

        // Clear per-department overrides to prevent duplicate logs
        await SQL.models.Department.update(
            { generalLogChannel: null, activityLogChannel: null },
            { where: { GuildIDENT: guildId } }
        );

        // Clear per-business overrides to prevent duplicate logs
        await SQL.models.Accounts.update(
            { generalLogChannel: null, activityLogChannel: null },
            { where: { guild: guildId, type: 'business' } }
        );

        const embed = new EmbedBuilder()
            .setColor("Green")
            .setTitle("Log Channel Set")
            .setDescription(`All server logs will now be sent to <#${channel.id}>.`)
            .addFields(
                { name: "Covers", value: "All transactions · taxes · salary · purchases · transfers · FOREX · Central Bank · payroll · fines · stipends", inline: false }
            )
            .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
    }
};
