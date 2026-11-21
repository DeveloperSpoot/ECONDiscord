const getActiveEntity = require("../../../DRY/getActiveEntity");
const { ErrorEmbed } = require("../../../utils/embedUtil");
const { PermManager, CreateData, UpdateData, UserHQ, GuildHQ, NotificationHQ } = require("../../../dataCrusher/Headquarters.js");
const discord = require("discord.js");
module.exports = {
    configure(subcommand) {
        return subcommand
            .setName("withdraw")
            .setDescription("Withdraws the requested amount to the owner.")
            .addNumberOption((op) =>
                op
                    .setName("amount")
                    .setDescription("The amount you wish to withdraw.")
                    .setRequired(true)
            )
    },

    async execute(interaction) {

        const { business } = await getActiveEntity.Business(interaction)

        if (business == null) return;

        if (
            (await PermManager.Business.checkPerm(
                business,
                interaction,
                "owner"
            )) === false
        ) {
            return await ErrorEmbed(
                interaction,
                "Insufficient use. Owner permission level required."
            );
        }

        const guildManager = new GuildHQ(interaction);


        await interaction.deferReply();

        const amount = interaction.options.getNumber("amount");

        if ((await business.getBalance()) - amount < 0) {
            return await ErrorEmbed(
                interaction,
                `Insufficient funds. Unable to withdraw ${await guildManager.formatMoney(
                    amount
                )}.`
            );
        }

        const owner = await new UserHQ(interaction, interaction.user.id);
        const ownerAcc = await owner.getBasicAccounts();

        await UpdateData.accountBalance(
            interaction,
            ownerAcc.wallet.IDENT,
            business.IDENT,
            amount
        ).catch((err) => {
            return ErrorEmbed(interaction, err.message);
        });
        
        const Transaction = await CreateData.basicTransaction(
            interaction,
            ownerAcc.wallet.IDENT,
            business.IDENT,
            amount,
            "BUSINESS OWNER WITHDRAW"
        ).catch((err) => {
            return ErrorEmbed(interaction, err.message);
        });

        if (Transaction.amount >= 5000) {
            await NotificationHQ.flagNotification(interaction, Transaction);
        }

        const SusEmebed = new discord.EmbedBuilder()
            .setTitle(`Business Owner Withdraw Successful`)
            .setColor(discord.Colors["Green"])
            .setTimestamp()
            .setFooter({
                text: `${interaction.guild.name} Economy System`,
                iconURL: interaction.guild.iconURL(),
            })
            .setDescription(
                `${await guildManager.formatMoney(
                    amount
                )} has been withdrawn and deposited into your account.`
            );
        return interaction.editReply({ embeds: [SusEmebed] });
    }
};