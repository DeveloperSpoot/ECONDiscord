const getActiveEntity = require("../../../DRY/getActiveEntity");
const { ErrorEmbed, SimpleEmbed } = require("../../../utils/embedUtil");
const { RetrieveData, PermManager, CreateData, UpdateData, UserHQ, GuildHQ, RevenueService } = require("../../../dataCrusher/Headquarters.js");

const {
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ButtonStyle,
    ButtonBuilder, EmbedBuilder, MessageFlags
} = require("discord.js");

module.exports = {
    configure(subcommand) {
        return subcommand
            .setName("quick-sell")
            .setDescription("Sell multiple selected items to a user, at once.")
            .addUserOption((option) =>
                option
                    .setName("member")
                    .setDescription("The member you are selling to.")
                    .setRequired(true)
            )
    },
    async execute(interaction) {

        const [ business, busName ] = await getActiveEntity.Business(interaction)

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

        const guildManager = new GuildHQ(interaction);

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const TS = new Date().getMilliseconds();
        const items = await business.getItems(true);

        if (items.length === 0) {
            const qaEmbed = await SimpleEmbed(
                interaction,
                "\\❌ There are no items marked as quick access.",
                null,
                "Red",
                null
            );
            return interaction.editReply({ embeds: [qaEmbed] });
        }

        const selectedQA = new Map();

        const quickMenu = new StringSelectMenuBuilder()
            .setCustomId(`QuickAccess`)
            .setPlaceholder("Select all items.")
            .setMinValues(1)
            .setMaxValues(items.length);

        let quickOptions = [];
        for (const ITEM of items) {
            quickOptions.push({
                label: ITEM.name,
                value: ITEM.IDENT,
            });

            selectedQA.set(ITEM.IDENT, ITEM);
        }

        quickMenu.setOptions(quickOptions);
        const row = new ActionRowBuilder();
        row.addComponents(quickMenu);

        const embed = await SimpleEmbed(
            interaction,
            "Select all items you would like to sell to the user",
            null,
            "Green",
            null
        );

        await interaction.editReply({
            embeds: [embed],
            components: [row],
        });

        const filter = (i) => {
            return i.user.id === interaction.user.id;
        };

        const itemSelection = await interaction.channel.awaitMessageComponent(
            { filter, time: 180000 }
        );

        /*
                  Must use confirmation to update the original interaction reply. Must pass empty arrays for everything orignally passed.
                  Next, get all items selected, each by selectedQA.get(confirmation.value[X])
                  Add up total cost, and create a new sell transaction embed and components reflecting all items.
                  new Businesses method to create sell records for all items sold. One transaction record for the sell.
               */

        const revenueService = new RevenueService(interaction);

        let totalCost = Number(0);
        let itemSummary = `*Transaction from **${busName}**.*\n`;
        let totalTax = Number(0);
        const customerUser = new UserHQ(
            interaction,
            interaction.options.getMember("member").id
        );

        let errored = false;
        for (const itemIDENT of itemSelection.values) {
            const item = await selectedQA.get(itemIDENT);
            const customerHasItemAlready =
                await customerUser.findItemInInventory(itemIDENT);

            if (item.ownMultiple === false && customerHasItemAlready) {
                errored = true;
                return ErrorEmbed(
                    interaction,
                    `This member already owns this item (${item.name}) and cannot purchase it again due to the item's ownMultiple setting being set to false.`
                );
            }
            const priceAT = await revenueService.calculateSalesTax(item.price);

            totalTax = Number(totalTax) + Number(priceAT.tax);
            totalCost = Number(totalCost) + Number(priceAT.total);
            itemSummary =
                itemSummary +
                `\n**${item.name}** • ${await guildManager.formatMoney(
                    item.price
                )} + Sales Tax ${await guildManager.formatMoney(priceAT.tax)}`;
        }

        if (errored) {
            return;
        }

        itemSummary =
            itemSummary +
            `\n**Total Cost:** ${await guildManager.formatMoney(totalCost)}`;

        const saleTransactionEmbed = new EmbedBuilder()
            .setColor("#f78343")
            .setTitle("Quick Sell Transaction")
            .setDescription(itemSummary)
            .addFields(
                {
                    name: "Customer",
                    value: `<@${interaction.options.getMember("member").id}>`,
                    inline: true,
                },
                {
                    name: "Seller",
                    value: `<@${interaction.member.id}>`,
                    inline: true,
                }
            )
            .setTimestamp()
            .setFooter({
                text: `${interaction.guild.name} Economy System`,
                iconURL: interaction.guild.iconURL(),
            });

        const awaitingPaymentEmbed = new EmbedBuilder()
            .setColor("#f78343")
            .setTitle("🟠 Awaiting payment from the Customer...");

        const selectPaymentEmbed = new EmbedBuilder()
            .setColor("#f78343")
            .setDescription(
                `🟠 Please select a payment method. The total cost for this transaction is ${await guildManager.formatMoney(
                    totalCost
                )}.`
            );

        await interaction.editReply({
            embeds: [awaitingPaymentEmbed],
            components: [],
        });

        const confirmRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`wallet${TS}`)
                .setLabel("Wallet")
                .setStyle(ButtonStyle.Success)
                .setEmoji("💵"),
            new ButtonBuilder()
                .setCustomId(`bank${TS}`)
                .setLabel("Bank")
                .setStyle(ButtonStyle.Success)
                .setEmoji("🏦"),
            new ButtonBuilder()
                .setCustomId(`cancel${TS}`)
                .setLabel(`Decline`)
                .setEmoji("🛑")
                .setStyle(ButtonStyle.Danger)
        );

        const customer = await interaction.options.getMember("member");
        await customer.send({
            embeds: [saleTransactionEmbed, selectPaymentEmbed],
            components: [confirmRow],
        });

        const DMfilter = (i) =>
            i.customId === `bank${TS}` ||
            i.customId === `wallet${TS}` ||
            i.customId === `cancel${TS}`;
        const confirmation = await interaction.options
            .getMember("member")
            .dmChannel.awaitMessageComponent({ DMfilter, time: 120000 });

        saleTransactionEmbed.setColor("#e663e1");

        const Customer = new UserHQ(interaction, customer.id);
        const customerAccounts = await Customer.getBasicAccounts();
        const Employee = await RetrieveData.user(
            interaction,
            interaction.user.id
        );

        switch (confirmation.customId) {
            case `cancel${TS}`:
                {
                    saleTransactionEmbed.setColor("#ff3b3b");
                    saleTransactionEmbed.setTitle(
                        "Quick Sale Transaction | Declined"
                    );

                    await confirmation.update({
                        embeds: [saleTransactionEmbed],
                        components: [],
                    });
                    await interaction.editReply({
                        embeds: [saleTransactionEmbed],
                        components: [],
                    });
                }
                break;

            case `bank${TS}`:
                {
                    const transactionStatus = await UpdateData.accountBalance(
                        interaction,
                        business.IDENT,
                        customerAccounts.bank.IDENT,
                        totalCost
                    );

                    if (transactionStatus === "Insufficient Funds") {
                        saleTransactionEmbed.setTitle("TRANSACTION ABORTED");
                        saleTransactionEmbed.setDescription(
                            "The transaction was aborted due to insufficient funds."
                        );
                        saleTransactionEmbed.setColor("Red");
                        confirmation.update({
                            components: [],
                            embeds: [saleTransactionEmbed],
                        });
                        interaction.editReply({ embeds: [saleTransactionEmbed] });
                        return;
                    }
                    const bTransAct = await CreateData.basicTransaction(
                        interaction,
                        customerAccounts.wallet.IDENT,
                        business.IDENT,
                        totalCost,
                        itemSummary
                    );
                    const saleRecord = await CreateData.sellRecord(
                        interaction,
                        bTransAct.IDENT,
                        1,
                        totalCost,
                        business.IDENT,
                        Employee.IDENT
                    );

                    await revenueService.fileSalesTax(totalTax, business);

                    for (const itemIDENT of itemSelection.values) {
                        await Customer.addItemToInventory(
                            itemIDENT,
                            saleRecord.IDENT,
                            1,
                            totalCost
                        ).catch((err) => console.log(err));
                    }

                    await confirmation.update({
                        embeds: [saleTransactionEmbed],
                        components: [],
                    });
                    await interaction.editReply({
                        embeds: [saleTransactionEmbed],
                        components: [],
                    });
                }
                break;

            case `wallet${TS}`:
                {
                    const transactionStatus = await UpdateData.accountBalance(
                        interaction,
                        business.IDENT,
                        customerAccounts.wallet.IDENT,
                        totalCost
                    );

                    if (transactionStatus === "Insufficient Funds") {
                        saleTransactionEmbed.setTitle("TRANSACTION ABORTED");
                        saleTransactionEmbed.setDescription(
                            "The transaction was aborted due to insufficient funds."
                        );
                        saleTransactionEmbed.setColor("Red");
                        confirmation.update({
                            components: [],
                            embeds: [saleTransactionEmbed],
                        });
                        interaction.editReply({ embeds: [saleTransactionEmbed] });
                        return;
                    }
                    const bTransAct = await CreateData.basicTransaction(
                        interaction,
                        customerAccounts.wallet.IDENT,
                        business.IDENT,
                        totalCost,
                        itemSummary
                    );
                    const saleRecord = await CreateData.sellRecord(
                        interaction,
                        bTransAct.IDENT,
                        1,
                        totalCost,
                        business.IDENT,
                        Employee.IDENT
                    );

                    await revenueService.fileSalesTax(totalTax, business);

                    for (const itemIDENT of itemSelection.values) {
                        await Customer.addItemToInventory(
                            itemIDENT,
                            saleRecord.IDENT,
                            1,
                            totalCost
                        ).catch((err) => console.log(err));
                    }

                    await confirmation.update({
                        embeds: [saleTransactionEmbed],
                        components: [],
                    });
                    await interaction.editReply({
                        embeds: [saleTransactionEmbed],
                        components: [],
                    });
                }
                break;
        }
    }
};