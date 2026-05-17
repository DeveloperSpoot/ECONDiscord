const {activeBusiness} = require("../dataCrusher/Headquarters").CacheManager;
const {
    ActionRowBuilder,
    StringSelectMenuBuilder,
    Interaction,
    SlashCommandBuilder,
    ComponentType,
    ButtonStyle,
    ButtonBuilder, EmbedBuilder, StringSelectMenuOptionBuilder, MessageFlags
} = require("discord.js");
const {SimpleEmbed, ErrorEmbed, SelectMenu} = require("../utils/embedUtil");
const {RetrieveData, CreateData, UpdateData, RevenueService} = require("../dataCrusher/Headquarters.js");
const mathUtils = require('../utils/mathUtils.js')
const {BusinessHQ, PermManager, UserHQ, NotificationHQ, DepartmentHQ, GuildHQ} = require("../dataCrusher/Headquarters");
const discord = require("discord.js");
const Entanglement = require("../dataCrusher/services/entanglement");
const { paginateUtil2 } = require("../utils/paginateUtil2.js");
const { LogGeneral } = require("../dataCrusher/services/guild");

//OPTIMIZE: Perhaps create a sub-command handler, so you cna split the sub-commands bc this is terrible.
module.exports = {
  data: new SlashCommandBuilder()
    .setName("bus")
    .setDescription("Contains all business management functions.")
    .addSubcommand((subCmd) =>
      subCmd
        .setName("balance")
        .setDescription("View the Treasury account balance.")
    )
    //  Staff Commands
    .addSubcommandGroup((group) =>
      group
        .setName("staff")
        .setDescription("Contains all staff management functions.")

        //  Employee Cmd
        .addSubcommand((subcommand) =>
          subcommand
            .setName("add-employee")
            .setDescription(
              "Add a new employee to your business and set their perms."
            )
            .addUserOption((option) =>
              option
                .setName("user")
                .setDescription("The person you would like to add to the team!")
                .setRequired(true)
            )
        )

        //  Remove Employee
        .addSubcommand((subcommand) =>
          subcommand
            .setName("remove-employee")
            .setDescription("Remove an employee from your business.")
            .addUserOption((option)=> 
            option
                .setName("employee")
                .setDescription("The employee you would like to terminate.")
                .setRequired(true)
            )
        )
    )

    // Point of Sale Commands
    .addSubcommandGroup((group) =>
      group
        .setName("pos")
        .setDescription("Contains all item management functions.")

        //  Add Item
        .addSubcommand((subcommand) =>
          subcommand
            .setName("add-item")
            .setDescription("Add a new item to your business.")
            .addStringOption((option) =>
              option
                .setName("name")
                .setDescription("The name of the item.")
                .setRequired(true)
            )
            .addStringOption((option) =>
              option
                .setName("description")
                .setDescription("The description of the item. Be creative!")
                .setRequired(true)
            )
            .addNumberOption((option) =>
              option
                .setName("price")
                .setDescription("The price of the item. Can include cents.")
                .setRequired(true)
            )
            .addBooleanOption((option) =>
              option
                .setName("own-multiple")
                .setDescription(
                  "If true, the item can be added to the customer's inventory multiple times."
                )
                .setRequired(true)
            )
            .addBooleanOption((option) =>
              option
                .setName("quick-access")
                .setDescription(
                  "If true, the item will be accessible through quick access, allowing the sell multiple items at once."
                )
            )
        )

        //  Remove Item
        .addSubcommand((subcommand) =>
          subcommand
            .setName("remove-item")
            .setDescription("Remove an item from your business.")
            .addStringOption((option) =>
              option
                .setName("item")
                .setDescription("The item you want to delete.")
                .setRequired(true)
                .setAutocomplete(true)
              )
            )
            //  Edit Item

        .addSubcommand((subCmd) =>
          subCmd
            .setName("edit-item")
            .setDescription("Edit an item.")
            .addStringOption((option) =>
              option
                .setName("item")
                .setRequired(true)
                .setDescription("The item you wish to edit.")
                .setAutocomplete(true)
            )
            .addStringOption((option) =>
              option
                .setName("name")
                .setDescription("The name of the item.")
                .setRequired(false)
            )
            .addStringOption((option) =>
              option
                .setName("description")
                .setDescription("The description of the item. Be creative!")
                .setRequired(false)
            )
            .addNumberOption((option) =>
              option
                .setName("price")
                .setDescription("The price of the item. Can include cents.")
                .setRequired(false)
            )
            .addBooleanOption((option) =>
              option
                .setName("own-multiple")
                .setDescription(
                  "If true, the item can be added to the customer's inventory multiple times."
                )
                .setRequired(false)
            )
            .addBooleanOption((option) =>
              option
                .setName("quick-access")
                .setDescription(
                  "Should the item be accessible through quick access, allowing sellers to sell multiple items at once."
                )
                .setRequired(false)
            )
        )
    )


    //  Pay Commands
    .addSubcommandGroup((group) =>
      group
        .setName("pay")
        .setDescription(
          "Transfer money to another entity from business funds. "
        )

        //  Pay Member
        .addSubcommand((subcommand) =>
          subcommand
            .setName("pay-member")
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
        )

        //  Pay Business
        .addSubcommand((subcommand) =>
          subcommand
            .setName("pay-business")
            .setDescription("Pay a business from business funds.")
            .addStringOption((op) =>
              op
                .setName("business")
                .setDescription("The business you want to pay.")
                .setAutocomplete(true)
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
        )

        //  Pay Department
        .addSubcommand((subcommand) =>
          subcommand
            .setName("pay-department")
            .setDescription("Pay another department using department funds.")
            .addStringOption((option) =>
              option
                .setName("department")
                .setDescription("The department you wish to pay.")
                .setAutocomplete(true)
                .setRequired(true)
            )
            .addNumberOption((option) =>
              option
                .setName("amount")
                .setDescription("The amount you wish to payout.")
                .setRequired(true)
            )
        )

        // Withdraw
        .addSubcommand((subcmd) =>
          subcmd
            .setName("withdraw")
            .setDescription("Withdraws the requested amount to the owner.")
            .addNumberOption((op) =>
              op
                .setName("amount")
                .setDescription("The amount you wish to withdraw.")
                .setRequired(true)
            )
        )
            
        //  Deposit
        .addSubcommand((subcmd) =>
          subcmd
            .setName("deposit")
            .setDescription("Deposits the requested amount to the business.")
            .addNumberOption((op) =>
              op
                .setName("amount")
                .setDescription("The amount you wish to deposit.")
                .setRequired(true)
            )
        )
    )
        
    // Sell Commands
    .addSubcommandGroup((group) =>
      group
        .setName("sell")
            .setDescription("Sell items from your business to customers.")
            
        //  Sell Item
        .addSubcommand((command) =>
          command
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
        )
        
        //  Quick Sell Command
        .addSubcommand((command) =>
          command
            .setName("quick-sell")
            .setDescription("Sell multiple selected items to a user, at once.")
            .addUserOption((option) =>
              option
                .setName("member")
                .setDescription("The member you are selling to.")
                .setRequired(true)
            )
        )
    )
    
    // Inflate Prices
    .addSubcommand((subCmd) =>
      subCmd
        .setName("inflate-prices")
        .setDescription(
          "Inflates all prices of items by the inputed percentage."
        )
        .addNumberOption((numOp) =>
          numOp
            .setName("percentage-amount")
            .setDescription(
              "The percetnage of which you want to the prices to be inflated by."
            )
            .setRequired(true)
        )
    )
    
    // Deflate Prices
    .addSubcommand((subCmd) =>
      subCmd
        .setName("deflate-prices")
        .setDescription(
          "Deflates all prices of items by the inputed percentage."
        )
        .addNumberOption((numOp) =>
          numOp
            .setName("percentage-amount")
            .setDescription(
              "The percetnage of which you want to the prices to be deflated by."
            )
            .setRequired(true)
        )
    )
    
    //  Buy Item
    .addSubcommand((subCmd) =>
      subCmd
        .setName("buy-item")
        .setDescription(
          "Used by members to buy items from businesses marked as self-served."
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
    )
    
    //  View Items
    .addSubcommand((subCmd) =>
      subCmd
        .setName("view-items")
        .setDescription("Used by members to view items of a business.")
    ),

    //  AUTOCOMPLETE INTERACTIONS
  async autocomplete(interaction) {
    if (process.env.status === "DEV") {
      await activeBusiness.set(
        `${interaction.IDENT}-${interaction.user.id}`,
        "c67bde70-7bcc-438b-8529-209325770cdd"
      );
      }
    
    
    const activeUSER = await new UserHQ(interaction, interaction.user.id);
    if ((await activeUSER.getBusiness()) == null) {
      return await interaction.respond([
        {
          name: "Error, please set a business first using the set command.",
          value: "Error",
        },
      ]);
    }
    const business = new BusinessHQ(
      interaction,
      await activeBusiness.get(`${interaction.IDENT}-${interaction.user.id}`)
    );
    const guildManager = new GuildHQ(interaction);
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
      case "department": {
        const Treasury = await RetrieveData.treasury(interaction.IDENT, false);
        const choices = await Treasury.getDepartments({ raw: true });
        if (choices.length === 0) {
          return await interaction.respond([
            {
              name: "Error, no departments exist in this economy.",
              value: "Error",
            },
          ]);
        }
        const filtered = choices.filter((choice) => {
          return choice.name
            .toLowerCase()
            .startsWith(focusedOption.value.toLowerCase());
        });
        await interaction.respond(
          filtered.map((choice) => ({ name: choice.name, value: choice.IDENT }))
        );
        break;
      }
      case "business":
        {
          const choices = await RetrieveData.accountsByType(
            interaction,
            "business"
          );
          if (choices.length === 0) {
            return await interaction.respond([
              {
                name: "Error, no businesses exist in this economy.",
                value: "Error",
              },
            ]);
          }
          const filtered = choices.filter((choice) => {
            return choice.name
              .toLowerCase()
              .startsWith(focusedOption.value.toLowerCase());
          });
          await interaction.respond(
            filtered.map((choice) => ({
              name: choice.name,
              value: choice.IDENT,
            }))
          );
        }
        break;
    }
  },

  async execute(interaction) {
    if (!interaction.guild) {
      return await ErrorEmbed(
        interaction,
        "This can only be used in a server!"
      );
    }

    const activeUSER = await new UserHQ(interaction, interaction.user.id);
    if ((await activeUSER.getBusiness()) == null) {
      return await ErrorEmbed(
        interaction,
        "Please select a business first by using /set business!"
      );
    }

    const guildManager = new GuildHQ(interaction);

    const business = new BusinessHQ(
      interaction,
      await activeBusiness.get(`${interaction.IDENT}-${interaction.user.id}`)
    );
    const busName = await business.getName();

    switch (interaction.options.getSubcommand()) {
      case "view-items": {
        await interaction.deferReply();

        const ITEMS = await business.getAllItems();

        const paginatedItems = await paginateUtil2(ITEMS, "IDENT", 10);

        let currentPage = 1;

        const firstDesc = await pageDescription(paginatedItems[currentPage]);

        let pageEmbed = new EmbedBuilder()
          .setTitle(`${busName} Items`)
          .setColor("#fcff63")
          .setFooter({
            text: `Taxes not included • ${currentPage}/${
              paginatedItems.length - 1
            }`,
          })
          .setDescription(firstDesc);

        const next = new ButtonBuilder()
          .setCustomId("next")
          .setLabel("-->")
          .setStyle(ButtonStyle.Secondary);

        const back = new ButtonBuilder()
          .setCustomId("back")
          .setLabel("<--")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true);

        const row = new ActionRowBuilder().addComponents(back, next);

        const respFilter = (i) => i.user.id === interaction.user.id;

        if (currentPage === paginatedItems.length - 1) {
          next.setDisabled(true);
        }

        const buttonCollector =
          interaction.channel.createMessageComponentCollector({
            respFilter,
            time: 1250000,
          });
        await interaction.editReply({ embeds: [pageEmbed], components: [row] });

        async function pageDescription(page) {
          let description = "";

          for (const key of page.keys()) {
            let value = await page.get(key);
            let price = await guildManager.formatMoney(value.price);

            description =
              description +
              `**${value.name}** - ${price}\n *${value.description}*\n\n`;
          }

          return description;
        }

        buttonCollector.on("collect", async (i) => {
          switch (i.customId) {
            case "next": {
              currentPage++;
              let desc = await pageDescription(paginatedItems[currentPage]);

              pageEmbed.setDescription(desc);
              pageEmbed.setFooter({
                text: `Taxes not included • ${currentPage}/${
                  paginatedItems.length - 1
                }`,
              });

              if (currentPage === paginatedItems.length - 1) {
                next.setDisabled(true);
                back.setDisabled(false);
              } else {
                next.setDisabled(false);
                back.setDisabled(false);
              }

              await i.update({ embeds: [pageEmbed], components: [row] });
              break;
            }

            case "back": {
              currentPage--;
              let desc = await pageDescription(paginatedItems[currentPage]);

              pageEmbed.setDescription(desc);
              pageEmbed.setFooter({
                text: `Taxes not included • ${currentPage}/${
                  paginatedItems.length - 1
                }`,
              });

              if (currentPage === 1) {
                back.setDisabled(true);
                next.setDisabled(false);
              } else {
                next.setDisabled(false);
                back.setDisabled(false);
              }

              await i.update({ embeds: [pageEmbed], components: [row] });
              break;
            }
          }
        });

        break;
      }

      case "buy-item":
        {
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

            let TotalPrice = await (busItem.price * quantity);

            const revenueService = new RevenueService(interaction);
            let priceAT = await revenueService.calculateSalesTax(busItem.price);
            priceAT.total = priceAT.total * quantity;
            priceAT.tax = priceAT.tax * quantity;

            if (customerAccounts.bank.balance < priceAT.total) {
              return ErrorEmbed(
                interaction,
                `Insufficient Funds. You do not have enough to purchase these items. Total With Tax: ${await guildManager.formatMoney(
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
                  `${await guildManager.formatMoney(priceAT.total)} (Tax: ${
                    priceAT.tax
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

            await interaction.editReply({ embeds: [customerDMEmbed] });
            await LogGeneral(interaction, 'Green', 'Item Purchase', `<@${interaction.user.id}> purchased an item.`, {name: 'Business', value: busName, inline: true}, {name: 'Item', value: busItem.name, inline: true}, {name: 'Amount', value: await guildManager.formatMoney(priceAT.total), inline: true}).catch(console.error);
          } catch (err) {
            console.log(err);
            return await ErrorEmbed(interaction, err.message, false, false);
          }
        }
        break;

      case "inflate-prices":
        {
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

          let amount = interaction.options.getNumber("percentage-amount");

          try {
            await interaction.deferReply();
            await business.inflatePrices(amount);

            const successEmbed = new EmbedBuilder()
              .setDescription(
                `Successfully inflated item prices by **${amount}%**.`
              )
              .setColor("Green");

            return interaction.editReply({ embeds: [successEmbed] });
          } catch (err) {
            console.log(err);
            return await ErrorEmbed(interaction, err.message, false, false);
          }
        }
        break;

      case "deflate-prices":
        {
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

          let amount = interaction.options.getNumber("percentage-amount");

          try {
            await interaction.deferReply();
            await business.deflatePrices(amount);

            const successEmbed = new EmbedBuilder()
              .setDescription(
                `Successfully deflated item prices by **-${amount}%**.`
              )
              .setColor("Green");

            return interaction.editReply({ embeds: [successEmbed] });
          } catch (err) {
            console.log(err);
            return await ErrorEmbed(interaction, err.message, false, false);
          }
        }
        break;

      case "quick-sell":
        {
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
                await LogGeneral(interaction, 'Green', 'Quick Sale', `<@${interaction.user.id}> sold items to <@${customer.id}>.`, {name: 'Business', value: busName, inline: true}, {name: 'Amount', value: await guildManager.formatMoney(totalCost), inline: true}).catch(console.error);
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
                await LogGeneral(interaction, 'Green', 'Quick Sale', `<@${interaction.user.id}> sold items to <@${customer.id}>.`, {name: 'Business', value: busName, inline: true}, {name: 'Amount', value: await guildManager.formatMoney(totalCost), inline: true}).catch(console.error);
              }
              break;
          }
        }
        break;
      case "edit-item":
        {
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
          await interaction.deferReply();
          const Embed = new EmbedBuilder()
            .setColor("Green")
            .setTimestamp()
            .setFooter({
              text: `${interaction.guild.name} Economy System`,
              iconURL: interaction.guild.iconURL(),
            });

          const Item = interaction.options.getString("item");
          const Name = interaction.options.getString("name");
          const Desc = interaction.options.getString("description");
          const Price = interaction.options.getNumber("price");
          const QuickA = interaction.options.getBoolean("quick-access");
          const Multiple = interaction.options.getBoolean("own-multiple");
          let EmbedDesc = "";

          if (typeof Name !== "undefined" && Name !== null) {
            await business.editItem.name(Item, Name, business).catch((err) => {
              return ErrorEmbed(interaction, err.message, false, true);
            });

            EmbedDesc =
              EmbedDesc +
              "\n Successfully changed the item name to ``" +
              Name +
              "``.";
          }

          if (typeof Desc !== "undefined" && Desc !== null) {
            await business.editItem
              .description(Item, Desc, business)
              .catch((err) => {
                return ErrorEmbed(interaction, err.message, false, true);
              });

            EmbedDesc =
              EmbedDesc +
              "\n Successfully changed the item description to ``" +
              Desc +
              "``.";
          }

          if (typeof Price !== "undefined" && Price !== null) {
            await business.editItem
              .price(Item, Price, business)
              .catch((err) => {
                return ErrorEmbed(interaction, err.message, false, true);
              });

            EmbedDesc =
              EmbedDesc +
              "\n Successfully changed the item price to ``" +
              Price +
              "``.";
          }

          if (typeof Multiple !== "undefined" && Multiple !== null) {
            await business.editItem
              .ownMultiple(Item, Multiple, business)
              .catch((err) => {
                return ErrorEmbed(interaction, err.message, false, true);
              });
            EmbedDesc =
              EmbedDesc +
              "\n Successfully changed the item owm-multiple setting to ``" +
              Multiple +
              "``.";
          }

          if (typeof QuickA !== "undefined" && QuickA !== null) {
            await business.editItem
              .quickAccess(Item, QuickA, business)
              .catch((err) => {
                return ErrorEmbed(interaction, err.message, false, true);
              });
            EmbedDesc =
              EmbedDesc +
              "\n Successfully changed the item quick-access setting to ``" +
              QuickA +
              "``.";
          }

          Embed.setDescription(EmbedDesc);
          return interaction.editReply({ embeds: [Embed] });
        }
        break;
      case "balance":
        {
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
        break;
      case "withdraw":
        {
          if (
            (await PermManager.Business.checkPerm(
              business,
              interaction,
              "owner"
            )) === false
          ) {
            return await ErrorEmbed(
              interaction,
              "Insufficient perms. Only the owner may use this command."
            );
          }
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
        break;
      case "deposit":
        {
          if (
            (await PermManager.Business.checkPerm(
              business,
              interaction,
              "owner"
            )) === false
          ) {
            return await ErrorEmbed(
              interaction,
              "Insufficient perms. Only the owner may use this command."
            );
          }
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
        break;
      case "add-item":
        {
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

          await interaction.deferReply();

          const item = new Map();
          item.set("name", interaction.options.getString("name"));
          item.set("description", interaction.options.getString("description"));
          item.set("price", interaction.options.getNumber("price"));
          item.set(
            "quickAccess",
            interaction.options.getBoolean("quick-access")
          );
          item.set(
            "ownMultiple",
            interaction.options.getBoolean("own-multiple")
          );

          if (String(item.get("name")).length > 25) {
            return await ErrorEmbed(
              interaction,
              "The item name cannot exceed 25 characters. You attempted to use ``" +
                String(item.get("name")).length +
                "`` characters.",
              true,
              false
            );
          }
          await business.addItem(item);
          const embed = await SimpleEmbed(
            interaction,
            "Item Added Successfully!",
            "The item was created successfully! The details are below!",
            "Green",
            item
          );
          await interaction.editReply({
            embeds: [embed],
          });
        }
        break;
      case "remove-item":
        {
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

          await interaction.deferReply();

          try {
            const item = interaction.options.getString("item");
            const busItem = await business.getSpecItem(item);

            const embed = await SimpleEmbed(
              interaction,
              "Successfully deleted item",
              `${busItem.name} has been deleted!`,
              "Green",
              null
            );
            await business.discontinueItem(item);
            interaction.editReply({
              embeds: [embed],
              components: [],
            });
          } catch (err) {
            interaction.editReply({
              content:
                "You did not select an option within the alotted amount of time.",
              components: [],
            });
            console.error(err);
          }

          // const menu = new StringSelectMenuBuilder()
          //     .setCustomId("itemDeletion")
          //     .setPlaceholder("Please choose an item to delete.");
          //
          //
          // const items = await business.getAllItems();
          //
          // const options = [];
          // for (let key in items) {
          //     const data = items[key];
          //     options.push({
          //         label: data.name,
          //         description: data.description,
          //         value: key,
          //     });
          // }
          // if (options.length === 0) {
          //     return interaction.reply("No items exist in this business!");
          // }
          // menu.addOptions(options);
          // const row = new ActionRowBuilder().addComponents(menu);
          // await interaction.reply({
          //     content: "Please choose the item you would like to delete.",
          //     components: [row],
          // });
          //
          // const filter = (i) => {
          //     return i.user.id === interaction.user.id;
          // };
          // await interaction.channel
          //     .awaitMessageComponent({
          //         filter,
          //         componentType: ComponentType.SelectMenu,
          //         time: 60000,
          //     })
          //     .then(async (selection) => {
          //         if (selection.customId === "itemDeletion") {
          //             console.warn(selection);
          //             const embed = await SimpleEmbed(interaction, "Successfully deleted item", `${items[selection.values[0]].name} has been deleted!`, "Green", null);
          //             await business.discontinueItem(items[selection.values[0]].IDENT);
          //             interaction.editReply({
          //                 embeds: [embed],
          //                 components: [],
          //             });
          //         }
          //     })
          //     .catch(e => {
          //         interaction.editReply({
          //             content: 'You did not select an option within the alotted amount of time.',
          //             components: []
          //         })
          //         console.error(e)
          //     })
        }
        break;
      case "add-employee":
        {
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
          const menu = new StringSelectMenuBuilder()
            .setCustomId("permSelector")
            .setPlaceholder(
              "Please choose the permissions you would like to grant to this individual."
            );
          const perms = [
            {
              label: "Admin",
              description: "Has all of the abilities that the owner has.",
              value: "admin",
            },
            {
              label: "Manager",
              description: "Supervisor abilities plus item/staff management.",
              value: "manager",
            },
            {
              label: "Supervisor",
              description: "Lead abilities plus transaction management.",
              value: "supervisor",
            },
            {
              label: "Lead",
              description: "Can provide POS overrides.",
              value: "lead",
            },
            {
              label: "POS Access",
              description: "Can process transactions on the POS.",
              value: "pos",
            },
            {
              label: "View Only Access",
              description: "Can view company ledger and POS records.",
              value: "view-only",
            },
          ];
          menu.addOptions(perms);
          const row = new ActionRowBuilder();
          row.addComponents(menu);
          const embed = await SimpleEmbed(
            interaction,
            "Please select the permission level you would like to grant to " +
              interaction.options.getMember("user").displayName,
            null,
            "Green",
            null
          );
          await interaction.reply({
            embeds: [embed],
            components: [row],
          });
          const filter = (i) => {
            return i.user.id === interaction.user.id;
          };
          await interaction.channel
            .awaitMessageComponent({
              filter,
              componentType: ComponentType.SelectMenu,
              time: 60000,
            })
            .then(async (selection) => {
              if (selection.customId === "permSelector") {
                const perms = new Map();
                perms.set("level", selection.values[0]);
                await business.hireEmployee(
                  interaction.options.getMember("user").user.id,
                  selection.values[0],
                  interaction.options.getMember("user")
                );
                const embed = await SimpleEmbed(
                  interaction,
                  "Employee Added Successfully!",
                  "The employee was added successfully!",
                  "Green",
                  null
                );
                await interaction.editReply({
                  embeds: [embed],
                  components: [],
                });
              }
            })
            .catch((err) => console.log(err));
        }
        break;
      case "remove-employee":
        {
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

          await interaction.deferReply();
          const selectedMember = interaction.options.getUser("employee")

          const employee = await business.getEmployeeByDiscord(selectedMember.id, interaction.guild.id)
          if(employee == null){
             return await ErrorEmbed(
              interaction,
              `Selected member (<@${selectedMember.id}>) is not an employee.`
            );
          }

          if ((await PermManager.Business.compareUsers(business,interaction, selectedMember)) === false) {
            return ErrorEmbed(
              interaction,
              "The user you are attemping to terminate has higher privileges than you."
            );
          }

          const embed = await SimpleEmbed(
            interaction,
            "Successfully deleted employee",
             `${selectedMember.displayName} has been deleted!`,
             "Green",
             null);

          await business.terminateEmployee(
            employee.IDENT,
            selectedMember
          );
          interaction.editReply({
            embeds: [embed],
            components: [],
          });
              
        }
        break;
      case "pay-member":
        {
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
        break;
      case "pay-business":
        {
          if (
            (await PermManager.Business.checkPerm(
              business,
              interaction,
              "supervisor"
            )) === false
          ) {
            return await ErrorEmbed(
              interaction,
              "Insufficient perms. Supervisor permission level required."
            );
          }

          await interaction.deferReply();

          const busSelected = interaction.options.getString("business");
          const businessToPay = new BusinessHQ(interaction, busSelected);
          const busName = await businessToPay.getName();
          const roundedAmt = mathUtils.Round(
            interaction.options.getNumber("amount")
          );
          await UpdateData.accountBalance(
            interaction,
            businessToPay.IDENT,
            business.IDENT,
            roundedAmt
          ).then(async (result) => {
            if (result === "Insufficient Funds") {
              return await ErrorEmbed(
                interaction,
                "Insufficient Funds. Transaction Cancelled."
              );
            }
            await CreateData.basicTransaction(
              interaction,
              businessToPay.IDENT,
              business.IDENT,
              roundedAmt,
              interaction.options.getString("reason")
            );

            const embed = await SimpleEmbed(
              interaction,
              "Payment Complete!",
              `Your payment of ${await guildManager.formatMoney(
                roundedAmt
              )} to ${busName} processed successfully!`,
              "Green",
              null
            );
            interaction.editReply({
              content: "",
              embeds: [embed],
              components: [],
            });
          });
        }
        break;
      case "pay-department":
        {
          if (
            (await PermManager.Business.checkPerm(
              business,
              interaction,
              "supervisor"
            )) === false
          ) {
            return await ErrorEmbed(
              interaction,
              "Insufficient perms. Supervisor permission level required."
            );
          }
          await interaction.deferReply();
          if (
            Number(await business.getBalance()) -
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
                "Unable to payout. Insufficient funds from the Business."
              );
            return interaction.editReply({ embeds: [DeclineEmebed] });
          }

          const department = await new DepartmentHQ(
            interaction,
            interaction.options.getString("department")
          );
          const dName = await department.getName();
          await business
            .payDepartment(department, interaction.options.getNumber("amount"))
            .catch(async (err) => {
              console.error(err);
              return await ErrorEmbed(
                interaction,
                `An error occurred: ${err.message}`,
                false,
                true
              );
            });
          const Emebed = new discord.EmbedBuilder()
            .setTitle(`Business To Department Payout Completed.`)
            .setColor(discord.Colors["Green"])
            .setTimestamp()
            .setFooter({
              text: `${interaction.guild.name} Economy System`,
              iconURL: interaction.guild.iconURL(),
            })
            .setDescription(
              `**${dName}** has been paid ${await guildManager.formatMoney(
                interaction.options.getNumber("amount")
              )} using Department funds.`
            );
          interaction.editReply({ embeds: [Emebed] });
        }
        break;
      case "sell-item":
        {
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

          const TS = new Date().getMilliseconds();
          const items = await business.getAllItems();
          const selectedItem = items.filter((i) => {
            return i.IDENT == interaction.options.getString("item");
          })[0];

          const customer = interaction.options.getMember("member");
          let quantity = interaction.options.getNumber("quantity") || 1;
          await interaction.deferReply({ flags: MessageFlags.Ephemeral });
          const customerAccounts = await RetrieveData.userBasicAccounts(
            interaction,
            customer
          );
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

          //Add Green Button For Wallet Payment With Cash Emoji, Add Green Button With Bank and Piggy Bank Emoji, Add Red Decline Button with a big X emoji.
          //Process transaction using CREATE Service basic transaction function. In memo, include quantity and item name.
          //Provide confirmation to seller via ephemeral message, If declined, use ErrorEmbed and notify.

          //Handle Inventory
          //Add item to buyer inventory
          //Create sale record in business including items sold and linked to basic transaction, as well as the selling employee.
        }
        break;
    }
  },
};
