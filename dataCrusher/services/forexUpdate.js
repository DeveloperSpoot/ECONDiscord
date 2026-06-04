const cron = require('node-cron');
const { EmbedBuilder } = require('discord.js');
const SQL = require('../Server');
const { getGuildStrength } = require('./forexService');
const { convertCurrency } = require('../../utils/forexStrength');

const VALARIA_GUILD_ID = '1097636386133254177';

const NAME_W = 18;
const SYM_W  = 7;
const RATE_W = 11;

// Strip Discord custom emoji (<:name:id> → name) and all non-ASCII (flag emoji etc.)
function sanitize(str) {
    return str
        .replace(/<a?:(\w+):\d+>/g, '$1')
        .replace(/[^\x00-\x7F]/g, '')
        .trim();
}

function makeTable(header, rows) {
    const divider = '─'.repeat(NAME_W + SYM_W + RATE_W + 8);
    return '```\n' + header + '\n' + divider + '\n' + rows.join('\n') + '\n```';
}

function tableRow(displayName, symbol, rate, extra = '') {
    const name = sanitize(displayName).slice(0, NAME_W - 1).padEnd(NAME_W);
    const sym  = sanitize(symbol).slice(0, SYM_W - 1).padEnd(SYM_W);
    const amt  = rate.padEnd(RATE_W);
    return name + sym + amt + extra;
}

async function runForexUpdate(client) {
    const valariaStats = await getGuildStrength(VALARIA_GUILD_ID);
    if (valariaStats.strength <= 0) {
        console.warn('[ForexUpdate] Valaria has zero strength — skipping run.');
        return;
    }

    const allGuildRecords = await SQL.models.Guilds.findAll({ raw: true });
    const guildRecordMap = Object.fromEntries(allGuildRecords.map(g => [g.IDENT, g]));

    // Compute vollarsPerUnit for every Discord guild the bot is in
    const rateRows = [];
    const rateUpdates = [];

    for (const [guildId, discordGuild] of client.guilds.cache) {
        const stats = await getGuildStrength(guildId);
        const vollarsPerUnit = stats.strength > 0
            ? convertCurrency(1, stats.strength, valariaStats.strength)
            : 0;
        const perVollar = vollarsPerUnit > 0 ? (1 / vollarsPerUnit) : 0;

        const guildRecord = guildRecordMap[guildId];
        const lastRate = guildRecord?.forexLastRate != null ? Number(guildRecord.forexLastRate) : null;

        let changeStr;
        if (guildId === VALARIA_GUILD_ID) {
            changeStr = 'ref';
        } else if (lastRate === null || lastRate <= 0) {
            changeStr = 'NEW';
        } else {
            const pct = ((vollarsPerUnit - lastRate) / lastRate) * 100;
            if (Math.abs(pct) < 0.001) changeStr = '+0.00%';
            else if (pct > 0) changeStr = `+${pct.toFixed(2)}%`;
            else changeStr = `${pct.toFixed(2)}%`;
        }

        rateRows.push({
            guildId,
            name: discordGuild.name,
            symbol: guildRecord?.customCurrency || '$',
            vollarsPerUnit,
            perVollar,
            changeStr,
            isValaria: guildId === VALARIA_GUILD_ID
        });
        rateUpdates.push({ IDENT: guildId, newRate: vollarsPerUnit });
    }

    // Valaria at top, rest sorted strongest first
    rateRows.sort((a, b) => {
        if (a.isValaria) return -1;
        if (b.isValaria) return 1;
        return b.vollarsPerUnit - a.vollarsPerUnit;
    });

    // ── Embed 1: all currencies vs vollars ───────────────────────────────────
    const vollarHeader = 'SERVER'.padEnd(NAME_W) + 'SYM'.padEnd(SYM_W) + 'PER VOLLAR'.padEnd(RATE_W) + '24H';
    const vollarRows = rateRows.map(r =>
        tableRow(
            r.isValaria ? `${r.name} (ref)` : r.name,
            r.symbol,
            r.perVollar.toFixed(6),
            r.changeStr
        )
    );

    const embed1 = new EmbedBuilder()
        .setTitle('📊 Daily FOREX — Currencies per Vollar')
        .setColor('Blue')
        .setDescription(
            '-# *PER VOLLAR = how much of each currency 1 vollar buys. A higher number means the vollar is stronger against that currency.*\n' +
            makeTable(vollarHeader, vollarRows)
        )
        .setTimestamp()
        .setFooter({ text: 'Sorted by strength · Updates daily at midnight UTC' });

    // ── Send to every configured channel ─────────────────────────────────────
    const channelGuilds = allGuildRecords.filter(g => g.forexUpdateChannel != null);

    for (const guildRecord of channelGuilds) {
        const discordGuild = client.guilds.cache.get(guildRecord.IDENT);
        if (!discordGuild) continue;
        const channel = await discordGuild.channels.fetch(guildRecord.forexUpdateChannel).catch(() => null);
        if (!channel) continue;

        // Find this guild's row so we can compute home→other rates
        const homeRow = rateRows.find(r => r.guildId === guildRecord.IDENT);
        const homeVollars = homeRow?.vollarsPerUnit ?? 0;
        const homeSymbol  = homeRow?.symbol ?? '$';

        // ── Embed 2: 1 home currency vs every other currency ─────────────────
        const convHeader = 'SERVER'.padEnd(NAME_W) + 'SYM'.padEnd(SYM_W) + `1 ${sanitize(homeSymbol)} BUYS`.padEnd(RATE_W);
        const convRows = rateRows.map(r => {
            // 1 home unit = homeVollars vollars; 1 foreign unit = r.vollarsPerUnit vollars
            // => home buys homeVollars / r.vollarsPerUnit foreign units
            const amount = (homeVollars > 0 && r.vollarsPerUnit > 0)
                ? (homeVollars / r.vollarsPerUnit).toFixed(6)
                : '—';
            return tableRow(
                r.isValaria ? `${r.name} (ref)` : r.name,
                r.symbol,
                amount
            );
        });

        const embed2 = new EmbedBuilder()
            .setTitle(`💱 1 ${discordGuild.name} Currency Converts To`)
            .setColor('Gold')
            .setDescription(
                `-# *How much of each other currency you receive in exchange for 1 unit of ${discordGuild.name}'s currency.*\n` +
                makeTable(convHeader, convRows)
            )
            .setTimestamp()
            .setFooter({ text: 'Use /forex exchange to convert · Updates daily at midnight UTC' });

        await channel.send({ embeds: [embed1, embed2] }).catch(err =>
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
