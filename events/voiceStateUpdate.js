const SQL = require("../dataCrusher/Server");

// In-memory join times: key `${guildId}_${userId}` → join timestamp (ms)
// Note: join times are lost on bot restart — this is acceptable.
const vcJoinTimes = new Map();

module.exports = {
    name: "voiceStateUpdate",
    once: false,
    async execute(oldState, newState) {
        const guildId = newState.guild?.id ?? oldState.guild?.id;
        if (!guildId) return;

        const userId = newState.member?.user?.id ?? oldState.member?.user?.id;
        if (!userId) return;

        // Ignore bots
        if (newState.member?.user?.bot || oldState.member?.user?.bot) return;

        const key = `${guildId}_${userId}`;
        const joinedChannel = newState.channel;
        const leftChannel = oldState.channel;

        if (!leftChannel && joinedChannel) {
            // User joined a voice channel
            vcJoinTimes.set(key, Date.now());
        } else if (leftChannel && !joinedChannel) {
            // User left a voice channel
            const joinedAt = vcJoinTimes.get(key);
            if (!joinedAt) return;

            vcJoinTimes.delete(key);
            const minutes = (Date.now() - joinedAt) / 60000;
            if (minutes < 0.1) return; // ignore sub-6-second blips

            const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

            try {
                const [row] = await SQL.models.ActivityLog.findOrCreate({
                    where: { guild: guildId, date: today },
                    defaults: { guild: guildId, date: today, messageCount: 0, vcMinutes: 0 }
                });
                await row.increment("vcMinutes", { by: minutes });
            } catch (err) {
                console.error("ActivityLog voiceStateUpdate error:", err);
            }
        }
        // Channel switch (leftChannel && joinedChannel): continuous session, don't reset timer
    }
};
