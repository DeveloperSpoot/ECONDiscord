const getActiveEntity = require("../../../DRY/getActiveEntity");
const { ErrorEmbed } = require("../../../utils/embedUtil");
const { PermManager, CreateData, UpdateData, UserHQ, GuildHQ, NotificationHQ } = require("../../../dataCrusher/Headquarters.js");

module.exports = {
    configure(subcommand) {
        return subcommand
            .setName("deposit")
            .setDescription("Deposits the requested amount to the business.")
            .addNumberOption((op) =>
              op
                .setName("amount")
                .setDescription("The amount you wish to deposit.")
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
        const owner = await new UserHQ(interaction, interaction.user.id);
        const ownerAcc = await owner.getBasicAccounts();
        if (ownerAcc.wallet.balance - amount < 0) {
            return await ErrorEmbed(
                interaction,
                `Insufficient funds. Unable to deposit ${await guildManager.formatMoney(
                    amount
                )}.`
            );
        }

        await UpdateData.accountBalance(
            interaction,
            business.IDENT,
            ownerAcc.wallet.IDENT,
            amount
        ).catch((err) => {
            return ErrorEmbed(interaction, err.message);
        });
        const Transaction = await CreateData.basicTransaction(
            interaction,
            business.IDENT,
            ownerAcc.wallet.IDENT,
            amount,
            "BUSINESS OWNER DEPOSIT"
        ).catch((err) => {
            return ErrorEmbed(interaction, err.message);
        });

        if (Transaction.amount >= 5000) {
            await NotificationHQ.flagNotification(interaction, Transaction);
        }

        const SusEmebed = new discord.EmbedBuilder()
            .setTitle(`Business Owner Deposit Successful`)
            .setColor(discord.Colors["Green"])
            .setTimestamp()
            .setFooter({
                text: `${interaction.guild.name} Economy System`,
                iconURL: interaction.guild.iconURL(),
            })
            .setDescription(
                `${await guildManager.formatMoney(
                    amount
                )} has been deposited into the business.`
            );
        return interaction.editReply({ embeds: [SusEmebed] });
    }
};