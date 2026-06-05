const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const SQL = require("../dataCrusher/Server");
const { ErrorEmbed } = require("../utils/embedUtil");
const { RetrieveData, GuildHQ } = require("../dataCrusher/Headquarters");
const { LogGeneral } = require("../dataCrusher/services/guild");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("bonds")
        .setDescription("Browse and purchase sovereign bonds from any server.")
        .addSubcommand(sub =>
            sub.setName("list")
                .setDescription("List all available bonds across all servers."))
        .addSubcommand(sub =>
            sub.setName("buy")
                .setDescription("Purchase a bond using your bank account.")
                .addStringOption(opt =>
                    opt.setName("bond-id")
                        .setDescription("The bond IDENT to purchase.")
                        .setRequired(true))
                .addStringOption(opt =>
                    opt.setName("business")
                        .setDescription("Buy with a business account instead of your personal bank.")
                        .setRequired(false)
                        .setAutocomplete(true)))
        .addSubcommand(sub =>
            sub.setName("transfer")
                .setDescription("Transfer a bond you hold to another registered user (free — no payment).")
                .addStringOption(opt =>
                    opt.setName("bond-id")
                        .setDescription("The bond IDENT to transfer.")
                        .setRequired(true))
                .addUserOption(opt =>
                    opt.setName("to")
                        .setDescription("The user to transfer the bond to.")
                        .setRequired(true)))
        .addSubcommand(sub =>
            sub.setName("holdings")
                .setDescription("View bonds you personally hold.")),

    async autocomplete(interaction) {
        const focused = interaction.options.getFocused(true);
        if (focused.name !== 'business') return interaction.respond([]);
        const guildId = interaction.IDENT ?? interaction.guildId;
        const memberRecord = await RetrieveData.user(interaction, interaction.user.id).catch(() => null);
        if (!memberRecord) return interaction.respond([]);
        const businesses = await SQL.models.Accounts.findAll({
            where: { guild: guildId, owner: memberRecord.IDENT, type: 'business' },
            raw: true
        });
        const choices = businesses
            .map(b => ({ name: b.name || b.IDENT.slice(0, 8), value: b.IDENT }))
            .filter(c => c.name.toLowerCase().includes(focused.value.toLowerCase()))
            .slice(0, 25);
        return interaction.respond(choices);
    },

    async execute(interaction) {
        if (!interaction.guild) {
            return ErrorEmbed(interaction, "This command can only be used inside a server.");
        }

        await interaction.deferReply();

        const sub = interaction.options.getSubcommand();
        const guildManager = new GuildHQ(interaction);

        // ── list ──────────────────────────────────────────────────────────────
        if (sub === "list") {
            const bonds = await SQL.models.TreasuryBonds.findAll({
                where: { status: "available" },
                order: [["createdAt", "DESC"]],
                raw: true
            });

            if (!bonds.length) {
                return interaction.editReply({
                    embeds: [new EmbedBuilder().setColor("Yellow").setDescription("No bonds are currently available for purchase.")]
                });
            }

            let desc = "";
            for (const b of bonds) {
                const issuerGuild = interaction.client.guilds.cache.get(b.issuerGuild);
                const issuerName = issuerGuild?.name ?? b.issuerGuild;
                desc += `**${b.IDENT.slice(0, 8)}...** · Issuer: **${issuerName}** · Face: ${Number(b.faceValue).toLocaleString()} · Price: ${Number(b.purchasePrice).toFixed(2)} · Yield: ${(b.yieldRate * 100).toFixed(2)}% · Matures in: ${b.maturityDays}d\n`;
            }

            return interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setTitle("Available Bonds")
                    .setColor("Blue")
                    .setDescription(desc)
                    .setFooter({ text: "Use /bonds buy bond-id:<id> to purchase. Copy the full bond ID from /treasury bonds list." })
                    .setTimestamp()]
            });
        }

        // ── buy ───────────────────────────────────────────────────────────────
        if (sub === "buy") {
            const bondId = interaction.options.getString("bond-id");
            const businessId = interaction.options.getString("business");

            const bond = await SQL.models.TreasuryBonds.findOne({
                where: { IDENT: bondId, status: "available" }
            });

            if (!bond) {
                return interaction.editReply({
                    embeds: [new EmbedBuilder().setColor("Red").setDescription("Bond not found or no longer available.")]
                });
            }

            if (bond.issuerGuild !== interaction.IDENT) {
                const issuerGuildObj = interaction.client.guilds.cache.get(bond.issuerGuild);
                const issuerName = issuerGuildObj?.name ?? bond.issuerGuild;
                return interaction.editReply({
                    embeds: [new EmbedBuilder().setColor("Red").setDescription(
                        `This bond was issued by **${issuerName}**. You must run this command from that server.\n` +
                        `Use \`/forex exchange\` to convert your currency there first, then purchase the bond from within **${issuerName}**'s server.`
                    )]
                });
            }

            const memberRecord = await RetrieveData.user(interaction, interaction.user.id);
            if (!memberRecord) {
                return interaction.editReply({
                    embeds: [new EmbedBuilder().setColor("Red").setDescription("You must be registered to purchase bonds.")]
                });
            }

            // Determine paying account: business or personal bank
            let payingAccount;
            const isBusinessPurchase = !!businessId;
            if (isBusinessPurchase) {
                payingAccount = await SQL.models.Accounts.findOne({
                    where: { IDENT: businessId, owner: memberRecord.IDENT, type: "business" },
                    raw: true
                });
                if (!payingAccount) {
                    return interaction.editReply({
                        embeds: [new EmbedBuilder().setColor("Red").setDescription("Business account not found or you don't own it.")]
                    });
                }
            } else {
                payingAccount = await SQL.models.Accounts.findOne({
                    where: { owner: memberRecord.IDENT, type: "personal-bank" },
                    raw: true
                });
                if (!payingAccount) {
                    return interaction.editReply({
                        embeds: [new EmbedBuilder().setColor("Red").setDescription("No bank account found.")]
                    });
                }
            }

            const purchasePrice = Number(bond.purchasePrice);
            if (Number(payingAccount.balance) < purchasePrice) {
                return interaction.editReply({
                    embeds: [new EmbedBuilder().setColor("Red").setDescription(`Insufficient funds. Purchase price: ${await guildManager.formatMoney(purchasePrice)} · Balance: ${await guildManager.formatMoney(payingAccount.balance)}`)]
                });
            }

            const now = new Date();
            const maturesAt = new Date(now.getTime() + bond.maturityDays * 24 * 60 * 60 * 1000);

            await SQL.models.Accounts.update(
                { balance: Number(payingAccount.balance) - purchasePrice },
                { where: { IDENT: payingAccount.IDENT } }
            );

            const issuerGuild = await SQL.models.Guilds.findByPk(bond.issuerGuild, { raw: true });
            await SQL.models.Guilds.update(
                { balance: Number(issuerGuild.balance) + purchasePrice },
                { where: { IDENT: bond.issuerGuild } }
            );

            await bond.update({
                holderType: isBusinessPurchase ? "business" : "user",
                holderMember: isBusinessPurchase ? null : memberRecord.IDENT,
                holderAccount: isBusinessPurchase ? payingAccount.IDENT : null,
                holderGuild: null,
                issuedAt: now,
                maturesAt,
                status: "active"
            });

            await SQL.models.AdvTransactionLogs.create({
                guild: bond.issuerGuild,
                amount: purchasePrice,
                creditAccount: payingAccount.IDENT,
                debitAccount: bond.issuerGuild,
                creditType: "Account",
                debitType: "Treasury",
                memo: `BOND PURCHASE | ${bond.IDENT} | ${isBusinessPurchase ? 'business' : 'individual'}`
            }).catch(console.error);

            const issuerGuildObj = interaction.client.guilds.cache.get(bond.issuerGuild);
            const embed = new EmbedBuilder()
                .setTitle("Bond Purchased")
                .setColor("Green")
                .addFields(
                    { name: "Issuer", value: issuerGuildObj?.name ?? bond.issuerGuild, inline: true },
                    { name: "Paid From", value: isBusinessPurchase ? (payingAccount.name || 'Business') : 'Personal Bank', inline: true },
                    { name: "Paid", value: await guildManager.formatMoney(purchasePrice), inline: true },
                    { name: "Face Value", value: await guildManager.formatMoney(bond.faceValue), inline: true },
                    { name: "Yield", value: `${(bond.yieldRate * 100).toFixed(2)}%`, inline: true },
                    { name: "Matures", value: `<t:${Math.floor(maturesAt.getTime() / 1000)}:R>`, inline: true }
                )
                .setFooter({ text: "The issuer must run /treasury bonds redeem once matured to pay you out." })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
            await LogGeneral(interaction, "Green", "Bond Purchased", `<@${interaction.user.id}> purchased a bond from ${issuerGuildObj?.name ?? bond.issuerGuild}.`, { name: "Paid", value: await guildManager.formatMoney(purchasePrice), inline: true }, { name: "Face Value", value: await guildManager.formatMoney(bond.faceValue), inline: true }).catch(console.error);
        }

        // ── transfer ──────────────────────────────────────────────────────────
        if (sub === "transfer") {
            const bondId = interaction.options.getString("bond-id");
            const toUser = interaction.options.getUser("to");

            const memberRecord = await RetrieveData.user(interaction, interaction.user.id);
            if (!memberRecord) {
                return interaction.editReply({
                    embeds: [new EmbedBuilder().setColor("Red").setDescription("You must be registered.")]
                });
            }

            const bond = await SQL.models.TreasuryBonds.findOne({
                where: { IDENT: bondId, holderType: "user", holderMember: memberRecord.IDENT, status: "active" }
            });

            if (!bond) {
                return interaction.editReply({
                    embeds: [new EmbedBuilder().setColor("Red").setDescription("Bond not found, not active, or you don't hold it.")]
                });
            }

            const recipientRecord = await RetrieveData.user(interaction, toUser.id);
            if (!recipientRecord) {
                return interaction.editReply({
                    embeds: [new EmbedBuilder().setColor("Red").setDescription(`<@${toUser.id}> is not registered in this server's economy.`)]
                });
            }

            if (recipientRecord.IDENT === memberRecord.IDENT) {
                return interaction.editReply({
                    embeds: [new EmbedBuilder().setColor("Red").setDescription("You cannot transfer a bond to yourself.")]
                });
            }

            await bond.update({ holderMember: recipientRecord.IDENT });

            const issuerGuildObj = interaction.client.guilds.cache.get(bond.issuerGuild);
            const embed = new EmbedBuilder()
                .setTitle("Bond Transferred")
                .setColor("Green")
                .addFields(
                    { name: "Bond", value: bond.IDENT.slice(0, 8) + '...', inline: true },
                    { name: "Issuer", value: issuerGuildObj?.name ?? bond.issuerGuild, inline: true },
                    { name: "From", value: `<@${interaction.user.id}>`, inline: true },
                    { name: "To", value: `<@${toUser.id}>`, inline: true },
                    { name: "Face Value", value: await guildManager.formatMoney(bond.faceValue), inline: true },
                    { name: "Matures", value: `<t:${Math.floor(new Date(bond.maturesAt).getTime() / 1000)}:R>`, inline: true }
                )
                .setFooter({ text: "Free transfer — no payment." })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
            await LogGeneral(interaction, "Blue", "Bond Transferred", `<@${interaction.user.id}> transferred a bond to <@${toUser.id}>.`, { name: "Face Value", value: await guildManager.formatMoney(bond.faceValue), inline: true }).catch(console.error);
        }

        // ── holdings ──────────────────────────────────────────────────────────
        if (sub === "holdings") {
            const memberRecord = await RetrieveData.user(interaction, interaction.user.id);
            if (!memberRecord) {
                return interaction.editReply({
                    embeds: [new EmbedBuilder().setColor("Red").setDescription("You must be registered.")]
                });
            }

            const bonds = await SQL.models.TreasuryBonds.findAll({
                where: { holderMember: memberRecord.IDENT, holderType: "user" },
                order: [["maturesAt", "ASC"]],
                raw: true
            });

            if (!bonds.length) {
                return interaction.editReply({
                    embeds: [new EmbedBuilder().setColor("Yellow").setDescription("You hold no bonds.")]
                });
            }

            const statusEmoji = { available: "🟡", active: "🟢", redeemed: "✅", defaulted: "🔴" };
            let desc = "";
            for (const b of bonds) {
                const issuerGuild = interaction.client.guilds.cache.get(b.issuerGuild);
                const maturesStr = b.maturesAt ? `<t:${Math.floor(new Date(b.maturesAt).getTime() / 1000)}:R>` : "—";
                desc += `${statusEmoji[b.status] ?? "•"} **${b.IDENT.slice(0, 8)}...** · ${issuerGuild?.name ?? b.issuerGuild} · Face: ${Number(b.faceValue).toLocaleString()} · Matures: ${maturesStr} · ${b.status}\n`;
            }

            return interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setTitle("Your Bond Holdings")
                    .setColor("Blue")
                    .setDescription(desc)
                    .setTimestamp()]
            });
        }
    }
};
