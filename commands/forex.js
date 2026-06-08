const { SlashCommandBuilder, EmbedBuilder, MessageFlags, PermissionFlagsBits } = require("discord.js");
const SQL = require("../dataCrusher/Server");
const { ErrorEmbed } = require("../utils/embedUtil");
const { GuildHQ, RetrieveData, PermManager } = require("../dataCrusher/Headquarters");
const { getGuildStrength } = require("../dataCrusher/services/forexService");
const { convertCurrency, canonicalPair, ALPHA, BETA } = require("../utils/forexStrength");
const { LogGeneral } = require("../dataCrusher/services/guild");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("forex")
        .setDescription("Foreign exchange — view rates, convert currency, and manage liquidity pools.")
        .addSubcommand(sub =>
            sub.setName("exchange")
                .setDescription("Exchange your currency into another server's currency.")
                .addNumberOption(opt =>
                    opt.setName("amount")
                        .setDescription("Amount to exchange (in this server's currency).")
                        .setRequired(true))
                .addStringOption(opt =>
                    opt.setName("target-server")
                        .setDescription("The server to exchange into.")
                        .setRequired(true)
                        .setAutocomplete(true)))
        .addSubcommand(sub =>
            sub.setName("rate")
                .setDescription("View the exchange rate between this server and another.")
                .addStringOption(opt =>
                    opt.setName("target-server")
                        .setDescription("The server to compare against.")
                        .setRequired(true)
                        .setAutocomplete(true)))
        .addSubcommand(sub =>
            sub.setName("strength")
                .setDescription("View this server's economic strength metrics."))
        .addSubcommandGroup(group =>
            group.setName("pool")
                .setDescription("Manage the nostro/vostro liquidity pool with another server.")
                .addSubcommand(sub =>
                    sub.setName("deposit")
                        .setDescription("Deposit domestic currency into the liquidity pool with another server (CB authorized).")
                        .addStringOption(opt =>
                            opt.setName("target-server")
                                .setDescription("The server to create/fund the pool with.")
                                .setRequired(true)
                                .setAutocomplete(true))
                        .addNumberOption(opt =>
                            opt.setName("amount")
                                .setDescription("Amount to deposit from the CB balance.")
                                .setRequired(true)))
                .addSubcommand(sub =>
                    sub.setName("withdraw")
                        .setDescription("Withdraw domestic currency from the liquidity pool back to CB (CB authorized).")
                        .addStringOption(opt =>
                            opt.setName("target-server")
                                .setDescription("The pool partner server.")
                                .setRequired(true)
                                .setAutocomplete(true))
                        .addNumberOption(opt =>
                            opt.setName("amount")
                                .setDescription("Amount to withdraw back to CB balance.")
                                .setRequired(true)))
                .addSubcommand(sub =>
                    sub.setName("view")
                        .setDescription("View liquidity pool balances for this server.")
                        .addStringOption(opt =>
                            opt.setName("target-server")
                                .setDescription("Filter to a specific partner server (optional).")
                                .setRequired(false)
                                .setAutocomplete(true)))),

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

        const group = interaction.options.getSubcommandGroup(false);
        const sub = interaction.options.getSubcommand();
        const guildId = interaction.IDENT;
        const guildManager = new GuildHQ(interaction);

        // ── /forex strength ───────────────────────────────────────────────────
        if (sub === "strength") {
            await interaction.deferReply({});
            const { M, V, E, C, strength } = await getGuildStrength(guildId);

            const embed = new EmbedBuilder()
                .setTitle(`${interaction.guild.name} — Economic Strength`)
                .setColor("Blue")
                .addFields(
                    { name: "Messages (30d)", value: String(Math.round(M)), inline: true },
                    { name: "VC Minutes (30d)", value: String(Math.round(V)), inline: true },
                    { name: "Transactions (30d)", value: String(E), inline: true },
                    { name: "Circulation (C)", value: await guildManager.formatMoney(C), inline: true },
                    { name: "Strength Score (S)", value: strength.toFixed(6), inline: true }
                )
                .setFooter({ text: `Formula: S = (α·(M+V) + β·E) / C  |  α=${ALPHA} β=${BETA}` })
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });
        }

        // ── /forex rate ───────────────────────────────────────────────────────
        if (sub === "rate") {
            await interaction.deferReply({});
            const targetGuildId = interaction.options.getString("target-server");
            const homeGuildId = guildId;

            const targetGuild = interaction.client.guilds.cache.get(targetGuildId);
            if (!targetGuild) {
                return interaction.editReply({
                    embeds: [new EmbedBuilder().setColor("Red").setDescription("That server is not accessible to the bot.")]
                });
            }

            const [homeStats, targetStats] = await Promise.all([
                getGuildStrength(homeGuildId),
                getGuildStrength(targetGuildId)
            ]);

            const rateAtoB = homeStats.strength > 0 && targetStats.strength > 0
                ? convertCurrency(1, homeStats.strength, targetStats.strength)
                : 0;
            const rateBtoA = homeStats.strength > 0 && targetStats.strength > 0
                ? convertCurrency(1, targetStats.strength, homeStats.strength)
                : 0;

            const embed = new EmbedBuilder()
                .setTitle("FOREX Rate")
                .setColor("Blue")
                .setDescription(`**${interaction.guild.name}** ↔ **${targetGuild.name}**`)
                .addFields(
                    { name: `1 ${interaction.guild.name} → ${targetGuild.name}`, value: rateAtoB.toFixed(6), inline: true },
                    { name: `1 ${targetGuild.name} → ${interaction.guild.name}`, value: rateBtoA.toFixed(6), inline: true },
                    { name: "​", value: "**Home Server**", inline: false },
                    { name: "Strength", value: homeStats.strength.toFixed(6), inline: true },
                    { name: "Messages (30d)", value: String(Math.round(homeStats.M)), inline: true },
                    { name: "Transactions (30d)", value: String(homeStats.E), inline: true },
                    { name: "Circulation", value: await guildManager.formatMoney(homeStats.C), inline: true },
                    { name: "​", value: `**${targetGuild.name}**`, inline: false },
                    { name: "Strength", value: targetStats.strength.toFixed(6), inline: true },
                    { name: "Messages (30d)", value: String(Math.round(targetStats.M)), inline: true },
                    { name: "Transactions (30d)", value: String(targetStats.E), inline: true },
                    { name: "Circulation", value: targetStats.C.toLocaleString(), inline: true }
                )
                .setFooter({ text: `Formula: S = (α·(M+V) + β·E) / C  |  α=${ALPHA} β=${BETA}` })
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });
        }

        // ── /forex exchange ───────────────────────────────────────────────────
        if (sub === "exchange") {
            await interaction.deferReply({});
            const amount = interaction.options.getNumber("amount");
            const targetGuildId = interaction.options.getString("target-server");
            const homeGuildId = guildId;

            if (amount <= 0) {
                return interaction.editReply({
                    embeds: [new EmbedBuilder().setColor("Red").setDescription("Amount must be greater than zero.")]
                });
            }

            const targetGuild = interaction.client.guilds.cache.get(targetGuildId);
            if (!targetGuild) {
                return interaction.editReply({
                    embeds: [new EmbedBuilder().setColor("Red").setDescription("That server is not accessible to the bot.")]
                });
            }

            // Verify user is registered in both servers
            const homeRecord = await RetrieveData.user(interaction, interaction.user.id);
            if (!homeRecord) {
                return interaction.editReply({
                    embeds: [new EmbedBuilder().setColor("Red").setDescription("You must be registered in this server.")]
                });
            }

            const targetMember = await SQL.models.GuildMembers.findOne({
                where: { guild: targetGuildId, id: interaction.user.id },
                raw: true
            });
            if (!targetMember) {
                return interaction.editReply({
                    embeds: [new EmbedBuilder().setColor("Red").setDescription(`You must be registered in **${targetGuild.name}** to receive funds there.`)]
                });
            }

            // Load source bank account
            const sourceAccount = await SQL.models.Accounts.findOne({
                where: { owner: homeRecord.IDENT, type: "personal-bank" },
                raw: true
            });
            if (!sourceAccount || Number(sourceAccount.balance) < amount) {
                return interaction.editReply({
                    embeds: [new EmbedBuilder().setColor("Red").setDescription("Insufficient funds in your bank account.")]
                });
            }

            // Load target bank account
            const targetAccount = await SQL.models.Accounts.findOne({
                where: { owner: targetMember.IDENT, type: "personal-bank" },
                raw: true
            });
            if (!targetAccount) {
                return interaction.editReply({
                    embeds: [new EmbedBuilder().setColor("Red").setDescription(`No bank account found for you in **${targetGuild.name}**.`)]
                });
            }

            // Compute exchange rate
            const [homeStats, targetStats] = await Promise.all([
                getGuildStrength(homeGuildId),
                getGuildStrength(targetGuildId)
            ]);

            if (homeStats.strength <= 0 || targetStats.strength <= 0) {
                return interaction.editReply({
                    embeds: [new EmbedBuilder().setColor("Red").setDescription(
                        "Exchange rate cannot be computed — one or both servers have zero economic strength.\n" +
                        "Servers need transaction history and circulation to enable FOREX."
                    )]
                });
            }

            const received = convertCurrency(amount, homeStats.strength, targetStats.strength);
            const rate = received / amount;

            // Resolve the canonical pool for this pair
            const [poolGuildA, poolGuildB, homeIsA] = canonicalPair(homeGuildId, targetGuildId);
            const pool = await SQL.models.ForexPool.findOne({ where: { guildA: poolGuildA, guildB: poolGuildB } });

            if (!pool) {
                return interaction.editReply({
                    embeds: [new EmbedBuilder().setColor("Red").setDescription(
                        `No liquidity pool exists for this pair yet.\nA CB from **${interaction.guild.name}** or **${targetGuild.name}** must run \`/forex pool deposit\` first to establish the pool.`
                    )]
                });
            }

            const targetPoolBalance = homeIsA ? Number(pool.balanceB) : Number(pool.balanceA);
            if (targetPoolBalance < received) {
                const targetGuildRecord = await SQL.models.Guilds.findByPk(targetGuildId, { raw: true });
                const targetSymbol = targetGuildRecord?.customCurrency ?? '$';
                return interaction.editReply({
                    embeds: [new EmbedBuilder().setColor("Red").setDescription(
                        `Insufficient liquidity: the pool holds **${targetPoolBalance.toFixed(2)} ${targetSymbol}** but your exchange requires **${received.toFixed(2)} ${targetSymbol}**.\n` +
                        `Ask **${targetGuild.name}**'s CB to run \`/forex pool deposit\` to add more ${targetSymbol} to the pool.`
                    )]
                });
            }

            // Execute pool-mediated transfer (C_n of neither server changes)
            await SQL.models.Accounts.update(
                { balance: Number(sourceAccount.balance) - amount },
                { where: { IDENT: sourceAccount.IDENT } }
            );
            if (homeIsA) {
                await pool.increment('balanceA', { by: amount });
                await pool.decrement('balanceB', { by: received });
            } else {
                await pool.increment('balanceB', { by: amount });
                await pool.decrement('balanceA', { by: received });
            }
            await SQL.models.Accounts.update(
                { balance: Number(targetAccount.balance) + received },
                { where: { IDENT: targetAccount.IDENT } }
            );

            // Transaction logs in both guilds
            await SQL.models.AdvTransactionLogs.create({
                guild: homeGuildId,
                amount: amount,
                creditAccount: sourceAccount.IDENT,
                debitAccount: targetAccount.IDENT,
                creditType: "Account",
                debitType: "Account",
                memo: `FOREX EXCHANGE OUT → ${targetGuild.name} | rate ${rate.toFixed(6)}`
            }).catch(console.error);

            await SQL.models.AdvTransactionLogs.create({
                guild: targetGuildId,
                amount: received,
                creditAccount: sourceAccount.IDENT,
                debitAccount: targetAccount.IDENT,
                creditType: "Account",
                debitType: "Account",
                memo: `FOREX EXCHANGE IN ← ${interaction.guild.name} | rate ${rate.toFixed(6)}`
            }).catch(console.error);

            const embed = new EmbedBuilder()
                .setTitle("FOREX Exchange Complete")
                .setColor("Green")
                .addFields(
                    { name: "Deducted", value: await guildManager.formatMoney(amount), inline: true },
                    { name: "Received", value: received.toFixed(2), inline: true },
                    { name: "Rate", value: `1 : ${rate.toFixed(6)}`, inline: true },
                    { name: "Home Strength", value: homeStats.strength.toFixed(6), inline: true },
                    { name: `${targetGuild.name} Strength`, value: targetStats.strength.toFixed(6), inline: true }
                )
                .setDescription(`Exchanged into **${targetGuild.name}** via liquidity pool`)
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
            await LogGeneral(interaction, 'Blue', 'FOREX Exchange', `<@${interaction.user.id}> exchanged currency.`, {name: 'Sent', value: await guildManager.formatMoney(amount), inline: true}, {name: 'Received', value: received.toFixed(2), inline: true}, {name: 'Rate', value: rate.toFixed(6), inline: true}, {name: 'Target Server', value: targetGuild.name, inline: true}).catch(console.error);
            return;
        }

        // ── /forex pool (deposit / withdraw / view) ───────────────────────────
        if (group === "pool") {
            // deposit and withdraw require CB auth
            if (sub === "deposit" || sub === "withdraw") {
                await interaction.deferReply({});
                const auth = await PermManager.CentralBank.checkAuthorization(interaction, interaction.user);
                if (!auth) {
                    return interaction.editReply({
                        embeds: [new EmbedBuilder().setColor("Red").setDescription("You are not authorized to manage the Central Bank.")]
                    });
                }
            } else {
                await interaction.deferReply({});
            }

            // ── pool deposit ──────────────────────────────────────────────────
            if (sub === "deposit") {
                const targetGuildId = interaction.options.getString("target-server");
                const amount = interaction.options.getNumber("amount");

                if (amount <= 0) {
                    return interaction.editReply({
                        embeds: [new EmbedBuilder().setColor("Red").setDescription("Amount must be greater than zero.")]
                    });
                }

                const targetGuild = interaction.client.guilds.cache.get(targetGuildId);
                if (!targetGuild) {
                    return interaction.editReply({
                        embeds: [new EmbedBuilder().setColor("Red").setDescription("That server is not accessible to the bot.")]
                    });
                }

                const guildRecord = await SQL.models.Guilds.findByPk(guildId, { raw: true });
                if (Number(guildRecord.cbBalance) < amount) {
                    return interaction.editReply({
                        embeds: [new EmbedBuilder().setColor("Red").setDescription(`Insufficient CB funds. CB Balance: ${await guildManager.formatMoney(guildRecord.cbBalance)}`)]
                    });
                }

                const [poolGuildA, poolGuildB, homeIsA] = canonicalPair(guildId, targetGuildId);
                const [pool] = await SQL.models.ForexPool.findOrCreate({
                    where: { guildA: poolGuildA, guildB: poolGuildB },
                    defaults: { guildA: poolGuildA, guildB: poolGuildB, balanceA: 0, balanceB: 0 }
                });

                await SQL.models.Guilds.decrement('cbBalance', { by: amount, where: { IDENT: guildId } });
                if (homeIsA) {
                    await pool.increment('balanceA', { by: amount });
                } else {
                    await pool.increment('balanceB', { by: amount });
                }

                await pool.reload();
                const newPoolA = Number(pool.balanceA);
                const newPoolB = Number(pool.balanceB);

                const embed = new EmbedBuilder()
                    .setTitle("Pool Deposit Successful")
                    .setColor("Green")
                    .setDescription(`Deposited into the **${interaction.guild.name} ↔ ${targetGuild.name}** liquidity pool.`)
                    .addFields(
                        { name: "Deposited", value: await guildManager.formatMoney(amount), inline: true },
                        { name: `${interaction.guild.name} Pool Balance`, value: await guildManager.formatMoney(homeIsA ? newPoolA : newPoolB), inline: true },
                        { name: `${targetGuild.name} Pool Balance`, value: (homeIsA ? newPoolB : newPoolA).toFixed(2), inline: true }
                    )
                    .setFooter({ text: "Pool balances count toward each server's C_n — deposits do not affect strength." })
                    .setTimestamp();

                await interaction.editReply({ embeds: [embed] });
                await LogGeneral(interaction, 'Blue', 'FOREX Pool Deposit', `<@${interaction.user.id}> deposited into pool with ${targetGuild.name}.`, {name: 'Amount', value: await guildManager.formatMoney(amount), inline: true}, {name: 'Partner', value: targetGuild.name, inline: true}).catch(console.error);
                return;
            }

            // ── pool withdraw ─────────────────────────────────────────────────
            if (sub === "withdraw") {
                const targetGuildId = interaction.options.getString("target-server");
                const amount = interaction.options.getNumber("amount");

                if (amount <= 0) {
                    return interaction.editReply({
                        embeds: [new EmbedBuilder().setColor("Red").setDescription("Amount must be greater than zero.")]
                    });
                }

                const targetGuild = interaction.client.guilds.cache.get(targetGuildId);
                if (!targetGuild) {
                    return interaction.editReply({
                        embeds: [new EmbedBuilder().setColor("Red").setDescription("That server is not accessible to the bot.")]
                    });
                }

                const [poolGuildA, poolGuildB, homeIsA] = canonicalPair(guildId, targetGuildId);
                const pool = await SQL.models.ForexPool.findOne({ where: { guildA: poolGuildA, guildB: poolGuildB } });

                if (!pool) {
                    return interaction.editReply({
                        embeds: [new EmbedBuilder().setColor("Red").setDescription("No pool exists for this pair. Use `/forex pool deposit` to create one.")]
                    });
                }

                const homePoolBalance = homeIsA ? Number(pool.balanceA) : Number(pool.balanceB);
                if (homePoolBalance < amount) {
                    return interaction.editReply({
                        embeds: [new EmbedBuilder().setColor("Red").setDescription(`Pool only holds **${await guildManager.formatMoney(homePoolBalance)}** on your side.`)]
                    });
                }

                if (homeIsA) {
                    await pool.decrement('balanceA', { by: amount });
                } else {
                    await pool.decrement('balanceB', { by: amount });
                }
                await SQL.models.Guilds.increment('cbBalance', { by: amount, where: { IDENT: guildId } });

                await pool.reload();
                const newHomeBal = homeIsA ? Number(pool.balanceA) : Number(pool.balanceB);

                const embed = new EmbedBuilder()
                    .setTitle("Pool Withdrawal Successful")
                    .setColor("Green")
                    .setDescription(`Withdrew from the **${interaction.guild.name} ↔ ${targetGuild.name}** pool back to CB.`)
                    .addFields(
                        { name: "Withdrawn", value: await guildManager.formatMoney(amount), inline: true },
                        { name: "Your Remaining Pool Balance", value: await guildManager.formatMoney(newHomeBal), inline: true }
                    )
                    .setTimestamp();

                await interaction.editReply({ embeds: [embed] });
                await LogGeneral(interaction, 'Orange', 'FOREX Pool Withdrawal', `<@${interaction.user.id}> withdrew from pool with ${targetGuild.name}.`, {name: 'Amount', value: await guildManager.formatMoney(amount), inline: true}).catch(console.error);
                return;
            }

            // ── pool view ─────────────────────────────────────────────────────
            if (sub === "view") {
                const targetGuildId = interaction.options.getString("target-server");
                const { Op } = require("sequelize");

                let pools;
                if (targetGuildId) {
                    const [poolGuildA, poolGuildB] = canonicalPair(guildId, targetGuildId);
                    const found = await SQL.models.ForexPool.findOne({ where: { guildA: poolGuildA, guildB: poolGuildB }, raw: true });
                    pools = found ? [found] : [];
                } else {
                    pools = await SQL.models.ForexPool.findAll({
                        where: { [Op.or]: [{ guildA: guildId }, { guildB: guildId }] },
                        raw: true
                    });
                }

                if (!pools.length) {
                    return interaction.editReply({
                        embeds: [new EmbedBuilder().setColor("Yellow").setDescription("No liquidity pools found. Use `/forex pool deposit` to create one.")]
                    });
                }

                const homeStats = await getGuildStrength(guildId);
                const fields = [];
                for (const p of pools) {
                    const homeIsA = p.guildA === guildId;
                    const partnerGuildId = homeIsA ? p.guildB : p.guildA;
                    const partnerGuild = interaction.client.guilds.cache.get(partnerGuildId);
                    const partnerName = partnerGuild?.name ?? partnerGuildId;

                    const homePoolBal = homeIsA ? Number(p.balanceA) : Number(p.balanceB);
                    const partnerPoolBal = homeIsA ? Number(p.balanceB) : Number(p.balanceA);

                    let rateStr = "N/A";
                    try {
                        const partnerStats = await getGuildStrength(partnerGuildId);
                        if (partnerStats.strength > 0 && homeStats.strength > 0) {
                            rateStr = `1 : ${convertCurrency(1, homeStats.strength, partnerStats.strength).toFixed(6)}`;
                        }
                    } catch { /* skip */ }

                    const partnerRecord = await SQL.models.Guilds.findByPk(partnerGuildId, { raw: true });
                    const partnerSymbol = partnerRecord?.customCurrency ?? '$';

                    fields.push({
                        name: `↔ ${partnerName}`,
                        value: `Your side: **${await guildManager.formatMoney(homePoolBal)}** · Partner side: **${partnerPoolBal.toFixed(2)} ${partnerSymbol}** · Rate: ${rateStr}`,
                        inline: false
                    });
                }

                const embed = new EmbedBuilder()
                    .setTitle(`${interaction.guild.name} — Liquidity Pools`)
                    .setColor("Blue")
                    .setDescription("Each pool holds both servers' currencies for fee-free exchange. Pool balances are included in each server's C_n.")
                    .addFields(...fields)
                    .setTimestamp();

                return interaction.editReply({ embeds: [embed] });
            }
        }
    }
};
