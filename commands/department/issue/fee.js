const {
    Interaction,
    EmbedBuilder,
    SlashCommandBuilder,
    Colors,
    SelectMenuBuilder,
    ActionRowBuilder,
    ComponentType,
    ButtonBuilder,
    ButtonStyle,
    AttachmentBuilder,
    PermissionsBitField, MessageFlags
} = require("discord.js");
const { ErrorEmbed, SimpleEmbed } = require("../../../utils/embedUtil");
const { activeDepartment } =
    require("../../../dataCrusher/Headquarters").CacheManager;
const {
    RetrieveData,
    DepartmentHQ,
    PermManager,
    UserHQ,
    UpdateData,
    BusinessHQ,
    CreateData,
    NotificationHQ,
    GuildHQ,
} = require("../../../dataCrusher/Headquarters");
const discord = require("discord.js");
const { csvGenerator } = require("../../../utils/csvGenerator");
const getActiveEntity = require("../../../DRY/getActiveEntity");
module.exports = {
    configure(subcommand) {
        return subcommand
            .setName("fee")
            .setDescription(
                "Issue a fee to a user, which is to be paid upon being issued."
            )
            .addUserOption((userOp) =>
                userOp
                    .setName("user")
                    .setDescription("The user you wish to issue the fee to.")
                    .setRequired(true)
            )
            .addStringOption((stringOp) =>
                stringOp
                    .setName("reason")
                    .setDescription("The Roleplay character of the user.")
                    .setRequired(true)
            )
            .addNumberOption((numberOp) =>
                numberOp
                    .setName("amount")
                    .setDescription("The amount of the fee you wish to issue.")
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
                "Submit-Citations"
            )) === false
        ) {
            return await ErrorEmbed(
                interaction,
                "Insufficient perms. Submit-Fines permission level required."
            );
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const guildManager = new GuildHQ(interaction)

        const Member = interaction.options.getUser("user");
        const amount = interaction.options.getNumber("amount");
        const reason = interaction.options.getString("reason");

        const TS = new Date().getMilliseconds();
        const client = await new UserHQ(interaction, Member.id);
        const issuer = await new UserHQ(interaction, interaction.user.id);
        await issuer.getIDENT();
        await client.getIDENT();
        const Fee = { reason, client, issuer, amount };

        let customerDMEmbed = await SimpleEmbed(
            interaction,
            "Please Confirm This Transaction",
            `**${await Department.getName()}** is issuing you a fee! Select an action below!`,
            "Orange",
            [
                ["Reason", reason],
                ["Amount", await guildManager.formatMoney(amount)],
                ["Issuer", `${Member}`],
            ]
        );

        const confirmRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`wallet${TS}`)
                .setLabel("Pay With Wallet")
                .setStyle(ButtonStyle.Success)
                .setEmoji("💵"),
            new ButtonBuilder()
                .setCustomId(`bank${TS}`)
                .setLabel("Pay With Bank")
                .setStyle(ButtonStyle.Success)
                .setEmoji("🏦"),
            new ButtonBuilder()
                .setCustomId(`cancel${TS}`)
                .setLabel(`Decline To Pay`)
                .setEmoji("🛑")
                .setStyle(ButtonStyle.Danger)
        );

        const buttonFilter = (i) =>
            i.customId === `bank${TS}` ||
            i.customId === `wallet${TS}` ||
            i.customId === `cancel${TS}`;

        const awaitEmbed = new EmbedBuilder()
            .setTitle("Awaiting Response From User")
            .setDescription(
                "Waiting for the user to decide the payment method."
            )
            .setColor("Orange")
            .setTimestamp();

        const customerMessage = await Member.send({
            embeds: [customerDMEmbed],
            components: [confirmRow],
        }).catch((error) => {
            interaction.editReply({ content: error.message });
        });

        await interaction.editReply({ embeds: [awaitEmbed] });

        const DMCollector =
            customerMessage.channel.createMessageComponentCollector({
                buttonFilter,
                time: 60000,
            });

        DMCollector.on("collect", async (i) => {
            const customerAccounts = await client.getBasicAccounts();

            switch (i.customId) {
                case `bank${TS}`:
                    {
                        if (
                            Number(customerAccounts.bank.balance) - Number(Fee.amount) <
                            0
                        ) {
                            customerDMEmbed = await SimpleEmbed(
                                interaction,
                                "Transaction Declined",
                                `Insufficient Funds`,
                                "Red",
                                null
                            );
                            i.update({ components: [], embeds: [customerDMEmbed] });
                            interaction.editReply({ embeds: [customerDMEmbed] });
                            return;
                        }
                        await Department.issueFee(Fee, customerAccounts.bank);

                        customerDMEmbed = await SimpleEmbed(
                            interaction,
                            "Transaction Completed",
                            ` Receipt from **${await Department.getName()}**`,
                            "Purple",
                            [
                                ["Reason", `Fee for ${reason}`],
                                ["Amount", await guildManager.formatMoney(amount)],
                                ["Issuer", `${Member}`],
                            ]
                        );
                        i.update({ components: [], embeds: [customerDMEmbed] });
                        interaction.editReply({ embeds: [customerDMEmbed] });
                    }
                    break;
                case `wallet${TS}`:
                    {
                        if (
                            Number(customerAccounts.wallet.balance) -
                            Number(Fee.amount) <
                            0
                        ) {
                            customerDMEmbed = await SimpleEmbed(
                                interaction,
                                "Transaction Declined",
                                `Insufficient Funds`,
                                "Red",
                                null
                            );
                            i.update({ components: [], embeds: [customerDMEmbed] });
                            interaction.editReply({ embeds: [customerDMEmbed] });
                            return;
                        }
                        await Department.issueFee(Fee, customerAccounts.wallet);

                        customerDMEmbed = await SimpleEmbed(
                            interaction,
                            "Transaction Completed",
                            ` Receipt from **${await Department.getName()}**`,
                            "Purple",
                            [
                                ["Reason", `Fee for ${reason}`],
                                ["Amount", await guildManager.formatMoney(amount)],
                                ["Issuer", `${Member}`],
                            ]
                        );
                        i.update({ components: [], embeds: [customerDMEmbed] });
                        interaction.editReply({ embeds: [customerDMEmbed] });
                    }
                    break;
                case `cancel${TS}`:
                    {
                        customerDMEmbed = await SimpleEmbed(
                            interaction,
                            "Transaction Declined",
                            `Declined the pay the fee from **${await Department.getName()}**`,
                            "Red",
                            [
                                ["Reason", `Fee for ${reason}`],
                                ["Amount", await guildManager.formatMoney(amount)],
                                ["Issuer", `${Member}`],
                            ]
                        );
                        i.update({ components: [], embeds: [customerDMEmbed] });
                        interaction.editReply({ embeds: [customerDMEmbed] });
                    }
                    break;
            }
        });
    }
};