const { SimpleEmbed, ErrorEmbed } = require("../../../utils/embedUtil");
const { RetrieveData, CreateData, UpdateData, PermManager, NotificationHQ, GuildHQ } = require("../../../dataCrusher/Headquarters");


module.exports = {
    configure(subcommand) {
        return subcommand
            .setName('print')
            .setDescription('Generates money and places it into the treasury general account for distribution.')
            .addNumberOption((option) =>
                option
                    .setName('amount')
                    .setDescription('The amount of money you would like to generate.')
                    .setRequired(true)
            )
            .addStringOption((option) =>
                option
                    .setName('reason')
                    .setDescription('Why are you printing money out of thin air?')
                    .setRequired(true)
            )
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

        const treasury = await RetrieveData.treasury(interaction.IDENT);
        await UpdateData.treasuryBalance(interaction.IDENT, Number(treasury.balance) + interaction.options.getNumber('amount'));
        await CreateData.treasuryPrint(interaction, interaction.options.getNumber('amount'), interaction.options.getString('reason'))
        const embed = await SimpleEmbed(interaction, 'Inflation Successful', 'The balance of the treasury account is now ' + await guildManager.formatMoney(Number(treasury.balance) + Number(interaction.options.getNumber('amount'))), 'Green', null);
        interaction.reply({ embeds: [embed], components: [] });

        await NotificationHQ.inflationNotification(interaction, interaction.options.getNumber('amount'));

    }
};