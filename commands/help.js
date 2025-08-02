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
            .setDescription("In order to use any command, you must first be registered. To register run </register:1077339153194303531> command. Need help setting up ECON? Run the </setup:1260740541771939920> command.")
            .setColor("#33E300")
            .setTimestamp()
            .setFooter({text: "ECON by Spectacle Development"})
            .addFields(
                { name: 'Treasury', value: '/treasury', inline: true },
                { name: 'Business', value: '/bus', inline: true },
                { name: 'Department', value: '/dep', inline: true },
                { name: 'Support Us', value: '[Discord Premium](https://discord.com/application-directory/1077139728538812416/store/1260839276069785653)', inline: true },
                { name: 'Bot Guide', value: '[View all bot commands here.](econ.spectacledev.com/docs)', inline: true },
                {name: 'Support Server', value: '[Join The Discord Server](https://discord.gg/tgg2cyYHDh)', inline: true},
                {name: 'Legal', value: '[Terms of Service](https://spectacledev.com/econ-termsofservice) | [Privacy Policy](https://spectacledev.com/econ-privacypolicy)', inline: true},
                {name: 'Vote For The Bot', value: '[Vote on Top.gg](https://top.gg/bot/1077139728538812416)', inline: true},
                {name: 'Invite The Bot', value: '[Invite Link](https://discord.com/api/oauth2/authorize?client_id=1077139728538812416&permissions=414464723008&scope=bot)', inline: true},
                {name: 'Forms', value: '[Report A Bug](https://discord.gg/tgg2cyYHDh) | [Make A Suggestion](https://discord.gg/tgg2cyYHDh)', inline: true}

            )

        interaction.reply({embeds: [infoEmbed], components: [row]});
    },
};