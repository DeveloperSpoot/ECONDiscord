const { RetrieveData, CreateData, UpdateData, BusinessHQ } = require("../dataCrusher/Headquarters.js");
const {
    ActionRowBuilder,
    SelectMenuBuilder,
    Interaction,
    SlashCommandBuilder,
    ComponentType, EmbedBuilder, AttachmentBuilder,
    PermissionsBitField
} = require("discord.js");
const { SimpleEmbed, ErrorEmbed } = require("../utils/embedUtil");
const discord = require("discord.js");
const { PermManager, DepartmentHQ, NotificationHQ, UserHQ, GuildHQ, EntanglementDrive } = require("../dataCrusher/Headquarters");
const { csvGenerator } = require("../utils/csvGenerator");
const { activeCleanUp } = require("../dataCrusher/Headquarters").CacheManager;

module.exports = {
    data: new SlashCommandBuilder()
        .setName("treasury")
        .setDescription("Administrative options for the economy.")

        //  Tax Commands
        .addSubcommandGroup((subCmdGroup) =>

            subCmdGroup.setName("tax-service")
                .setDescription("Manage tax related settings.")

                //  Payroll Tax
                .addSubcommand((subCmd) =>
                    subCmd.setName("set-payroll-tax")
                        .setDescription("Set the value that is taxed from payrolls.")
                        .addStringOption((stringOp) =>
                            stringOp.setName("type")
                                .setDescription("Set the tax type, can be flat or a percentage.")
                                .addChoices(
                                    { name: "flat", value: 'Flat' },
                                    { name: "Percentage", value: 'Percentage' }
                                )
                                .setRequired(true)
                        )
                        .addNumberOption((numOp) =>
                            numOp.setName("value")
                                .setDescription("The value/percent that should be taxed.")
                                .setRequired(true)
                        )
                )

                //  Sales Tax
                .addSubcommand((subCmd) =>
                    subCmd.setName("set-sales-tax")
                        .setDescription("Set the value that should be taxed from sales.")
                        .addStringOption((stringOp) =>
                            stringOp.setName("type")
                                .setDescription("Set the tax type, can be flat or a percentage.")
                                .addChoices(
                                    { name: "Flat", value: `Flat` },
                                    { name: "Percentage", value: "Percentage" }
                                )
                                .setRequired(true)
                        )
                        .addNumberOption((numOp) =>
                            numOp.setName("value")
                                .setDescription("The value/percent that should be taxed.")
                                .setRequired(true)
                        )
                )
        )

        // Treasury Balance Command
        .addSubcommand((subCmd) =>
            subCmd
                .setName('balance')
                .setDescription('View the Treasury account balance.')
        )

        //  Add Business
        .addSubcommand((subcommand) =>
            subcommand
                .setName("add-business")
                .setDescription(
                    "Add a new business to the economy."
                )
                .addStringOption((option) =>
                    option
                        .setName("name")
                        .setRequired(true)
                        .setDescription("The name of the business.")
                )
                .addStringOption((option) =>
                    option
                        .setName("description")
                        .setRequired(true)
                        .setDescription("The description of the business.")
                )
                .addUserOption((option) =>
                    option
                        .setName("owner")
                        .setRequired(true)
                        .setDescription("The owner of the business. Has all perms. ")
                )
                .addBooleanOption((option) =>
                    option
                        .setName("selfserved")
                        .setRequired(true)
                        .setDescription("Wether or not users can buy items from this business directly on their own.")
                )
                .addRoleOption((option) =>
                    option
                        .setName("role")
                        .setRequired(false)
                        .setDescription("The role that all business members have.")
                )
        )

        //  Remove Business
        .addSubcommand((subcommand) =>
            subcommand
                .setName("remove-business")
                .setDescription("Remove a business from the database.")
                .addStringOption(stringOp =>
                    stringOp.setName('business')
                        .setDescription('The business you wish to remove.')
                        .setAutocomplete(true)
                        .setRequired(true)
                )
        )

        //  Remove Department
        .addSubcommand((subcommand) =>
            subcommand
                .setName("remove-department")
                .setDescription("Remove a department from the database.")
                .addStringOption(option => option.setName('department').setRequired(true).setDescription('The department you wish to remove.').setAutocomplete(true))

        )

        //  Print Money
        .addSubcommand((subcommand) =>
            subcommand
                .setName('print-money')
                .setDescription('Generates money and places it into the treasury general account for distribution.')
                .addNumberOption((option) =>
                    option
                        .setName('amount')
                        .setDescription('The amount of money you would like to generate.')
                        .setRequired(true)
                )
                .addStringOption((option) =>
                    option
                        .setName('reason')
                        .setDescription('Why are you printing money out of thin air?')
                        .setRequired(true)
                )
        )

        //  Add Department
        .addSubcommand((subcommand) =>
            subcommand
                .setName('add-department')
                .setDescription('Creates a department.')
                .addStringOption((option) =>
                    option
                        .setName('department-name')
                        .setDescription('The name of the department in which you wish to create.')
                        .setRequired(true)
                )
                .addRoleOption((option) =>
                    option
                        .setName('department-head-role')
                        .setDescription('The role in which the department head will have.')
                        .setRequired(true)
                )
                .addRoleOption((option) =>
                    option
                        .setName('department-role')
                        .setDescription('The role in which all department members will have.')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('department-description')
                        .setDescription('The description of the department.')
                        .setRequired(false)
                        .setAutocomplete(false)
                )
                .addNumberOption((option) =>
                    option
                        .setName('department-budget')
                        .setDescription('The amount of money the department may claim periodically.')
                        .setRequired(false)
                        .setAutocomplete(false)
                )
                .addNumberOption((option) =>
                    option
                        .setName('department-max-balance')
                        .setDescription('This limits budget claiming based on the department balance.')
                        .setRequired(false)
                        .setAutocomplete(false))

        )

        //  Budget Timeout
        .addSubcommand((subcommand) =>
            subcommand
                .setName('set-budget-timeout')
                .setDescription('Set the amount of hours a department must wait before claiming their budget.')
                .addNumberOption((option) =>
                    option
                        .setName('dep-timeout')
                        .setDescription('The amount of HOURS you would like departments to wait until claiming their next budget.')
                        .setRequired(true)
                )
        )

        // Stipend
        .addSubcommand((subcommand) =>
            subcommand
                .setName('set-stipend')
                .setDescription('Set the stipend that users are able to claim.')
                .addNumberOption((option) =>
                    option
                        .setName('stipend')
                        .setDescription('The amount of money you would like to set as the stipend.')
                        .setRequired(true)
                )
                .addNumberOption((option) =>
                    option
                        .setName('timeout')
                        .setDescription('The amount of HOURS you would like users to wait until claiming their next stipend.')
                        .setRequired(true)
                )
        )

        //  Clean Up
        .addSubcommand((cleanUpSubcommand) =>
            cleanUpSubcommand.setName('clean-up')
                .setDescription('Cleans up all accounts of members who have left.')
        )

        //  View Fines
        .addSubcommand((citationsSubcommand) =>
            citationsSubcommand.setName('view-fines')
                .setDescription('View all department unpaid fines.')
        )

        //  View Fees
        .addSubcommand((feesSubcommand) =>
            feesSubcommand.setName('view-fees')
                .setDescription('View (all) fees issued in the server.')
                .addBooleanOption(viewallOption =>
                    viewallOption.setName('view-all')
                        .setDescription('View all issued fees for the server?'))
        )

        //  Dismiss Fine
        .addSubcommand((dismissCitationsSubcommand) =>
            dismissCitationsSubcommand.setName('dismiss-fine')
                .setDescription('Dismiss/remove a fine.')
                .addStringOption(citationRecord =>
                    citationRecord.setName('fine')
                        .setDescription('Search fine by character.')
                        .setAutocomplete(true)
                        .setRequired(true))
        )

        //  Fund Deaprtment
        .addSubcommand(subcommand =>
            subcommand
                .setName('fund-department')
                .setDescription('Transfer funds from the treasury account to the department.')
                .addStringOption(option =>
                    option
                        .setName('department')
                        .setDescription('The department you wish to fund.')
                        .setAutocomplete(true)
                        .setRequired(true))
                .addNumberOption(option =>
                    option
                        .setName('amount')
                        .setDescription('The amount you wish to fund.')
                        .setAutocomplete(false)
                        .setRequired(true)))

        //  Starting Balance
        .addSubcommand(subcommand =>
            subcommand
                .setName('set-starting-balance')
                .setDescription('The balance all newly registered plays shall receive.')
                .addNumberOption(option =>
                    option
                        .setName('amount')
                        .setRequired(true)
                        .setDescription('The amount you would like to set the starting balance to.')))

        //  Statistics
        .addSubcommand(subCmd =>
            subCmd.setName("statistics")
                .setDescription("Displays statistical information about the treasury.")
        )

        //  Edit Deaprtment
        .addSubcommand(subCmd =>
            subCmd.setName('edit-department')
                .setDescription('Edit a Department.')
                .addStringOption(option => option.setName('department').setRequired(true).setDescription('The department you wish to edit.').setAutocomplete(true))
                .addStringOption((option) =>
                    option
                        .setName('department-name')
                        .setDescription('The name of the department in which you wish to create.')
                        .setRequired(false)
                )
                .addRoleOption((option) =>
                    option
                        .setName('department-head-role')
                        .setDescription('The role in which the department head will have.')
                        .setRequired(false)
                )
                .addRoleOption((option) =>
                    option
                        .setName('department-role')
                        .setDescription('The role in which all department members will have.')
                        .setRequired(false)
                )
                .addStringOption(option =>
                    option
                        .setName('department-description')
                        .setDescription('The description of the department.')
                        .setRequired(false)
                        .setAutocomplete(false)
                )
                .addNumberOption((option) =>
                    option
                        .setName('department-budget')
                        .setDescription('The amount of money the department may claim periodically.')
                        .setRequired(false)
                        .setAutocomplete(false)
                )
                .addNumberOption((option) =>
                    option
                        .setName('department-max-balance')
                        .setDescription('This limits budget claiming based on the department balance.')
                        .setRequired(false)
                        .setAutocomplete(false)))
        
        //  Edit Business
        .addSubcommand(subCmd =>
            subCmd.setName('edit-business')
                .setDescription('Used to edit a selected business.')
                .addStringOption(stringOp =>
                    stringOp.setName('business')
                        .setDescription('The business you wish to edit.')
                        .setAutocomplete(true)
                        .setRequired(true)
                )
                .addStringOption(stringOp =>
                    stringOp.setName('name').setDescription('Edit the name of the business.').setRequired(false))
                .addStringOption(stringOp =>
                    stringOp.setName('description').setDescription('Edit the description of the business.').setRequired(false))
                .addUserOption(userOp =>
                    userOp.setName('owner').setDescription('Change the owner of the business').setRequired(false))
                .addBooleanOption((option) =>
                    option.setName("selfserved").setRequired(false).setDescription("Wether or not users can buy items from this business directly on their own."))
                .addRoleOption(roleOp =>
                    roleOp.setName('role').setDescription('Change the business role.').setRequired(false))
        )

        //  Set Currency
        .addSubcommand(subCmd =>
            subCmd.setName("set-currency")
                .setDescription("Allows you to change the default currency symbol to whatever you would like.")
                .addStringOption(stringOp =>
                    stringOp.setName("symbol")
                        .setDescription("The \"Symbol\" you would like to use.")
                        .setRequired(true)
                )
        )

        //  Inflate
        .addSubcommand(subCmd =>
            subCmd.setName("inflate")
                .setDescription("Inflates ALL prices of ALL items by the inputed percentage.")
                .addNumberOption(numOp =>
                    numOp.setName("percentage-amount")
                        .setDescription("The percetnage of which you want to the prices to be inflated by.")
                        .setRequired(true)
                )
        )

        //  Deflate
        .addSubcommand(subCmd =>
            subCmd.setName("deflate")
                .setDescription("Deflates ALL prices of ALL items by the inputed percentage.")
                .addNumberOption(numOp =>
                    numOp.setName("percentage-amount")
                        .setDescription("The percetnage of which you want to the prices to be deflated by.")
                        .setRequired(true)
                )
        )

        // Entanglement Commands (Kind of Cursed tbh - Spoot)
        .addSubcommandGroup(subGroup =>
            subGroup.setName("entanglement")
                .setDescription("Allows you add or join servers to entangle with, sharing one treasury, one economy.")

                // Generating OTC
                .addSubcommand(subCmd =>
                    subCmd.setName("add")
                        .setDescription("Generates a one-time code to use on the server that is joining.")
                )

                // Joining
                .addSubcommand(subCmd =>
                    subCmd.setName("join")
                        .setDescription("Allows this server to entangle with another server, sharing their economy.")
                        .addStringOption(stringOp =>
                            stringOp.setName("code")
                                .setDescription("The Entanglement Code Generated By The Server You're Joining.")
                                .setRequired(true))
                )

                // Disengaging 
                .addSubcommand(subCmd =>
                    subCmd.setName("disengage")
                        .setDescription("Sever entanglement with all servers. This Restores The Treasury And Economy For This Server.")
                )
        ),

        //  AUTOCOMPLETE
    async autocomplete(interaction) {
        if (await PermManager.Treasury.checkAuthorization(interaction, interaction.user) == null && interaction.user.id !== interaction.guild.ownerId) {
            return await interaction.respond([{
                name: "Error, You are not authorized manage the Treasury.",
                value: "Error"
            }]);
        }
        const focusedOption = interaction.options.getFocused(true);

        const Treasury = await RetrieveData.treasury(interaction.IDENT, false);
        const MoneyFormat = new Intl.NumberFormat('en-us');

        switch (focusedOption.name) {
            case 'fine': {
                const choices = await Treasury.getCitations({ raw: true });
                if (choices.length === 0) {
                    return await interaction.respond([{
                        name: "Error, there are no active (unpaid) fines.",
                        value: "Error"
                    }]);
                }

                const filtered = choices.filter(choice => {
                    return choice.character.toLowerCase().startsWith(focusedOption.value.toLowerCase())
                });

                console.log(filtered)
                await interaction.respond(
                    filtered.map(choice => ({ name: `${choice.character} | ${choice.cadRecordID} | ${(choice.amount)}`, value: choice.IDENT })),
                );
            } break

            case 'department': {
                const choices = await Treasury.getDepartments({ raw: true });
                if (choices.length === 0) {
                    return await interaction.respond([{
                        name: "Error, no departments exist in this economy.",
                        value: "Error"
                    }]);
                }
                const filtered = choices.filter(choice => {
                    return choice.name.toLowerCase().startsWith(focusedOption.value.toLowerCase())
                });
                await interaction.respond(
                    filtered.map(choice => ({ name: choice.name, value: choice.IDENT })),
                );
            } break

            case 'business': {
                const choices = await RetrieveData.accountsByType(interaction, 'business')
                if (choices.length === 0) {
                    return await interaction.respond([{
                        name: "Error, no businesses exist in this economy.",
                        value: "Error"
                    }]);
                }
                const filtered = choices.filter(choice => {
                    return choice.name.toLowerCase().startsWith(focusedOption.value.toLowerCase())
                });
                await interaction.respond(
                    filtered.map(choice => ({ name: choice.name, value: choice.IDENT })),
                );
            } break

        }

    },

    async execute(interaction) {
        if (!interaction.guild) {
            return await ErrorEmbed(
                interaction,
                "This can only be used in a server!"
            );
        }

        if (interaction.IDENT !== interaction.guildId) {
            return await ErrorEmbed(interaction, "Sub Servers of an Entanglement may not manage the treasury. Treasury settings changes and interactions must be conducted on the main server.")
        }

        if (await PermManager.Treasury.checkAuthorization(interaction, interaction.user) == null && interaction.user.id !== interaction.guild.ownerId) {
            return await ErrorEmbed(
                interaction,
                "You are not authorized manage the Treasury."
            );
        }

        const MoneyFormat = new Intl.NumberFormat('en-us', { currency: 'USD', style: 'currency' })
        const Treasury = await RetrieveData.treasury(interaction.IDENT, false)
        const guildManager = new GuildHQ(interaction);

        switch (interaction.options.getSubcommand()) {
            case 'add': {

                await interaction.deferReply({ ephemeral: true });
                let ETG = new EntanglementDrive(interaction);

                let ETG_Embed = new EmbedBuilder()
                    .setColor("Yellow")
                    .setTitle("Entnaglement Code")
                    .setDescription(`The Following ETG CODE Must Be Entered Into The ETG Join Command On The Other Server: ||${await ETG.generateEntanglementCode()}||\n\n *One-Time Use, Expires In Two Minutes.*`)

                interaction.editReply({ embeds: [ETG_Embed] })
            } break;

            case 'join': {
                let ETG = new EntanglementDrive(interaction);
                await interaction.deferReply();

                try {
                    let etg_AuthCode = interaction.options.getString("code");

                    await ETG.ETGJoin(etg_AuthCode)
                    const susEmbed = new EmbedBuilder()
                        .setColor("Green")
                        .setTitle("Joined Entanglement")
                        .setDescription("This Server Is Now Entangled And Is Operating Through Another Servers Treasury And Economy.\n\n 🛑 ECON Logging Is No Longer Available For This Server.")
                    interaction.editReply({ embeds: [susEmbed] });

                } catch (err) {
                    console.log(err);
                    await ErrorEmbed(interaction, `Failed To Join Entanglement: ${err.message}`)
                }
            } break

            case 'disengage': {
                let ETG = new EntanglementDrive(interaction);
                await interaction.deferReply();

                try {
                    await ETG.disengage();
                    const susEmbed = new EmbedBuilder()
                        .setColor("Green")
                        .setTitle("Disengaged Entanglement")
                        .setDescription("This Server Has Disengaged From All Entanglements. This Server Is Now Operating On It's Own Treasury and Economy.\n\n 🟢 ECON Logging Is Now Available For The Server.")
                    interaction.editReply({ embeds: [susEmbed] });
                } catch (err) {
                    console.log(err);
                    await ErrorEmbed(interaction, `Disengagement Failed: ${err.message}`)
                }
            } break

            case 'inflate': {

                let amount = interaction.options.getNumber("percentage-amount");

                try {
                    await interaction.deferReply();
                    await guildManager.inflatePrices(amount);

                    const successEmbed = new EmbedBuilder()
                        .setDescription(`Successfully inflated all item prices by **${amount}%**.`)
                        .setColor("Green");

                    return interaction.editReply({ embeds: [successEmbed] });
                } catch (err) {
                    console.log(err)
                    return await ErrorEmbed(interaction, err.message, false, false)
                }
            } break

            case 'deflate': {

                let amount = interaction.options.getNumber("percentage-amount");

                try {
                    await interaction.deferReply();
                    await guildManager.deflatePrices(amount);

                    const successEmbed = new EmbedBuilder()
                        .setDescription(`Successfully deflated all item prices by **-${amount}%**.`)
                        .setColor("Green");

                    return interaction.editReply({ embeds: [successEmbed] });
                } catch (err) {
                    console.log(err)
                    return await ErrorEmbed(interaction, err.message, false, false)
                }
            } break

            case 'set-payroll-tax': {
                let taxValue = interaction.options.getNumber("value");
                let taxType = interaction.options.getString("type")


                if (taxType !== "Flat" && taxType !== "Percentage") {
                    return await ErrorEmbed(interaction, "The tax type must either be \"Fixed\" or \"Percentage\".", false, false);
                }

                await interaction.deferReply()


                try {
                    let displayValue;
                    if (taxType === 'Flat') {
                        displayValue = await guildManager.formatMoney(taxValue);
                    } else {
                        displayValue = `${taxValue}%`
                    }
                    await guildManager.setPayrollTax(taxValue, taxType);

                    let goodEmbed = new EmbedBuilder()
                        .setDescription(`Successfully updated the payroll tax to **${taxType}** with the value of **${displayValue}**.`)
                        .setColor("Green");

                    return interaction.editReply({ embeds: [goodEmbed] })
                } catch (e) {
                    return await ErrorEmbed(interaction, e.message, false, false);
                }

            } break

            case 'set-sales-tax': {
                let taxValue = interaction.options.getNumber("value");
                let taxType = interaction.options.getString("type")

                if (taxType !== "Flat" && taxType !== "Percentage") {
                    return await ErrorEmbed(interaction, "The tax type must either be \"Flat\" or \"Percentage\".", false, false);
                }

                await interaction.deferReply();

                try {
                    let displayValue;
                    if (taxType === 'Flat') {
                        displayValue = await guildManager.formatMoney(taxValue);
                    } else {
                        displayValue = `${taxValue}%`
                    }

                    await guildManager.setSalesTax(taxValue, taxType);

                    let goodEmbed = new EmbedBuilder()
                        .setDescription(`Successfully updated the sales tax to **${taxType}** with the value of **${displayValue}**.`)
                        .setColor("Green");

                    return interaction.editReply({ embeds: [goodEmbed] })
                } catch (e) {
                    return await ErrorEmbed(interaction, e.message, false, false);
                }

            } break

            case 'set-currency': {
                try {
                    await guildManager.setCurrency(interaction.options.getString("symbol"))
                } catch (err) {
                    console.error(err)
                    return ErrorEmbed(interaction, err.message)
                }

                let sucessEmbed = new EmbedBuilder()
                    .setDescription(`Successfully updated the server currency symbol to: ${interaction.options.getString("symbol")}`)
                    .setColor("Green");

                interaction.reply({ embeds: [sucessEmbed] });

            } break

            case 'statistics': {
                await interaction.deferReply()
                const premiumStatus = await guildManager.getPremiumStatus();

                if (premiumStatus === true) {

                    const stats = await guildManager.getStatsPremium();

                    const statsEmbed = new EmbedBuilder()
                        .setTitle("Statistics (Premium)")
                        .addFields(
                            { name: "Total Cicurlating", value: await guildManager.formatMoney(stats.total), inline: true },
                            { name: "Average Printed", value: await guildManager.formatMoney(stats.average), inline: true },
                            { name: "\u200b", value: "\u200b", inline: true },
                            { name: "Circulated (Last 7 Days)", value: await guildManager.formatMoney(stats.sevenDays), inline: true },
                            { name: "Circulated (Last 30 Days)", value: await guildManager.formatMoney(stats.month), inline: true }
                        )
                        .setColor("DarkGreen");
                    await interaction.editReply({ embeds: [statsEmbed] })
                    return;
                }

                const basicStats = await guildManager.getStatsBasic();
                const basicStatsEmbed = new EmbedBuilder()
                    .setTitle("Statistics (Basic)")
                    .addFields(
                        { name: "Total Cicurlating", value: await guildManager.formatMoney(basicStats.total), inline: true },
                        { name: "Average Printed", value: await guildManager.formatMoney(basicStats.average), inline: true })
                    .setColor("DarkGreen");
                const preimumAd = new EmbedBuilder()
                    .setColor("DarkBlue")
                    .setDescription("ℹ️ Unlock More Stats With [Premium](https://discord.com/channels/901182775116300338/1077447346310357103/1244042799310045247).")

                await interaction.editReply({ embeds: [basicStatsEmbed, preimumAd] })
            } break;

            case 'set-logchannel': {

                const logChannel = interaction.options.getChannel('log-channel')

                await interaction.deferReply()
                const permsCheck = await logChannel.permissionsFor(interaction.client.user);

                if ((await permsCheck.has(PermissionsBitField.Flags.SendMessages)) === false) {
                    return await ErrorEmbed(interaction, 'ECON must have \`\`SEND_MESSAGES\`\` permission in the channel you are wanting to set as the logging channel.', false, false)
                }

                try {
                    await UpdateData.logChannel(interaction, logChannel)
                    const susccessEmbed = new EmbedBuilder()
                        .setColor('Green')
                        .setDescription(`\\✅ Successfully updated the Servers log channel to <#${logChannel.id}>.`)
                    await interaction.editReply({ embeds: [susccessEmbed] })
                } catch (err) {
                    console.error(err)
                    return ErrorEmbed(interaction, err.message)
                }

            } break

            case 'clean-up': {

                await activeCleanUp.set(interaction.IDENT, true)

                await interaction.deferReply()

                const Members = await RetrieveData.guildMembers(interaction.IDENT).catch(async err => {
                    console.warn(err)
                    await ErrorEmbed(this.interaction, err.message)
                });

                let inactiveCollection = [];

                for (const member of Members) {
                    try {
                        await interaction.guild.members.fetch(String(member.id));
                    } catch (err) {
                        if (err.message === "Unknown Member") {
                            inactiveCollection.push(member)
                            continue
                        }
                        console.warn("CLEANUP ERROR | ", err.message)
                    }
                }

                let amountToCollect = 0;
                let records = [{}]

                for (const inactee of inactiveCollection) {
                    const inacteeAccounts = await RetrieveData.userBasicAccountsByIDENT(inactee.IDENT);
                    const inacteeNet = Number(inacteeAccounts.bank.balance) + Number(inacteeAccounts.wallet.balance)
                    amountToCollect = Number(amountToCollect) + Number(inacteeNet);
                    records.push({ DiscordID: inactee.id, AmountCollected: inacteeNet, newTotal: amountToCollect, IDENT: inactee.IDENT })

                    await UpdateData.inactivateMember(interaction, inactee.IDENT, inacteeAccounts)
                }

                const newTresBal = Number(Treasury.balance) + Number(amountToCollect);
                await UpdateData.treasuryBalance(interaction.IDENT, newTresBal)

                const csvCollection = await csvGenerator(["DiscordID", "AmountCollected", "newTotal", "IDENT"], records)
                const recordsAttachment = new AttachmentBuilder(Buffer.from(csvCollection), { name: `${interaction.guild.name}-CleanUpMembers.csv` })

                await activeCleanUp.set(interaction.IDENT, false)

                interaction.editReply(`The following attached member account's have been cleaned up.`)

                interaction.followUp({ files: [recordsAttachment] })
            } break

            case 'view-fees': {
                await interaction.deferReply();
                const viewAll = interaction.options.getBoolean('view-all');
                const feesCollection = await Treasury.getFees({ raw: true }).catch(async err => {
                    console.warn(err)
                    await ErrorEmbed(this.interaction, err.message)
                });

                if (viewAll) {

                    let collection = [{}]

                    for (const fee of feesCollection) {
                        let Department = await new DepartmentHQ(interaction, fee.department)
                        const depName = await Department.getName()
                        let client = await RetrieveData.userByIDENT(fee.client);
                        client = await interaction.guild.members.fetch(client.id)
                        let issuer = await RetrieveData.userByIDENT(fee.issuer)
                        issuer = await interaction.guild.members.fetch(issuer.id)
                        collection.push({ Department: depName, Client: client.user.username, Fee: fee.fee, Amount: fee.amount, Issuer: issuer.user.username })
                    }

                    const feeCSVcollection = await csvGenerator(['Department', 'Client', 'Fee', 'Amount', 'Issuer'], collection)
                    const feesAttachment = new AttachmentBuilder(Buffer.from(feeCSVcollection), { name: `${interaction.guild.name}-Fees.csv` })

                    const csvEmbed = new EmbedBuilder()
                        .setTitle('\\✅ Attaching CSV file now.')
                        .setTimestamp()
                        .setColor('Green')
                        .setFooter({
                            text: `${interaction.guild.name} Economy System`, iconURL: interaction.guild.iconURL(),
                        });

                    await interaction.editReply({ embeds: [csvEmbed] })
                    interaction.followUp({ files: [feesAttachment] })

                    return
                }

                let feesFileds = "``Department | Client | Fee | Amount | Issuer``\n";

                for (const fee of feesCollection) {
                    let Department = await new DepartmentHQ(interaction, fee.department)
                    const depName = await Department.getName()
                    let client = await RetrieveData.userByIDENT(fee.client);
                    client = await interaction.guild.members.fetch(client.id)
                    let issuer = await RetrieveData.userByIDENT(fee.issuer)
                    issuer = await interaction.guild.members.fetch(issuer.id)

                    feesFileds = feesFileds + `${depName} | ${client.user.username} | ${fee.fee} | ${await guildManager.formatMoney(fee.amount)} | ${issuer.user.username}\n`
                }

                const feeEmbed = new EmbedBuilder()
                    .setTitle(`${interaction.guild.name}'s Issued Fees`)
                    .setDescription(feesFileds)
                    .setColor('DarkGold')
                    .setTimestamp()
                    .setFooter({
                        text: `${interaction.guild.name} Economy System`, iconURL: interaction.guild.iconURL(),
                    });

                interaction.editReply({ embeds: [feeEmbed] })

            } break

            case 'dismiss-fine': {
                const citation = interaction.options.getString('fine');

                await interaction.deferReply();

                await UpdateData.removeCitation(interaction, citation).catch(err => {
                    return ErrorEmbed(interaction, err.message, false, true);
                })

                const susEmbed = new EmbedBuilder()
                    .setColor("Green")
                    .setTitle(`\\✅ Successfully dismissed fine.`)
                    .setTimestamp()
                    .setFooter({
                        text: `${interaction.guild.name} Economy System`, iconURL: interaction.guild.iconURL(),
                    });

                interaction.editReply({ embeds: [susEmbed] })
            } break

            case 'view-fines': {
                await interaction.deferReply();


                const citationCollection = await Treasury.getCitations({ raw: true });
                console.log(citationCollection)

                if (citationCollection.length > 30) {

                    let collection = [{}]

                    for (const cite of citationCollection) {
                        let Department = await new DepartmentHQ(interaction, cite.department)
                        const depName = await Department.getName()
                        let violatorID = await RetrieveData.userByIDENT(cite.violator);
                        let issuerID = await RetrieveData.userByIDENT(cite.issuer)
                        let violator = null, issuer = null;

                        try {
                            violator = await interaction.guild.members.fetch(violatorID.id)
                            issuer = await interaction.guild.members.fetch(issuerID.id)

                        } catch (e) {
                            console.log("Returning due to unknown member");
                            console.log(e)
                            continue;
                        }

                        if (violator === null) { violator = { user: { username: "Member No Longer In Server" } } }
                        if (issuer === null) { issuer = { user: { username: "Member No Longer In Server" } } }

                        collection.push({ Department: depName, Violator: violator.user.username, Character: cite.character, RecordID: cite.cadRecordID, Amount: cite.amount, Issuer: issuer.user.username })
                    }

                    const citationCSVcollection = await csvGenerator(['Department', 'Violator', 'Character', 'RecordID', 'Amount', 'Issuer'], collection)
                    const citationsAttachment = new AttachmentBuilder(Buffer.from(citationCSVcollection), { name: `${interaction.guild.name}-Citations.csv` })

                    const csvEmbed = new EmbedBuilder()
                        .setTitle('\\✅ Attaching CSV file now.')
                        .setTimestamp()
                        .setColor('Green')
                        .setFooter({
                            text: `${interaction.guild.name} Economy System`, iconURL: interaction.guild.iconURL(),
                        });

                    await interaction.editReply({ embeds: [csvEmbed] })
                    interaction.followUp({ files: [citationsAttachment] })

                    return
                }

                let citationFileds = "``Department | Violator | Character | Record ID | Amount | Issuer``\n";

                for (const cite of citationCollection) {
                    let Department = await new DepartmentHQ(interaction, cite.department)
                    const depName = await Department.getName()
                    let violatorID = await RetrieveData.userByIDENT(cite.violator);
                    let issuerID = await RetrieveData.userByIDENT(cite.issuer)
                    let violator = null, issuer = null;

                    try {
                        violator = await interaction.guild.members.fetch(violatorID.id)
                        issuer = await interaction.guild.members.fetch(issuerID.id)

                    } catch (e) {
                        console.log("Returning due to unknown member");
                        console.log(e)
                        continue;
                    }

                    if (violator === null) { violator = { user: { username: "Member No Longer In Server" } } }
                    if (issuer === null) { issuer = { user: { username: "Member No Longer In Server" } } }


                    citationFileds = citationFileds + `${depName} | ${violator.user.username} | ${cite.character} | ${cite.cadRecordID} | ${await guildManager.formatMoney(cite.amount)} | ${issuer.user.username}\n`
                }

                const citeEmbed = new EmbedBuilder()
                    .setTitle(`${interaction.guild.name} Server | Unpaid Fines`)
                    .setDescription(citationFileds)
                    .setColor('Greyple')
                    .setTimestamp()
                    .setFooter({
                        text: `${interaction.guild.name} Economy System`, iconURL: interaction.guild.iconURL(),
                    });

                interaction.editReply({ embeds: [citeEmbed] })
            } break

            case 'edit-business': {
                await interaction.deferReply();
                const Embed = new EmbedBuilder()
                    .setColor('Green')
                    .setTimestamp()
                    .setFooter({
                        text: `${interaction.guild.name} Economy System`, iconURL: interaction.guild.iconURL(),
                    });

                const busIDENT = interaction.options.getString('business');
                const Name = interaction.options.getString('name');
                const Description = interaction.options.getString('description');
                const Owner = interaction.options.getUser('owner');
                const SelfServed = interaction.options.getBoolean('selfserved')
                const Role = interaction.options.getRole('role');

                const Business = await new BusinessHQ(interaction, busIDENT);

                let EmbedDesc = "";

                if (typeof Name !== "undefined" && Name !== null) {
                    await Business.edit.name(Business, Name).catch(err => {
                        return ErrorEmbed(interaction, err.message, false, true);
                    });

                    EmbedDesc = EmbedDesc + '\n Successfully changed the business name to ``' + Name + '``.'
                }

                if (typeof Description !== "undefined" && Description !== null) {
                    await Business.edit.description(Business, Description).catch(err => {
                        return ErrorEmbed(interaction, err.message, false, true);
                    });

                    EmbedDesc = EmbedDesc + '\n Successfully changed the business description to ``' + Description + '``.'
                }

                if (typeof Role !== "undefined" && Role !== null) {
                    await Business.edit.role(Business, Role).catch(err => {
                        return ErrorEmbed(interaction, err.message, false, true);
                    });

                    EmbedDesc = EmbedDesc + `\n Successfully changed the business role to ${Role}.`
                }

                if (typeof Owner !== "undefined" && Owner !== null) {
                    const User = await new UserHQ(interaction, Owner.id);
                    await User.getIDENT();
                    await Business.edit.owner(Business, await User.getIDENT(), Owner).catch(err => {
                        return ErrorEmbed(interaction, err.message, false, true);
                    });

                    EmbedDesc = EmbedDesc + `\n Successfully changed the business owner to ${Owner}.`

                }

                if (typeof SelfServed !== "undefined" && SelfServed !== null) {
                    await Business.edit.selfServed(Business, SelfServed).catch(err => {
                        return ErrorEmbed(interaction, err.message, false, true);
                    });

                    EmbedDesc = EmbedDesc + `\n Successfully changed the business SelfServed to ${SelfServed}.`

                }

                Embed.setDescription(EmbedDesc)
                return interaction.editReply({ embeds: [Embed] })

            }
            case 'edit-department': {

                await interaction.deferReply();
                const Embed = new EmbedBuilder()
                    .setColor('Green')
                    .setTimestamp()
                    .setFooter({
                        text: `${interaction.guild.name} Economy System`, iconURL: interaction.guild.iconURL(),
                    });

                const Department = interaction.options.getString('department');
                const Name = interaction.options.getString('department-name');
                const Desc = interaction.options.getString('department-description');
                const HeadRole = interaction.options.getRole('department-head-role');
                const DepartmentRole = interaction.options.getRole('department-role');
                const DepartmentBudget = interaction.options.getNumber('department-budget');
                const MaxBal = interaction.options.getNumber('department-max-balance')

                const DEPARTMENT = await new DepartmentHQ(interaction, Department);
                let EmbedDesc = "Nothing selected to edit.";

                if (typeof Name !== "undefined" && Name !== null) {
                    await DEPARTMENT.editDepartment.name(DEPARTMENT, Name).catch(err => {
                        return ErrorEmbed(interaction, err.message, false, true);
                    });

                    EmbedDesc = EmbedDesc + '\n Successfully changed the department name to ``' + Name + '``.'
                }

                if (typeof Desc !== "undefined" && Desc !== null) {
                    await DEPARTMENT.editDepartment.description(DEPARTMENT, Desc).catch(err => {
                        return ErrorEmbed(interaction, err.message, false, true);
                    });

                    EmbedDesc = EmbedDesc + '\n Successfully changed the department description to ``' + Desc + '``.'
                }

                if (typeof HeadRole !== "undefined" && HeadRole !== null) {
                    await DEPARTMENT.editDepartment.headRole(DEPARTMENT, HeadRole).catch(err => {
                        return ErrorEmbed(interaction, err.message, false, true);
                    });

                    EmbedDesc = EmbedDesc + `\n Successfully changed the department head role to ${HeadRole}.`
                }

                if (typeof DepartmentRole !== "undefined" && DepartmentRole !== null) {
                    await DEPARTMENT.editDepartment.departmentRole(DEPARTMENT, DepartmentRole).catch(err => {
                        return ErrorEmbed(interaction, err.message, false, true);
                    });

                    EmbedDesc = EmbedDesc + `\n Successfully changed the department role to ${DepartmentRole}.`

                }

                if (typeof DepartmentBudget !== "undefined" && DepartmentBudget !== null) {
                    await DEPARTMENT.editDepartment.departmentBudget(DEPARTMENT, DepartmentBudget).catch(err => {
                        return ErrorEmbed(interaction, err.message, false, true);
                    });

                    EmbedDesc = EmbedDesc + '\n Successfully changed the department budget to ' + await guildManager.formatMoney(DepartmentBudget) + '.'

                }

                if (typeof MaxBal !== "undefined" && MaxBal !== null) {
                    await DEPARTMENT.editDepartment.maxBalance(DEPARTMENT, MaxBal).catch(err => {
                        return ErrorEmbed(interaction, err.message, false, true);
                    });

                    EmbedDesc = EmbedDesc + '\n Successfully changed the department max balance to ``' + MaxBal + '``.'
                }

                Embed.setDescription(EmbedDesc)
                return interaction.editReply({ embeds: [Embed] })
            } break

            case 'balance': {
                await interaction.deferReply();
                const Treasury = await RetrieveData.treasury(interaction.IDENT, true);
                const SusEmebed = new discord.EmbedBuilder()
                    .setTitle(`Treasury Account`,)
                    .setDescription('The Treasury account currently has a balance of ' + await guildManager.formatMoney(Treasury.balance) + '.')
                    .setColor(discord.Colors['Green'])
                    .setTimestamp()
                    .setFooter({
                        text: `${interaction.guild.name} Economy System`, iconURL: interaction.guild.iconURL(),
                    })
                return interaction.editReply({ embeds: [SusEmebed] });

            } break

            case 'set-starting-balance': {
                await interaction.deferReply();
                const amount = interaction.options.getNumber('amount');
                await UpdateData.treasuryStartingBalance(interaction.IDENT, amount).catch((error) => {
                    console.log(error);
                    return ErrorEmbed(interaction, "Error creating business! " + error.message);
                });

                const SusEmebed = new discord.EmbedBuilder()
                    .setTitle(`Updated Starting Balance`,)
                    .setColor(discord.Colors['Green'])
                    .setTimestamp()
                    .setFooter({
                        text: `${interaction.guild.name} Economy System`, iconURL: interaction.guild.iconURL(),
                    })
                    .setDescription(`The starting balance for all newly registered users has been set to ${await guildManager.formatMoney(amount)}`)
                return interaction.editReply({ embeds: [SusEmebed] });
            } break

            case 'fund-department': {
                await interaction.deferReply();
                const Treasury = await RetrieveData.treasury(interaction.IDENT, true)
                if ((Number(await Treasury.balance) - Number(interaction.options.getNumber('amount')) <= 0)) {
                    const DeclineEmebed = new discord.EmbedBuilder()
                        .setTitle(`Unable To Fund Department`,)
                        .setColor(discord.Colors['Red'])
                        .setTimestamp()
                        .setFooter({
                            text: `${interaction.guild.name} Economy System`, iconURL: interaction.guild.iconURL(),
                        })
                        .setDescription('Unable to fund department. Insufficient funds from Treasury.')
                    return interaction.editReply({ embeds: [DeclineEmebed] });
                }
                const amount = interaction.options.getNumber('amount');
                const department = await new DepartmentHQ(interaction, interaction.options.getString('department'))

                await UpdateData.departmentBalance(interaction, department, amount)

                const Emebed = new discord.EmbedBuilder()
                    .setTitle(`Department Funded.`,)
                    .setColor(discord.Colors['Green'])
                    .setTimestamp()
                    .setFooter({
                        text: `${interaction.guild.name} Economy System`, iconURL: interaction.guild.iconURL(),
                    })
                    .setDescription(`**${await department.getName()}** has been funded ${await guildManager.formatMoney(amount)} using Treasury funds.`)
                interaction.editReply({ embeds: [Emebed] })
            } break

            case 'add-business':
                {
                    await interaction.deferReply();
                    //Create constants for the options.
                    const name = interaction.options.getString("name");
                    const description = interaction.options.getString("description");
                    const owner = interaction.options.getUser("owner").id;
                    const selfServed = interaction.options.getBoolean("selfserved");
                    let role = interaction.options.getRole("role") ?? null;

                    if (role !== null) {
                        role = role.id;
                    }

                    //Create the business.
                    await CreateData.businessAccount(
                        interaction,
                        name,
                        description,
                        owner,
                        selfServed,
                        role
                    )
                        .then(async (result) => {
                            const embed = await SimpleEmbed(
                                interaction,
                                "Successfully created business!",
                                `${name} has been created!`,
                                "Green",
                                null
                            );
                            return interaction.editReply({ embeds: [embed] });
                        })
                        .catch(async (error) => {
                            console.log(error);
                            return await ErrorEmbed(interaction, "Error creating business! " + error.message);
                        });
                } break

            case 'remove-business':
                {
                    try {

                        await interaction.deferReply();
                        const bussIDENT = interaction.options.getString("business");
                        const resultEmbed = new EmbedBuilder()
                            .setColor("Green");
                        const businessManager = new BusinessHQ(interaction, bussIDENT);
                        const busName = await businessManager.getName();

                        await businessManager.dissolve();

                        resultEmbed.setDescription(`Successfully removed ${busName}.`)

                        await interaction.editReply({ embeds: [resultEmbed] });
                    } catch (err) {
                        console.log(err);
                        return await ErrorEmbed(interaction, err.message, false, false);
                    }

                } break

            case 'print-money':
                {
                    const MoneyFormat = new Intl.NumberFormat('en-us', { currency: 'USD', style: 'currency' })

                    const treasury = await RetrieveData.treasury(interaction.IDENT);
                    await UpdateData.treasuryBalance(interaction.IDENT, Number(treasury.balance) + interaction.options.getNumber('amount'));
                    await CreateData.treasuryPrint(interaction, interaction.options.getNumber('amount'), interaction.options.getString('reason'))
                    const embed = await SimpleEmbed(interaction, 'Inflation Successful', 'The balance of the treasury account is now ' + await guildManager.formatMoney(Number(treasury.balance) + Number(interaction.options.getNumber('amount'))), 'Green', null);
                    interaction.reply({ embeds: [embed], components: [] });

                    await NotificationHQ.inflationNotification(interaction, interaction.options.getNumber('amount'));
                } break

            case 'add-department':
                {
                    const Name = interaction.options.getString('department-name');
                    const HeadRole = interaction.options.getRole('department-head-role');
                    const MemberRole = interaction.options.getRole('department-role');
                    const Desc = interaction.options.getString('department-description');
                    const Budget = interaction.options.getNumber('department-budget');
                    const MaxBal = interaction.options.getNumber('department-max-balance');

                    await interaction.deferReply();
                    await CreateData.department(interaction, Name, HeadRole.id, MemberRole.id, Desc, Budget, MaxBal).catch(async err => {
                        console.log(err);
                        await ErrorEmbed(interaction, `An error occurred: ${err.message}`, false, true)
                        return;
                    })
                    const SuccessEmbed = new discord.EmbedBuilder()
                        .setTitle(`Successfully Created ${Name}`,)
                        .setColor(discord.Colors['Green'])
                        .setTimestamp()
                        .setFooter({
                            text: `${interaction.guild.name} Economy System`, iconURL: interaction.guild.iconURL(),
                        })
                        .setDescription(`**Department Head Role:** ${HeadRole}\n **Member Role:** ${MemberRole}\n **Budget:** $${Budget}\n **Max Balance:** ${MaxBal}\n **Description:** ${Desc}`);
                    interaction.editReply({ embeds: [SuccessEmbed] })
                } break

            case 'remove-department':
                {
                    try {
                        await interaction.deferReply();

                        const depIDENT = interaction.options.getString("department");
                        const depManager = new DepartmentHQ(interaction, depIDENT);
                        const depName = await depManager.getName();

                        const resultEmbed = new EmbedBuilder()
                            .setColor("Green");

                        await depManager.dissolve();

                        resultEmbed.setDescription(`Sucessfully removed ${depName}.`);

                        await interaction.editReply({ embeds: [resultEmbed] });

                    } catch (err) {
                        console.log(err);

                        return await ErrorEmbed(interaction, err.message, false, false)
                    }

                } break

            case 'set-stipend': {
                const Stipend = interaction.options.getNumber('stipend');
                const Timeout = interaction.options.getNumber('timeout')
                await interaction.deferReply({ ephemeral: true });
                await UpdateData.treasuryStipend(interaction.IDENT, Stipend, Timeout).catch(async err => {
                    console.error(err);
                    await ErrorEmbed(interaction, `An error occurred: ${err.message}`, false, true)
                })
                const SuccessEmbed = new discord.EmbedBuilder()
                    .setTitle(`Successfully Updated Stipend`,)
                    .setColor(discord.Colors['Green'])
                    .setTimestamp()
                    .setFooter({
                        text: `${interaction.guild.name} Economy System`, iconURL: interaction.guild.iconURL(),
                    })
                    .setDescription(`The stipend has been updated to $${Stipend}. Users are able to claim this stipend every ${Timeout} hours.`);
                interaction.editReply({ embeds: [SuccessEmbed] })
            } break

            case 'set-budget-timeout': {
                const Timeout = interaction.options.getNumber('dep-timeout')
                await interaction.deferReply({ ephemeral: true });
                await UpdateData.treasuryBudgetTimeout(interaction.IDENT, Timeout).catch(async err => {
                    console.error(err);
                    await ErrorEmbed(interaction, `An error occurred: ${err.message}`, false, true)
                })
                const SuccessEmbed = new discord.EmbedBuilder()
                    .setTitle(`Successfully Updated Timeout`,)
                    .setColor(discord.Colors['Green'])
                    .setTimestamp()
                    .setFooter({
                        text: `${interaction.guild.name} Economy System`, iconURL: interaction.guild.iconURL(),
                    })
                    .setDescription(`The timeout for budget claiming has been updated to ${Timeout}.`);
                interaction.editReply({ embeds: [SuccessEmbed] })
            } break
        }
    }
};
