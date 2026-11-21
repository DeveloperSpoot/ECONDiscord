const getActiveEntity = require("../../../DRY/getActiveEntity");
const { ErrorEmbed, SimpleEmbed } = require("../../../utils/embedUtil");
const {RetrieveData, PermManager, CreateData, UpdateData, UserHQ, GuildHQ, RevenueService } = require("../../../dataCrusher/Headquarters.js");
const {
    ActionRowBuilder,
    ButtonStyle,
    ButtonBuilder, MessageFlags
} = require("discord.js");

module.exports = {
    configure(subcommand) {
        return subcommand
            .setName("sell-item")
            .setDescription(
                "Sell an item out of business inventory using this command."
            )
            .addUserOption((option) =>
                option
                    .setName("member")
                    .setDescription("The member you are selling to.")
                    .setRequired(true)
            )
            .addStringOption((option) =>
                option
                    .setName("item")
                    .setDescription("The item you are selling.")
                    .setAutocomplete(true)
                    .setRequired(true)
            )
            .addNumberOption((option) =>
                option
                    .setName("quantity")
                    .setDescription("How many are you selling?")
                    .setRequired(false)
            )
            .addNumberOption((option) =>
                option
                    .setName("price-override")
                    .setDescription("The price you would like to see the item for.")
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

        const { business } = await getActiveEntity.Business(interaction)

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

        const TS = new Date().getMilliseconds();
        const items = await business.getAllItems();
        const selectedItem = items.filter((i) => {
            return i.IDENT == interaction.options.getString("item");
        })[0];

        const customer = interaction.options.getMember("member");
        let quantity = interaction.options.getNumber("quantity") || 1;
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const busName = await business.getName();
        const priceOverride =
            interaction.options.getNumber("price-override") || null;

        const customerUser = new UserHQ(interaction, customer.id);
        const customerHasItemAlready = await customerUser.findItemInInventory(
            selectedItem.IDENT
        );

        if (selectedItem.ownMultiple === false && customerHasItemAlready) {
            return ErrorEmbed(
                interaction,
                "This member already owns this item and cannot purchase it again due to the item's ownMultiple setting being set to false."
            );
        }

        if (selectedItem.ownMultiple === false && quantity > 1) {
            return ErrorEmbed(
                interaction,
                "This item can only be sold once per member. Ensure that the quantity is set to 1."
            );
        }

        if (
            priceOverride !== null &&
            (await PermManager.Business.checkPerm(
                business,
                interaction,
                "lead"
            )) === false
        ) {
            return await ErrorEmbed(
                interaction,
                "Insufficient perms. Lead permission level required for price override."
            );
        }

        if (priceOverride !== null) {
            selectedItem.price = priceOverride;
        }

        let TotalPrice = await (selectedItem.price * quantity);

        const revenueService = new RevenueService(interaction);
        let priceAT = await revenueService.calculateSalesTax(
            selectedItem.price
        );
        priceAT.total = priceAT.total * quantity;
        priceAT.tax = priceAT.tax * quantity;

        console.log(priceAT.total, priceAT.tax, selectedItem.price);
        //Send member a DM showing item, quantity, and total. Ask if they want to use bank or wallet to pay. They will also have option to decline. If DMs are off, send via ephemeral tag like in ATM command.
        let customerDMEmbed = await SimpleEmbed(
            interaction,
            "Please Confirm This Transaction",
            `**${busName}** is trying to sell you something! Select an action below!`,
            "Purple",
            [
                ["Item Name", selectedItem.name],
                ["Quantity", quantity],
                [
                    "Total With Tax",
                    `${await guildManager.formatMoney(
                        priceAT.total
                    )} (Tax: ${await guildManager.formatMoney(priceAT.tax)})`,
                ],
            ]
        );

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

        const buttonFilter = (i) =>
            i.customId === `bank${TS}` ||
            i.customId === `wallet${TS}` ||
            i.customId === `cancel${TS}`;

        const customerMessage = await customer
            .send({ embeds: [customerDMEmbed], components: [confirmRow] })
            .catch((error) => {
                interaction.editReply({ content: error.message });
            });

        const DMCollector =
            customerMessage.channel.createMessageComponentCollector({
                buttonFilter,
                time: 60000,
            });

        DMCollector.on("collect", async (i) => {
            const Customer = new UserHQ(interaction, customer.id);
            const customerAccounts = await Customer.getBasicAccounts();
            const Employee = await RetrieveData.user(
                interaction,
                interaction.user.id
            );
            switch (i.customId) {
                case `bank${TS}`:
                    {
                        customerDMEmbed = await SimpleEmbed(
                            interaction,
                            "Transaction Completed",
                            ` Receipt from **${busName}**`,
                            "Purple",
                            [
                                ["Item Name", selectedItem.name],
                                ["Description", selectedItem.description],
                                ["Quantity", quantity],
                                [
                                    "Total With Tax",
                                    `${await guildManager.formatMoney(
                                        priceAT.total
                                    )} (Tax: ${priceAT.tax})`,
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
                                "The transaction was aborted due to insufficient funds."
                            );
                            customerDMEmbed.setColor("Red");
                            i.update({ components: [], embeds: [customerDMEmbed] });
                            interaction.editReply({ embeds: [customerDMEmbed] });
                            return;
                        }

                        const bTransAct = await CreateData.basicTransaction(
                            interaction,
                            customerAccounts.bank.IDENT,
                            business.IDENT,
                            TotalPrice
                        );
                        const saleRecord = await CreateData.sellRecord(
                            interaction,
                            bTransAct.IDENT,
                            quantity,
                            TotalPrice,
                            business.IDENT,
                            Employee.IDENT
                        );

                        await revenueService.fileSalesTax(priceAT.tax, business);

                        await Customer.addItemToInventory(
                            selectedItem.IDENT,
                            saleRecord.IDENT,
                            quantity,
                            TotalPrice
                        ).catch((err) => console.log(err));
                        i.update({ components: [], embeds: [customerDMEmbed] });
                        interaction.editReply({ embeds: [customerDMEmbed] });
                    }
                    break;
                case `wallet${TS}`:
                    {
                        customerDMEmbed = await SimpleEmbed(
                            interaction,
                            "Transaction Completed",
                            ` Receipt from **${busName}**`,
                            "Purple",
                            [
                                ["Item Name", selectedItem.name],
                                ["Quantity", quantity],
                                [
                                    "Total With Tax",
                                    `${await guildManager.formatMoney(
                                        priceAT.total
                                    )} (Tax: ${priceAT.total})`,
                                ],
                            ]
                        );
                        const transactionStatus = await UpdateData.accountBalance(
                            interaction,
                            business.IDENT,
                            customerAccounts.wallet.IDENT,
                            priceAT.total
                        );

                        if (transactionStatus === "Insufficient Funds") {
                            customerDMEmbed.setTitle("TRANSACTION ABORTED");
                            customerDMEmbed.setDescription(
                                "The transaction was aborted due to insufficient funds."
                            );
                            customerDMEmbed.setColor("Red");
                            i.update({ components: [], embeds: [customerDMEmbed] });
                            interaction.editReply({ embeds: [customerDMEmbed] });
                            return;
                        }
                        const bTransAct = await CreateData.basicTransaction(
                            interaction,
                            customerAccounts.wallet.IDENT,
                            business.IDENT,
                            TotalPrice
                        );
                        const saleRecord = await CreateData.sellRecord(
                            interaction,
                            bTransAct.IDENT,
                            quantity,
                            TotalPrice,
                            business.IDENT,
                            Employee.IDENT
                        );

                        await revenueService.fileSalesTax(priceAT.tax, business);

                        await Customer.addItemToInventory(
                            selectedItem.IDENT,
                            saleRecord.IDENT,
                            quantity,
                            TotalPrice
                        ).catch((err) => console.log(err));
                        i.update({ components: [], embeds: [customerDMEmbed] });
                        interaction.editReply({ embeds: [customerDMEmbed] });
                    }
                    break;
                case `cancel${TS}`:
                    {
                        customerDMEmbed = await SimpleEmbed(
                            interaction,
                            "Transaction Declined",
                            `Declined the purchase from **${busName}**`,
                            "Red",
                            [
                                ["Item Name", selectedItem.name],
                                ["Quantity", quantity],
                                [
                                    "Total",
                                    `${await guildManager.formatMoney(priceAT.total)}`,
                                ],
                            ]
                        );
                        interaction.editReply({ embeds: [customerDMEmbed] });
                        i.update({ components: [], embeds: [customerDMEmbed] });
                    }
                    break;
            }
        });
    }
};