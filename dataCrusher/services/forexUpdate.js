const cron = require('node-cron');
const { EmbedBuilder } = require('discord.js');
const { Op } = require('sequelize');
const SQL = require('../Server');
const { getGuildStrength } = require('./forexService');
const { convertCurrency } = require('../../utils/forexStrength');

const VALARIA_GUILD_ID = '1097636386133254177';

async function runForexUpdate(client) {
    const valariaStats = await getGuildStrength(VALARIA_GUILD_ID);
    if (valariaStats.strength <= 0) {
        console.warn('[ForexUpdate] Valaria has zero strength — skipping run.');
        return;
    }

    // Load all guild DB records for lastRate lookups
    const allGuildRecords = await SQL.models.Guilds.findAll({ raw: true });
    const guildRecordMap = Object.fromEntries(allGuildRecords.map(g => [g.IDENT, g]));

    // Compute rate vs vollars for every Discord guild the bot is in
    const rateRows = [];
    const rateUpdates = [];

    for (const [guildId, discordGuild] of client.guilds.cache) {
        const stats = await getGuildStrength(guildId);
        const currentRate = stats.strength > 0
            ? convertCurrency(1, stats.strength, valariaStats.strength)
            : 0;

        const guildRecord = guildRecordMap[guildId];
        const lastRate = guildRecord?.forexLastRate != null ? Number(guildRecord.forexLastRate) : null;

        let changeStr;
        if (guildId === VALARIA_GUILD_ID) {
            changeStr = '*(reference)*';
        } else if (lastRate === null || lastRate <= 0) {
            changeStr = '*New*';
        } else {
            const pct = ((currentRate - lastRate) / lastRate) * 100;
            if (Math.abs(pct) < 0.001) changeStr = '±0.00%';
            else if (pct > 0) changeStr = `▲ +${pct.toFixed(2)}%`;
            else changeStr = `▼ ${pct.toFixed(2)}%`;
        }

        rateRows.push({ name: discordGuild.name, rate: currentRate, changeStr, isValaria: guildId === VALARIA_GUILD_ID });
        rateUpdates.push({ IDENT: guildId, newRate: currentRate });
    }

    // Valaria at top, rest sorted strongest first
    rateRows.sort((a, b) => {
        if (a.isValaria) return -1;
        if (b.isValaria) return 1;
        return b.rate - a.rate;
    });

    const lines = rateRows.map(r =>
        `${r.isValaria ? '🏗️' : '🔹'} **${r.name}** — \`${r.rate.toFixed(6)}\` vollars  ${r.changeStr}`
    ).join('\n');

    const embed = new EmbedBuilder()
        .setTitle('📊 Daily FOREX — All Currencies vs Vollars')
        .setColor('Blue')
        .setDescription(lines)
        .setTimestamp()
        .setFooter({ text: 'Sorted by strength · Valaria is reference · Updates daily at midnight UTC' });

    // Send to every configured channel
    const channelGuilds = allGuildRecords.filter(g => g.forexUpdateChannel != null);
    for (const guildRecord of channelGuilds) {
        const discordGuild = client.guilds.cache.get(guildRecord.IDENT);
        if (!discordGuild) continue;
        const channel = await discordGuild.channels.fetch(guildRecord.forexUpdateChannel).catch(() => null);
        if (!channel) continue;
        await channel.send({ embeds: [embed] }).catch(err =>
            console.error(`[ForexUpdate] Failed to send to ${discordGuild.name}:`, err.message)
        );
    }

    // Persist new rates for tomorrow's % change
    for (const { IDENT, newRate } of rateUpdates) {
        await SQL.models.Guilds.update(
            { forexLastRate: newRate },
            { where: { IDENT } }
        );
    }
}

function scheduleForexUpdates(client) {
    cron.schedule('0 0 * * *', () => {
        runForexUpdate(client).catch(err =>
            console.error('[ForexUpdate] Cron run failed:', err)
        );
    }, { timezone: 'UTC' });

    console.log('[ForexUpdate] Daily FOREX update scheduled for midnight UTC.');
}

module.exports = { scheduleForexUpdates, runForexUpdate };
