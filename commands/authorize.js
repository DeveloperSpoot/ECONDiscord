const {Interaction, EmbedBuilder, SlashCommandBuilder, Colors} = require("discord.js");
const {ErrorEmbed} = require("../utils/embedUtil");
const {CreateData, PermManager, NotificationHQ} = require("../dataCrusher/Headquarters");
const discord = require("discord.js");
module.exports = {
    data: new SlashCommandBuilder()
        .setName("authorize")
        .setDescription(
            "Add and remove access from users to the Treasury."
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("remove")
                .setDescription("Unauthorize a user from managing the Treasury.")
                .addUserOption((option) =>
                    option
                        .setName("user")
                        .setDescription("The user you wish to remove access from.")
                        .setRequired(true)))
        .addSubcommand((subcommand) =>
            subcommand
                .setName("add")
                .setDescription("Authorize a user to manage the Treasury.")
                .addUserOption((option) =>
                    option
                        .setName("user")
                        .setDescription("The user you wish to authorize.")
                        .setRequired(true))),

    async execute(interaction) {
        if(interaction.user.id !== '537355342313422849' && interaction.user.id !== interaction.guild.ownerId){
            return ErrorEmbed(interaction, 'You not authorized to use this command. Only the server owner is authorized.', true, false)
        }
        await interaction.deferReply({flags: MessageFlags.Ephemeral});
        const User = interaction.options.getUser('user');

        switch(interaction.options.getSubcommand()){
            case 'add': {
                await CreateData.authorizedUser(interaction, User).catch(async err => {
                    console.error(err);
                    return await ErrorEmbed(interaction, `An error occurred: ${err.message}`, false,true)
                })

                const SucessfulEmebed = new discord.EmbedBuilder()
                    .setTitle(`Authorization Granted`,)
                    .setColor(discord.Colors['Green'])
                    .setTimestamp()
                    .setFooter({
                        text: `${interaction.guild.name} Economy System`, iconURL: interaction.guild.iconURL(),
                    })
                    .setDescription(`<@${User.id}> has been authorized to manage the Treasury.`)
                interaction.editReply({embeds: [SucessfulEmebed]})

                await NotificationHQ.authoirzationNotification(interaction, User)
            }break
            case 'remove': {
                const check = await PermManager.Treasury.checkAuthorization(interaction, User);
                if(!check){
                    return await ErrorEmbed(interaction, `Unable to remove access from ${User}, because they are not authorized.`, true, false) ;
                }
                await PermManager.Treasury.deauthorize(interaction, User).catch(err=>{console.error(err); ErrorEmbed(interaction, `Error: ${err.message}`, false, true)})
                const SucessfulEmebed = new discord.EmbedBuilder()
                    .setTitle(`Authorization Removed`,)
                    .setColor(discord.Colors['Green'])
                    .setTimestamp()
                    .setFooter({
                        text: `${interaction.guild.name} Economy System`, iconURL: interaction.guild.iconURL(),
                    })
                    .setDescription(`${User}'s authorization to manage the Treasury has been **removed**.`)
                interaction.editReply({embeds: [SucessfulEmebed]})
            }break
        }
    },
};