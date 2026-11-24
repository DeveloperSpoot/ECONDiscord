const { ErrorEmbed } = require("../../../utils/embedUtil");
const discord = require("discord.js");
const { PermManager, UpdateData, GuildHQ } = require("../../../dataCrusher/Headquarters");

module.exports = {
    configure(subcommand) {
        return subcommand
            .setName('starting-balance')
            .setDescription('The balance all newly registered plays shall receive.')
            .addNumberOption(option =>
                option
                    .setName('amount')
                    .setRequired(true)
                    .setDescription('The amount you would like to set the starting balance to.'))
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

        await interaction.deferReply();
        const amount = interaction.options.getNumber('amount');
        await UpdateData.treasuryStartingBalance(interaction.IDENT, amount).catch((error) => {
            console.log(error);
            return ErrorEmbed(interaction, "Error creating business! " + error.message);
        });

        const SusEmebed = new discord.EmbedBuilder()
            .setTitle(`Updated Starting Balance`,)
            .setColor(discord.Colors['Green'])
            .setTimestamp()
            .setFooter({
                text: `${interaction.guild.name} Economy System`, iconURL: interaction.guild.iconURL(),
            })
            .setDescription(`The starting balance for all newly registered users has been set to ${await guildManager.formatMoney(amount)}`)
        return interaction.editReply({ embeds: [SusEmebed] });

    }
};