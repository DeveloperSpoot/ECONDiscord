const SQL = require("../dataCrusher/Server");

// Per-user cooldown: only count one message per user per 15 seconds
// Key: `${guildId}_${userId}` → timestamp of last counted message
const lastCounted = new Map();
const COOLDOWN_MS = 15 * 1000;
const MIN_LENGTH = 4;

module.exports = {
    name: "messageCreate",
    once: false,
    async execute(message) {
        // Ignore DMs and bots
        if (!message.guild || message.author.bot) return;

        const content = message.content ?? "";

        // Ignore very short messages
        if (content.length < MIN_LENGTH) return;

        // Ignore command-like messages (slash commands show as "/" prefix in some clients,
        // or the message starts with a mention)
        if (content.startsWith("/") || content.startsWith("<@")) return;

        const guildId = message.guild.id;
        const userId = message.author.id;
        const key = `${guildId}_${userId}`;

        const now = Date.now();
        const last = lastCounted.get(key) ?? 0;

        if (now - last < COOLDOWN_MS) return;

        lastCounted.set(key, now);

        const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

        try {
            // Upsert today's row, incrementing messageCount
            const [row] = await SQL.models.ActivityLog.findOrCreate({
                where: { guild: guildId, date: today },
                defaults: { guild: guildId, date: today, messageCount: 0, vcMinutes: 0 }
            });
            await row.increment("messageCount", { by: 1 });
        } catch (err) {
            console.error("ActivityLog messageCreate error:", err);
        }
    }
};
