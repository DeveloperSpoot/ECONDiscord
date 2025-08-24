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
const {paginateUtil} = require("../utils/paginateUtil");
const {ErrorEmbed} = require("../utils/embedUtil");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("leaderboard")
        .setDescription("Retrieves the leaderboard."),
    /**@param {Interaction} interaction*/ //Telling VSCode what the params of this function are.
    async execute(interaction) {
        if (!interaction.guild) {
            return interaction.reply('This can only be used in a server!');
        }

        await interaction.deferReply();
        
        const guildManager = new GuildHQ(interaction);
        const leaderboard = await RetrieveData.leaderboard(interaction.IDENT);
        if(typeof leaderboard.get(interaction.user.id) === "undefined"){
            return await ErrorEmbed(interaction, "You must be registered to use this command.");
        }

        const paginateLeaderboard = await paginateUtil(leaderboard, 10);

        let currentPage = 1;
        const row = new ActionRowBuilder();
        const backButt = new ButtonBuilder()
            .setCustomId("back")
            .setLabel("<--")
            .setStyle(ButtonStyle.Primary);
        const nextButt = new ButtonBuilder()
            .setCustomId("next")
            .setLabel("-->")
            .setStyle(ButtonStyle.Primary);
        row.addComponents(nextButt);

        const leaderboardEmbed = new EmbedBuilder()
            .setTitle(`${interaction.guild.name} Leaderboard`)
            .setDescription("Test")
            .setColor(Colors.Blurple)
            .setFooter({
                text: `Page 1/${Object.keys(paginateLeaderboard).length} • Your leaderboard rank: ${leaderboard.get(interaction.user.id).pos + 1}`,
                iconURL: interaction.guild.iconURL(),
            });

        const MoneyFormat = new Intl.NumberFormat('en-us', {currency: 'USD', style: 'currency'})
        let leaders = [];
        for (let [key, value] of paginateLeaderboard[currentPage]) {
            leaders.push(`**${value.pos + 1}.** <@${key}> • ${await guildManager.formatMoney(value.netWorth)}`);
            // await interaction.guild.members.fetch(key).then(member => {
            //     leaders.push(`**${value.pos + 1}.** ${member.displayName} • ${value.netWorth}`);
            // })
        }
        leaderboardEmbed.setDescription(leaders.join('\r\n'));

        currentPage === Object.keys(paginateLeaderboard).length ? (
            interaction.editReply({embeds: [leaderboardEmbed]})
        ) : (
            interaction.editReply({embeds: [leaderboardEmbed], components: [row]})
        )


        const buttonFilter = (i) =>
            (i.customId === "back" ||
                i.customId === "next") &&
            i.user.id === interaction.user.id;

        const buttonCollector = interaction.channel.createMessageComponentCollector(
            {buttonFilter, time: 120000}
        )

        buttonCollector.on("collect", async (i) => {
            if (
                (i.customId === "back" || i.customId === "next") &&
                i.user.id === interaction.user.id
            ) {
                const row = new ActionRowBuilder();
                row.addComponents(backButt, nextButt)
                leaders = []
                await i.deferReply();
                if (i.customId === "back") {
                    const ROW = new ActionRowBuilder();
                    ROW.addComponents(nextButt)
                    currentPage--
                    const leaderboardEmbedB = new EmbedBuilder()
                        .setTitle(`${interaction.guild.name} Leaderboard`)
                        .setDescription("Test")
                        .setColor(Colors.Blurple)
                        .setFooter({
                            text: `Page ${currentPage}/${Object.keys(paginateLeaderboard).length} • Your leaderboard rank: ${leaderboard.get(interaction.user.id).pos + 1}`,
                            iconURL: interaction.guild.iconURL(),
                        });
                    for (let [key, value] of paginateLeaderboard[currentPage]) {
                        leaders.push(`**${value.pos + 1}.** <@${key}> • ${await guildManager.formatMoney(value.netWorth)}`);
                        // await interaction.guild.members.fetch(key).then(member => {
                        //     leaders.push(`**${value.pos + 1}.** ${member.displayName} • ${value.netWorth}`);
                        // })
                    }
                    leaderboardEmbedB.setDescription(leaders.join('\r\n'));
                    interaction.editReply({embeds: [leaderboardEmbedB], components: [(currentPage === 1 ? ROW : row)]})
                    await  i.deleteReply();
                    return;
                }
                if (i.customId === "next") {
                    const ROW = new ActionRowBuilder();
                    ROW.addComponents(backButt)
                    currentPage++
                    const leaderboardEmbedn = new EmbedBuilder()
                        .setTitle(`${interaction.guild.name} Leaderboard`)
                        .setDescription("Test")
                        .setColor(Colors.Blurple)
                        .setFooter({
                            text: `Page ${currentPage}/${Object.keys(paginateLeaderboard).length} • Your leaderboard rank: ${leaderboard.get(interaction.user.id).pos + 1}`,
                            iconURL: interaction.guild.iconURL(),
                        });
                    for (let [key, value] of paginateLeaderboard[currentPage]) {
                        leaders.push(`**${value.pos + 1}.** <@${key}> • ${await guildManager.formatMoney(value.netWorth)}`);
                        // await interaction.guild.members.fetch(key).then(member => {
                        //     leaders.push(`**${value.pos + 1}.** ${member.displayName} • ${value.netWorth}`);
                        // })
                    }
                    leaderboardEmbedn.setDescription(leaders.join('\r\n'));
                    interaction.editReply({
                        embeds: [leaderboardEmbedn],
                        components: [(currentPage === Object.keys(paginateLeaderboard).length ? ROW : row)]
                    })
                    await  i.deleteReply();
                }
            }
        })
    }
};
