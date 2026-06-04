const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { runForexUpdate } = require('../dataCrusher/services/forexUpdate');

const AUTHORIZED_USER = '896668239977930752';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('forexupdate')
        .setDescription('Force a FOREX rate update to all configured channels immediately.'),

    async execute(interaction) {
        if (interaction.user.id !== AUTHORIZED_USER) {
            return interaction.reply({
                embeds: [new EmbedBuilder().setColor('Red').setDescription('You are not authorized to use this command.')],
                flags: MessageFlags.Ephemeral
            });
        }

        await interaction.deferReply();

        await runForexUpdate(interaction.client);

        return interaction.editReply({
            embeds: [new EmbedBuilder()
                .setColor('Green')
                .setTitle('FOREX Update Dispatched')
                .setDescription('Daily FOREX update has been sent to all configured channels.')
                .setTimestamp()]
        });
    }
};
