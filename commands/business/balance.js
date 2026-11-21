const getActiveEntity = require("../../DRY/getActiveEntity");
const { ErrorEmbed } = require("../../utils/embedUtil");
const { PermManager, GuildHQ } = require("../../dataCrusher/Headquarters")
const discord = require("discord.js");
module.exports = {
    configure(subcommand) {
        return subcommand
            .setName("balance")
            .setDescription("View the Treasury account balance.")
    },

    async execute(interaction) {
        const [business, busName] = await getActiveEntity.Business(interaction)

        if (business == null) return;

        if (
            (await PermManager.Business.checkPerm(
                business,
                interaction,
                "pos"
            )) === false
        ) {
            return await ErrorEmbed(
                interaction,
                "Insufficient perms. Point of Sale permission level required."
            );
        }
        await interaction.deferReply();
        const guildManager = new GuildHQ(interaction);
        const SusEmebed = new discord.EmbedBuilder()
            .setTitle(`${await business.getName()} Account`)
            .setDescription(
                "The business account currently has a balance of " +
                (await guildManager.formatMoney(await business.getBalance())) +
                "."
            )
            .setColor(discord.Colors["Green"])
            .setTimestamp()
            .setFooter({
                text: `${interaction.guild.name} Economy System`,
                iconURL: interaction.guild.iconURL(),
            });
        return interaction.editReply({ embeds: [SusEmebed] });
    }
};