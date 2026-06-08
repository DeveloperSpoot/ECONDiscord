const {Interaction, EmbedBuilder, SlashCommandBuilder, Colors, ButtonBuilder, ButtonStyle, ActionRowBuilder} = require("discord.js");
module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Returns basic bot information.'),
    async execute(interaction) {
        const action = new ButtonBuilder()
            .setStyle(ButtonStyle.Link)
            .setURL("https://discord.com/application-directory/1077139728538812416/store/1260839276069785653")
            .setLabel("Upgrade To Premium");

        const row = new ActionRowBuilder()
            .addComponents(action)

        const infoEmbed = new EmbedBuilder()
            .setTitle('ECON | Help')
            .setDescription(
                "You must be registered to use most commands. Run `/register` to get started.\n" +
                "New here? Run `/userguide` for a quick rundown of everyday member commands.\n" +
                "New server? Run `/setup` for a guided configuration walkthrough.\n\n" +
                "**Detailed guides:** `/userguide` · `/setup` · `/treasuryhelp` · `/cbhelp` · `/bondshelp` · `/taxhelp`"
            )
            .setColor("#33E300")
            .setTimestamp()
            .setFooter({text: "ECON by Spectacle Development"})
            .addFields(
                { name: '🏛️  Treasury', value: '`/treasury` — Balance, departments, businesses, bonds, taxes', inline: false },
                { name: '🏦  Central Bank', value: '`/centralbank` — Money supply, print/destroy, CB bonds, reserves', inline: false },
                { name: '💱  FOREX', value: '`/forex` — Exchange rates, currency conversion, strength metrics', inline: false },
                { name: '📜  Bonds', value: '`/bonds` — Browse, buy, transfer sovereign bonds · `/bondshelp` for full guide', inline: false },
                { name: '🏪  Business & Departments', value: '`/bus` — Business payments & items · `/dep` — Department payroll & transfers', inline: false },
                { name: '💵  Income & Transfers', value: '`/transfer` · `/collect-income` · `/stipend` · `/payroll`', inline: false },
                { name: '​', value: '​', inline: false },
                { name: 'Support Us', value: '[Discord Premium](https://discord.com/application-directory/1077139728538812416/store/1260839276069785653)', inline: true },
                { name: 'Bot Guide', value: '[View all commands](https://econ.spectacledev.com/Documentation)', inline: true },
                { name: 'Support Server', value: '[Join the Discord](https://discord.gg/tgg2cyYHDh)', inline: true },
                { name: 'Legal', value: '[Terms of Service](https://spectacledev.com/econ-termsofservice) | [Privacy Policy](https://spectacledev.com/econ-privacypolicy)', inline: true },
                { name: 'Vote For The Bot', value: '[Vote on Top.gg](https://top.gg/bot/1077139728538812416)', inline: true },
                { name: 'Invite The Bot', value: '[Invite Link](https://discord.com/api/oauth2/authorize?client_id=1077139728538812416&permissions=414464723008&scope=bot)', inline: true }
            )

        interaction.reply({embeds: [infoEmbed], components: [row]});
    },
};