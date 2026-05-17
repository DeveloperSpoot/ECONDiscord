const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require("discord.js");
const SQL = require("../dataCrusher/Server");
const { ErrorEmbed } = require("../utils/embedUtil");
const { UserHQ, RetrieveData, DepartmentHQ, BusinessHQ, GuildHQ, SalaryHQ } = require("../dataCrusher/Headquarters");
const IRS = require("../dataCrusher/services/irs");
const { parseBrackets, calcTax } = require("../utils/taxBrackets");
const { LogGeneral } = require("../dataCrusher/services/guild");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("collect-income")
        .setDescription("Collect unpaid wages from departments and businesses.")
        .addStringOption(option =>
            option
                .setName("entity-type")
                .setDescription("Limit collection to one entity type.")
                .addChoices(
                    { name: "All", value: "all" },
                    { name: "Department", value: "department" },
                    { name: "Business", value: "business" }
                )
                .setRequired(false))
        .addBooleanOption(option =>
            option
                .setName("preview")
                .setDescription("Preview the payout without collecting.")
                .setRequired(false)),
    async execute(interaction) {
        if (!interaction.guild) {
            return await ErrorEmbed(interaction, "This command can only be used inside a server.");
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const filterType = interaction.options.getString("entity-type") ?? "all";
        const previewOnly = interaction.options.getBoolean("preview") ?? false;

        const guildMemberRecord = await RetrieveData.user(interaction, interaction.user.id);
        if (!guildMemberRecord) {
            return await ErrorEmbed(interaction, "You must be registered before collecting income.", false, false);
        }

        const salaries = await SalaryHQ.listForMember({
            guild: interaction.IDENT,
            memberIDENT: guildMemberRecord.IDENT,
            entityType: filterType
        });

        if (salaries.length === 0) {
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Yellow")
                        .setDescription("There are no salary payouts configured for you.")
                ]
            });
        }

        const userHQ = new UserHQ(interaction, interaction.user.id);
        const guildManager = new GuildHQ(interaction);
        const userAccounts = await userHQ.getBasicAccounts();
        if (!userAccounts || !userAccounts.bank) {
            return await ErrorEmbed(interaction, "Unable to locate your bank account. Please register again or contact an administrator.", false, false);
        }
        const bankAccountId = userAccounts.bank.id ?? userAccounts.bank.IDENT;
        const bankAccount = await SQL.models.Accounts.findByPk(bankAccountId, { raw: true });
        if (!bankAccount) {
            return await ErrorEmbed(interaction, "Unable to load your bank account balance. Please try again later.", false, false);
        }
        const revenueService = new IRS(interaction);
        const guildRecord = await SQL.models.Guilds.findByPk(interaction.IDENT, { raw: true });
        const incomeBrackets = guildRecord?.incomeTaxBrackets
            ? parseBrackets(guildRecord.incomeTaxBrackets).brackets ?? null
            : null;
        const now = new Date();
        const nowMs = now.getTime();
        const memberRoles = interaction.member.roles.cache;
        const results = [];
        let totalNet = 0;
        let totalGross = 0;
        let totalTax = 0;
        let anyPaid = false;

        for (const salary of salaries) {
            const isRoleEntry = !salary.memberIDENT && salary.roleId;
            if (isRoleEntry) {
                if (!memberRoles.has(salary.roleId)) {
                    continue;
                }
            } else if (salary.memberIDENT !== guildMemberRecord.IDENT) {
                continue;
            }

            const periodDays = salary.periodDays ?? 7;
            const periodMs = periodDays * 24 * 60 * 60 * 1000;
            let lastPaid = salary.lastPaidAt ? new Date(salary.lastPaidAt).getTime() : null;
            let receipt = null;

            if (isRoleEntry) {
                receipt = await SalaryHQ.getReceipt(salary.IDENT, guildMemberRecord.IDENT);
                lastPaid = receipt?.lastPaidAt ? new Date(receipt.lastPaidAt).getTime() : null;
            }

            let cyclesDue = !lastPaid ? 1 : Math.floor((nowMs - lastPaid) / periodMs);

            const summary = {
                name: "",
                type: salary.entityType,
                gross: 0,
                net: 0,
                tax: 0,
                cycles: cyclesDue,
                periodDays,
                paid: false,
                reason: null,
                roleId: salary.roleId ?? null
            };

            const entity =
                salary.entityType === "business"
                    ? new BusinessHQ(interaction, salary.entityIDENT)
                    : new DepartmentHQ(interaction, salary.entityIDENT);
            summary.name = await entity.getName();

            if (cyclesDue <= 0) {
                if (lastPaid) {
                    summary.reason = `Next payout <t:${Math.floor((lastPaid + periodMs) / 1000)}:R>`;
                } else {
                    summary.reason = "Not yet eligible.";
                }
                results.push(summary);
                continue;
            }

            const gross = Number(salary.amount) * cyclesDue;
            summary.gross = gross;
            if (gross <= 0) {
                summary.reason = "Salary amount is zero.";
                results.push(summary);
                continue;
            }

            const sourceRecord =
                salary.entityType === "business"
                    ? await SQL.models.Accounts.findByPk(salary.entityIDENT, { raw: true })
                    : await SQL.models.Department.findByPk(salary.entityIDENT, { raw: true });
            const available = Number(sourceRecord?.balance ?? 0);

            let taxAmount = 0;
            let netAmount = gross;
            if (incomeBrackets) {
                taxAmount = calcTax(gross, incomeBrackets);
                netAmount = gross - taxAmount;
            }
            summary.net = netAmount;
            summary.tax = taxAmount;

            if (!previewOnly) {
                const totalCost = netAmount + taxAmount;
                if (available < totalCost) {
                    summary.reason = "Insufficient funds.";
                    results.push(summary);
                    continue;
                }

                if (salary.entityType === "business") {
                    await SQL.models.Accounts.update(
                        {
                            balance: available - netAmount,
                            netWorth: Number(sourceRecord.netWorth ?? 0) - netAmount
                        },
                        { where: { IDENT: salary.entityIDENT } }
                    );
                } else {
                    await SQL.models.Department.update(
                        { balance: available - netAmount },
                        { where: { IDENT: salary.entityIDENT } }
                    );
                }

                await SQL.models.Accounts.update(
                    {
                        balance: Number(bankAccount.balance) + netAmount,
                        netWorth: Number(bankAccount.netWorth ?? 0) + netAmount
                    },
                    { where: { IDENT: bankAccount.IDENT } }
                );
                bankAccount.balance = Number(bankAccount.balance) + netAmount;
                bankAccount.netWorth = Number(bankAccount.netWorth ?? 0) + netAmount;

                await SQL.models.AdvTransactionLogs.create({
                    guild: interaction.IDENT,
                    amount: netAmount,
                    creditAccount: salary.entityIDENT,
                    debitAccount: bankAccount.IDENT,
                    creditType: salary.entityType === "business" ? "Account" : "Department",
                    debitType: "Account",
                    memo: `COLLECT-SALARY | ${summary.name}`
                }).catch(console.error);

                if (taxAmount > 0) {
                    await revenueService.filePayrollTax(
                        taxAmount,
                        entity,
                        salary.entityType === "business" ? "Account" : "Department"
                    );
                }

                if (isRoleEntry) {
                    await SQL.models.SalaryReceipt.update(
                        { lastPaidAt: now },
                        { where: { IDENT: receipt.IDENT } }
                    );
                } else {
                    await SQL.models.Salary.update(
                        { lastPaidAt: now },
                        { where: { IDENT: salary.IDENT } }
                    );
                }

                summary.paid = true;
                anyPaid = true;
            }

            totalNet += netAmount;
            totalGross += gross;
            totalTax += taxAmount;
            results.push(summary);
        }

        if (results.length === 0) {
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Yellow")
                        .setDescription("There are no salary entries applicable to you right now.")
                ]
            });
        }

        const embed = new EmbedBuilder()
            .setTitle(previewOnly ? "Income Preview" : "Income Collection")
            .setColor(anyPaid ? "Green" : previewOnly ? "Blue" : "Yellow");

        let desc = "";
        for (const result of results) {
            const status = result.paid ? "🟢 Paid" : previewOnly ? "📋" : "⚠️ Skipped";
            const cyclesLabel = Math.max(result.cycles ?? 0, 0);
            const targetLabel = result.roleId ? `<@&${result.roleId}>` : `<@${interaction.user.id}>`;
            desc += `${status} **${result.name}** → ${targetLabel} · ${await guildManager.formatMoney(result.gross)} (${cyclesLabel} cycle(s))`;
            if (result.tax > 0) {
                desc += ` · Tax ${await guildManager.formatMoney(result.tax)}`;
            }
            if (result.reason) {
                desc += ` — ${result.reason}`;
            }
            desc += "\n";
        }

        if (!desc) {
            desc = previewOnly ? "Nothing to preview." : "No payouts were processed.";
        }

        embed.setDescription(desc)
            .addFields(
                { name: "Total Gross", value: await guildManager.formatMoney(totalGross), inline: true },
                { name: "Total Net", value: await guildManager.formatMoney(totalNet), inline: true },
                { name: "Payroll Tax", value: await guildManager.formatMoney(totalTax), inline: true }
            );

        embed.setFooter({
            text: previewOnly ? "Preview only." : anyPaid ? "Payout complete." : "Nothing collected."
        });

        await interaction.editReply({ embeds: [embed] });

        if (anyPaid && !previewOnly) {
            await LogGeneral(interaction, 'Green', 'Income Collected', `<@${interaction.user.id}> collected income.`, {name: 'Total Gross', value: await guildManager.formatMoney(totalGross), inline: true}, {name: 'Tax Withheld', value: await guildManager.formatMoney(totalTax), inline: true}, {name: 'Net Received', value: await guildManager.formatMoney(totalNet), inline: true}).catch(console.error);
        }
    }
};
