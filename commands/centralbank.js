const { SlashCommandBuilder, EmbedBuilder, MessageFlags, PermissionFlagsBits } = require("discord.js");
const SQL = require("../dataCrusher/Server");
const { ErrorEmbed } = require("../utils/embedUtil");
const { GuildHQ, RetrieveData, NotificationHQ, CreateData, PermManager } = require("../dataCrusher/Headquarters");
const { getGuildStrength } = require("../dataCrusher/services/forexService");
const { convertCurrency, ALPHA, BETA } = require("../utils/forexStrength");
const { Op } = require("sequelize");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("centralbank")
        .setDescription("Central bank operations — money supply, printing, and foreign reserves.")

        // balance
        .addSubcommand(sub =>
            sub.setName("balance")
                .setDescription("View the Central Bank balance."))

        // money-supply
        .addSubcommand(sub =>
            sub.setName("money-supply")
                .setDescription("View a breakdown of total money in circulation."))

        // print
        .addSubcommand(sub =>
            sub.setName("print")
                .setDescription("Print new money into the Central Bank.")
                .addNumberOption(opt =>
                    opt.setName("amount")
                        .setDescription("Amount to print.")
                        .setRequired(true))
                .addStringOption(opt =>
                    opt.setName("memo")
                        .setDescription("Reason for printing.")
                        .setRequired(true)))

        // report
        .addSubcommand(sub =>
            sub.setName("report")
                .setDescription("Macro-economic dashboard for this server."))

        // authorize subcommand group
        .addSubcommandGroup(group =>
            group.setName("authorize")
                .setDescription("Manage who can use Central Bank commands.")
                .addSubcommand(sub =>
                    sub.setName("add")
                        .setDescription("Authorize a user to manage the Central Bank.")
                        .addUserOption(opt =>
                            opt.setName("user")
                                .setDescription("The user to authorize.")
                                .setRequired(true)))
                .addSubcommand(sub =>
                    sub.setName("remove")
                        .setDescription("Remove a user's Central Bank authorization.")
                        .addUserOption(opt =>
                            opt.setName("user")
                                .setDescription("The user to deauthorize.")
                                .setRequired(true))))

        // reserves subcommand group
        .addSubcommandGroup(group =>
            group.setName("reserves")
                .setDescription("Manage foreign currency reserves.")
                .addSubcommand(sub =>
                    sub.setName("view")
                        .setDescription("View all foreign currency reserve holdings."))
                .addSubcommand(sub =>
                    sub.setName("buy")
                        .setDescription("Buy foreign currency reserves from another server.")
                        .addStringOption(opt =>
                            opt.setName("foreign-server")
                                .setDescription("Server whose currency to buy.")
                                .setRequired(true)
                                .setAutocomplete(true))
                        .addNumberOption(opt =>
                            opt.setName("amount")
                                .setDescription("Amount of domestic currency to spend.")
                                .setRequired(true)))
                .addSubcommand(sub =>
                    sub.setName("sell")
                        .setDescription("Sell foreign currency reserves back to domestic treasury.")
                        .addStringOption(opt =>
                            opt.setName("foreign-server")
                                .setDescription("Server whose currency to sell.")
                                .setRequired(true)
                                .setAutocomplete(true))
                        .addNumberOption(opt =>
                            opt.setName("amount")
                                .setDescription("Amount of foreign currency to sell.")
                                .setRequired(true)))),

    async autocomplete(interaction) {
        const focused = interaction.options.getFocused();
        const currentGuildId = interaction.IDENT ?? interaction.guildId;

        const choices = interaction.client.guilds.cache
            .filter(g => g.id !== currentGuildId)
            .map(g => ({ name: g.name, value: g.id }))
            .filter(g => g.name.toLowerCase().includes(focused.toLowerCase()))
            .slice(0, 25);

        await interaction.respond(choices);
    },

    async execute(interaction) {
        if (!interaction.guild) {
            return ErrorEmbed(interaction, "This command can only be used inside a server.");
        }

        const guildId = interaction.IDENT;
        const guildManager = new GuildHQ(interaction);

        // Determine full subcommand key (group + sub or just sub)
        let sub;
        const group = interaction.options.getSubcommandGroup(false);
        sub = group ? `${group} ${interaction.options.getSubcommand()}` : interaction.options.getSubcommand();

        // ── authorize add/remove — owner-only gate ────────────────────────────
        if (sub === "authorize add" || sub === "authorize remove") {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });

            if (interaction.user.id !== interaction.guild.ownerId) {
                return interaction.editReply({
                    embeds: [new EmbedBuilder().setColor("Red").setDescription("Only the server owner can manage Central Bank authorizations.")]
                });
            }

            const user = interaction.options.getUser("user");

            if (sub === "authorize add") {
                await CreateData.cbAuthorizedUser(interaction, user).catch(async err => {
                    return interaction.editReply({
                        embeds: [new EmbedBuilder().setColor("Red").setDescription(`Error: ${err.message}`)]
                    });
                });

                return interaction.editReply({
                    embeds: [new EmbedBuilder()
                        .setColor("Green")
                        .setTitle("CB Authorization Granted")
                        .setDescription(`<@${user.id}> can now manage the Central Bank.`)
                        .setTimestamp()]
                });
            }

            if (sub === "authorize remove") {
                const check = await PermManager.CentralBank.checkAuthorization(interaction, user);
                if (!check) {
                    return interaction.editReply({
                        embeds: [new EmbedBuilder().setColor("Red").setDescription(`<@${user.id}> does not have Central Bank authorization.`)]
                    });
                }
                await PermManager.CentralBank.deauthorize(interaction, user);

                return interaction.editReply({
                    embeds: [new EmbedBuilder()
                        .setColor("Green")
                        .setTitle("CB Authorization Removed")
                        .setDescription(`<@${user.id}>'s Central Bank authorization has been removed.`)
                        .setTimestamp()]
                });
            }
        }

        // ── All other subcommands require CB authorization ────────────────────
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const auth = await PermManager.CentralBank.checkAuthorization(interaction, interaction.user);
        if (!auth) {
            return interaction.editReply({
                embeds: [new EmbedBuilder().setColor("Red").setDescription("You are not authorized to manage the Central Bank.")]
            });
        }

        // ── balance ───────────────────────────────────────────────────────────
        if (sub === "balance") {
            const guildRecord = await SQL.models.Guilds.findByPk(guildId, { raw: true });
            const cbBalance = Number(guildRecord?.cbBalance ?? 0);

            const embed = new EmbedBuilder()
                .setTitle(`${interaction.guild.name} — Central Bank Balance`)
                .setColor("Blue")
                .setDescription(await guildManager.formatMoney(cbBalance))
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });
        }

        // ── money-supply ──────────────────────────────────────────────────────
        if (sub === "money-supply") {
            const walletSum = await SQL.models.Accounts.sum("balance", {
                where: { guild: guildId, type: "personal-wallet" }
            }) ?? 0;
            const bankSum = await SQL.models.Accounts.sum("balance", {
                where: { guild: guildId, type: "personal-bank" }
            }) ?? 0;
            const businessSum = await SQL.models.Accounts.sum("balance", {
                where: { guild: guildId, type: "business" }
            }) ?? 0;
            const departmentSum = await SQL.models.Department.sum("balance", {
                where: { GuildIDENT: guildId }
            }) ?? 0;
            const guildRecord = await SQL.models.Guilds.findByPk(guildId, { raw: true });
            const treasury = Number(guildRecord?.balance ?? 0);
            const cbBalance = Number(guildRecord?.cbBalance ?? 0);

            const total = Number(walletSum) + Number(bankSum) + Number(businessSum) + Number(departmentSum) + treasury + cbBalance;

            const embed = new EmbedBuilder()
                .setTitle(`${interaction.guild.name} — Money Supply`)
                .setColor("Blue")
                .addFields(
                    { name: "Personal Wallets", value: await guildManager.formatMoney(walletSum), inline: true },
                    { name: "Personal Banks", value: await guildManager.formatMoney(bankSum), inline: true },
                    { name: "Business Accounts", value: await guildManager.formatMoney(businessSum), inline: true },
                    { name: "Departments", value: await guildManager.formatMoney(departmentSum), inline: true },
                    { name: "Treasury", value: await guildManager.formatMoney(treasury), inline: true },
                    { name: "Central Bank", value: await guildManager.formatMoney(cbBalance), inline: true },
                    { name: "Total Circulation", value: await guildManager.formatMoney(total), inline: false }
                )
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });
        }

        // ── print ─────────────────────────────────────────────────────────────
        if (sub === "print") {
            const amount = interaction.options.getNumber("amount");
            const memo = interaction.options.getString("memo");

            if (amount <= 0) {
                return interaction.editReply({
                    embeds: [new EmbedBuilder().setColor("Red").setDescription("Amount must be greater than zero.")]
                });
            }

            const guildRecord = await SQL.models.Guilds.findByPk(guildId, { raw: true });
            const oldCbBalance = Number(guildRecord?.cbBalance ?? 0);
            const newCbBalance = oldCbBalance + amount;

            await SQL.models.Guilds.update(
                { cbBalance: newCbBalance },
                { where: { IDENT: guildId } }
            );

            await CreateData.treasuryPrint(interaction, amount, memo);

            await SQL.models.AdvTransactionLogs.create({
                guild: guildId,
                amount: amount,
                creditAccount: guildId,
                debitAccount: guildId,
                creditType: "Treasury",
                debitType: "Treasury",
                memo: `CB PRINT | ${memo}`
            }).catch(console.error);

            const expansionPct = oldCbBalance > 0 ? ((amount / oldCbBalance) * 100).toFixed(2) : "N/A";

            const embed = new EmbedBuilder()
                .setTitle("Money Printed — Central Bank")
                .setColor("Green")
                .addFields(
                    { name: "Amount Printed", value: await guildManager.formatMoney(amount), inline: true },
                    { name: "CB Balance Before", value: await guildManager.formatMoney(oldCbBalance), inline: true },
                    { name: "CB Balance After", value: await guildManager.formatMoney(newCbBalance), inline: true },
                    { name: "Expansion", value: expansionPct !== "N/A" ? `${expansionPct}%` : "N/A", inline: true },
                    { name: "Memo", value: memo, inline: false }
                )
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });
        }

        // ── report ────────────────────────────────────────────────────────────
        if (sub === "report") {
            const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

            const walletSum = Number(await SQL.models.Accounts.sum("balance", { where: { guild: guildId, type: "personal-wallet" } }) ?? 0);
            const bankSum = Number(await SQL.models.Accounts.sum("balance", { where: { guild: guildId, type: "personal-bank" } }) ?? 0);
            const businessSum = Number(await SQL.models.Accounts.sum("balance", { where: { guild: guildId, type: "business" } }) ?? 0);
            const departmentSum = Number(await SQL.models.Department.sum("balance", { where: { GuildIDENT: guildId } }) ?? 0);
            const guildRecord = await SQL.models.Guilds.findByPk(guildId, { raw: true });
            const treasury = Number(guildRecord?.balance ?? 0);
            const cbBalance = Number(guildRecord?.cbBalance ?? 0);
            const totalSupply = walletSum + bankSum + businessSum + departmentSum + treasury + cbBalance;

            const txCount = await SQL.models.AdvTransactionLogs.count({
                where: { guild: guildId, createdAt: { [Op.gte]: since } }
            });

            const { M, V, E, C, strength } = await getGuildStrength(guildId);

            const printedResult = await SQL.models.MoneyPrints.sum("amount", {
                where: { guild: guildId }
            });
            const totalPrinted = Number(printedResult ?? 0);

            const reserves = await SQL.models.ForexReserves.findAll({
                where: { guild: guildId },
                raw: true
            });
            let reserveValueDomestic = 0;
            for (const r of reserves) {
                if (Number(r.amount) <= 0) continue;
                try {
                    const foreignStats = await getGuildStrength(r.foreignGuild);
                    if (foreignStats.strength > 0 && strength > 0) {
                        reserveValueDomestic += convertCurrency(Number(r.amount), foreignStats.strength, strength);
                    }
                } catch { /* skip */ }
            }

            const embed = new EmbedBuilder()
                .setTitle(`${interaction.guild.name} — Central Bank Report`)
                .setColor("Blue")
                .addFields(
                    { name: "Total Money Supply", value: await guildManager.formatMoney(totalSupply), inline: true },
                    { name: "Treasury Balance", value: await guildManager.formatMoney(treasury), inline: true },
                    { name: "Central Bank Balance", value: await guildManager.formatMoney(cbBalance), inline: true },
                    { name: "Total Ever Printed", value: await guildManager.formatMoney(totalPrinted), inline: true },
                    { name: "Transactions (30d)", value: String(txCount), inline: true },
                    { name: "Strength Score (S)", value: strength.toFixed(6), inline: true },
                    { name: "Circulation (C)", value: await guildManager.formatMoney(C), inline: true },
                    { name: "Messages (30d)", value: String(Math.round(M)), inline: true },
                    { name: "VC Minutes (30d)", value: String(Math.round(V)), inline: true },
                    { name: "Foreign Reserves (domestic value)", value: await guildManager.formatMoney(reserveValueDomestic), inline: true }
                )
                .setFooter({ text: `α=${ALPHA} β=${BETA}  |  S = (α·(M+V) + β·E) / C` })
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });
        }

        // ── reserves view ─────────────────────────────────────────────────────
        if (sub === "reserves view") {
            const reserves = await SQL.models.ForexReserves.findAll({
                where: { guild: guildId },
                raw: true
            });

            if (!reserves || reserves.length === 0) {
                return interaction.editReply({
                    embeds: [new EmbedBuilder().setColor("Yellow").setDescription("No foreign currency reserves held.")]
                });
            }

            const homeStats = await getGuildStrength(guildId);
            let desc = "";

            for (const r of reserves) {
                const fg = interaction.client.guilds.cache.get(r.foreignGuild);
                const name = fg?.name ?? r.foreignGuild;
                let rateStr = "N/A";
                try {
                    const foreignStats = await getGuildStrength(r.foreignGuild);
                    if (foreignStats.strength > 0 && homeStats.strength > 0) {
                        const rate = convertCurrency(1, foreignStats.strength, homeStats.strength);
                        rateStr = rate.toFixed(6);
                    }
                } catch { /* skip */ }
                desc += `**${name}** — ${Number(r.amount).toFixed(2)} units · 1 unit = ${rateStr} domestic\n`;
            }

            const embed = new EmbedBuilder()
                .setTitle(`${interaction.guild.name} — Foreign Reserves`)
                .setColor("Blue")
                .setDescription(desc)
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });
        }

        // ── reserves buy ──────────────────────────────────────────────────────
        if (sub === "reserves buy") {
            const foreignGuildId = interaction.options.getString("foreign-server");
            const amount = interaction.options.getNumber("amount");

            if (amount <= 0) {
                return interaction.editReply({
                    embeds: [new EmbedBuilder().setColor("Red").setDescription("Amount must be greater than zero.")]
                });
            }

            const foreignGuild = interaction.client.guilds.cache.get(foreignGuildId);
            if (!foreignGuild) {
                return interaction.editReply({
                    embeds: [new EmbedBuilder().setColor("Red").setDescription("That server is not accessible to the bot.")]
                });
            }

            const guildRecord = await SQL.models.Guilds.findByPk(guildId, { raw: true });
            const cbBalance = Number(guildRecord?.cbBalance ?? 0);

            if (cbBalance < amount) {
                return interaction.editReply({
                    embeds: [new EmbedBuilder().setColor("Red").setDescription(`Insufficient Central Bank funds. CB Balance: ${await guildManager.formatMoney(cbBalance)}`)]
                });
            }

            const [homeStats, foreignStats] = await Promise.all([
                getGuildStrength(guildId),
                getGuildStrength(foreignGuildId)
            ]);

            if (homeStats.strength <= 0 || foreignStats.strength <= 0) {
                return interaction.editReply({
                    embeds: [new EmbedBuilder().setColor("Red").setDescription("Exchange rate cannot be computed — one or both servers have zero strength.")]
                });
            }

            const foreignUnits = convertCurrency(amount, homeStats.strength, foreignStats.strength);

            await SQL.models.Guilds.update(
                { cbBalance: cbBalance - amount },
                { where: { IDENT: guildId } }
            );

            const [row] = await SQL.models.ForexReserves.findOrCreate({
                where: { guild: guildId, foreignGuild: foreignGuildId },
                defaults: { guild: guildId, foreignGuild: foreignGuildId, amount: 0 }
            });
            await row.increment("amount", { by: foreignUnits });

            await SQL.models.AdvTransactionLogs.create({
                guild: guildId,
                amount: amount,
                creditAccount: guildId,
                debitAccount: guildId,
                creditType: "Treasury",
                debitType: "Treasury",
                memo: `RESERVE BUY | ${foreignGuild.name} | ${foreignUnits.toFixed(4)} units`
            }).catch(console.error);

            const embed = new EmbedBuilder()
                .setTitle("Reserves Purchased")
                .setColor("Green")
                .addFields(
                    { name: "Spent (domestic)", value: await guildManager.formatMoney(amount), inline: true },
                    { name: "Received (foreign units)", value: foreignUnits.toFixed(4), inline: true },
                    { name: "Foreign Server", value: foreignGuild.name, inline: true },
                    { name: "Rate", value: `1 domestic → ${(foreignUnits / amount).toFixed(6)} foreign`, inline: false }
                )
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });
        }

        // ── reserves sell ─────────────────────────────────────────────────────
        if (sub === "reserves sell") {
            const foreignGuildId = interaction.options.getString("foreign-server");
            const amount = interaction.options.getNumber("amount");

            if (amount <= 0) {
                return interaction.editReply({
                    embeds: [new EmbedBuilder().setColor("Red").setDescription("Amount must be greater than zero.")]
                });
            }

            const foreignGuild = interaction.client.guilds.cache.get(foreignGuildId);
            const foreignName = foreignGuild?.name ?? foreignGuildId;

            const reserveRow = await SQL.models.ForexReserves.findOne({
                where: { guild: guildId, foreignGuild: foreignGuildId }
            });

            if (!reserveRow || Number(reserveRow.amount) < amount) {
                return interaction.editReply({
                    embeds: [new EmbedBuilder().setColor("Red").setDescription(
                        `Insufficient reserves for **${foreignName}**. ` +
                        `Held: ${Number(reserveRow?.amount ?? 0).toFixed(4)} units.`
                    )]
                });
            }

            const [homeStats, foreignStats] = await Promise.all([
                getGuildStrength(guildId),
                getGuildStrength(foreignGuildId)
            ]);

            if (homeStats.strength <= 0 || foreignStats.strength <= 0) {
                return interaction.editReply({
                    embeds: [new EmbedBuilder().setColor("Red").setDescription("Exchange rate cannot be computed — one or both servers have zero strength.")]
                });
            }

            const domesticReceived = convertCurrency(amount, foreignStats.strength, homeStats.strength);

            await reserveRow.decrement("amount", { by: amount });

            const guildRecord = await SQL.models.Guilds.findByPk(guildId, { raw: true });
            await SQL.models.Guilds.update(
                { cbBalance: Number(guildRecord.cbBalance ?? 0) + domesticReceived },
                { where: { IDENT: guildId } }
            );

            await SQL.models.AdvTransactionLogs.create({
                guild: guildId,
                amount: domesticReceived,
                creditAccount: guildId,
                debitAccount: guildId,
                creditType: "Treasury",
                debitType: "Treasury",
                memo: `RESERVE SELL | ${foreignName} | ${amount} units`
            }).catch(console.error);

            const embed = new EmbedBuilder()
                .setTitle("Reserves Sold")
                .setColor("Green")
                .addFields(
                    { name: "Sold (foreign units)", value: amount.toFixed(4), inline: true },
                    { name: "Received (domestic)", value: await guildManager.formatMoney(domesticReceived), inline: true },
                    { name: "Foreign Server", value: foreignName, inline: true },
                    { name: "Rate", value: `1 foreign → ${(domesticReceived / amount).toFixed(6)} domestic`, inline: false }
                )
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });
        }
    }
};
