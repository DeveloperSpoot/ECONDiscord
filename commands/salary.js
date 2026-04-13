const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require("discord.js");
const { ErrorEmbed } = require("../utils/embedUtil");
const { RetrieveData, SalaryHQ, PermManager, BusinessHQ, DepartmentHQ, GuildHQ } = require("../dataCrusher/Headquarters");
const { activeBusiness, activeDepartment } = require("../dataCrusher/Headquarters").CacheManager;

async function resolveEntity(interaction, entityType) {
    const guildKey = `${interaction.IDENT}-${interaction.user.id}`;
    if (entityType === "business") {
        const active = await activeBusiness.get(guildKey);
        if (!active) {
            throw new Error("Please select a business first by using /set business.");
        }
        const business = await new BusinessHQ(interaction, active);
        const hasPerm = await PermManager.Business.checkPerm(business, interaction, "supervisor");
        if (hasPerm === false) {
            throw new Error("Insufficient perms. Supervisor permission level required.");
        }
        return {
            type: "business",
            ident: active,
            manager: business,
            name: await business.getName()
        };
    }

    const activeDep = await activeDepartment.get(guildKey);
    if (!activeDep) {
        throw new Error("Please select a department first by using /set department.");
    }
    const department = await new DepartmentHQ(interaction, activeDep);
    const hasPerm = await PermManager.Department.checkPerm(interaction, department, "Payroll-Management");
    if (hasPerm === false) {
        throw new Error("Insufficient perms. Payroll-Management permission level required.");
    }
    return {
        type: "department",
        ident: activeDep,
        manager: department,
        name: await department.getName()
    };
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("salary")
        .setDescription("Manage fixed salary payouts for employees.")
        .addSubcommand(sub =>
            sub.setName("set")
                .setDescription("Assign or update a salary for a user.")
                .addStringOption(option =>
                    option.setName("entity-type")
                        .setDescription("Which entity to manage.")
                        .setRequired(true)
                        .addChoices(
                            { name: "Business", value: "business" },
                            { name: "Department", value: "department" }
                        ))
                .addNumberOption(option =>
                    option.setName("amount")
                        .setDescription("Weekly salary amount.")
                        .setRequired(true))
                .addUserOption(option =>
                    option.setName("user")
                        .setDescription("User to assign the salary to.")
                        .setRequired(false))
                .addRoleOption(option =>
                    option.setName("role")
                        .setDescription("Department role to assign the salary to (department only).")
                        .setRequired(false))
                .addIntegerOption(option =>
                    option.setName("period-days")
                        .setDescription("Number of days between payouts (default 7).")
                        .setMinValue(1)))
        .addSubcommand(sub =>
            sub.setName("remove")
                .setDescription("Remove a salary assignment.")
                .addStringOption(option =>
                    option.setName("entity-type")
                        .setDescription("Which entity to manage.")
                        .setRequired(true)
                        .addChoices(
                            { name: "Business", value: "business" },
                            { name: "Department", value: "department" }
                        ))
                .addUserOption(option =>
                    option.setName("user")
                        .setDescription("User to remove.")
                        .setRequired(false))
                .addRoleOption(option =>
                    option.setName("role")
                        .setDescription("Department role to remove.")
                        .setRequired(false)))
        .addSubcommand(sub =>
            sub.setName("list")
                .setDescription("List all salaries for the selected entity.")
                .addStringOption(option =>
                    option.setName("entity-type")
                        .setDescription("Which entity to view.")
                        .setRequired(true)
                        .addChoices(
                            { name: "Business", value: "business" },
                            { name: "Department", value: "department" }
                        ))),
    async execute(interaction) {
        if (!interaction.guild) {
            return ErrorEmbed(interaction, "This command can only be run inside a server.");
        }

        const sub = interaction.options.getSubcommand();
        const entityType = interaction.options.getString("entity-type");

        let context;
        try {
            context = await resolveEntity(interaction, entityType);
        } catch (err) {
            return ErrorEmbed(interaction, err.message, false, false);
        }

        const guildManager = new GuildHQ(interaction);

        switch (sub) {
            case "set": {
                const targetUser = interaction.options.getUser("user");
                const targetRole = interaction.options.getRole("role");
                const amount = interaction.options.getNumber("amount", true);
                const periodDays = interaction.options.getInteger("period-days") ?? 7;

                if (amount <= 0) {
                    return ErrorEmbed(interaction, "Salary amount must be greater than zero.", false, false);
                }

                if (context.type === "business") {
                    if (!targetUser || targetRole) {
                        return ErrorEmbed(interaction, "Business salaries must target a specific user.", false, false);
                    }
                } else {
                    if ((!targetUser && !targetRole) || (targetUser && targetRole)) {
                        return ErrorEmbed(interaction, "Provide either a user or a role (but not both) for department salaries.", false, false);
                    }
                }

                let memberRecord = null;
                if (targetUser) {
                    memberRecord = await RetrieveData.user(interaction, targetUser.id);
                    if (!memberRecord) {
                        return ErrorEmbed(interaction, "Target user must be registered before assigning a salary.", false, false);
                    }
                }

                await SalaryHQ.setSalary({
                    guild: interaction.IDENT,
                    entityType: context.type,
                    entityIDENT: context.ident,
                    memberIDENT: memberRecord ? memberRecord.IDENT : null,
                    roleId: targetRole ? targetRole.id : null,
                    amount,
                    periodDays
                });

                const targetLabel = targetRole
                    ? `role <@&${targetRole.id}>`
                    : `<@${targetUser.id}>`;

                const embed = new EmbedBuilder()
                    .setColor("Green")
                    .setTitle("Salary Assigned")
                    .setDescription(
                        `Assigned ${await guildManager.formatMoney(amount)} every ${periodDays} day(s) to ${targetLabel} for **${context.name}**.`
                    );

                return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
            }
            case "remove": {
                const targetUser = interaction.options.getUser("user");
                const targetRole = interaction.options.getRole("role");

                if (context.type === "business") {
                    if (!targetUser || targetRole) {
                        return ErrorEmbed(interaction, "Business salaries can only be removed by specifying a user.", false, false);
                    }
                } else {
                    if ((!targetUser && !targetRole) || (targetUser && targetRole)) {
                        return ErrorEmbed(interaction, "Provide either a user or a role (but not both) to remove.", false, false);
                    }
                }

                let memberRecord = null;
                if (targetUser) {
                    memberRecord = await RetrieveData.user(interaction, targetUser.id);
                    if (!memberRecord) {
                        return ErrorEmbed(interaction, "Target user is not registered.", false, false);
                    }
                }

                const removed = await SalaryHQ.removeSalary({
                    guild: interaction.IDENT,
                    entityType: context.type,
                    entityIDENT: context.ident,
                    memberIDENT: memberRecord ? memberRecord.IDENT : null,
                    roleId: targetRole ? targetRole.id : null
                });

                if (!removed) {
                    return ErrorEmbed(interaction, "No salary found for that user.", false, false);
                }

                const label = targetRole ? `role <@&${targetRole.id}>` : `<@${targetUser.id}>`;
                const embed = new EmbedBuilder()
                    .setColor("Orange")
                    .setTitle("Salary Removed")
                    .setDescription(`Removed salary for ${label} in **${context.name}**.`);
                return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
            }
            case "list": {
                const records = await SalaryHQ.listForEntity({
                    guild: interaction.IDENT,
                    entityType: context.type,
                    entityIDENT: context.ident
                });

                if (records.length === 0) {
                    return interaction.reply({
                        embeds: [
                            new EmbedBuilder()
                                .setColor("Blue")
                                .setDescription(`No salaries are configured for **${context.name}**.`)
                        ],
                        flags: MessageFlags.Ephemeral
                    });
                }

                let desc = "";
                for (const record of records) {
                    let mention;
                    if (record.memberIDENT) {
                        const userRecord = await RetrieveData.userByIDENT(record.memberIDENT);
                        mention = userRecord ? `<@${userRecord.id}>` : `Member ${record.memberIDENT}`;
                    } else if (record.roleId) {
                        mention = `<@&${record.roleId}>`;
                    } else {
                        mention = "Unknown";
                    }
                    const referenceDate = record.memberIDENT ? record.lastPaidAt : record.lastPaidAt;
                    const nextDue = referenceDate
                        ? `<t:${Math.floor((new Date(referenceDate).getTime() + record.periodDays * 86400000) / 1000)}:R>`
                        : "Now";
                    desc += `• ${mention} — ${await guildManager.formatMoney(record.amount)} every ${record.periodDays} day(s) (next payout ${nextDue})\n`;
                }

                const embed = new EmbedBuilder()
                    .setColor("Purple")
                    .setTitle(`${context.name} Salaries`)
                    .setDescription(desc);
                return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
            }
        }
    }
};
