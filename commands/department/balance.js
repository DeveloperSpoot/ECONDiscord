
const { ErrorEmbed } = require("../../utils/embedUtil");

const {
    PermManager,
    GuildHQ
} = require("../../dataCrusher/Headquarters");
const discord = require("discord.js");
const getActiveEntity = require("../../DRY/getActiveEntity");

module.exports = {
    configure(subcommand) {
        return subcommand
            .setName("balance")
            .setDescription("View the department's account.")
    },

    async execute(interaction) {
        const [Department, depName] = await getActiveEntity.Department(interaction)

        if (Department == null) return;

        await interaction.deferReply();

        const guildManager = new GuildHQ(interaction)

        if (
            (await PermManager.Department.checkPerm(
                interaction,
                Department,
                "Finance-Management"
            )) === false
        ) {
            return await ErrorEmbed(
                interaction,
                "Insufficient perms. Department-Management permission level required."
            );
        }
        const balance = await Department.getBalance();

        const SusEmebed = new discord.EmbedBuilder()
            .setTitle(`${await Department.getName()} Account`)
            .setDescription(
                "The department's account currently has a balance of " +
                (await guildManager.formatMoney(balance)) +
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