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
  PermissionsBitField,MessageFlags
} = require("discord.js");
const { ErrorEmbed, SimpleEmbed } = require("../utils/embedUtil");
const { activeDepartment } =
  require("../dataCrusher/Headquarters").CacheManager;
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
} = require("../dataCrusher/Headquarters");
const discord = require("discord.js");
const { csvGenerator } = require("../utils/csvGenerator");
const { LogGeneral } = require("../dataCrusher/services/guild");
module.exports = {
  data: new SlashCommandBuilder()
    .setName("dep")
    .setDescription(
      "Contains all necessary commands for department management."
    )
        
    // Balance 
    .addSubcommand((subCmd) =>
      subCmd.setName("balance").setDescription("View the department's account.")
    )
    
    //  Add Rolebind
    .addSubcommand((subcommand) =>
      subcommand
        .setName("add-role-bind")
        .setDescription(
          "Bind a discord role to a permission set and/or pay policies."
        )
        .addRoleOption((option) =>
          option
            .setName("role")
            .setDescription(
              "The role you would like to bind to perms/pay policies."
            )
            .setRequired(true)
        )
    )
        
    // Remove Rolebind
    .addSubcommand((subcommand) =>
      subcommand
        .setName("remove-role-bind")
        .setDescription(
          "Unbind a discord role from a permission set and/or pay policies."
        )
    )
    
    // Claim Budget
    .addSubcommand((subcommand) =>
      subcommand
        .setName("claim-budget")
        .setDescription(
          "Claim the allotted budget by treasury. A cooldown may be applicable."
        )
    )
        
    // Pay Member
    .addSubcommand((subcommand) =>
      subcommand
        .setName("pay-member")
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
    )
    
    //  Pay Business
    .addSubcommand((subcommand) =>
      subcommand
        .setName("pay-business")
        .setDescription("Pay a business using the department funds.")
        .addStringOption((option) =>
          option
            .setName("business")
            .setDescription("The business you wish to pay.")
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addNumberOption((option) =>
          option
            .setName("amount")
            .setDescription("The amount you wish to payout.")
            .setRequired(true)
        )
    )
    
    // Pay Department
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
    
    // View Fines
    .addSubcommand((citationsSubcommand) =>
      citationsSubcommand
        .setName("view-fines")
        .setDescription("View all department unpaid fines.")
    )
    
    // View Fees
    .addSubcommand((feesSubcommand) =>
      feesSubcommand
        .setName("view-fees")
        .setDescription("View (all) department fees issued.")
        .addBooleanOption((viewallOption) =>
          viewallOption
            .setName("view-all")
            .setDescription("View all department issued fees?")
        )
    )
    
    // Issue Commands
    .addSubcommandGroup((subGroup) =>
      subGroup
        .setName("issue")
            .setDescription("Commands used for issuing.")
        
        //  Issue Fine
        .addSubcommand((subCmd) =>
          subCmd
            .setName("fine")
            .setDescription(
              "Issue a fine to a user, which is to be paid later."
            )
            .addUserOption((userOp) =>
              userOp
                .setName("user")
                .setDescription("The user you wish to issue a fine to.")
                .setRequired(true)
            )
            .addStringOption((stringOp) =>
              stringOp
                .setName("character")
                .setDescription("The Roleplay character of the user.")
                .setRequired(true)
            )
            .addStringOption((stringOp) =>
              stringOp
                .setName("cad-record-id")
                .setDescription("The cad record ID for the fine.")
                .setRequired(true)
            )
            .addNumberOption((numberOp) =>
              numberOp
                .setName("amount")
                .setDescription("The amount of the fine you wish to issue.")
                .setRequired(true)
            )
        )
        
        //  Issue Fee
        .addSubcommand((subCmd) =>
          subCmd
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
            .addIntegerOption((intOp) =>
              intOp
                .setName("periodicity-days")
                .setDescription("Make this a recurring fee, re-charged automatically every N days. Leave blank for a one-time fee.")
                .setMinValue(1)
                .setRequired(false)
            )
        )
    ),

    // AUTOCOMPLETE
  async autocomplete(interaction) {
    const activeUSER = await new UserHQ(interaction, interaction.user.id);
    if ((await activeUSER.getDepartment()) == null) {
      return await interaction.respond([
        {
          name: "Error, please set a department first using the set command.",
          value: "Error",
        },
      ]);
    }
    const focusedOption = interaction.options.getFocused(true);

    switch (focusedOption.name) {
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
      case "department":
        {
          const Treasury = await RetrieveData.treasury(
            interaction.IDENT,
            false
          );
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
    if (process.env.status === "DEV") {
      await activeDepartment.set(
        `${interaction.IDENT}-${interaction.user.id}`,
        "975a39e2-b67c-4b78-ae0e-67b7e46c9ae6"
      );
    }

    const activeUSER = await new UserHQ(interaction, interaction.user.id);
    if ((await activeUSER.getDepartment()) == null) {
      console.log(await activeUSER.getDepartment());
      return await ErrorEmbed(
        interaction,
        "Please select a department first by using /set department!"
      );
    }
    const MoneyFormat = new Intl.NumberFormat("en-us", {
      currency: "USD",
      style: "currency",
    });
    const guildManager = new GuildHQ(interaction);
    const Department = new DepartmentHQ(
      interaction,
      await activeDepartment.get(`${interaction.IDENT}-${interaction.user.id}`)
    );
    switch (interaction.options.getSubcommand()) {
      case "view-fees":
        {
          if (
            (await PermManager.Department.checkPerm(
              interaction,
              Department,
              "Citation-Management"
            )) === false
          ) {
            return await ErrorEmbed(
              interaction,
              "Insufficient perms. Citation-Management permission level required."
            );
          }
          await interaction.deferReply();
          const viewAll = interaction.options.getBoolean("view-all");
          const feesCollection = await Department.getFees(viewAll).catch(
            async (err) => {
              console.warn(err);
              await ErrorEmbed(this.interaction, err.message);
            }
          );

          if (viewAll) {
            let collection = [{}];

            for (const fee of feesCollection) {
              let client = await RetrieveData.userByIDENT(fee.client);
              client = await interaction.guild.members.fetch(client.id);
              let issuer = await RetrieveData.userByIDENT(fee.issuer);
              issuer = await interaction.guild.members.fetch(issuer.id);
              collection.push({
                Client: client.user.username,
                Fee: fee.fee,
                Amount: fee.amount,
                Issuer: issuer.user.username,
              });
            }

            const feeCSVcollection = await csvGenerator(
              ["Client", "Fee", "Amount", "Issuer"],
              collection
            );
            const depName = await Department.getName();
            const feesAttachment = new AttachmentBuilder(
              Buffer.from(feeCSVcollection),
              { name: `${depName}-Fees.csv` }
            );

            const csvEmbed = new EmbedBuilder()
              .setTitle("\\✅ Attaching CSV file now.")
              .setTimestamp()
              .setColor("Green")
              .setFooter({
                text: `${interaction.guild.name} Economy System`,
                iconURL: interaction.guild.iconURL(),
              });

            await interaction.editReply({ embeds: [csvEmbed] });
            interaction.followUp({ files: [feesAttachment] });

            return;
          }

          let feesFileds = "``Client | Fee | Amount | Issuer``\n";

          for (const fee of feesCollection) {
            let client = await RetrieveData.userByIDENT(fee.client);
            client = await interaction.guild.members.fetch(client.id);
            let issuer = await RetrieveData.userByIDENT(fee.issuer);
            issuer = await interaction.guild.members.fetch(issuer.id);

            feesFileds =
              feesFileds +
              `${client.user.username} | ${
                fee.fee
              } | ${await guildManager.formatMoney(fee.amount)} | ${
                issuer.user.username
              }\n`;
          }

          const feeEmbed = new EmbedBuilder()
            .setTitle(`${await Department.getName()} Issued Fees`)
            .setDescription(feesFileds)
            .setColor("Gold")
            .setTimestamp()
            .setFooter({
              text: `${interaction.guild.name} Economy System`,
              iconURL: interaction.guild.iconURL(),
            });

          interaction.editReply({ embeds: [feeEmbed] });
        }
        break;

      case "view-fines":
        {
          if (
            (await PermManager.Department.checkPerm(
              interaction,
              Department,
              "Citation-Management"
            )) === false
          ) {
            return await ErrorEmbed(
              interaction,
              "Insufficient perms. Fine-Management permission level required."
            );
          }
          await interaction.deferReply();

          const citationCollection = await Department.getCitations().catch(
            async (err) => {
              console.warn(err);
              await ErrorEmbed(this.interaction, err.message);
            }
          );

          if (citationCollection.length > 25) {
            let collection = [{}];

            for (const cite of citationCollection) {
              let violatorID = await RetrieveData.userByIDENT(cite.violator);
              let issuerID = await RetrieveData.userByIDENT(cite.issuer);
              let violator = null,
                issuer = null;

              try {
                violator = await interaction.guild.members.fetch(violatorID.id);
                issuer = await interaction.guild.members.fetch(issuerID.id);
              } catch (e) {
                console.log("Returning due to unknown member");
                console.log(e);
                continue;
              }

              if (violator === null) {
                violator = { user: { username: "Member No Longer In Server" } };
              }
              if (issuer === null) {
                issuer = { user: { username: "Member No Longer In Server" } };
              }

              collection.push({
                Violator: violator.user.username,
                Character: cite.character,
                RecordID: cite.cadRecordID,
                Amount: cite.amount,
                Issuer: issuer.user.username,
              });
            }

            const citationCSVcollection = await csvGenerator(
              ["Violator", "Character", "RecordID", "Amount", "Issuer"],
              collection
            );
            const depName = await Department.getName();
            const citationsAttachment = new AttachmentBuilder(
              Buffer.from(citationCSVcollection),
              { name: `${depName}-Fines.csv` }
            );

            const csvEmbed = new EmbedBuilder()
              .setTitle("\\✅ Attaching CSV file now.")
              .setTimestamp()
              .setColor("Green")
              .setFooter({
                text: `${interaction.guild.name} Economy System`,
                iconURL: interaction.guild.iconURL(),
              });

            await interaction.editReply({ embeds: [csvEmbed] });
            interaction.followUp({ files: [citationsAttachment] });

            return;
          }

          let citationFileds =
            "``Violator | Character | Record ID | Amount | Issuer``\n";

          for (const cite of citationCollection) {
            let violatorID = await RetrieveData.userByIDENT(cite.violator);
            let issuerID = await RetrieveData.userByIDENT(cite.issuer);
            let violator = null,
              issuer = null;

            try {
              violator = await interaction.guild.members.fetch(violatorID.id);
              issuer = await interaction.guild.members.fetch(issuerID.id);
            } catch (e) {
              console.log("Returning due to unknown member");
              console.log(e);
              continue;
            }

            if (violator === null) {
              violator = { user: { username: "Member No Longer In Server" } };
            }
            if (issuer === null) {
              issuer = { user: { username: "Member No Longer In Server" } };
            }

            citationFileds =
              citationFileds +
              `${violator.user.username} | ${cite.character} | ${
                cite.cadRecordID
              } | ${await guildManager.formatMoney(cite.amount)} | ${
                issuer.user.username
              }\n`;
          }

          const citeEmbed = new EmbedBuilder()
            .setTitle(`${await Department.getName()} Unpaid Fines`)
            .setDescription(citationFileds)
            .setColor("White")
            .setTimestamp()
            .setFooter({
              text: `${interaction.guild.name} Economy System`,
              iconURL: interaction.guild.iconURL(),
            });

          interaction.editReply({ embeds: [citeEmbed] });
        }
        break;

      case "fee":
        {
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
          await interaction.deferReply({});

          const Member = interaction.options.getUser("user");
          const amount = interaction.options.getNumber("amount");
          const reason = interaction.options.getString("reason");

          const periodicityDays = interaction.options.getInteger("periodicity-days");

          const TS = new Date().getMilliseconds();
          const client = await new UserHQ(interaction, Member.id);
          const issuer = await new UserHQ(interaction, interaction.user.id);
          await issuer.getIDENT();
          await client.getIDENT();
          const Fee = { reason, client, issuer, amount };

          // ── Recurring fee: skip the interactive confirmation, charge silently from bank each period ──
          if (periodicityDays) {
            const result = await Department.issueRecurringFee(Fee, periodicityDays);

            const recurringEmbed = new discord.EmbedBuilder()
              .setColor(result?.charged ? "Green" : "Orange")
              .setTitle("Recurring Fee Established")
              .setDescription(
                `A recurring fee under \`\`${await Department.getName()}\`\` has been set up for ${Member}.` +
                (result?.charged
                  ? " The first charge was collected from their bank account."
                  : " **Their first charge could not be collected (insufficient bank funds) — it will retry automatically.**")
              )
              .addFields(
                { name: "Reason", value: reason, inline: true },
                { name: "Amount", value: `${await guildManager.formatMoney(amount)}`, inline: true },
                { name: "Every", value: `${periodicityDays} day(s)`, inline: true }
              )
              .setTimestamp()
              .setFooter({ text: `${interaction.guild.name} Economy System`, iconURL: interaction.guild.iconURL() });

            await interaction.editReply({ embeds: [recurringEmbed] });

            const violatorEmbed = new discord.EmbedBuilder()
              .setDescription(`\`\`${await Department.getName()}\`\` has set up a **recurring fee** against you. It will be automatically deducted from your bank account every **${periodicityDays} day(s)**.`)
              .addFields(
                { name: "Reason", value: reason, inline: true },
                { name: "Amount per charge", value: `${await guildManager.formatMoney(amount)}`, inline: true },
                { name: "Issuer", value: `${interaction.user}`, inline: true }
              )
              .setColor("Orange")
              .setTimestamp()
              .setFooter({ text: `${interaction.guild.name} Economy System`, iconURL: interaction.guild.iconURL() });

            await Member.send({ embeds: [violatorEmbed] }).catch(() => {});

            await LogGeneral(interaction, 'Orange', 'Recurring Fee Issued', `<@${interaction.user.id}> set up a recurring fee against <@${Member.id}>.`, {name: 'Amount', value: await guildManager.formatMoney(amount), inline: true}, {name: 'Every', value: `${periodicityDays} day(s)`, inline: true}, {name: 'Reason', value: reason, inline: true}).catch(console.error);
            break;
          }

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
        break;
      case "fine":
        {
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

          await interaction.deferReply({});

          const Member = interaction.options.getUser("user");
          const citationID = interaction.options.getString("cad-record-id");
          const amount = interaction.options.getNumber("amount");
          const character = interaction.options.getString("character");

          const violator = await new UserHQ(interaction, Member.id);
          const issuer = await new UserHQ(interaction, interaction.user.id);

          const Citation = { citationID, character, violator, issuer, amount };

          await Department.issueCitation(Citation);

          const SusEmebed = new discord.EmbedBuilder()
            .setDescription(
              `You've been issued a fine from \`\`${await Department.getName()}\`\`. To pay this Fine, run \`\`/fines pay\`\`.`
            )
            .addFields([
              { name: "Cad Record ID", value: `${citationID}`, inline: true },
              { name: "Character", value: `${character}`, inline: true },
              { name: "Issuer", value: `${interaction.user}`, inline: true },
              { name: "Violator", value: `${Member}`, inline: true },
              {
                name: "Amount",
                value: `${await guildManager.formatMoney(amount)}`,
                inline: true,
              },
            ])
            .setColor(discord.Colors["White"])
            .setTimestamp()
            .setFooter({
              text: `${interaction.guild.name} Economy System`,
              iconURL: interaction.guild.iconURL(),
            });

          await Member.send({ embeds: [SusEmebed] }).catch((err) => {
            SusEmebed.setDescription(
              `Unable to notify ${Member} due to their DMs being off.`
            );
          });

          SusEmebed.setDescription(
            `Successfully issued fine under \`\`${await Department.getName()}\`\`.`
          ).setColor("Green");
          await interaction.editReply({ embeds: [SusEmebed] });
          await LogGeneral(interaction, 'Orange', 'Fine Issued', `<@${interaction.user.id}> issued a fine to <@${Member.id}>.`, {name: 'Amount', value: await guildManager.formatMoney(amount), inline: true}, {name: 'Reason', value: character, inline: true}).catch(console.error);
        }
        break;
      case "balance":
        {
          await interaction.deferReply();

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
        break;
      case "pay-member":
        {
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
          await interaction.editReply({ embeds: [Emebed] });
          await LogGeneral(interaction, 'Green', 'Funds Sent', `Funds sent from department to member.`, {name: 'Department', value: await Department.getName(), inline: true}, {name: 'Recipient', value: `<@${interaction.options.getUser("user").id}>`, inline: true}, {name: 'Amount', value: await guildManager.formatMoney(interaction.options.getNumber("amount")), inline: true}).catch(console.error);
        }
        break;
      case "pay-business":
        {
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

          const business = await new BusinessHQ(
            interaction,
            interaction.options.getString("business")
          );
          const bName = await business.getName();
          await Department.payBusiness(
            business,
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
              `**${bName}** has been paid ${await guildManager.formatMoney(
                interaction.options.getNumber("amount")
              )} using Department funds.`
            );
          await interaction.editReply({ embeds: [Emebed] });
          await LogGeneral(interaction, 'Green', 'Funds Sent', `Funds sent from department to business.`, {name: 'Department', value: await Department.getName(), inline: true}, {name: 'Business', value: bName, inline: true}, {name: 'Amount', value: await guildManager.formatMoney(interaction.options.getNumber("amount")), inline: true}).catch(console.error);
        }
        break;
      case "pay-department":
        {
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

          const department = await new DepartmentHQ(
            interaction,
            interaction.options.getString("department")
          );
          const dName = await department.getName();
          await Department.payDepartment(
            department,
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
              `**${dName}** has been paid ${await guildManager.formatMoney(
                interaction.options.getNumber("amount")
              )} using Department funds.`
            );
          interaction.editReply({ embeds: [Emebed] });
        }
        break;
      case "add-role-bind": {
        if (
          (await PermManager.Department.checkPerm(
            interaction,
            Department,
            "Department-Management"
          )) === false
        ) {
          return await ErrorEmbed(
            interaction,
            "Insufficient perms. Department-Management permission level required."
          );
        }

        const role = interaction.options.getRole("role");
        console.log(JSON.stringify(interaction.member));
        const highestRole = interaction.member.roles.highest;

        if (
          role.rawPosition >= highestRole.rawPosition &&
          !interaction.member.permissions.has(
            PermissionsBitField.Flags.Administrator
          )
        ) {
          return await ErrorEmbed(
            interaction,
            `Insufficient authority. <@&${role.id}>'s position is higher than your roles.`,
            true,
            false
          );
        }
        await interaction.deferReply();
        const menu = new SelectMenuBuilder()
          .setCustomId("permSelector")
          .setPlaceholder(
            "Please choose the permissions you would like to grant to this individual."
          )
          .setMinValues(1)
          .setMaxValues(7);

        const perms = [
          {
            label: "Department Management",
            description:
              "Add role bindings, change description, links and payroll behavior",
            value: "Department-Management",
          },
          {
            label: "Payroll Management",
            description:
              "Perform payrolls, review approved shift logs, adjust payrolls.",
            value: "Payroll-Management",
          },
          {
            label: "Shift Log Management",
            description: "Manage shift logs.",
            value: "Shift-Management",
          },
          {
            label: "Finance Management",
            description:
              "View account ledger, issue department payments, request funding.",
            value: "Finance-Management",
          },
          {
            label: "Fine Management",
            description: "Issue Fines, review fines, delete fines.",
            value: "Citation-Management",
          },
          {
            label: "Submit Shift Logs",
            description: "Submit shift logs.",
            value: "Submit-ShiftLogs",
          },
          {
            label: "Submit Fines & Fees",
            description: "Submit Fines and Fees.",
            value: "Submit-Citations",
          },
        ];
        menu.addOptions(perms);
        const row = new ActionRowBuilder();
        row.addComponents(menu);
        const embed = await SimpleEmbed(
          interaction,
          `Select Permissions`,
          `Please select the permission level you would like to grant to <@&${role.id}>`,
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
        await interaction.channel
          .awaitMessageComponent({
            filter,
            componentType: ComponentType.SelectMenu,
            time: 60000,
          })
          .then(async (selection) => {
            if (selection.customId === "permSelector") {
              await Department.addRoleBind(role, selection.values).catch(
                async (err) => {
                  console.error(err);
                  return await ErrorEmbed(
                    interaction,
                    `An error occurred: ${err.message}`,
                    false,
                    true
                  );
                }
              );
              const embed = await SimpleEmbed(
                interaction,
                "Role Binded Successfully!",
                `<@&${role.id}> was binded to department successfully.`,
                "Green",
                null
              );
              await interaction.editReply({
                embeds: [embed],
                components: [],
              });
            }
          })
          .catch(async (err) => {
            if (
              err.message ===
              "Collector received no interactions before ending with reason: time"
            ) {
              return await ErrorEmbed(
                interaction,
                `You did not select an option within the alotted amount of time.`,
                false,
                false
              );
            }
            console.log(err);
          });

        break;
      }
      case "remove-role-bind": {
        if (
          (await PermManager.Department.checkPerm(
            interaction,
            Department,
            "Department-Management"
          )) === false
        ) {
          return await ErrorEmbed(
            interaction,
            "Insufficient perms. Department-Management permission level required."
          );
        }

        await interaction.deferReply();
        const Roles = await Department.getRoles();
        const menu = new SelectMenuBuilder()
          .setCustomId("roleSelector")
          .setPlaceholder("Please choose the role you would like disband.");
        const options = [];
        for (var key in Roles) {
          console.log(Roles[key]);
          const data = Roles[key];
          const disRole = await interaction.guild.roles.fetch(Roles[key].id);
          if (!disRole) {
            continue;
          }
          options.push({
            label: disRole.name,
            description: `${String(data.permissions).substring(0, 47)}...`,
            value: key,
          });
        }
        if (options.length === 0) {
          return interaction.editReply(
            "No department roles exist in this economy!"
          );
        }
        menu.addOptions(options);
        const row = new ActionRowBuilder().addComponents(menu);
        await interaction.editReply({
          content:
            "Please choose the department role you would like to interact with.",
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
            if (selection.customId === "roleSelector") {
              await Department.removeRoleBind(
                interaction,
                Roles[selection.values]
              ).catch(async (err) => {
                console.error(err);
                return await ErrorEmbed(
                  interaction,
                  `An error occurred: ${err.message}`,
                  false,
                  true
                );
              });

              const embed = await SimpleEmbed(
                interaction,
                "Role Removed Successfully!",
                `<@&${
                  Roles[selection.values].id
                }> was removed from the department successfully.`,
                "Green",
                null
              );
              await interaction.editReply({
                embeds: [embed],
                components: [],
              });
            }
          })
          .catch(async (e) => {
            if (
              e.message ===
              "Collector received no interactions before ending with reason: time"
            ) {
              return await ErrorEmbed(
                interaction,
                `You did not select an option within the alotted amount of time.`,
                false,
                false
              );
            }
            await ErrorEmbed(
              interaction,
              `Error Message: ${e.message}`,
              false,
              false
            );
            console.log(e);
          });
        break;
      }
      case "set-description": {
        if (
          (await PermManager.Department.checkPerm(
            interaction,
            Department,
            "Department-Management"
          )) === false
        ) {
          return await ErrorEmbed(
            interaction,
            "Insufficient perms. Department-Management permission level required."
          );
        }
        break;
      }
      case "claim-budget": {
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
        await interaction.deferReply();

        let DepartmentBudget = await Department.getBudget();
        const MaxBal = await Department.getMaxBalance();

        const DepBalance = await Department.getBalance();

        let LastTime = await Department.getBudgetTimestamp();

        const Treasury = await RetrieveData.treasury(interaction.IDENT);
        const Timeout = Number(Treasury.budgetTimeout) * 60 * 60 * 1000;

        const TIMEOUTTIME = new Date(
          Number(Date.parse(LastTime)) + Number(Timeout)
        );
        const CurrentTime = new Date(Date.now());
        let alteredBudget = false;

        if (
          typeof MaxBal !== "undefined" &&
          MaxBal !== null &&
          Number(DepBalance) >= Number(MaxBal)
        ) {
          const DeclineEmebed = new discord.EmbedBuilder()
            .setTitle(`Could Not Claim The Allotted Budget.`)
            .setColor(discord.Colors["Red"])
            .setTimestamp()
            .setFooter({
              text: `${interaction.guild.name} Economy System`,
              iconURL: interaction.guild.iconURL(),
            })
            .setDescription(
              `Unable to claim budget. The departments balance (${await guildManager.formatMoney(
                DepBalance
              )}) has reached the max balance allowed (\`\`${await guildManager.formatMoney(
                MaxBal
              )}\`\`).`
            );
          return interaction.editReply({ embeds: [DeclineEmebed] });
        }

        if (
          typeof MaxBal !== "undefined" &&
          MaxBal !== null &&
          Number(DepBalance) + Number(DepartmentBudget) > Number(MaxBal)
        ) {
          DepartmentBudget =
            Number(DepartmentBudget) -
            (Number(DepBalance) + Number(DepartmentBudget) - Number(MaxBal));
          alteredBudget = true;
        }

        if (Number(Treasury.balance) - Number(DepartmentBudget) < 0) {
          const DeclineEmebed = new discord.EmbedBuilder()
            .setTitle(`Could Not Claim The Allotted Budget.`)
            .setColor(discord.Colors["Red"])
            .setTimestamp()
            .setFooter({
              text: `${interaction.guild.name} Economy System`,
              iconURL: interaction.guild.iconURL(),
            })
            .setDescription(
              "Unable to claim budget. Insufficient funds from the Treasury."
            );
          return interaction.editReply({ embeds: [DeclineEmebed] });
        }

        if (!LastTime || CurrentTime >= TIMEOUTTIME) {
          await Department.claimBudget().catch(async (err) => {
            console.error(err);
            return await ErrorEmbed(
              interaction,
              `An error occurred: ${err.message}`,
              false,
              true
            );
          });
          const SucessfulEmebed = new discord.EmbedBuilder()
            .setTitle(`Claimed Budget`)
            .setColor(discord.Colors["Green"])
            .setTimestamp()
            .setFooter({
              text: `${interaction.guild.name} Economy System`,
              iconURL: interaction.guild.iconURL(),
            })
            .setDescription(
              `You have claimed the allotted budget of ${await guildManager.formatMoney(
                DepartmentBudget
              )}.` +
                " You can claim your budget again <t:" +
                Math.floor(Number(Date.now() + Number(Timeout)) / 1000) +
                ":R>."
            );

          if (alteredBudget === true) {
            SucessfulEmebed.setDescription(
              `Due to the departments max balance, you have claimed a **limited** budget of ${await guildManager.formatMoney(
                DepartmentBudget
              )}` +
                " You can claim your budget again <t:" +
                Math.floor(Number(Date.now() + Number(Timeout)) / 1000) +
                ":R>."
            );
          }

          return interaction.editReply({ embeds: [SucessfulEmebed] });
        }

        const DeclineEmebed = new discord.EmbedBuilder()
          .setTitle(`Could Not Claim Budget`)
          .setColor(discord.Colors["Red"])
          .setTimestamp()
          .setFooter({
            text: `${interaction.guild.name} Economy System`,
            iconURL: interaction.guild.iconURL(),
          })
          .setDescription(
            "Unable to claim the allotted budget. You may calim your budget again " +
              "<t:" +
              Math.floor((Number(LastTime) + Timeout) / 1000) +
              ":R>."
          );

        return interaction.editReply({ embeds: [DeclineEmebed] });
      }
    }
  },
};

/*Permission System:
 * All permissions will be managed with role binds, unlike businesses. When adding a new role permission, the user will need to select a permission set.
 * The permission check function will check for necessary permission set based on role. Rank based checks wsould be based on role ordering. (higher role would have more rank over lower role?)
 * Roles can be designated as rank or division roles, with ability to fine tune permissions, using multi-select menu. When determining effective permission set, all role permission sets will be added together, creating a set of permissions to evaluate access with.
 */

/*Permission Settings:
 * Department Management: Add role bindings, change team description, change links, change payroll behaviour.
 * Payroll Management: Perform payroll, review approved patrol logs, make payroll adjustments.
 * Patrol Log Management: Delete patrol logs, review patrol logs, approve patrol logs, adjust patrol logs.
 * Finance Management: View account ledger, issue department payments, request funding.
 * Citation Management: Issue citations, review citations, delete citations.
 * Vehicle Management: View vehicle list, add vehicles, remove vehicles, edit vehicle information.
 * Inventory Management: View inventory, add inventory, remove inventory, edit inventory.
 * Submit Patrol Logs: Submit patrol logs.
 * Submit citationq: Submit citations.
 * Submit incident reports: Submit incident reports.
 * */
