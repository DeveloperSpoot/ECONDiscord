const { SlashCommandBuilder, EmbedBuilder, MessageFlags, PermissionFlagsBits } = require("discord.js");
const SQL = require("../dataCrusher/Server");
const { ErrorEmbed } = require("../utils/embedUtil");
const { GuildHQ, RetrieveData } = require("../dataCrusher/Headquarters");

function parseBrackets(str) {
    const parts = str.split(',').map(s => s.trim()).filter(Boolean);
    if (parts.length === 0) {
        return { error: 'Brackets string is empty. Example: `50000:10,100000:20,30`' };
    }
    const brackets = [];
    let prev = 0;
    for (const part of parts) {
        if (part.includes(':')) {
            const [threshStr, rateStr] = part.split(':');
            const thresh = Number(threshStr);
            const rate = Number(rateStr);
            if (isNaN(thresh) || isNaN(rate)) {
                return { error: `Invalid bracket \`${part}\`. Expected \`threshold:rate\` (e.g. \`50000:10\`).` };
            }
            if (thresh <= prev) {
                return { error: `Thresholds must be in ascending order. Got \`${thresh}\` after \`${prev}\`.` };
            }
            if (rate < 0 || rate > 100) {
                return { error: `Rate \`${rate}\` is out of range. Must be between 0 and 100.` };
            }
            brackets.push({ from: prev, to: thresh, rate });
            prev = thresh;
        } else {
            const rate = Number(part);
            if (isNaN(rate)) {
                return { error: `Invalid top rate \`${part}\`. Expected a plain number (e.g. \`30\`).` };
            }
            if (rate < 0 || rate > 100) {
                return { error: `Rate \`${rate}\` is out of range. Must be between 0 and 100.` };
            }
            brackets.push({ from: prev, to: Infinity, rate });
        }
    }
    return { brackets };
}

function calcTax(balance, brackets) {
    let tax = 0;
    for (const b of brackets) {
        if (balance <= b.from) break;
        const slice = Math.min(balance, b.to) - b.from;
        tax += slice * (b.rate / 100);
    }
    return Math.round(tax * 100) / 100;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("tax")
        .setDescription("Apply a progressive tax sweep to guild members or businesses.")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(opt =>
            opt.setName("type")
                .setDescription("Which balance to tax.")
                .setRequired(true)
                .addChoices(
                    { name: "Income (wallet)", value: "income" },
                    { name: "PEX (bank balance)", value: "pex" },
                    { name: "VAT (business accounts)", value: "vat" }
                ))
        .addStringOption(opt =>
            opt.setName("brackets")
                .setDescription("Format: 50000:10,100000:20,30 — thresholds:rate%, trailing number = top bracket rate.")
                .setRequired(true))
        .addRoleOption(opt =>
            opt.setName("target-role")
                .setDescription("Apply to members of a specific role only. Income/PEX only. Omit for all.")
                .setRequired(false))
        .addBooleanOption(opt =>
            opt.setName("preview")
                .setDescription("Preview calculations without deducting anything.")
                .setRequired(false)),

    async execute(interaction) {
        if (!interaction.guild) {
            return ErrorEmbed(interaction, "This command can only be used inside a server.");
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const taxType = interaction.options.getString("type");
        const bracketsStr = interaction.options.getString("brackets");
        const targetRole = interaction.options.getRole("target-role");
        const previewOnly = interaction.options.getBoolean("preview") ?? false;

        const { brackets, error } = parseBrackets(bracketsStr);
        if (error) {
            return ErrorEmbed(interaction, error, false, false);
        }

        const taxLabel = taxType === "income" ? "Income Tax" : taxType === "pex" ? "PEX" : "VAT";
        const guildManager = new GuildHQ(interaction);
        const results = [];
        let totalCollected = 0;

        // ── VAT: sweep all business accounts ──────────────────────────────────
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

        // ── Income / PEX: sweep member wallet or bank ──────────────────────────
        } else {
            const accountType = taxType === "income" ? "personal-wallet" : "personal-bank";

            // Resolve members — role-filtered or all
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
                    where: { owner: member.IDENT, type: accountType },
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
                        memo: `${taxLabel} | User ${member.id}`
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
                embeds: [
                    new EmbedBuilder()
                        .setColor("Yellow")
                        .setDescription(`No taxable balances found under these brackets.`)
                ]
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

        return interaction.editReply({ embeds: [embed] });
    }
};
