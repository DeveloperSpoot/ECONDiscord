const getActiveEntity = require("../../../DRY/getActiveEntity.js");
const { ErrorEmbed, SimpleEmbed } = require("../../../utils/embedUtil.js");
const { PermManager, UpdateData, UserHQ, RevenueService} = require("../../../dataCrusher/Headquarters.js");
const mathUtils = require('../../../utils/mathUtils.js')
const {
    ActionRowBuilder,
    StringSelectMenuBuilder,
    Interaction,
    SlashCommandBuilder,
    ComponentType,
    ButtonStyle,
    ButtonBuilder, EmbedBuilder, StringSelectMenuOptionBuilder, MessageFlags
} = require("discord.js");
module.exports = {
    configure(subcommand) {
        return subcommand
            .setName("member")
            .setDescription(
                "Pay a member from business funds. Goes to user bank."
            )
            .addUserOption((option) =>
                option
                    .setName("member")
                    .setDescription("The server member you would like to pay.")
                    .setRequired(true)
            )
            .addNumberOption((option) =>
                option
                    .setName("amount")
                    .setDescription("The amount you would like to pay.")
                    .setRequired(true)
            )
            .addStringOption((option) =>
                option
                    .setName("reason")
                    .setDescription("Reason for payment.")
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
                "manager"
            )) === false
        ) {
            return await ErrorEmbed(
                interaction,
                "Insufficient perms. Manager permission level required."
            );
        }

        const member = interaction.options.getMember("member");
        const memberObject = new UserHQ(interaction, member.user.id);
        const memberAccounts = await memberObject.getBasicAccounts();
        const roundedAmt = mathUtils.Round(
            interaction.options.getNumber("amount")
        );

        const revenueService = new RevenueService(interaction);
        const amountAT = await revenueService.calculatePayrollTax(roundedAmt);
        await UpdateData.accountBalance(
            interaction,
            memberAccounts.bank.IDENT,
            business.IDENT,
            roundedAmt
        ).then(async (result) => {
            if (result === "Insufficient Funds") {
                return await ErrorEmbed(
                    interaction,
                    "Insufficient Funds. Transaction Cancelled."
                );
            }

            await revenueService.filePayrollTax(
                amountAT.tax,
                business,
                "Account"
            );
            await CreateData.basicTransaction(
                interaction,
                memberAccounts.bank.IDENT,
                business.IDENT,
                amountAT.total,
                interaction.options.getString("reason")
            );

            const embed = await SimpleEmbed(
                interaction,
                "Payment Complete!",
                `Your payment to ${member.displayName} processed successfully! Tax Paid: ${amountAT.tax}.`,
                "Green",
                null
            );
            interaction.reply({
                content: "",
                embeds: [embed],
                components: [],
            });
        });
    }
};