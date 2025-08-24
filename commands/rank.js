const {RetrieveData, CreateData, UpdateData, GuildHQ} = require("../dataCrusher/Headquarters.js");
const {
    Interaction,
    SlashCommandBuilder,
    EmbedBuilder,
    Colors,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");
const {paginateUtil} = require("../utils/paginateUtil.js");
const {ErrorEmbed} = require("../utils/embedUtil.js");
const crypto = require("crypto")

module.exports = {
    data: new SlashCommandBuilder()
        .setName("rank")
        .setDescription("Shows how you are ranked compared to other member balances"),
    /**@param {Interaction} interaction*/ //Telling VSCode what the params of this function are.
    async execute(interaction) {
        if (!interaction.guild) {
            return interaction.reply('This can only be used in a server!');
        }

        await interaction.deferReply();
        
        const guildManager = new GuildHQ(interaction);

        const leaderboard = await RetrieveData.leaderboard(interaction.IDENT);

        const hashUser = crypto.createHash("sha256")
            .update(interaction.user.id)
            .digest("hex");

        if(typeof leaderboard.get(String(hashUser)) === "undefined"){
            return await ErrorEmbed(interaction, "You must be registered to use this command.");
        }
        const rank = leaderboard.get(hashUser)
        
        const leaderboardEmbed = new EmbedBuilder()
            .setTitle(`${interaction.guild.name} Leaderboard`)
            .setDescription(`You are ranked \`\`${rank.pos + 1}\`\` with ${await guildManager.formatMoney(rank.netWorth)}`)
            .setColor(Colors.Blurple)

        await interaction.editReply({embeds: [leaderboardEmbed]})
    }
};
