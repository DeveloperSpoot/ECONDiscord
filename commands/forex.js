const { SlashCommandBuilder, EmbedBuilder, MessageFlags, PermissionFlagsBits } = require("discord.js");
const SQL = require("../dataCrusher/Server");
const { ErrorEmbed } = require("../utils/embedUtil");
const { GuildHQ, RetrieveData } = require("../dataCrusher/Headquarters");
const { getGuildStrength } = require("../dataCrusher/services/forexService");
const { convertCurrency, ALPHA, BETA } = require("../utils/forexStrength");
const { LogGeneral } = require("../dataCrusher/services/guild");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("forex")
        .setDescription("Foreign exchange — view rates and convert currency between servers.")
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
                .setDescription("View this server's economic strength metrics.")),

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

        const sub = interaction.options.getSubcommand();

        // ── /forex strength ───────────────────────────────────────────────────
        if (sub === "strength") {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            const guildId = interaction.IDENT;
            const guildManager = new GuildHQ(interaction);
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
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            const targetGuildId = interaction.options.getString("target-server");
            const homeGuildId = interaction.IDENT;
            const guildManager = new GuildHQ(interaction);

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
                    { name: "\u200B", value: "**Home Server**", inline: false },
                    { name: "Strength", value: homeStats.strength.toFixed(6), inline: true },
                    { name: "Messages (30d)", value: String(Math.round(homeStats.M)), inline: true },
                    { name: "Transactions (30d)", value: String(homeStats.E), inline: true },
                    { name: "Circulation", value: await guildManager.formatMoney(homeStats.C), inline: true },
                    { name: "\u200B", value: `**${targetGuild.name}**`, inline: false },
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
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            const amount = interaction.options.getNumber("amount");
            const targetGuildId = interaction.options.getString("target-server");
            const homeGuildId = interaction.IDENT;
            const guildManager = new GuildHQ(interaction);

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

            // Find target-server guild member by Discord user ID
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

            // Compute exchange
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

            // Execute transfer
            await SQL.models.Accounts.update(
                { balance: Number(sourceAccount.balance) - amount },
                { where: { IDENT: sourceAccount.IDENT } }
            );
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
                .setDescription(`Exchanged into **${targetGuild.name}**`)
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
            await LogGeneral(interaction, 'Blue', 'FOREX Exchange', `<@${interaction.user.id}> exchanged currency.`, {name: 'Sent', value: await guildManager.formatMoney(amount), inline: true}, {name: 'Received', value: received.toFixed(2), inline: true}, {name: 'Rate', value: rate.toFixed(6), inline: true}, {name: 'Target Server', value: targetGuild.name, inline: true}).catch(console.error);
            return;
        }
    }
};
