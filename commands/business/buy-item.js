const getActiveEntity = require("../../DRY/getActiveEntity");
const { ErrorEmbed, SimpleEmbed } = require("../../utils/embedUtil");
const { RetrieveData, CreateData, UpdateData, UserHQ, RevenueService } = require("../../dataCrusher/Headquarters.js");
const {PermManager} = require("../../dataCrusher/Headquarters")
module.exports = {
    configure(subcommand) {
        return subcommand
            .setName("buy-item")
            .setDescription(
                "Used by members to buy items from businesses marked as self-served; paid using bank funds."
            )
            .addStringOption((stringOp) =>
                stringOp
                    .setName("item")
                    .setDescription("The Item You Wish To Purchase From The Business.")
                    .setAutocomplete(true)
                    .setRequired(true)
            )
            .addNumberOption((option) =>
                option
                    .setName("quantity")
                    .setDescription("How many of this item are you buying?")
                    .setRequired(false)
            )
    },

    async autocomplete(interaction) {


        const { business } = await getActiveEntity.Business(interaction)

        if (business == null) return;

        const MoneyFormat = new Intl.NumberFormat("en-us");
        const focusedOption = interaction.options.getFocused(true);

        switch (focusedOption.name) {

            case "item":
                {
                    const choices = await business.getAllItems();
                    const filtered = choices.filter((choice) => {
                        return choice.name
                            .toLowerCase()
                            .startsWith(focusedOption.value.toLowerCase());
                    });
                    await interaction.respond(
                        filtered
                            .map((choice) => {
                                if (String(choice.name).length > 25) {
                                    choice.name = String(choice.name).substring(0, 25);
                                }
                                return {
                                    name: `${choice.name} | ${MoneyFormat.format(choice.price)}`,
                                    value: choice.IDENT,
                                };
                            })
                            .slice(0, 20)
                    );
                }
                break;

        }
    },

    async execute(interaction) {
        const [ business, busName ] = await getActiveEntity.Business(interaction)

        if (business == null) return;

        const item = interaction.options.getString("item");
        let quantity = interaction.options.getNumber("quantity") || 1;
        try {
            const isSelfServed = await business.getSelfServedStatus();

            if (!isSelfServed) {
                return ErrorEmbed(
                    interaction,
                    `This business is not self-served. You may not buy items from this business directly, items must be sold to you.`
                );
            }

            await interaction.deferReply();

            const userManager = new UserHQ(interaction, interaction.member.id);
            const userIDENT = await userManager.getIDENT();
            const customerAccounts = await RetrieveData.userBasicAccounts(
                interaction,
                interaction.member
            );
            const busItem = await business.getSpecItem(item);

            const customerUser = new UserHQ(interaction, interaction.member.id);
            const customerHasItemAlready =
                await customerUser.findItemInInventory(busItem.IDENT);

            if (busItem.ownMultiple === false && customerHasItemAlready) {
                return ErrorEmbed(
                    interaction,
                    "You already own this item and cannot purchase it again due to the item's ownMultiple setting being set to false."
                );
            }

            if (busItem.ownMultiple === false && quantity > 1) {
                return ErrorEmbed(interaction, "You can only purchase one of this item because ownMultiple is set to false.");
            }

            let TotalPrice = await (busItem.price * quantity);

            const revenueService = new RevenueService(interaction);
            let priceAT = await revenueService.calculateSalesTax(busItem.price);
            priceAT.total = priceAT.total * quantity;
            priceAT.tax = priceAT.tax * quantity;

            if (customerAccounts.bank.balance < priceAT.total) {
                return ErrorEmbed(
                    interaction,
                    `Insufficient Funds. You do not have enough to purchase these items; ensure you have enough in your bank. Total With Tax: ${await guildManager.formatMoney(
                        priceAT.total
                    )}`
                );
            }

            let customerDMEmbed = await SimpleEmbed(
                interaction,
                "Transaction Completed",
                ` Receipt from **${busName}**`,
                "Purple",
                [
                    ["Item Name", busItem.name],
                    ["Description", busItem.description],
                    ["Quantity", quantity],
                    [
                        "Total With Tax",
                        `${await guildManager.formatMoney(priceAT.total)} (Tax: ${priceAT.tax
                        })`,
                    ],
                ]
            );
            const transactionStatus = await UpdateData.accountBalance(
                interaction,
                business.IDENT,
                customerAccounts.bank.IDENT,
                priceAT.total
            );

            if (transactionStatus === "Insufficient Funds") {
                customerDMEmbed.setTitle("TRANSACTION ABORTED");
                customerDMEmbed.setDescription(
                    "The transaction was aborted due to Insufficient Funds. You do not have enough to purchase these items"
                );
                customerDMEmbed.setColor("Red");

                interaction.editReply({ embeds: [customerDMEmbed] });
                return;
            }
            const bTransAct = await CreateData.basicTransaction(
                interaction,
                customerAccounts.bank.IDENT,
                business.IDENT,
                priceAT.total
            );
            const saleRecord = await CreateData.sellRecord(
                interaction,
                bTransAct.IDENT,
                quantity,
                TotalPrice,
                business.IDENT,
                userIDENT
            );

            await revenueService.fileSalesTax(priceAT.tax, business);

            await userManager
                .addItemToInventory(
                    busItem.IDENT,
                    saleRecord.IDENT,
                    quantity,
                    TotalPrice
                )
                .catch((err) => console.log(err));

            interaction.editReply({ embeds: [customerDMEmbed] });
        } catch (err) {
            console.log(err);
            return await ErrorEmbed(interaction, err.message, false, false);
        }
    }
};