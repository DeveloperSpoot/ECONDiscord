const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { ErrorEmbed } = require('../utils/embedUtil');
const { PermManager } = require('../dataCrusher/Headquarters');
const SQL = require('../dataCrusher/Server');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setforexchannel')
        .setDescription('Configure the channel that receives daily FOREX rate updates vs Valaria (vollars).')
        .addSubcommand(sub =>
            sub.setName('set')
                .setDescription('Set the channel for daily FOREX updates.')
                .addChannelOption(opt =>
                    opt.setName('channel')
                        .setDescription('Channel to post daily FOREX updates in.')
                        .setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('remove')
                .setDescription('Stop posting daily FOREX updates.')),

    async execute(interaction) {
        await interaction.deferReply();

        const auth = await PermManager.Treasury.checkAuthorization(interaction, interaction.user);
        if (!auth) {
            return ErrorEmbed(interaction, 'You are not authorized to manage server settings.');
        }

        const sub = interaction.options.getSubcommand();
        const guildId = interaction.IDENT;

        if (sub === 'set') {
            const channel = interaction.options.getChannel('channel');

            const perms = channel.permissionsFor(interaction.client.user);
            if (!perms?.has(PermissionFlagsBits.SendMessages) || !perms?.has(PermissionFlagsBits.EmbedLinks)) {
                return interaction.editReply({
                    embeds: [new EmbedBuilder().setColor('Red').setDescription(
                        `I don't have permission to send messages or embeds in <#${channel.id}>. Please adjust the channel permissions and try again.`
                    )]
                });
            }

            await SQL.models.Guilds.update(
                { forexUpdateChannel: channel.id },
                { where: { IDENT: guildId } }
            );

            return interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setColor('Green')
                    .setTitle('FOREX Update Channel Set')
                    .setDescription(`Daily exchange rate updates vs **Valaria** (vollars) will be posted to <#${channel.id}> at midnight UTC.`)
                    .addFields({ name: 'Posts', value: 'New message each day — never edits or deletes prior messages.', inline: false })
                    .setTimestamp()]
            });
        }

        if (sub === 'remove') {
            await SQL.models.Guilds.update(
                { forexUpdateChannel: null },
                { where: { IDENT: guildId } }
            );

            return interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setColor('Orange')
                    .setTitle('FOREX Update Channel Removed')
                    .setDescription('Daily FOREX updates have been disabled for this server.')
                    .setTimestamp()]
            });
        }
    }
};
