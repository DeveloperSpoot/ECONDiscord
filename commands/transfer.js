const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require("discord.js");
const SQL = require("../dataCrusher/Server");
const { ErrorEmbed } = require("../utils/embedUtil");
const { RetrieveData, GuildHQ, DepartmentHQ, BusinessHQ, PermManager } = require("../dataCrusher/Headquarters");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("transfer")
        .setDescription("Transfer money between accounts.")

        // member → member
        .addSubcommand(sub =>
            sub.setName("member-to-member")
                .setDescription("Send money from your bank to another member's bank.")
                .addUserOption(opt =>
                    opt.setName("target")
                        .setDescription("The member to send money to.")
                        .setRequired(true))
                .addNumberOption(opt =>
                    opt.setName("amount")
                        .setDescription("Amount to transfer.")
                        .setRequired(true))
                .addStringOption(opt =>
                    opt.setName("memo")
                        .setDescription("Reason for the transfer.")
                        .setRequired(false)))

        // member → treasury
        .addSubcommand(sub =>
            sub.setName("member-to-treasury")
                .setDescription("Send money from your bank to the treasury.")
                .addNumberOption(opt =>
                    opt.setName("amount")
                        .setDescription("Amount to transfer.")
                        .setRequired(true))
                .addStringOption(opt =>
                    opt.setName("memo")
                        .setDescription("Reason for the transfer.")
                        .setRequired(false)))

        // member → department
        .addSubcommand(sub =>
            sub.setName("member-to-department")
                .setDescription("Send money from your bank to a department.")
                .addStringOption(opt =>
                    opt.setName("department")
                        .setDescription("The department to send money to.")
                        .setRequired(true)
                        .setAutocomplete(true))
                .addNumberOption(opt =>
                    opt.setName("amount")
                        .setDescription("Amount to transfer.")
                        .setRequired(true))
                .addStringOption(opt =>
                    opt.setName("memo")
                        .setDescription("Reason for the transfer.")
                        .setRequired(false)))

        // department → treasury
        .addSubcommand(sub =>
            sub.setName("department-to-treasury")
                .setDescription("Send money from a department to the treasury. Requires department management.")
                .addStringOption(opt =>
                    opt.setName("department")
                        .setDescription("The department to transfer from.")
                        .setRequired(true)
                        .setAutocomplete(true))
                .addNumberOption(opt =>
                    opt.setName("amount")
                        .setDescription("Amount to transfer.")
                        .setRequired(true))
                .addStringOption(opt =>
                    opt.setName("memo")
                        .setDescription("Reason for the transfer.")
                        .setRequired(false)))

        // business → treasury
        .addSubcommand(sub =>
            sub.setName("business-to-treasury")
                .setDescription("Send money from a business to the treasury. Requires business manager.")
                .addStringOption(opt =>
                    opt.setName("business")
                        .setDescription("The business to transfer from.")
                        .setRequired(true)
                        .setAutocomplete(true))
                .addNumberOption(opt =>
                    opt.setName("amount")
                        .setDescription("Amount to transfer.")
                        .setRequired(true))
                .addStringOption(opt =>
                    opt.setName("memo")
                        .setDescription("Reason for the transfer.")
                        .setRequired(false)))

        // business → department
        .addSubcommand(sub =>
            sub.setName("business-to-department")
                .setDescription("Send money from a business to a department. Requires business manager.")
                .addStringOption(opt =>
                    opt.setName("business")
                        .setDescription("The business to transfer from.")
                        .setRequired(true)
                        .setAutocomplete(true))
                .addStringOption(opt =>
                    opt.setName("department")
                        .setDescription("The department to send money to.")
                        .setRequired(true)
                        .setAutocomplete(true))
                .addNumberOption(opt =>
                    opt.setName("amount")
                        .setDescription("Amount to transfer.")
                        .setRequired(true))
                .addStringOption(opt =>
                    opt.setName("memo")
                        .setDescription("Reason for the transfer.")
                        .setRequired(false))),

    async autocomplete(interaction) {
        const focusedOption = interaction.options.getFocused(true);

        if (focusedOption.name === "department") {
            const treasury = await RetrieveData.treasury(interaction.IDENT, false);
            const choices = await treasury.getDepartments({ raw: true });
            const filtered = choices.filter(c =>
                c.name.toLowerCase().startsWith(focusedOption.value.toLowerCase())
            );
            return interaction.respond(filtered.map(c => ({ name: c.name, value: c.IDENT })));
        }

        if (focusedOption.name === "business") {
            const choices = await RetrieveData.accountsByType(interaction, "business");
            const filtered = choices.filter(c =>
                c.name.toLowerCase().startsWith(focusedOption.value.toLowerCase())
            );
            return interaction.respond(filtered.map(c => ({ name: c.name, value: c.IDENT })));
        }
    },

    async execute(interaction) {
        if (!interaction.guild) {
            return ErrorEmbed(interaction, "This command can only be used inside a server.");
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const sub = interaction.options.getSubcommand();
        const amount = interaction.options.getNumber("amount");
        const memo = interaction.options.getString("memo") ?? "No memo provided";
        const guildId = interaction.IDENT;
        const guildManager = new GuildHQ(interaction);

        if (amount <= 0) {
            return interaction.editReply({
                embeds: [new EmbedBuilder().setColor("Red").setDescription("Amount must be greater than zero.")]
            });
        }

        // ── member-to-member ───────────────────────────────────────────────────
        if (sub === "member-to-member") {
            const targetUser = interaction.options.getUser("target");

            if (targetUser.id === interaction.user.id) {
                return interaction.editReply({
                    embeds: [new EmbedBuilder().setColor("Red").setDescription("You cannot transfer money to yourself.")]
                });
            }

            const senderAccounts = await RetrieveData.userBasicAccounts(interaction, interaction.user);
            if (!senderAccounts?.bank) {
                return interaction.editReply({
                    embeds: [new EmbedBuilder().setColor("Red").setDescription("Unable to find your bank account.")]
                });
            }

            if (Number(senderAccounts.bank.balance) < amount) {
                return interaction.editReply({
                    embeds: [new EmbedBuilder().setColor("Red").setDescription(`Insufficient funds. Your bank balance: ${await guildManager.formatMoney(senderAccounts.bank.balance)}`)]
                });
            }

            const targetMember = await RetrieveData.user(interaction, targetUser.id);
            if (!targetMember) {
                return interaction.editReply({
                    embeds: [new EmbedBuilder().setColor("Red").setDescription(`<@${targetUser.id}> is not registered.`)]
                });
            }

            const targetAccount = await SQL.models.Accounts.findOne({
                where: { owner: targetMember.IDENT, type: "personal-bank" },
                raw: true
            });
            if (!targetAccount) {
                return interaction.editReply({
                    embeds: [new EmbedBuilder().setColor("Red").setDescription(`No bank account found for <@${targetUser.id}>.`)]
                });
            }

            await SQL.models.Accounts.update(
                { balance: Number(senderAccounts.bank.balance) - amount },
                { where: { IDENT: senderAccounts.bank.IDENT } }
            );
            await SQL.models.Accounts.update(
                { balance: Number(targetAccount.balance) + amount },
                { where: { IDENT: targetAccount.IDENT } }
            );
            await SQL.models.AdvTransactionLogs.create({
                guild: guildId, amount,
                creditAccount: senderAccounts.bank.IDENT,
                debitAccount: targetAccount.IDENT,
                creditType: "Account", debitType: "Account",
                memo: `TRANSFER | <@${interaction.user.id}> → <@${targetUser.id}> | ${memo}`
            }).catch(console.error);

            return interaction.editReply({
                embeds: [new EmbedBuilder().setColor("Green").setTitle("Transfer Complete")
                    .addFields(
                        { name: "From", value: `<@${interaction.user.id}>`, inline: true },
                        { name: "To", value: `<@${targetUser.id}>`, inline: true },
                        { name: "Amount", value: await guildManager.formatMoney(amount), inline: true },
                        { name: "Memo", value: memo, inline: false }
                    ).setTimestamp()]
            });
        }

        // ── member-to-treasury ─────────────────────────────────────────────────
        if (sub === "member-to-treasury") {
            const senderAccounts = await RetrieveData.userBasicAccounts(interaction, interaction.user);
            if (!senderAccounts?.bank) {
                return interaction.editReply({
                    embeds: [new EmbedBuilder().setColor("Red").setDescription("Unable to find your bank account.")]
                });
            }

            if (Number(senderAccounts.bank.balance) < amount) {
                return interaction.editReply({
                    embeds: [new EmbedBuilder().setColor("Red").setDescription(`Insufficient funds. Your bank balance: ${await guildManager.formatMoney(senderAccounts.bank.balance)}`)]
                });
            }

            const guildRecord = await SQL.models.Guilds.findByPk(guildId, { raw: true });

            await SQL.models.Accounts.update(
                { balance: Number(senderAccounts.bank.balance) - amount },
                { where: { IDENT: senderAccounts.bank.IDENT } }
            );
            await SQL.models.Guilds.update(
                { balance: Number(guildRecord.balance) + amount },
                { where: { IDENT: guildId } }
            );
            await SQL.models.AdvTransactionLogs.create({
                guild: guildId, amount,
                creditAccount: senderAccounts.bank.IDENT,
                debitAccount: guildId,
                creditType: "Account", debitType: "Treasury",
                memo: `TRANSFER | <@${interaction.user.id}> → Treasury | ${memo}`
            }).catch(console.error);

            return interaction.editReply({
                embeds: [new EmbedBuilder().setColor("Green").setTitle("Transfer Complete")
                    .addFields(
                        { name: "From", value: `<@${interaction.user.id}>`, inline: true },
                        { name: "To", value: "Treasury", inline: true },
                        { name: "Amount", value: await guildManager.formatMoney(amount), inline: true },
                        { name: "Memo", value: memo, inline: false }
                    ).setTimestamp()]
            });
        }

        // ── member-to-department ───────────────────────────────────────────────
        if (sub === "member-to-department") {
            const depIDENT = interaction.options.getString("department");

            const senderAccounts = await RetrieveData.userBasicAccounts(interaction, interaction.user);
            if (!senderAccounts?.bank) {
                return interaction.editReply({
                    embeds: [new EmbedBuilder().setColor("Red").setDescription("Unable to find your bank account.")]
                });
            }

            if (Number(senderAccounts.bank.balance) < amount) {
                return interaction.editReply({
                    embeds: [new EmbedBuilder().setColor("Red").setDescription(`Insufficient funds. Your bank balance: ${await guildManager.formatMoney(senderAccounts.bank.balance)}`)]
                });
            }

            const dep = await SQL.models.Department.findByPk(depIDENT, { raw: true });
            if (!dep) {
                return interaction.editReply({
                    embeds: [new EmbedBuilder().setColor("Red").setDescription("Department not found.")]
                });
            }

            await SQL.models.Accounts.update(
                { balance: Number(senderAccounts.bank.balance) - amount },
                { where: { IDENT: senderAccounts.bank.IDENT } }
            );
            await SQL.models.Department.update(
                { balance: Number(dep.balance) + amount },
                { where: { IDENT: depIDENT } }
            );
            await SQL.models.AdvTransactionLogs.create({
                guild: guildId, amount,
                creditAccount: senderAccounts.bank.IDENT,
                debitAccount: depIDENT,
                creditType: "Account", debitType: "Department",
                memo: `TRANSFER | <@${interaction.user.id}> → ${dep.name} | ${memo}`
            }).catch(console.error);

            return interaction.editReply({
                embeds: [new EmbedBuilder().setColor("Green").setTitle("Transfer Complete")
                    .addFields(
                        { name: "From", value: `<@${interaction.user.id}>`, inline: true },
                        { name: "To", value: dep.name, inline: true },
                        { name: "Amount", value: await guildManager.formatMoney(amount), inline: true },
                        { name: "Memo", value: memo, inline: false }
                    ).setTimestamp()]
            });
        }

        // ── department-to-treasury ─────────────────────────────────────────────
        if (sub === "department-to-treasury") {
            const depIDENT = interaction.options.getString("department");
            const depManager = new DepartmentHQ(interaction, depIDENT);

            const authorized = await PermManager.Department.checkPerm(interaction, depManager, "Department-Management");
            if (!authorized) {
                return interaction.editReply({
                    embeds: [new EmbedBuilder().setColor("Red").setDescription("You need department management permission to transfer funds out of a department.")]
                });
            }

            const dep = await SQL.models.Department.findByPk(depIDENT, { raw: true });
            if (!dep) {
                return interaction.editReply({
                    embeds: [new EmbedBuilder().setColor("Red").setDescription("Department not found.")]
                });
            }

            if (Number(dep.balance) < amount) {
                return interaction.editReply({
                    embeds: [new EmbedBuilder().setColor("Red").setDescription(`Insufficient department funds. Balance: ${await guildManager.formatMoney(dep.balance)}`)]
                });
            }

            const guildRecord = await SQL.models.Guilds.findByPk(guildId, { raw: true });

            await SQL.models.Department.update(
                { balance: Number(dep.balance) - amount },
                { where: { IDENT: depIDENT } }
            );
            await SQL.models.Guilds.update(
                { balance: Number(guildRecord.balance) + amount },
                { where: { IDENT: guildId } }
            );
            await SQL.models.AdvTransactionLogs.create({
                guild: guildId, amount,
                creditAccount: depIDENT,
                debitAccount: guildId,
                creditType: "Department", debitType: "Treasury",
                memo: `TRANSFER | ${dep.name} → Treasury | ${memo}`
            }).catch(console.error);

            return interaction.editReply({
                embeds: [new EmbedBuilder().setColor("Green").setTitle("Transfer Complete")
                    .addFields(
                        { name: "From", value: dep.name, inline: true },
                        { name: "To", value: "Treasury", inline: true },
                        { name: "Amount", value: await guildManager.formatMoney(amount), inline: true },
                        { name: "Memo", value: memo, inline: false }
                    ).setTimestamp()]
            });
        }

        // ── business-to-treasury ───────────────────────────────────────────────
        if (sub === "business-to-treasury") {
            const businessIDENT = interaction.options.getString("business");
            const busManager = new BusinessHQ(interaction, businessIDENT);

            const authorized = await PermManager.Business.checkPerm(busManager, interaction, "manager");
            if (!authorized) {
                return interaction.editReply({
                    embeds: [new EmbedBuilder().setColor("Red").setDescription("You need manager permission to transfer funds out of this business.")]
                });
            }

            const busAccount = await SQL.models.Accounts.findByPk(businessIDENT, { raw: true });
            if (!busAccount) {
                return interaction.editReply({
                    embeds: [new EmbedBuilder().setColor("Red").setDescription("Business account not found.")]
                });
            }

            if (Number(busAccount.balance) < amount) {
                return interaction.editReply({
                    embeds: [new EmbedBuilder().setColor("Red").setDescription(`Insufficient business funds. Balance: ${await guildManager.formatMoney(busAccount.balance)}`)]
                });
            }

            const guildRecord = await SQL.models.Guilds.findByPk(guildId, { raw: true });

            await SQL.models.Accounts.update(
                { balance: Number(busAccount.balance) - amount },
                { where: { IDENT: businessIDENT } }
            );
            await SQL.models.Guilds.update(
                { balance: Number(guildRecord.balance) + amount },
                { where: { IDENT: guildId } }
            );
            await SQL.models.AdvTransactionLogs.create({
                guild: guildId, amount,
                creditAccount: businessIDENT,
                debitAccount: guildId,
                creditType: "Account", debitType: "Treasury",
                memo: `TRANSFER | ${busAccount.name} → Treasury | ${memo}`
            }).catch(console.error);

            return interaction.editReply({
                embeds: [new EmbedBuilder().setColor("Green").setTitle("Transfer Complete")
                    .addFields(
                        { name: "From", value: busAccount.name, inline: true },
                        { name: "To", value: "Treasury", inline: true },
                        { name: "Amount", value: await guildManager.formatMoney(amount), inline: true },
                        { name: "Memo", value: memo, inline: false }
                    ).setTimestamp()]
            });
        }

        // ── business-to-department ─────────────────────────────────────────────
        if (sub === "business-to-department") {
            const businessIDENT = interaction.options.getString("business");
            const depIDENT = interaction.options.getString("department");
            const busManager = new BusinessHQ(interaction, businessIDENT);

            const authorized = await PermManager.Business.checkPerm(busManager, interaction, "manager");
            if (!authorized) {
                return interaction.editReply({
                    embeds: [new EmbedBuilder().setColor("Red").setDescription("You need manager permission to transfer funds out of this business.")]
                });
            }

            const busAccount = await SQL.models.Accounts.findByPk(businessIDENT, { raw: true });
            if (!busAccount) {
                return interaction.editReply({
                    embeds: [new EmbedBuilder().setColor("Red").setDescription("Business account not found.")]
                });
            }

            if (Number(busAccount.balance) < amount) {
                return interaction.editReply({
                    embeds: [new EmbedBuilder().setColor("Red").setDescription(`Insufficient business funds. Balance: ${await guildManager.formatMoney(busAccount.balance)}`)]
                });
            }

            const dep = await SQL.models.Department.findByPk(depIDENT, { raw: true });
            if (!dep) {
                return interaction.editReply({
                    embeds: [new EmbedBuilder().setColor("Red").setDescription("Department not found.")]
                });
            }

            await SQL.models.Accounts.update(
                { balance: Number(busAccount.balance) - amount },
                { where: { IDENT: businessIDENT } }
            );
            await SQL.models.Department.update(
                { balance: Number(dep.balance) + amount },
                { where: { IDENT: depIDENT } }
            );
            await SQL.models.AdvTransactionLogs.create({
                guild: guildId, amount,
                creditAccount: businessIDENT,
                debitAccount: depIDENT,
                creditType: "Account", debitType: "Department",
                memo: `TRANSFER | ${busAccount.name} → ${dep.name} | ${memo}`
            }).catch(console.error);

            return interaction.editReply({
                embeds: [new EmbedBuilder().setColor("Green").setTitle("Transfer Complete")
                    .addFields(
                        { name: "From", value: busAccount.name, inline: true },
                        { name: "To", value: dep.name, inline: true },
                        { name: "Amount", value: await guildManager.formatMoney(amount), inline: true },
                        { name: "Memo", value: memo, inline: false }
                    ).setTimestamp()]
            });
        }
    }
};
