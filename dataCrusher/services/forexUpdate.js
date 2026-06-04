const cron = require('node-cron');
const { EmbedBuilder } = require('discord.js');
const { Op } = require('sequelize');
const SQL = require('../Server');
const { getGuildStrength } = require('./forexService');
const { convertCurrency } = require('../../utils/forexStrength');

const VALARIA_GUILD_ID = '1097636386133254177';

async function runForexUpdate(client) {
    const valariaStats = await getGuildStrength(VALARIA_GUILD_ID);
    console.log(`[ForexUpdate] Valaria strength: ${valariaStats.strength}`);
    if (valariaStats.strength <= 0) {
        console.warn('[ForexUpdate] Valaria has zero strength — skipping run.');
        return;
    }

    const guilds = await SQL.models.Guilds.findAll({
        where: { forexUpdateChannel: { [Op.ne]: null } },
        raw: true
    });
    console.log(`[ForexUpdate] Found ${guilds.length} guild(s) with forex channels:`, guilds.map(g => `${g.IDENT} → ch:${g.forexUpdateChannel}`));

    for (const guildRecord of guilds) {
        if (guildRecord.IDENT === VALARIA_GUILD_ID) { console.log(`[ForexUpdate] Skipping Valaria (${guildRecord.IDENT})`); continue; }

        const discordGuild = client.guilds.cache.get(guildRecord.IDENT);
        if (!discordGuild) { console.warn(`[ForexUpdate] Discord guild not found in cache for IDENT ${guildRecord.IDENT}`); continue; }

        const channel = await discordGuild.channels.fetch(guildRecord.forexUpdateChannel).catch(err => { console.warn(`[ForexUpdate] Channel fetch failed:`, err.message); return null; });
        if (!channel) continue;
        console.log(`[ForexUpdate] Sending to ${discordGuild.name} → #${channel.name}`);

        const homeStats = await getGuildStrength(guildRecord.IDENT);
        const currentRate = homeStats.strength > 0
            ? convertCurrency(1, homeStats.strength, valariaStats.strength)
            : 0;

        const inverseRate = currentRate > 0 ? (1 / currentRate) : 0;
        const lastRate = guildRecord.forexLastRate != null ? Number(guildRecord.forexLastRate) : null;
        const currSymbol = guildRecord.customCurrency || '$';

        let changeText;
        let embedColor;

        if (lastRate === null || lastRate <= 0) {
            changeText = 'First update — no comparison data yet.';
            embedColor = 'Blue';
        } else {
            const changePct = ((currentRate - lastRate) / lastRate) * 100;
            if (Math.abs(changePct) < 0.001) {
                changeText = '— No change';
                embedColor = 'Blue';
            } else if (changePct > 0) {
                changeText = `▲ +${changePct.toFixed(2)}% vs yesterday`;
                embedColor = 'Green';
            } else {
                changeText = `▼ ${changePct.toFixed(2)}% vs yesterday`;
                embedColor = 'Red';
            }
        }

        const embed = new EmbedBuilder()
            .setTitle('📊 Daily FOREX Update')
            .setColor(embedColor)
            .setDescription(`Exchange rate between **${discordGuild.name}** and **Valaria** (vollars)`)
            .addFields(
                { name: `1 ${discordGuild.name} currency`, value: `${currentRate.toFixed(6)} vollars`, inline: true },
                { name: '1 vollar', value: `${inverseRate.toFixed(6)} ${currSymbol}`, inline: true },
                { name: '24h Change', value: changeText, inline: false }
            )
            .setTimestamp()
            .setFooter({ text: 'FOREX Daily Update · Valaria' });

        await channel.send({ embeds: [embed] }).catch(err =>
            console.error(`[ForexUpdate] Failed to send to ${discordGuild.name}:`, err.message)
        );

        await SQL.models.Guilds.update(
            { forexLastRate: currentRate },
            { where: { IDENT: guildRecord.IDENT } }
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
