const { ErrorEmbed } = require("../../../utils/embedUtil");
const {
    PermManager,
    UserHQ,
    GuildHQ
} = require("../../../dataCrusher/Headquarters");
const discord = require("discord.js");
const getActiveEntity = require("../../../DRY/getActiveEntity");

module.exports = {
    configure(subcommand) {
        return subcommand
            .setName("member")
            .setDescription("Pay a member using the department funds.")
            .addUserOption((option) =>
                option
                    .setName("user")
                    .setRequired(true)
                    .setDescription("The user you wish to pay.")
            )
            .addNumberOption((option) =>
                option
                    .setName("amount")
                    .setDescription("The amount you wish to payout.")
                    .setRequired(true)
            )
    },

    async execute(interaction) {

        const [Department, depName] = await getActiveEntity.Department(interaction)

        if (Department == null) return;

        if (
            (await PermManager.Department.checkPerm(
                interaction,
                Department,
                "Payroll-Management"
            )) === false
        ) {
            return await ErrorEmbed(
                interaction,
                "Insufficient perms. Department-Management permission level required."
            );
        }

        const guildManager = new GuildHQ(interaction);

        await interaction.deferReply();
        if (
            Number(await Department.getBalance()) -
            Number(interaction.options.getNumber("amount")) <
            0
        ) {
            const DeclineEmebed = new discord.EmbedBuilder()
                .setTitle(`Unable To Payout`)
                .setColor(discord.Colors["Red"])
                .setTimestamp()
                .setFooter({
                    text: `${interaction.guild.name} Economy System`,
                    iconURL: interaction.guild.iconURL(),
                })
                .setDescription(
                    "Unable to payout. Insufficient funds from the Department."
                );
            return interaction.editReply({ embeds: [DeclineEmebed] });
        }
        const user = await new UserHQ(
            interaction,
            interaction.options.getUser("user").id
        );
        await Department.payMember(
            user,
            interaction.options.getNumber("amount")
        ).catch(async (err) => {
            console.error(err);
            return await ErrorEmbed(
                interaction,
                `An error occurred: ${err.message}`,
                false,
                true
            );
        });
        const Emebed = new discord.EmbedBuilder()
            .setTitle(`Department Payout Completed.`)
            .setColor(discord.Colors["Green"])
            .setTimestamp()
            .setFooter({
                text: `${interaction.guild.name} Economy System`,
                iconURL: interaction.guild.iconURL(),
            })
            .setDescription(
                `**${interaction.options.getUser(
                    "user"
                )}** has been paid ${await guildManager.formatMoney(
                    interaction.options.getNumber("amount")
                )} using Department funds.`
            );
        interaction.editReply({ embeds: [Emebed] });
    }
};