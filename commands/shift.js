const { Interaction, EmbedBuilder, SlashCommandBuilder, Colors, AttachmentBuilder, } = require("discord.js");
const { activeBusiness, activeDepartment } = require("../dataCrusher/Headquarters").CacheManager;
const { ErrorEmbed } = require("../utils/embedUtil");
const { RetrieveData, BusinessHQ, CreateData, UpdateData, UserHQ } = require("../dataCrusher/Headquarters.js");
const { PermManager, DepartmentHQ, GuildHQ } = require("../dataCrusher/Headquarters");
const { activeShifts } = require("../dataCrusher/services/cache");
const { csvGenerator } = require("../utils/csvGenerator");
const { currentPromotion } = require("../utils/PromotionUtil");
const MoneyFormat = new Intl.NumberFormat('en-us', { currency: 'USD', style: 'currency' })

module.exports = {
    data: new SlashCommandBuilder()
        .setName("shift")
        .setDescription("Command used to view and interact with shifts..")

        //  Clokcing In / Out Command
        .addSubcommand((subCmd) =>
            subCmd.setName('clock').setDescription('Used to clock In & Out.')
                .addStringOption((stringOp) =>
                    stringOp.setName('entity-type').setDescription('Type of entity (Business or Department) to use for this shift.').setRequired(true)
                        .addChoices(
                            { name: 'Business', value: 'business' },
                            { name: 'Department', value: 'department' }
                        ))
                .addStringOption((stringOp) =>
                    stringOp.setName("action").setDescription('Would you like to Clock-In or Clock-Out?')
                        .setRequired(true)
                        .addChoices(
                            { name: 'clock-in', value: 'IN' },
                            { name: 'clock-out', value: 'OUT' }
                        )
                ))

        //  Viewing Shifts
        .addSubcommand(subCmd =>
            subCmd.setName('view')
                .setDescription('View selected shift.')
                .addStringOption((stringOp) =>
                    stringOp.setName('entity-type').setDescription('Type of entity (Business or Department) that should be used to retrieve your shifts.').setRequired(true)
                        .addChoices(
                            { name: 'Business', value: 'business' },
                            { name: 'Department', value: 'department' }
                        ))
                .addUserOption(userOp =>
                    userOp.setName('user').setDescription('Would you like to view all shift logs of another user?').setRequired(false)
                ))

        //  Stats
        .addSubcommand(subCmd =>
            subCmd.setName('stats')
                .setDescription('View the shift stats for any given entity.')
                .addStringOption((stringOp) =>
                    stringOp.setName('entity-type').setDescription('Type of entity (Business or Department) that should be used to retrieve your shifts.').setRequired(true)
                        .addChoices(
                            { name: 'Business', value: 'business' },
                            { name: 'Department', value: 'department' }
                        )))

        //  User Stats
        .addSubcommand(subCmd =>
            subCmd.setName('user-stats')
                .setDescription('View the shift stats for any given entity.')
                .addStringOption((stringOp) =>
                    stringOp.setName('entity-type').setDescription('Type of entity that should be used to retrieve your shifts. Or retrieve all your shifts.').setRequired(true)
                        .addChoices(
                            { name: 'Business', value: 'business' },
                            { name: 'Department', value: 'department' },
                            { name: "ALL", value: "all" }
                        ))
                .addUserOption(userOp => userOp.setName('user').setDescription('The user that you would like to view stats for.').setRequired(false))
        )

        //  Export Shifts
        .addSubcommand(subCmd =>
            subCmd.setName('export')
                .setDescription('Export a record of shifts submitted in a payroll format.')
                .addStringOption((stringOp) =>
                    stringOp.setName('entity-type').setDescription('Type of entity (Business or Department) that should be used to retrieve your shifts.').setRequired(true)
                        .addChoices(
                            { name: 'Business', value: 'business' },
                            { name: 'Department', value: 'department' }
                        ))
                .addStringOption((stringOp) =>
                    stringOp.setName('format').setDescription('Would you like to view an embed version or export to a CSV file?').setRequired(true)
                        .addChoices(
                            { name: 'CSV', value: 'csv' },
                            { name: 'Embed', value: 'embed' }
                        ))
        )

        //  Pay Commands
        .addSubcommandGroup(group =>
            group.setName('pay').setDescription('All payment methods.')

                //  Execute Payroll
                .addSubcommand(subCmd =>
                    subCmd.setName('execute-payroll').setDescription('Execute Payroll Through ECON Shifts.')
                        .addStringOption((stringOp) =>
                            stringOp.setName('entity-type').setDescription('Type of entity (Business or Department) that should be used to retrieve your shifts.').setRequired(true)
                                .addChoices(
                                    { name: 'Business', value: 'business' },
                                    { name: 'Department', value: 'department' }
                                ))
                        .addStringOption((stringOp) =>
                            stringOp.setName('from').setDescription("Payroll start date, formatted as XX/XX/XX, UTC.").setRequired(true))
                        .addStringOption((stringOp) =>
                            stringOp.setName('to').setDescription("Payroll end date, formatted as XX/XX/XX, UTC.").setRequired(true)))
        )

        //  Manage Shifts Commands
        .addSubcommandGroup(group =>
            group.setName('manage').setDescription('Manage Shifts.')
                
                // Add Role-Based Pay
                .addSubcommand(subCmd =>
                    subCmd.setName('add-role-pay').setDescription('Bind a role with additional pay, on top of base pay.')
                        .addStringOption((stringOp) =>
                            stringOp.setName('entity-type').setDescription('Type of entity (Business or Department) that should be used to retrieve your shifts.').setRequired(true)
                                .addChoices(
                                    { name: 'Business', value: 'business' },
                                    { name: 'Department', value: 'department' }
                                ))
                        .addRoleOption(roleOp => roleOp.setName('role').setDescription('The role to be bound with additional pay.').setRequired(true))
                        .addNumberOption(numberOp => numberOp.setName('amount').setDescription('The amount to be bound with the role.').setRequired(true)))
                
                //  Remove Role-Based Pay
                .addSubcommand(subCmd =>
                    subCmd.setName('remove-role-pay').setDescription('Remove a role with additional pay.')
                        .addStringOption((stringOp) =>
                            stringOp.setName('entity-type').setDescription('Type of entity (Business or Department) that should be used to retrieve your shifts.').setRequired(true)
                                .addChoices(
                                    { name: 'Business', value: 'business' },
                                    { name: 'Department', value: 'department' }
                                ))
                        .addRoleOption(roleOp => roleOp.setName('role').setDescription('The role to be removed from additional pay.').setRequired(true)))
        
                // View Additional Pay
                .addSubcommand(subCmd =>
                    subCmd.setName('view-additional-pay').setDescription('View all additional pay binded with roles.')
                        .addStringOption(stringOp =>
                            stringOp.setName('entity-type').setDescription('Type of entity (Business or Department) that should be used to retrieve your shifts.').setRequired(true)
                                .addChoices(
                                    { name: 'Business', value: 'business' },
                                    { name: 'Department', value: 'department' }
                                )))

                // Set Base Pay
                .addSubcommand(subCmd =>
                    subCmd.setName('set-base').setDescription('The the amount that should be paid as the base hourly rate.')
                        .addStringOption((stringOp) =>
                            stringOp.setName('entity-type').setDescription('Type of entity (Business or Department) that should be used to retrieve your shifts.').setRequired(true)
                                .addChoices(
                                    { name: 'Business', value: 'business' },
                                    { name: 'Department', value: 'department' }
                                ))
                        .addNumberOption(numberOp => numberOp.setName('amount').setDescription('The amount to be paid.').setRequired(true)))

                //  Remove Shift
                .addSubcommand(subCmd =>
                    subCmd.setName('remove-shift')
                        .setDescription(`Remove a shift record from a user.`)
                        .addStringOption(stringOp =>
                            stringOp.setName('entity-type').setDescription('Type of entity (Business or Department) that should be used to retrieve your shifts.').setRequired(true)
                                .addChoices(
                                    { name: 'Business', value: 'business' },
                                    { name: 'Department', value: 'department' }
                                ))

                        .addUserOption(userOp => userOp.setName('user').setDescription('The user that you would like to delete a shift record from.').setRequired(true))

                        .addStringOption(stringOp =>
                            stringOp.setName('shift').setDescription('The shift to be removed. Search by start date & time. (en-us, UTC)').setRequired(true)
                                .setAutocomplete(true)))

                //  Clear Shifts
                .addSubcommand(subCmd =>
                    subCmd.setName('clear-shifts')
                        .setDescription(`Remove all shift from an entity, to reset the pay period.`)
                        .addStringOption(stringOp =>
                            stringOp.setName('entity-type').setDescription('Type of entity (Business or Department) that should be used to retrieve your shifts.').setRequired(true)
                                .addChoices(
                                    { name: 'Business', value: 'business' },
                                    { name: 'Department', value: 'department' }
                                )))
        )
    ,

    //  AUTOCOMPLETE
    async autocomplete(interaction) {

        const focusedOption = interaction.options.getFocused(true);
        const Treasury = await RetrieveData.treasury(interaction.IDENT, false)
        switch (focusedOption.name) {
            case "sort-by-department": {
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
            }
                break

            case "sort-by-business": {
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
            }
                break

            case 'shift': {
                console.warn(interaction.options.get('user'))
                if (interaction.options.get('user') === null || interaction.options.get('entity-type') === null) {
                    return await interaction.respond([{
                        name: "Error, You must select a user/entity-type.",
                        value: "Error"
                    }]);
                }
                const DiscUser = await interaction.options.get('user').value

                const User = await new UserHQ(interaction, DiscUser);

                await User.getIDENT();

                const authorUser = await new UserHQ(interaction, interaction.user.id)

                let Entity;
                switch (interaction.options.getString('entity-type')) {
                    case 'business': {
                        Entity = await authorUser.getBusiness()
                    } break

                    case 'department': {
                        Entity = await authorUser.getDepartment()
                    }
                }

                if (Entity === null) {
                    return await interaction.respond([{
                        name: "Error, You must set your business/department first.",
                        value: "Error"
                    }]);
                }

                const choices = await User.getShifts({ IDENT: Entity });

                if (choices.length === 0) {
                    return await interaction.respond([{
                        name: "Error, this user does not have any shifts logged.",
                        value: "Error"
                    }]);
                }

                if (focusedOption.value === "") {
                    await interaction.respond(
                        choices.map(choice => ({ name: `Start: ${new Date(choice.start).toLocaleString('en-us', { timeZone: 'UTC' })} | End: ${new Date(choice.end).toLocaleString('en-us', { timeZone: 'UTC' })}`, value: choice.IDENT })),
                    );
                    return
                }

                const filtered = await choices.filter(choice => {
                    const time = new Date(choice.start).toLocaleString('en-us', { timeZone: 'UTC' })
                    return String(time).includes(focusedOption.value)
                });

                if (filtered.length === 0) {
                    return await interaction.respond(
                        choices.map(choice => ({ name: `Start: ${new Date(choice.start).toLocaleString('en-us', { timeZone: 'UTC' })} | End: ${new Date(choice.end).toLocaleString('en-us', { timeZone: 'UTC' })}`, value: choice.IDENT })),
                    );
                }
                await interaction.respond(
                    filtered.map(choice => ({ name: `Start: ${new Date(choice.start).toLocaleString('en-us', { timeZone: 'UTC' })} | End: ${new Date(choice.end).toLocaleString('en-us', { timeZone: 'UTC' })}`, value: choice.IDENT })),
                );
            }
        }
    },
    async execute(interaction) {
        const guildManager = new GuildHQ(interaction);
        // *** Entity Fetching ***
        const Type = interaction.options.getString('entity-type');
        let Entity = null;
        switch (Type) {
            case 'all': { }
            case 'business': {
                const activeUSER = await new UserHQ(interaction, interaction.user.id);
                if (await activeUSER.getBusiness() == null) {
                    return await ErrorEmbed(interaction, "Please select a business first by using /set business!");
                }

                Entity = await activeBusiness.get(`${interaction.IDENT}-${interaction.user.id}`)

                const BUSINESS = await new BusinessHQ(interaction, Entity)
                if ((await PermManager.Business.checkPerm(BUSINESS, interaction, 'pos') === false)) {
                    return await ErrorEmbed(interaction, "Insufficient perms. You must have the POS permissions.")
                }

                switch (interaction.options.getSubcommand()) {
                    case 'clock': {
                        if ((await PermManager.Business.checkPerm(BUSINESS, interaction, 'pos') === false)) {
                            return await ErrorEmbed(interaction, "Insufficient perms. You must have the POS permissions.")
                        }
                        break
                    }

                    case 'view': {

                        break
                    }

                    case 'stats': {
                        if ((await PermManager.Business.checkPerm(BUSINESS, interaction, 'manager') === false)) {
                            return await ErrorEmbed(interaction, "Insufficient perms. You must have the Manager permissions.")
                        }
                        break
                    }

                    case 'set-base': {
                        if ((await PermManager.Business.checkPerm(BUSINESS, interaction, 'admin') === false)) {
                            return await ErrorEmbed(interaction, "Insufficient perms. You must have the Admin permissions.")
                        }
                        break
                    }

                    case 'add-role-pay': {
                        if ((await PermManager.Business.checkPerm(BUSINESS, interaction, 'admin') === false)) {
                            return await ErrorEmbed(interaction, "Insufficient perms. You must have the Admin permissions.")
                        }
                        break
                    }

                    case 'remove-role-pay': {
                        if ((await PermManager.Business.checkPerm(BUSINESS, interaction, 'admin') === false)) {
                            return await ErrorEmbed(interaction, "Insufficient perms. You must have the Admin permissions.")
                        }
                        break
                    }

                    case 'view-additional-pay': {
                        if ((await PermManager.Business.checkPerm(BUSINESS, interaction, 'supervisor') === false)) {
                            return await ErrorEmbed(interaction, "Insufficient perms. You must have the Supervisor permissions.")
                        }
                        break
                    }

                    case 'export': {
                        if ((await PermManager.Business.checkPerm(BUSINESS, interaction, 'supervisor') === false)) {
                            return await ErrorEmbed(interaction, "Insufficient perms. You must have the Supervisor permissions.")
                        }
                        break
                    }

                    case 'execute-payroll': {
                        if ((await PermManager.Business.checkPerm(BUSINESS, interaction, 'supervisor') === false)) {
                            return await ErrorEmbed(interaction, "Insufficient perms. You must have the Supervisor permissions.")
                        }
                        break
                    }

                    case 'remove-shift': {
                        if ((await PermManager.Business.checkPerm(BUSINESS, interaction, 'supervisor') === false)) {
                            return await ErrorEmbed(interaction, "Insufficient perms. You must have the Supervisor permissions.")
                        }
                        break
                    } break

                    case 'clear-shifts': {
                        if ((await PermManager.Business.checkPerm(BUSINESS, interaction, 'supervisor') === false)) {
                            return await ErrorEmbed(interaction, "Insufficient perms. You must have the Supervisor permissions.")
                        }
                        break
                    } break
                }

                Entity = BUSINESS
            }
                break
            case 'department': {
                const activeUSER = await new UserHQ(interaction, interaction.user.id);
                if (await activeUSER.getDepartment() == null) {
                    return await ErrorEmbed(interaction, "Please select a department first by using /set department!");
                }

                Entity = await activeDepartment.get(`${interaction.IDENT}-${interaction.user.id}`)

                const DEPARTMENT = await new DepartmentHQ(interaction, Entity)

                if ((await PermManager.Department.checkPerm(interaction, DEPARTMENT, 'Member') === false)) {
                    return await ErrorEmbed(interaction, "Insufficient perms. You must be a member of this department.")
                }

                switch (interaction.options.getSubcommand()) {
                    case 'clock': {
                        if ((await PermManager.Department.checkPerm(interaction, DEPARTMENT, 'Member') === false)) {
                            return await ErrorEmbed(interaction, "Insufficient perms. You must have the Member permissions.")
                        }
                        break
                    }

                    case 'view': {

                        break
                    }

                    case 'stats': {
                        if ((await PermManager.Department.checkPerm(interaction, DEPARTMENT, 'Shift-Management') === false)) {
                            return await ErrorEmbed(interaction, "Insufficient perms. You must have the Shift-Management permissions.")
                        }
                        break
                    }

                    case 'set-base': {
                        if ((await PermManager.Department.checkPerm(interaction, DEPARTMENT, 'Department-Management') === false)) {
                            return await ErrorEmbed(interaction, "Insufficient perms. You must have the Department-Management permissions.")
                        }
                        break
                    }

                    case 'add-role-pay': {
                        if ((await PermManager.Department.checkPerm(interaction, DEPARTMENT, 'Department-Management') === false)) {
                            return await ErrorEmbed(interaction, "Insufficient perms. You must have the Department-Management permissions.")
                        }
                        break
                    }

                    case 'remove-role-pay': {
                        if ((await PermManager.Department.checkPerm(interaction, DEPARTMENT, 'Department-Management') === false)) {
                            return await ErrorEmbed(interaction, "Insufficient perms. You must have the Department-Management permissions.")
                        }
                        break
                    }

                    case 'view-additional-pay': {
                        if ((await PermManager.Department.checkPerm(interaction, DEPARTMENT, 'Shift-Management') === false)) {
                            return await ErrorEmbed(interaction, "Insufficient perms. You must have the Shift-Management permissions.")
                        }
                        break
                    }

                    case 'export': {
                        if ((await PermManager.Department.checkPerm(interaction, DEPARTMENT, 'Shift-Management') === false)) {
                            return await ErrorEmbed(interaction, "Insufficient perms. You must have the Shift-Management permissions.")
                        }
                        break
                    }

                    case 'execute-payroll': {
                        if ((await PermManager.Department.checkPerm(interaction, DEPARTMENT, 'Payroll-Management') === false)) {
                            return await ErrorEmbed(interaction, "Insufficient perms. You must have the Payroll-Management permissions.")
                        }
                        break
                    }

                    case 'remove-shift': {
                        if ((await PermManager.Department.checkPerm(interaction, DEPARTMENT, 'Shift-Management') === false)) {
                            return await ErrorEmbed(interaction, "Insufficient perms. You must have the Shift-Management permissions.")
                        }

                    } break

                    case 'clear-shifts': {
                        if ((await PermManager.Department.checkPerm(interaction, DEPARTMENT, 'Shift-Management') === false)) {
                            return await ErrorEmbed(interaction, "Insufficient perms. You must have the Shift-Management permissions.")
                        }

                    } break
                }

                Entity = DEPARTMENT
            }
                break
        }
        if (Entity === null) {

            return await ErrorEmbed(interaction, "Please select a business or department first by using /set business or /set department!");
        }
        const EntityName = await Entity.getName();

        const MoneyFormat = new Intl.NumberFormat('en-us', { currency: 'USD', style: 'currency' })
        const statusEmebed = new EmbedBuilder();

        switch (interaction.options.getSubcommand()) {
            case 'clock': {
                await interaction.deferReply();
                const guildManager = new GuildHQ(interaction);
                const ispremium = await guildManager.getPremiumStatus();
                const promoEmbed = await currentPromotion(ispremium);
                const User = new UserHQ(interaction, interaction.user.id);
                await User.getIDENT()

                const timestamp = new Date()
                const entityName = await Entity.getName();
                const ClockEmbed = new EmbedBuilder()
                    .setTitle('TIME CARD')
                    .setDescription("```" + entityName + "```")
                    .setTimestamp(timestamp)

                const activeShift = await activeShifts.get(interaction.user.id)

                switch (interaction.options.getString('action')) {
                    case 'IN': {
                        if (typeof activeShift !== "undefined") {
                            return ErrorEmbed(interaction, "Please conclude your current active shift with **" + entityName + "** before starting a new shift.")
                        }


                        await activeShifts.set(interaction.user.id, {
                            entity: entityName, entityIDENT: Entity.IDENT, type: Type, start: timestamp, end: "-"
                        })

                        ClockEmbed.addFields([{
                            name: "USER", value: "```" + interaction.member.displayName + "```", inline: true
                        }, {
                            name: "TIME IN", value: "```" + timestamp.toLocaleTimeString('en-US', {
                                timeZone: "UTC", timeZoneName: "short", hour12: false
                            }) + "```", inline: true
                        }, { name: "TIME OUT", value: "```   -   ```", inline: true }])
                            .setColor("#008b31")

                        interaction.editReply({ embeds: [ClockEmbed] })
                    }
                        break

                    case 'OUT': {
                        if (typeof activeShift === "undefined") {
                            return ErrorEmbed(interaction, "Please make sure to clock-on, before attempting to clock-off!")
                        }

                        if (activeShift.type !== Type) {
                            return ErrorEmbed(interaction, "You selected **" + Type + "**, however you currently have an active **" + activeShift.type + " shift**. Please select that entityType to clock out.")
                        }

                        let ERROR = false

                        const onTimestamp = new Date(activeShift.start)

                        ClockEmbed.addFields([{
                            name: "USER", value: "```" + interaction.member.displayName + "```", inline: true
                        }, {
                            name: "TIME IN", value: "```" + onTimestamp.toLocaleTimeString('en-US', {
                                timeZone: "UTC", timeZoneName: "short", hour12: false
                            }) + "```", inline: true
                        }, {
                            name: "TIME OUT", value: "```" + timestamp.toLocaleTimeString('en-US', {
                                timeZone: "UTC", timeZoneName: "short", hour12: false
                            }) + "```", inline: true
                        }])
                            .setColor("#8b0000")
                        interaction.editReply({ embeds: [ClockEmbed] })

                        activeShift.end = timestamp

                        await activeShifts.set(interaction.user.id, activeShift)

                        const processEmebed = new EmbedBuilder()
                            .setDescription("<a:loading:1121922926313218120> We are logging your shift now.")
                            .setColor("Orange")



                        const processMessage = await interaction.channel.send({ embeds: [processEmebed] }).catch(async err => {
                            await ErrorEmbed(interaction, err.message, false, true);
                            ClockEmbed.setColor("Red").setDescription(`ERROR: Unable To Process Shift, due to the following error: ${err.message}`).setTitle('TIME CARD ERROR')
                            interaction.editReply({ embeds: [ClockEmbed] })
                            ERROR = true
                        });

                        if (ERROR) {
                            return
                        }


                        const USER = new UserHQ(interaction, interaction.user.id)
                        await USER.getIDENT();

                        try {
                            await Entity.recordShift(activeShift, USER)
                            await activeShifts.delete(interaction.user.id)
                            await processMessage.delete()
                        } catch (err) {
                            console.error(err)
                            await processMessage.delete()
                            return ErrorEmbed(interaction, err.message)
                        }

                    }
                }

            }
                break

            case 'view': {
                await interaction.deferReply();

                let User;
                let optionUser = interaction.options.getUser('user');

                if (!optionUser) {
                    User = await new UserHQ(interaction, interaction.user.id)
                } else {
                    User = await new UserHQ(interaction, optionUser.id);
                }

                await User.getIDENT();

                const entityName = await Entity.getName()
                let Shifts = await User.getShifts(Entity)

                for (const x of Shifts) {
                    const startTime = new Date(x.start)
                    const endTime = new Date(x.end)

                    x.entity = "DEP-> " + entityName
                    x.start = String(startTime.toLocaleString('en-US', {
                        timeZone: "UTC", timeZoneName: "short", hour12: false
                    })).replace(",", "")
                    x.end = String(endTime.toLocaleString('en-US', {
                        timeZone: "UTC", timeZoneName: "short", hour12: false
                    })).replace(",", "")
                }

                const CSV = await csvGenerator(['entity', 'start', 'end'], Shifts)

                const csvAttachment = new AttachmentBuilder(Buffer.from(CSV), { name: `${entityName}-${interaction.member.displayName}-Shifts.csv` })

                const processEmebed = new EmbedBuilder()
                    .setDescription("<a:loading:1121922926313218120> Now attaching CSV record of shifts.")
                    .setColor("Orange")

                interaction.editReply({ embeds: [processEmebed] })
                interaction.editReply({ embeds: [], files: [csvAttachment]})
            }
                break

            case 'stats': {

                //Manager Shift-Management
                await interaction.deferReply()
                const entityName = await Entity.getName();
                const statsEmbed = new EmbedBuilder()
                    .setTitle(`${entityName}'s Shift Statistics`)
                    .setColor("#60a181")
                    .setTimestamp()
                let stats = {
                    averageHours: null, averagePay: null, totalPayAmount: null, totalNumberOfShifts: null,
                    totalLoggedHours: null
                };

                const Shifts = await Entity.getShifts();
                const payRate = await Entity.getBasePay();
                stats.totalNumberOfShifts = Shifts.length

                let totalHours = 0;

                for (const x of Shifts) {

                    //add Total Hours
                    const startTime = new Date(x.start);
                    const endTime = new Date(x.end);
                    totalHours = Number(totalHours) + Number(((endTime - startTime) / (1000 * 60 * 60))); //Returns difference of dates in milliseconds, do we divide by the number of milliseconds in an hour.

                }

                stats.totalLoggedHours = (totalHours).toFixed(2);
                stats.averageHours = (totalHours / stats.totalNumberOfShifts).toFixed(2);
                stats.averagePay = stats.averageHours * payRate;
                stats.totalPayAmount = totalHours * payRate;

                statsEmbed.addFields(
                    { name: 'Total Logged Hours', value: "" + String(stats.totalLoggedHours) + "", inline: true },
                    {
                        name: 'Total Base Labor Cost',
                        value: "" + String(await guildManager.formatMoney(stats.totalPayAmount)) + "", inline: true
                    },
                    {
                        name: 'Total Logged Shifts', value: "" + String(stats.totalNumberOfShifts) + "",
                        inline: true
                    },
                    { name: 'Average Logged Hours', value: "" + String(stats.averageHours) + "", inline: true },
                    {
                        name: 'Average Base Labor Cost', value: "" + String(await guildManager.formatMoney(stats.averagePay)) + "",
                        inline: true
                    }
                )
                interaction.editReply({ embeds: [statsEmbed] })

            }
                break

            case 'user-stats': {

                //Manager Shift-Management
                await interaction.deferReply()
                const memberToCheck = interaction.options.getMember("user") || interaction.member;

                const HQ_User = await new UserHQ(interaction, memberToCheck.user.id);
                await HQ_User.getIDENT();


                if (interaction.options.getString('entity-type') === "all") {
                    const statsEmbed = new EmbedBuilder()
                        .setTitle(`${memberToCheck.displayName}'s Server Shift Statistics`)
                        .setColor("#cda86c")
                        .setTimestamp()
                    let stats = {
                        averageHours: null, averagePay: null, totalPayAmount: null, totalNumberOfShifts: null,
                        totalLoggedHours: null
                    };

                    const Shifts = await HQ_User.getShifts();
                    stats.totalNumberOfShifts = Shifts.length

                    let totalHours = 0;

                    for (const x of Shifts) {

                        //add Total Hours
                        const startTime = new Date(x.start);
                        const endTime = new Date(x.end);
                        totalHours = Number(totalHours) + Number(((endTime - startTime) / (1000 * 60 * 60))); //Returns difference of dates in milliseconds, do we divide by the number of milliseconds in an hour.

                    }

                    stats.totalLoggedHours = (totalHours).toFixed(2);
                    stats.averageHours = (totalHours / stats.totalNumberOfShifts).toFixed(2);

                    statsEmbed.addFields(
                        { name: 'Total Logged Hours', value: "```" + String(stats.totalLoggedHours) + "```", inline: true },
                        {
                            name: 'Total Logged Shifts', value: "```" + String(stats.totalNumberOfShifts) + "```",
                            inline: true
                        },
                        { name: 'Average Logged Hours', value: "```" + String(stats.averageHours) + "```", inline: true },

                    )
                    interaction.editReply({ embeds: [statsEmbed] })
                    return
                }

                const entityName = await Entity.getName();
                const statsEmbed = new EmbedBuilder()
                    .setTitle(`${memberToCheck.displayName}'s ${entityName} Shift Statistics`)
                    .setColor("#cda86c")
                    .setTimestamp()
                let stats = {
                    averageHours: null, averagePay: null, totalPayAmount: null, totalNumberOfShifts: null,
                    totalLoggedHours: null
                };

                const Shifts = await HQ_User.getShifts(Entity);
                stats.totalNumberOfShifts = Shifts.length

                let totalHours = 0;

                for (const x of Shifts) {

                    //add Total Hours
                    const startTime = new Date(x.start);
                    const endTime = new Date(x.end);
                    totalHours = Number(totalHours) + Number(((endTime - startTime) / (1000 * 60 * 60))); //Returns difference of dates in milliseconds, do we divide by the number of milliseconds in an hour.

                }

                stats.totalLoggedHours = (totalHours).toFixed(2);
                stats.averageHours = (totalHours / stats.totalNumberOfShifts).toFixed(2);

                statsEmbed.addFields(
                    { name: 'Logged Hours', value: "```" + String(stats.totalLoggedHours) + "```", inline: true },
                    {
                        name: 'Logged Shifts', value: "```" + String(stats.totalNumberOfShifts) + "```",
                        inline: true
                    },
                    { name: 'Average Logged Hours', value: "```" + String(stats.averageHours) + "```", inline: true },

                )
                interaction.editReply({ embeds: [statsEmbed] })

            }
                break

            case 'set-base': {

                //Admin Department Management

                await interaction.deferReply();
                const basePay = interaction.options.getNumber('amount');

                try {
                    await Entity.setBasePay(basePay);
                    statusEmebed.setColor('Green')
                        .setTitle(`\\✅ Successfully updated the base pay to ${await guildManager.formatMoney(basePay)} for \`\`${EntityName}\`\`.`)
                    interaction.editReply({ embeds: [statusEmebed] })
                } catch (e) {
                    console.log(e)
                    await ErrorEmbed(interaction, e.message, false, false)
                }
            }
                break

            case 'add-role-pay': {
                //Admin Department-Management

                await interaction.deferReply();
                const additionalPay = interaction.options.getNumber('amount');
                const role = interaction.options.getRole('role')
                try {
                    await Entity.addRolePay(role, additionalPay);
                    statusEmebed.setColor('Green')
                        .setTitle(`\\✅ Successfully added ${await guildManager.formatMoney(additionalPay)} additional pay for ${role.name} under ${EntityName}.`)
                    interaction.editReply({ embeds: [statusEmebed] })
                } catch (e) {
                    console.log(e)
                    await ErrorEmbed(interaction, e.message, false, false)
                }
            }
                break

            case 'remove-role-pay': {

                //ADMIN Department-Management

                await interaction.deferReply();
                const role = interaction.options.getRole('role')
                try {
                    await Entity.removeRolePay(role);
                    statusEmebed.setColor('Green')
                        .setTitle(`\\✅ Successfully removed additional pay from \`\`${role.name}\`\` under \`\`${EntityName}\`\`.`)
                    interaction.editReply({ embeds: [statusEmebed] })
                } catch (e) {
                    console.log(e)
                    await ErrorEmbed(interaction, e.message, false, false)
                }
            }
                break

            case 'view-additional-pay': {
                //MANGER/Shift-Management

                await interaction.deferReply();
                const processEmebed = new EmbedBuilder()
                    .setDescription("<a:loading:1121922926313218120> Fetching All Roles With Additional Pay.")
                    .setColor("Orange")

                interaction.editReply({ embeds: [processEmebed] })

                const additionalPayRoles = await Entity.getAdditionalPayRoles();
                let desc = "";

                for (const role of additionalPayRoles) {
                    desc = desc + `<@&${role.id}> - **${await guildManager.formatMoney(role.additionalPay)}** \n`
                }

                const shiftBase = await Entity.getBasePay();
                desc = desc + `Base Pay - **${shiftBase}**`;

                const Embed = new EmbedBuilder()
                    .setTitle(`${EntityName}'s Additional Role Pay`)
                    .setDescription(desc)
                    .setColor("#60a181")
                    .setTimestamp()

                interaction.editReply({ embeds: [Embed] })
            }
                break

            case 'export': {
                await interaction.deferReply();
                const processEmebed = new EmbedBuilder()
                    .setDescription("<a:loading:1121922926313218120> Fetching All Shifts Now & Roles With Additional Pay...")
                    .setColor("#a16060")

                await interaction.editReply({ embeds: [processEmebed] })

                const Shifts = await Entity.getShifts();
                const additionalPayRoles = await Entity.getAdditionalPayRoles();
                const basePay = await Entity.getBasePay()

                processEmebed.setDescription("<a:loading:1121922926313218120> Processing All Shifts Now...")
                    .setColor("#a18560")

                await interaction.editReply({ embeds: [processEmebed] })

                let Users = {}

                try {
                    for (const x of Shifts) {

                        //Figuring out the total of hours in a shift
                        const startTime = new Date(x.start);
                        const endTime = new Date(x.end);
                        const totalTime = Number(((endTime - startTime) / (1000 * 60 * 60)));

                        //Creating variables to log the grand total of amount to be paid out and with the additional pay from roles.
                        let additionalPay = 0;
                        let grandTotal = Number(Number(totalTime) * Number(basePay));

                        const User = await RetrieveData.userByIDENT(x.user);
                        const DisID = User.dataValues.id;
                        let Member = null;
                        try {
                            Member = await interaction.guild.members.fetch(String(DisID)).then((member) => member);
                        } catch (e) {
                            console.log("Returning due to unknown member");
                            console.log(e)
                        }

                        if (Member === null) { continue }

                        const memberRoles = await Member.roles.cache;

                        for (const role of memberRoles) {

                            for (const payRole of additionalPayRoles) {

                                if (payRole.id === role[0]) {

                                    additionalPay = (Number(Number(additionalPay) + Number(Number(totalTime) * Number(payRole.additionalPay))))
                                    grandTotal = Number(Number(grandTotal) + Number(additionalPay))
                                    console.warn('User had additional Pay', additionalPay)
                                }
                            }
                        }

                        //If we have the user in this current cache of shifts, update their data, if not create new cache record.
                        if (typeof Users[x.user] !== 'undefined') {
                            const oldGT = Number(Users[x.user].grandTotal);
                            const oldAP = Number(Users[x.user].additionalPay);
                            const oldHours = Number(Users[x.user].totalTime);


                            Users[x.user] = {
                                IDENT: x.user, grandTotal: (Number(oldGT) + Number(grandTotal)),
                                additionalPay: (Number(oldAP) + Number(additionalPay)),
                                totalTime: (Number(oldHours) + Number(totalTime)), DisID: DisID,
                                displayName: Member.displayName
                            }
                            continue
                        }
                        Users[x.user] = {
                            IDENT: x.user, grandTotal, additionalPay, totalTime, DisID: DisID,
                            displayName: Member.displayName
                        }
                    }
                } catch (e) {
                    console.log(e)
                    return ErrorEmbed(interaction, e.message);
                }
                processEmebed.setDescription("<a:loading:1121922926313218120> Formatting & Attaching...")
                    .setColor("Orange")

                await interaction.editReply({ embeds: [processEmebed] })

                const FORMAT = interaction.options.getString('format')


                switch (FORMAT) {
                    case 'csv': {
                        let TimeStamp = new Date()
                        TimeStamp = TimeStamp.toLocaleDateString('en-US', { timeZone: "UTC", hour12: false })

                        let ShiftsSummaries = [];
                        for (const userKey of Object.keys(Users)) {
                            console.warn('Additional PAy', Users[userKey].additionalPay)
                            ShiftsSummaries.push(Users[userKey])
                        }

                        const CSV = await csvGenerator(['IDENT', 'displayName', 'totalTime', 'grandTotal',
                            'additionalPay'], ShiftsSummaries)

                        const csvAttachment = new AttachmentBuilder(await Buffer.from(CSV), { name: `${EntityName}-${TimeStamp}-Shifts.csv` });

                        processEmebed
                            .setTitle(`${EntityName} Shift Summaries Export`)
                            .setDescription('All Shift Summaries For This Entity Have Been Exported To A CSV File, Attached.')
                            .setColor("Green")

                        interaction.editReply({ embeds: [processEmebed], files: [csvAttachment] })
                    }
                        break

                    case 'embed': {
                        let desc = "";

                        for (const userKey of Object.keys(Users)) {
                            desc = desc + `<@${Users[userKey].DisID}> **Total Hours:** \`\`${Users[userKey].totalTime.toFixed(2)}\`\` **Total Earned**: ${await guildManager.formatMoney(Users[userKey].grandTotal)} **Additional Pay:** ${await guildManager.formatMoney(Users[userKey].additionalPay)} \n`
                        }

                        processEmebed
                            .setTitle(`${EntityName} Shift Summaries`)
                            .setDescription(desc)
                            .setColor("Green")

                        interaction.editReply({ embeds: [processEmebed] })
                    }
                }

            }
                break

            case 'execute-payroll': {
                await interaction.deferReply();
                const processEmebed = new EmbedBuilder()
                    .setDescription("<a:loading:1121922926313218120> Fetching All Shifts Now & Roles With Additional Pay...")
                    .setColor("#a16060")

                await interaction.editReply({ embeds: [processEmebed] })

                //TODO Figure out a way to ensure the dates provided are handled as UTC Dates
                const fromDate = new Date(interaction.options.getString('from'));
                const toDate = new Date(interaction.options.getString('to'));

                if (String(fromDate) === "Invalid Date" || String(toDate) === "Invalid Date") {
                    processEmebed.setColor('Red')
                        .setDescription("\\🔴 Unable to Execute Payroll. Invalid Date(s) provided.")

                    return await interaction.editReply({ embeds: [processEmebed] })
                }

                const Shifts = await Entity.getPayrollPeriod(fromDate, toDate)//await Entity.getShifts();

                const additionalPayRoles = await Entity.getAdditionalPayRoles();
                const basePay = await Entity.getBasePay()

                processEmebed.setDescription("<a:loading:1121922926313218120> Processing All Shifts Now...")
                    .setColor("#a18560")

                await interaction.editReply({ embeds: [processEmebed] })

                if (Shifts.length === 0 || !Shifts) {
                    processEmebed.setColor('Red')
                        .setDescription("\\🔴 Unable to Execute Payroll. There are no shifts logged.")

                    return await interaction.editReply({ embeds: [processEmebed] })
                }

                let Users = {}

                console.warn('AdditionalPay', additionalPayRoles)
                for (const x of Shifts) {

                    //Figuring out the total of hours in a shift
                    const startTime = new Date(x.start);
                    const endTime = new Date(x.end);
                    const totalTime = Number(((endTime - startTime) / (1000 * 60 * 60)));

                    //Creating variables to log the grand total of amount to be paid out and with the additional pay from roles.
                    let additionalPay = 0;
                    let grandTotal = Number(Number(totalTime) * Number(basePay));

                    const User = await RetrieveData.userByIDENT(x.user);
                    const DisID = User.dataValues.id;
                    let Member = await interaction.guild.members.fetch(String(DisID)).then((member) => member);
                    const memberRoles = await Member.roles.cache;
                    const UsersHQ = await new UserHQ(interaction, DisID);

                    for (const role of memberRoles) {
                        for (const payRole of additionalPayRoles) {
                            if (payRole.id === role[0]) {
                                additionalPay = (Number(Number(additionalPay) + Number(Number(totalTime) * Number(payRole.additionalPay))))
                                grandTotal = Number(Number(grandTotal) + Number(additionalPay))
                            }
                        }
                    }

                    //If we have the user in this current cache of shifts, update their data, if not create new cache record.
                    if (typeof Users[x.user] !== 'undefined') {
                        const oldGT = Number(Users[x.user].grandTotal);
                        const oldAP = Number(Users[x.user].additionalPay);
                        const oldHours = Number(Users[x.user].totalTime);


                        Users[x.user] = {
                            userHQ: UsersHQ, IDENT: x.user, grandTotal: (Number(oldGT) + Number(grandTotal)),
                            additionalPay: (Number(oldAP) + Number(additionalPay)),
                            totalTime: (Number(oldHours) + Number(totalTime)), DisID: DisID,
                            displayName: Member.displayName
                        }
                        continue
                    }
                    Users[x.user] = {
                        userHQ: UsersHQ, IDENT: x.user, grandTotal, additionalPay, totalTime, DisID: DisID,
                        displayName: Member.displayName
                    }
                }

                processEmebed.setDescription("<a:loading:1121922926313218120> Executing Payroll...")
                    .setColor("Orange")

                await interaction.editReply({ embeds: [processEmebed] })

                await Entity.executeShiftPayout(processEmebed, Users)
            }
                break

            case 'remove-shift': {
                await interaction.deferReply()
                const processEmebed = new EmbedBuilder()
                    .setDescription("<a:loading:1121922926313218120> Removing selected shift...")
                    .setColor("#a16060")

                await interaction.editReply({ embeds: [processEmebed] })
                const selectedShift = interaction.options.getString('shift')

                try {
                    await Entity.removeShift(selectedShift)
                    processEmebed.setDescription('\\✅ Successfully removed selected shift from user.')
                    processEmebed.setColor("Green")
                    await interaction.editReply({ embeds: [processEmebed] })
                } catch (err) {
                    console.log(err)
                    processEmebed.setDescription(`\\❌ ERROR: ${err.msg}`)
                    processEmebed.setColor("Red")
                    return await interaction.editReply({ embeds: [processEmebed] })
                }
            } break

            case 'clear-shifts': {
                await interaction.deferReply()
                const processEmebed = new EmbedBuilder()
                    .setDescription("<a:loading:1121922926313218120> Clear All Shifts...")
                    .setColor("#a16060")

                await interaction.editReply({ embeds: [processEmebed] })
                const selectedShift = interaction.options.getString('shift')

                try {
                    await Entity.clearShifts()
                    processEmebed.setDescription(`\\✅ Successfully Cleared All Shifts from \`\`${EntityName}\`\`.`)
                    processEmebed.setColor("Green")
                    await interaction.editReply({ embeds: [processEmebed] })
                } catch (err) {
                    console.log(err)
                    processEmebed.setDescription(`\\❌ ERROR: ${err.msg}`)
                    processEmebed.setColor("Red")
                    return await interaction.editReply({ embeds: [processEmebed] })
                }
            }

        }
    },
};
