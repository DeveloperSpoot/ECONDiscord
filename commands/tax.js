const { SlashCommandBuilder, EmbedBuilder, MessageFlags, PermissionFlagsBits } = require("discord.js");
const SQL = require("../dataCrusher/Server");
const { ErrorEmbed } = require("../utils/embedUtil");
const { GuildHQ } = require("../dataCrusher/Headquarters");
const { parseBrackets, calcTax } = require("../utils/taxBrackets");
const { LogGeneral } = require("../dataCrusher/services/guild");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("tax")
        .setDescription("Set income tax brackets, or apply a PEX/VAT sweep.")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(opt =>
            opt.setName("type")
                .setDescription("Tax type.")
                .setRequired(true)
                .addChoices(
                    { name: "Income (sets brackets for /collect-income)", value: "income" },
                    { name: "PEX (bank balance sweep)", value: "pex" },
                    { name: "VAT (business accounts sweep)", value: "vat" }
                ))
        .addStringOption(opt =>
            opt.setName("brackets")
                .setDescription("Format: 50000:10,100000:20,30 — thresholds:rate%, trailing number = top bracket rate.")
                .setRequired(true))
        .addRoleOption(opt =>
            opt.setName("target-role")
                .setDescription("PEX only: apply to members of a specific role. Omit for all members.")
                .setRequired(false))
        .addBooleanOption(opt =>
            opt.setName("preview")
                .setDescription("PEX/VAT only: preview calculations without deducting anything.")
                .setRequired(false)),

    async execute(interaction) {
        if (!interaction.guild) {
            return ErrorEmbed(interaction, "This command can only be used inside a server.");
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const taxType = interaction.options.getString("type");
        const bracketsStr = interaction.options.getString("brackets");

        const { brackets, error } = parseBrackets(bracketsStr);
        if (error) {
            return ErrorEmbed(interaction, error, false, false);
        }

        const guildManager = new GuildHQ(interaction);

        // ── Income: store brackets for /collect-income to use ─────────────────
        if (taxType === "income") {
            await SQL.models.Guilds.update(
                { incomeTaxBrackets: bracketsStr },
                { where: { IDENT: interaction.IDENT } }
            );

            const bracketSummary = brackets.map(b => {
                const from = b.from === 0 ? "0" : b.from.toLocaleString();
                const to = b.to === Infinity ? "∞" : b.to.toLocaleString();
                return `${from}–${to}: ${b.rate}%`;
            }).join("\n");

            const embed = new EmbedBuilder()
                .setTitle("Income Tax Brackets Set")
                .setColor("Green")
                .setDescription("These brackets will be applied automatically when members use `/collect-income`.")
                .addFields({ name: "Brackets", value: bracketSummary })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
            await LogGeneral(interaction, 'Green', 'Income Tax Brackets Set', `Income tax brackets updated by <@${interaction.user.id}>.`, {name: 'Brackets', value: bracketSummary}).catch(console.error);
            return;
        }

        // ── VAT: sweep all business accounts ──────────────────────────────────
        const targetRole = interaction.options.getRole("target-role");
        const previewOnly = interaction.options.getBoolean("preview") ?? false;
        const taxLabel = taxType === "pex" ? "PEX" : "VAT";
        const results = [];
        let totalCollected = 0;

        if (taxType === "vat") {
            const businessAccounts = await SQL.models.Accounts.findAll({
                where: { guild: interaction.IDENT, type: "business" },
                raw: true
            });

            if (!businessAccounts || businessAccounts.length === 0) {
                return interaction.editReply({
                    embeds: [new EmbedBuilder().setColor("Yellow").setDescription("No business accounts found in this server.")]
                });
            }

            for (const account of businessAccounts) {
                const balance = Number(account.balance);
                if (balance <= 0) continue;

                const tax = calcTax(balance, brackets);
                if (tax <= 0) continue;

                const actualTax = Math.min(tax, balance);
                results.push({ label: account.name || account.IDENT, accountIDENT: account.IDENT, balance, tax: actualTax });

                if (!previewOnly) {
                    await SQL.models.Accounts.update(
                        { balance: balance - actualTax },
                        { where: { IDENT: account.IDENT } }
                    );
                    await SQL.models.AdvTransactionLogs.create({
                        guild: interaction.IDENT,
                        amount: actualTax,
                        creditAccount: account.IDENT,
                        debitAccount: interaction.guildId,
                        creditType: "Account",
                        debitType: "Treasury",
                        memo: `VAT | ${account.name || account.IDENT}`
                    }).catch(console.error);
                }

                totalCollected += actualTax;
            }

        // ── PEX: sweep member bank balances ───────────────────────────────────
        } else {
            let members = await SQL.models.GuildMembers.findAll({
                where: { guild: interaction.IDENT },
                raw: true
            });

            if (targetRole) {
                const discordRole = await interaction.guild.roles.fetch(targetRole.id, { force: true });
                await interaction.guild.members.fetch();
                const roleDiscordIds = new Set([...discordRole.members.keys()]);
                members = members.filter(m => roleDiscordIds.has(String(m.id)));
            }

            if (!members || members.length === 0) {
                return interaction.editReply({
                    embeds: [new EmbedBuilder().setColor("Yellow").setDescription("No registered members found for that role.")]
                });
            }

            for (const member of members) {
                const account = await SQL.models.Accounts.findOne({
                    where: { owner: member.IDENT, type: "personal-bank" },
                    raw: true
                });

                if (!account || Number(account.balance) <= 0) continue;

                const balance = Number(account.balance);
                const tax = calcTax(balance, brackets);
                if (tax <= 0) continue;

                const actualTax = Math.min(tax, balance);
                results.push({ label: `<@${member.id}>`, accountIDENT: account.IDENT, balance, tax: actualTax });

                if (!previewOnly) {
                    await SQL.models.Accounts.update(
                        { balance: balance - actualTax },
                        { where: { IDENT: account.IDENT } }
                    );
                    await SQL.models.AdvTransactionLogs.create({
                        guild: interaction.IDENT,
                        amount: actualTax,
                        creditAccount: account.IDENT,
                        debitAccount: interaction.guildId,
                        creditType: "Account",
                        debitType: "Treasury",
                        memo: `PEX | User ${member.id}`
                    }).catch(console.error);
                }

                totalCollected += actualTax;
            }
        }

        // Single treasury credit
        if (!previewOnly && totalCollected > 0) {
            const guild = await SQL.models.Guilds.findByPk(interaction.IDENT, { raw: true });
            await SQL.models.Guilds.update(
                { balance: Number(guild.balance) + totalCollected },
                { where: { IDENT: interaction.IDENT } }
            );
        }

        if (results.length === 0) {
            return interaction.editReply({
                embeds: [new EmbedBuilder().setColor("Yellow").setDescription("No taxable balances found under these brackets.")]
            });
        }

        const DETAIL_LIMIT = 15;
        let desc = "";
        for (const r of results.slice(0, DETAIL_LIMIT)) {
            desc += `• ${r.label} — taxed **${await guildManager.formatMoney(r.tax)}** (balance: ${await guildManager.formatMoney(r.balance)})\n`;
        }
        if (results.length > DETAIL_LIMIT) {
            desc += `_...and ${results.length - DETAIL_LIMIT} more_\n`;
        }

        const bracketSummary = brackets.map(b => {
            const from = b.from === 0 ? "0" : b.from.toLocaleString();
            const to = b.to === Infinity ? "∞" : b.to.toLocaleString();
            return `${from}–${to}: ${b.rate}%`;
        }).join("  |  ");

        const countLabel = taxType === "vat" ? "Businesses Taxed" : "Members Taxed";

        const embed = new EmbedBuilder()
            .setTitle(previewOnly ? `${taxLabel} — Preview` : `${taxLabel} — Applied`)
            .setColor(previewOnly ? "Blue" : "Green")
            .setDescription(desc)
            .addFields(
                { name: countLabel, value: String(results.length), inline: true },
                { name: previewOnly ? "Would Collect" : "Total Collected", value: await guildManager.formatMoney(totalCollected), inline: true },
                { name: "Brackets", value: bracketSummary, inline: false }
            )
            .setFooter({ text: previewOnly ? "Preview only — no balances were changed." : "Tax collection complete." })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });

        if (!previewOnly && results.length > 0) {
            if (taxType === 'pex') {
                await LogGeneral(interaction, 'Orange', 'PEX Tax Applied', `PEX sweep by <@${interaction.user.id}>.`, {name: 'Members Taxed', value: String(results.length), inline: true}, {name: 'Total Collected', value: await guildManager.formatMoney(totalCollected), inline: true}).catch(console.error);
            } else {
                await LogGeneral(interaction, 'Orange', 'VAT Applied', `VAT sweep by <@${interaction.user.id}>.`, {name: 'Businesses Taxed', value: String(results.length), inline: true}, {name: 'Total Collected', value: await guildManager.formatMoney(totalCollected), inline: true}).catch(console.error);
            }
        }
    }
};
