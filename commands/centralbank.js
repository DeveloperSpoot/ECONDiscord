const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const SQL = require("../dataCrusher/Server");
const { ErrorEmbed } = require("../utils/embedUtil");
const { GuildHQ, RetrieveData, NotificationHQ, CreateData, PermManager } = require("../dataCrusher/Headquarters");
const { getGuildStrength } = require("../dataCrusher/services/forexService");
const { convertCurrency, canonicalPair, ALPHA, BETA } = require("../utils/forexStrength");
const { Op } = require("sequelize");
const { LogGeneral } = require("../dataCrusher/services/guild");

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

        // destroy
        .addSubcommand(sub =>
            sub.setName("destroy")
                .setDescription("Permanently destroy money from the Central Bank.")
                .addNumberOption(opt =>
                    opt.setName("amount")
                        .setDescription("Amount to destroy.")
                        .setRequired(true))
                .addStringOption(opt =>
                    opt.setName("memo")
                        .setDescription("Reason for destroying money.")
                        .setRequired(false)))

        // transfer
        .addSubcommand(sub =>
            sub.setName("transfer")
                .setDescription("Move money between the Central Bank and the Treasury.")
                .addStringOption(opt =>
                    opt.setName("direction")
                        .setDescription("Which way to move the funds.")
                        .setRequired(true)
                        .addChoices(
                            { name: "Central Bank → Treasury", value: "cb-to-treasury" },
                            { name: "Treasury → Central Bank", value: "treasury-to-cb" }
                        ))
                .addNumberOption(opt =>
                    opt.setName("amount")
                        .setDescription("Amount to transfer.")
                        .setRequired(true))
                .addStringOption(opt =>
                    opt.setName("memo")
                        .setDescription("Reason for the transfer.")
                        .setRequired(false)))

        // authorize subcommand group
        .addSubcommandGroup(group =>
            group.setName("authorize")
                .setDescription("Manage who can use Central Bank commands.")
                .addSubcommand(sub =>
                    sub.setName("add")
                        .setDescription("Authorize a user or role to manage the Central Bank.")
                        .addUserOption(opt =>
                            opt.setName("user")
                                .setDescription("The user to authorize."))
                        .addRoleOption(opt =>
                            opt.setName("role")
                                .setDescription("The role to authorize — anyone holding it gains access.")))
                .addSubcommand(sub =>
                    sub.setName("remove")
                        .setDescription("Remove a user's or role's Central Bank authorization.")
                        .addUserOption(opt =>
                            opt.setName("user")
                                .setDescription("The user to deauthorize."))
                        .addRoleOption(opt =>
                            opt.setName("role")
                                .setDescription("The role to deauthorize."))))

        // reserves subcommand group
        .addSubcommandGroup(group =>
            group.setName("reserves")
                .setDescription("View foreign currency reserve holdings.")
                .addSubcommand(sub =>
                    sub.setName("view")
                        .setDescription("View all foreign currency reserve holdings.")))

        // bonds subcommand group
        .addSubcommandGroup(group =>
            group.setName("bonds")
                .setDescription("Purchase and manage sovereign bonds as CB reserve assets.")
                .addSubcommand(sub =>
                    sub.setName("buy")
                        .setDescription("Buy a sovereign bond as a CB reserve asset.")
                        .addStringOption(opt =>
                            opt.setName("bond-id")
                                .setDescription("The bond IDENT to purchase.")
                                .setRequired(true)))
                .addSubcommand(sub =>
                    sub.setName("transfer")
                        .setDescription("Transfer a CB-held bond to another server's CB (free — no payment).")
                        .addStringOption(opt =>
                            opt.setName("bond-id")
                                .setDescription("The bond IDENT to transfer.")
                                .setRequired(true))
                        .addStringOption(opt =>
                            opt.setName("to-guild")
                                .setDescription("The server whose CB will receive the bond.")
                                .setRequired(true)
                                .setAutocomplete(true)))
                .addSubcommand(sub =>
                    sub.setName("holdings")
                        .setDescription("View all bonds held by this CB."))),

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
            await interaction.deferReply({});

            if (interaction.user.id !== interaction.guild.ownerId) {
                return interaction.editReply({
                    embeds: [new EmbedBuilder().setColor("Red").setDescription("Only the server owner can manage Central Bank authorizations.")]
                });
            }

            const user = interaction.options.getUser("user");
            const role = interaction.options.getRole("role");

            if (user && role) {
                return interaction.editReply({
                    embeds: [new EmbedBuilder().setColor("Red").setDescription("Provide either a `user` or a `role`, not both.")]
                });
            }
            if (!user && !role) {
                return interaction.editReply({
                    embeds: [new EmbedBuilder().setColor("Red").setDescription("You must provide either a `user` or a `role`.")]
                });
            }

            if (sub === "authorize add") {
                if (role) {
                    await PermManager.CentralBank.authorizeRole(interaction, role);
                    await interaction.editReply({
                        embeds: [new EmbedBuilder()
                            .setColor("Green")
                            .setTitle("CB Authorization Granted")
                            .setDescription(`Anyone with the <@&${role.id}> role can now manage the Central Bank.`)
                            .setTimestamp()]
                    });
                    await LogGeneral(interaction, 'Green', 'CB Authorization Granted', `<@${interaction.user.id}> granted CB access to the <@&${role.id}> role.`).catch(console.error);
                    return;
                }

                await CreateData.cbAuthorizedUser(interaction, user).catch(async err => {
                    return interaction.editReply({
                        embeds: [new EmbedBuilder().setColor("Red").setDescription(`Error: ${err.message}`)]
                    });
                });

                await interaction.editReply({
                    embeds: [new EmbedBuilder()
                        .setColor("Green")
                        .setTitle("CB Authorization Granted")
                        .setDescription(`<@${user.id}> can now manage the Central Bank.`)
                        .setTimestamp()]
                });
                await LogGeneral(interaction, 'Green', 'CB Authorization Granted', `<@${interaction.user.id}> granted CB access to <@${user.id}>.`).catch(console.error);
                return;
            }

            if (sub === "authorize remove") {
                if (role) {
                    const roleCheck = await PermManager.CentralBank.checkRoleAuthorization(interaction, role);
                    if (!roleCheck) {
                        return interaction.editReply({
                            embeds: [new EmbedBuilder().setColor("Red").setDescription(`The <@&${role.id}> role does not have Central Bank authorization.`)]
                        });
                    }
                    await PermManager.CentralBank.deauthorizeRole(interaction, role);
                    await interaction.editReply({
                        embeds: [new EmbedBuilder()
                            .setColor("Green")
                            .setTitle("CB Authorization Removed")
                            .setDescription(`<@&${role.id}>'s Central Bank authorization has been removed.`)
                            .setTimestamp()]
                    });
                    await LogGeneral(interaction, 'Orange', 'CB Authorization Removed', `<@${interaction.user.id}> removed CB access from the <@&${role.id}> role.`).catch(console.error);
                    return;
                }

                const check = await PermManager.CentralBank.checkAuthorization(interaction, user);
                if (!check) {
                    return interaction.editReply({
                        embeds: [new EmbedBuilder().setColor("Red").setDescription(`<@${user.id}> does not have Central Bank authorization.`)]
                    });
                }
                await PermManager.CentralBank.deauthorize(interaction, user);

                await interaction.editReply({
                    embeds: [new EmbedBuilder()
                        .setColor("Green")
                        .setTitle("CB Authorization Removed")
                        .setDescription(`<@${user.id}>'s Central Bank authorization has been removed.`)
                        .setTimestamp()]
                });
                await LogGeneral(interaction, 'Orange', 'CB Authorization Removed', `<@${interaction.user.id}> removed CB access from <@${user.id}>.`).catch(console.error);
                return;
            }
        }

        // ── All other subcommands require CB authorization ────────────────────
        await interaction.deferReply({});

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

            const walletSum = Number(await SQL.models.Accounts.sum("balance", { where: { guild: guildId, type: "personal-wallet" } }) ?? 0);
            const bankSum = Number(await SQL.models.Accounts.sum("balance", { where: { guild: guildId, type: "personal-bank" } }) ?? 0);
            const businessSum = Number(await SQL.models.Accounts.sum("balance", { where: { guild: guildId, type: "business" } }) ?? 0);
            const departmentSum = Number(await SQL.models.Department.sum("balance", { where: { GuildIDENT: guildId } }) ?? 0);
            const treasuryBal = Number(guildRecord?.balance ?? 0);
            const totalCirculation = walletSum + bankSum + businessSum + departmentSum + treasuryBal + oldCbBalance;
            const expansionPct = totalCirculation > 0 ? ((amount / totalCirculation) * 100).toFixed(2) : "N/A";

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

            await interaction.editReply({ embeds: [embed] });
            await LogGeneral(interaction, 'Orange', 'Money Printed', `<@${interaction.user.id}> printed money.`, {name: 'Amount Printed', value: await guildManager.formatMoney(amount), inline: true}, {name: 'CB Balance After', value: await guildManager.formatMoney(newCbBalance), inline: true}, {name: 'Memo', value: memo, inline: false}).catch(console.error);
            return;
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

            // Mark-to-market value of active CB-held bonds as reserve proxy
            const { Op: ReportOp } = require("sequelize");
            const activeBonds = await SQL.models.TreasuryBonds.findAll({
                where: { holderGuild: guildId, holderType: 'cb', status: 'active' },
                raw: true
            });
            let reserveValueDomestic = 0;
            for (const b of activeBonds) {
                try {
                    const issuerStats = await getGuildStrength(b.issuerGuild);
                    if (issuerStats.strength > 0 && strength > 0) {
                        reserveValueDomestic += convertCurrency(Number(b.faceValue), issuerStats.strength, strength);
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

        // ── destroy ───────────────────────────────────────────────────────────
        if (sub === "destroy") {
            const amount = interaction.options.getNumber("amount");
            const memo = interaction.options.getString("memo") ?? "No reason provided";

            if (amount <= 0) {
                return interaction.editReply({
                    embeds: [new EmbedBuilder().setColor("Red").setDescription("Amount must be greater than zero.")]
                });
            }

            const guildRecord = await SQL.models.Guilds.findByPk(guildId, { raw: true });
            const cbBalance = Number(guildRecord?.cbBalance ?? 0);

            if (cbBalance < amount) {
                return interaction.editReply({
                    embeds: [new EmbedBuilder().setColor("Red").setDescription(`Insufficient Central Bank funds. CB Balance: ${await guildManager.formatMoney(cbBalance)}`)]
                });
            }

            await SQL.models.Guilds.update(
                { cbBalance: cbBalance - amount },
                { where: { IDENT: guildId } }
            );

            await SQL.models.AdvTransactionLogs.create({
                guild: guildId,
                amount: amount,
                creditAccount: guildId,
                debitAccount: guildId,
                creditType: "Treasury",
                debitType: "Treasury",
                memo: `DESTROY | ${memo}`
            }).catch(console.error);

            const embed = new EmbedBuilder()
                .setTitle("Money Destroyed")
                .setColor("Red")
                .addFields(
                    { name: "Amount Destroyed", value: await guildManager.formatMoney(amount), inline: true },
                    { name: "CB Balance After", value: await guildManager.formatMoney(cbBalance - amount), inline: true },
                    { name: "Memo", value: memo, inline: false }
                )
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
            await LogGeneral(interaction, 'Red', 'Money Destroyed', `<@${interaction.user.id}> destroyed money.`, {name: 'Amount Destroyed', value: await guildManager.formatMoney(amount), inline: true}, {name: 'Memo', value: memo, inline: false}).catch(console.error);
            return;
        }

        // ── transfer ──────────────────────────────────────────────────────────
        if (sub === "transfer") {
            const direction = interaction.options.getString("direction");
            const amount = interaction.options.getNumber("amount");
            const memo = interaction.options.getString("memo") ?? "Internal transfer";

            if (amount <= 0) {
                return interaction.editReply({
                    embeds: [new EmbedBuilder().setColor("Red").setDescription("Amount must be greater than zero.")]
                });
            }

            const guildRecord = await SQL.models.Guilds.findByPk(guildId, { raw: true });
            const treasury = Number(guildRecord?.balance ?? 0);
            const cbBalance = Number(guildRecord?.cbBalance ?? 0);

            if (direction === "cb-to-treasury") {
                if (cbBalance < amount) {
                    return interaction.editReply({
                        embeds: [new EmbedBuilder().setColor("Red").setDescription(`Insufficient Central Bank funds. CB Balance: ${await guildManager.formatMoney(cbBalance)}`)]
                    });
                }
                await SQL.models.Guilds.update(
                    { cbBalance: cbBalance - amount, balance: treasury + amount },
                    { where: { IDENT: guildId } }
                );
            } else {
                if (treasury < amount) {
                    return interaction.editReply({
                        embeds: [new EmbedBuilder().setColor("Red").setDescription(`Insufficient Treasury funds. Treasury Balance: ${await guildManager.formatMoney(treasury)}`)]
                    });
                }
                await SQL.models.Guilds.update(
                    { balance: treasury - amount, cbBalance: cbBalance + amount },
                    { where: { IDENT: guildId } }
                );
            }

            await SQL.models.AdvTransactionLogs.create({
                guild: guildId,
                amount: amount,
                creditAccount: guildId,
                debitAccount: guildId,
                creditType: "Treasury",
                debitType: "Treasury",
                memo: `CB TRANSFER | ${direction === "cb-to-treasury" ? "CB→Treasury" : "Treasury→CB"} | ${memo}`
            }).catch(console.error);

            const [fromLabel, toLabel] = direction === "cb-to-treasury"
                ? ["Central Bank", "Treasury"]
                : ["Treasury", "Central Bank"];

            const embed = new EmbedBuilder()
                .setTitle("Transfer Complete")
                .setColor("Green")
                .addFields(
                    { name: "From", value: fromLabel, inline: true },
                    { name: "To", value: toLabel, inline: true },
                    { name: "Amount", value: await guildManager.formatMoney(amount), inline: true },
                    { name: "Memo", value: memo, inline: false }
                )
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
            await LogGeneral(interaction, 'Blue', 'CB Transfer', `<@${interaction.user.id}> transferred CB funds.`, {name: 'From', value: fromLabel, inline: true}, {name: 'To', value: toLabel, inline: true}, {name: 'Amount', value: await guildManager.formatMoney(amount), inline: true}, {name: 'Memo', value: memo, inline: false}).catch(console.error);
            return;
        }

        // ── reserves view ─────────────────────────────────────────────────────
        if (sub === "reserves view") {
            const { Op: ReservesOp } = require("sequelize");
            const homeStats = await getGuildStrength(guildId);
            const embeds = [];

            // Section 1: Liquidity pools
            const pools = await SQL.models.ForexPool.findAll({
                where: { [ReservesOp.or]: [{ guildA: guildId }, { guildB: guildId }] },
                raw: true
            });

            let poolDesc = "";
            let totalPoolValueDomestic = 0;
            for (const p of pools) {
                const homeIsA = p.guildA === guildId;
                const partnerGuildId = homeIsA ? p.guildB : p.guildA;
                const partnerGuild = interaction.client.guilds.cache.get(partnerGuildId);
                const partnerName = partnerGuild?.name ?? partnerGuildId;
                const homePoolBal = homeIsA ? Number(p.balanceA) : Number(p.balanceB);
                const partnerPoolBal = homeIsA ? Number(p.balanceB) : Number(p.balanceA);

                let rateStr = "N/A";
                let partnerSymbol = '$';
                try {
                    const partnerRecord = await SQL.models.Guilds.findByPk(partnerGuildId, { raw: true });
                    partnerSymbol = partnerRecord?.customCurrency ?? '$';
                    const partnerStats = await getGuildStrength(partnerGuildId);
                    if (partnerStats.strength > 0 && homeStats.strength > 0) {
                        rateStr = convertCurrency(1, homeStats.strength, partnerStats.strength).toFixed(6);
                        totalPoolValueDomestic += convertCurrency(partnerPoolBal, partnerStats.strength, homeStats.strength);
                    }
                } catch { /* skip */ }

                poolDesc += `**↔ ${partnerName}**\nYour side: ${await guildManager.formatMoney(homePoolBal)} · Partner side: ${partnerPoolBal.toFixed(2)} ${partnerSymbol} · Rate: 1 : ${rateStr}\n\n`;
            }

            // Section 2: Active CB-held bonds (mark-to-market)
            const activeBonds = await SQL.models.TreasuryBonds.findAll({
                where: { holderGuild: guildId, holderType: 'cb', status: 'active' },
                raw: true
            });

            let bondDesc = "";
            let totalBondValueDomestic = 0;
            for (const b of activeBonds) {
                const issuerGuild = interaction.client.guilds.cache.get(b.issuerGuild);
                const issuerName = issuerGuild?.name ?? b.issuerGuild;
                const maturesStr = b.maturesAt ? `<t:${Math.floor(new Date(b.maturesAt).getTime() / 1000)}:R>` : "—";
                let markToMarket = Number(b.faceValue);
                let issuerSymbol = '$';
                try {
                    const issuerRecord = await SQL.models.Guilds.findByPk(b.issuerGuild, { raw: true });
                    issuerSymbol = issuerRecord?.customCurrency ?? '$';
                    const issuerStats = await getGuildStrength(b.issuerGuild);
                    if (issuerStats.strength > 0 && homeStats.strength > 0) {
                        markToMarket = convertCurrency(Number(b.faceValue), issuerStats.strength, homeStats.strength);
                        totalBondValueDomestic += markToMarket;
                    }
                } catch { /* skip */ }

                bondDesc += `**${b.IDENT.slice(0, 8)}...** from **${issuerName}** · Face: ${Number(b.faceValue).toFixed(2)} ${issuerSymbol} · MTM: ${await guildManager.formatMoney(markToMarket)} · Matures: ${maturesStr}\n`;
            }

            if (!poolDesc && !bondDesc) {
                return interaction.editReply({
                    embeds: [new EmbedBuilder().setColor("Yellow").setDescription("No liquidity pools or CB bond holdings. Use `/forex pool deposit` to establish a pool.")]
                });
            }

            const embed = new EmbedBuilder()
                .setTitle(`${interaction.guild.name} — Reserves & Liquidity`)
                .setColor("Blue")
                .setTimestamp();

            if (poolDesc) {
                embed.addFields({ name: "💧  Liquidity Pools", value: poolDesc || "None", inline: false });
                embed.addFields({ name: "Pool Value (domestic MTM)", value: await guildManager.formatMoney(totalPoolValueDomestic), inline: true });
            }
            if (bondDesc) {
                embed.addFields({ name: "📜  CB Bond Holdings (mark-to-market)", value: bondDesc, inline: false });
                embed.addFields({ name: "Total Bond MTM Value", value: await guildManager.formatMoney(totalBondValueDomestic), inline: true });
            }

            return interaction.editReply({ embeds: [embed] });
        }

        // ── bonds buy ─────────────────────────────────────────────────────────
        if (sub === "bonds buy") {
            const bondId = interaction.options.getString("bond-id");

            const bond = await SQL.models.TreasuryBonds.findOne({
                where: { IDENT: bondId, status: "available" }
            });

            if (!bond) {
                return interaction.editReply({
                    embeds: [new EmbedBuilder().setColor("Red").setDescription("Bond not found or no longer available.")]
                });
            }

            if (bond.issuerGuild === guildId) {
                return interaction.editReply({
                    embeds: [new EmbedBuilder().setColor("Red").setDescription("A CB cannot purchase its own server's bonds as reserves.")]
                });
            }

            const purchasePrice = Number(bond.purchasePrice); // in issuer's currency

            const [homeStats, issuerStats] = await Promise.all([
                getGuildStrength(guildId),
                getGuildStrength(bond.issuerGuild)
            ]);

            if (homeStats.strength <= 0 || issuerStats.strength <= 0) {
                return interaction.editReply({
                    embeds: [new EmbedBuilder().setColor("Red").setDescription("Exchange rate cannot be computed — one or both servers have zero strength.")]
                });
            }

            const costInHome = convertCurrency(purchasePrice, issuerStats.strength, homeStats.strength);

            const guildRecord = await SQL.models.Guilds.findByPk(guildId, { raw: true });
            if (Number(guildRecord.cbBalance) < costInHome) {
                return interaction.editReply({
                    embeds: [new EmbedBuilder().setColor("Red").setDescription(`Insufficient CB funds. Required: ${await guildManager.formatMoney(costInHome)} · CB Balance: ${await guildManager.formatMoney(guildRecord.cbBalance)}`)]
                });
            }

            const now = new Date();
            const maturesAt = new Date(now.getTime() + bond.maturityDays * 24 * 60 * 60 * 1000);

            // Verify pool has enough issuer currency
            const [poolGuildA, poolGuildB, homeIsA] = canonicalPair(guildId, bond.issuerGuild);
            const pool = await SQL.models.ForexPool.findOne({ where: { guildA: poolGuildA, guildB: poolGuildB } });

            const issuerGuildObjPre = interaction.client.guilds.cache.get(bond.issuerGuild);
            if (!pool) {
                return interaction.editReply({
                    embeds: [new EmbedBuilder().setColor("Red").setDescription(
                        `No liquidity pool exists for this pair.\nRun \`/forex pool deposit\` targeting **${issuerGuildObjPre?.name ?? bond.issuerGuild}** to establish a pool first.`
                    )]
                });
            }

            const issuerPoolBalance = homeIsA ? Number(pool.balanceB) : Number(pool.balanceA);
            const issuerRecordPre = await SQL.models.Guilds.findByPk(bond.issuerGuild, { raw: true });
            const issuerSymbolPre = issuerRecordPre?.customCurrency ?? '$';
            if (issuerPoolBalance < purchasePrice) {
                return interaction.editReply({
                    embeds: [new EmbedBuilder().setColor("Red").setDescription(
                        `Pool has insufficient **${issuerSymbolPre}** liquidity.\nPool holds: ${issuerPoolBalance.toFixed(2)} ${issuerSymbolPre} · Needed: ${purchasePrice.toFixed(2)} ${issuerSymbolPre}\n` +
                        `Run \`/forex pool deposit\` to add more, or ask **${issuerGuildObjPre?.name ?? bond.issuerGuild}**'s CB to fund the pool.`
                    )]
                });
            }

            // Debit CB, route through pool, credit issuer treasury
            await SQL.models.Guilds.decrement('cbBalance', { by: costInHome, where: { IDENT: guildId } });
            if (homeIsA) {
                await pool.increment('balanceA', { by: costInHome });
                await pool.decrement('balanceB', { by: purchasePrice });
            } else {
                await pool.increment('balanceB', { by: costInHome });
                await pool.decrement('balanceA', { by: purchasePrice });
            }

            // Credit issuer treasury by purchasePrice (issuer's currency)
            const issuerRecord = await SQL.models.Guilds.findByPk(bond.issuerGuild, { raw: true });
            await SQL.models.Guilds.update(
                { balance: Number(issuerRecord.balance) + purchasePrice },
                { where: { IDENT: bond.issuerGuild } }
            );

            // Activate bond
            await bond.update({
                holderType: "cb",
                holderGuild: guildId,
                holderMember: null,
                issuedAt: now,
                maturesAt,
                status: "active"
            });

            await SQL.models.AdvTransactionLogs.create({
                guild: guildId, amount: costInHome,
                creditAccount: guildId, debitAccount: bond.issuerGuild,
                creditType: "Treasury", debitType: "Treasury",
                memo: `CB BOND PURCHASE | ${bond.IDENT}`
            }).catch(console.error);
            await SQL.models.AdvTransactionLogs.create({
                guild: bond.issuerGuild, amount: purchasePrice,
                creditAccount: guildId, debitAccount: bond.issuerGuild,
                creditType: "Treasury", debitType: "Treasury",
                memo: `CB BOND PURCHASE (incoming) | ${bond.IDENT}`
            }).catch(console.error);

            const issuerGuildObj = interaction.client.guilds.cache.get(bond.issuerGuild);
            const issuerCurrency = issuerRecord.customCurrency || '$';
            const embed = new EmbedBuilder()
                .setTitle("Bond Purchased — CB Reserve")
                .setColor("Green")
                .addFields(
                    { name: "Issuer", value: issuerGuildObj?.name ?? bond.issuerGuild, inline: true },
                    { name: "You Paid", value: await guildManager.formatMoney(costInHome), inline: true },
                    { name: "Issuer Received", value: `${purchasePrice.toFixed(2)} ${issuerCurrency}`, inline: true },
                    { name: "Face Value", value: `${Number(bond.faceValue).toFixed(2)} ${issuerCurrency}`, inline: true },
                    { name: "Yield", value: `${(bond.yieldRate * 100).toFixed(2)}%`, inline: true },
                    { name: "Matures", value: `<t:${Math.floor(maturesAt.getTime() / 1000)}:R>`, inline: true },
                    { name: "Pool Settlement", value: `Routed via liquidity pool — neither server's C_n changed.`, inline: false }
                )
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
            await LogGeneral(interaction, 'Blue', 'CB Bond Purchased', `CB purchased bond from ${issuerGuildObj?.name ?? bond.issuerGuild}.`, { name: 'You Paid', value: await guildManager.formatMoney(costInHome), inline: true }, { name: 'Face Value', value: `${Number(bond.faceValue).toFixed(2)} ${issuerCurrency}`, inline: true }).catch(console.error);
            return;
        }

        // ── bonds transfer ────────────────────────────────────────────────────
        if (sub === "bonds transfer") {
            const bondId = interaction.options.getString("bond-id");
            const targetGuildId = interaction.options.getString("to-guild");

            if (targetGuildId === guildId) {
                return interaction.editReply({
                    embeds: [new EmbedBuilder().setColor("Red").setDescription("Cannot transfer a bond to your own CB.")]
                });
            }

            const bond = await SQL.models.TreasuryBonds.findOne({
                where: { IDENT: bondId, holderType: "cb", holderGuild: guildId, status: "active" }
            });

            if (!bond) {
                return interaction.editReply({
                    embeds: [new EmbedBuilder().setColor("Red").setDescription("Bond not found, not active, or this CB does not hold it.")]
                });
            }

            const targetGuild = interaction.client.guilds.cache.get(targetGuildId);
            if (!targetGuild) {
                return interaction.editReply({
                    embeds: [new EmbedBuilder().setColor("Red").setDescription("Target server is not accessible to the bot.")]
                });
            }

            await bond.update({ holderGuild: targetGuildId });

            const issuerGuildObj = interaction.client.guilds.cache.get(bond.issuerGuild);
            const embed = new EmbedBuilder()
                .setTitle("Bond Transferred — CB to CB")
                .setColor("Green")
                .addFields(
                    { name: "Bond", value: bond.IDENT.slice(0, 8) + '...', inline: true },
                    { name: "Issuer", value: issuerGuildObj?.name ?? bond.issuerGuild, inline: true },
                    { name: "From CB", value: interaction.guild.name, inline: true },
                    { name: "To CB", value: targetGuild.name, inline: true },
                    { name: "Face Value", value: await guildManager.formatMoney(bond.faceValue), inline: true },
                    { name: "Matures", value: `<t:${Math.floor(new Date(bond.maturesAt).getTime() / 1000)}:R>`, inline: true }
                )
                .setFooter({ text: "Free transfer — no payment." })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
            await LogGeneral(interaction, 'Blue', 'CB Bond Transferred', `CB transferred bond to ${targetGuild.name}.`, { name: 'To', value: targetGuild.name, inline: true }, { name: 'Face Value', value: await guildManager.formatMoney(bond.faceValue), inline: true }).catch(console.error);
            return;
        }

        // ── bonds holdings ────────────────────────────────────────────────────
        if (sub === "bonds holdings") {
            const bonds = await SQL.models.TreasuryBonds.findAll({
                where: { holderGuild: guildId, holderType: "cb" },
                order: [["maturesAt", "ASC"]],
                raw: true
            });

            if (!bonds.length) {
                return interaction.editReply({
                    embeds: [new EmbedBuilder().setColor("Yellow").setDescription("This CB holds no bonds.")]
                });
            }

            const statusEmoji = { available: "🟡", active: "🟢", redeemed: "✅", defaulted: "🔴" };
            let desc = "";
            let totalFaceValue = 0;
            for (const b of bonds) {
                const issuerGuild = interaction.client.guilds.cache.get(b.issuerGuild);
                const maturesStr = b.maturesAt ? `<t:${Math.floor(new Date(b.maturesAt).getTime() / 1000)}:R>` : "—";
                desc += `${statusEmoji[b.status] ?? "•"} **${b.IDENT.slice(0, 8)}...** · ${issuerGuild?.name ?? b.issuerGuild} · Face: ${Number(b.faceValue).toLocaleString()} · Paid: ${Number(b.purchasePrice).toFixed(2)} · Matures: ${maturesStr} · ${b.status}\n`;
                if (b.status === "active") totalFaceValue += Number(b.faceValue);
            }

            return interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setTitle(`${interaction.guild.name} CB — Bond Holdings`)
                    .setColor("Blue")
                    .setDescription(desc)
                    .addFields({ name: "Total Face Value (active)", value: await guildManager.formatMoney(totalFaceValue), inline: true })
                    .setTimestamp()]
            });
        }
    }
};
