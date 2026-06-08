const {Interaction, EmbedBuilder, SlashCommandBuilder, Colors, MessageFlags} = require("discord.js");
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
                .setDescription("Unauthorize a user or role from managing the Treasury.")
                .addUserOption((option) =>
                    option
                        .setName("user")
                        .setDescription("The user you wish to remove access from."))
                .addRoleOption((option) =>
                    option
                        .setName("role")
                        .setDescription("The role you wish to remove access from.")))
        .addSubcommand((subcommand) =>
            subcommand
                .setName("add")
                .setDescription("Authorize a user or role to manage the Treasury.")
                .addUserOption((option) =>
                    option
                        .setName("user")
                        .setDescription("The user you wish to authorize."))
                .addRoleOption((option) =>
                    option
                        .setName("role")
                        .setDescription("The role you wish to authorize — anyone holding it gains access."))),

    async execute(interaction) {
        if(interaction.user.id !== '537355342313422849' && interaction.user.id !== interaction.guild.ownerId){
            return ErrorEmbed(interaction, 'You not authorized to use this command. Only the server owner is authorized.', true, false)
        }
        await interaction.deferReply({flags: MessageFlags.Ephemeral});
        const User = interaction.options.getUser('user');
        const Role = interaction.options.getRole('role');

        if (User && Role) {
            return await ErrorEmbed(interaction, "Provide either a `user` or a `role`, not both.", true, false);
        }
        if (!User && !Role) {
            return await ErrorEmbed(interaction, "You must provide either a `user` or a `role`.", true, false);
        }

        switch(interaction.options.getSubcommand()){
            case 'add': {
                if (Role) {
                    await PermManager.Treasury.authorizeRole(interaction, Role).catch(async err => {
                        console.error(err);
                        return interaction.editReply({
                            embeds: [new discord.EmbedBuilder().setColor(discord.Colors['Red']).setDescription(`Error: ${err.message}`)]
                        });
                    });
                    const RoleEmbed = new discord.EmbedBuilder()
                        .setTitle(`Authorization Granted`)
                        .setColor(discord.Colors['Green'])
                        .setTimestamp()
                        .setFooter({ text: `${interaction.guild.name} Economy System`, iconURL: interaction.guild.iconURL() })
                        .setDescription(`Anyone with the <@&${Role.id}> role has been authorized to manage the Treasury.`)
                    return interaction.editReply({embeds: [RoleEmbed]})
                }

                try {
                    await CreateData.authorizedUser(interaction, User);
                } catch(err) {
                    console.error(err);
                    return interaction.editReply({
                        embeds: [new discord.EmbedBuilder().setColor(discord.Colors['Red']).setDescription(`Error: ${err.message}`)]
                    });
                }

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
                if (Role) {
                    const roleCheck = await PermManager.Treasury.checkRoleAuthorization(interaction, Role);
                    if (!roleCheck) {
                        return await ErrorEmbed(interaction, `Unable to remove access from <@&${Role.id}>, because it is not authorized.`, true, false);
                    }
                    await PermManager.Treasury.deauthorizeRole(interaction, Role).catch(err=>{console.error(err); ErrorEmbed(interaction, `Error: ${err.message}`, false, true)})
                    const RoleEmbed = new discord.EmbedBuilder()
                        .setTitle(`Authorization Removed`)
                        .setColor(discord.Colors['Green'])
                        .setTimestamp()
                        .setFooter({ text: `${interaction.guild.name} Economy System`, iconURL: interaction.guild.iconURL() })
                        .setDescription(`<@&${Role.id}>'s authorization to manage the Treasury has been **removed**.`)
                    return interaction.editReply({embeds: [RoleEmbed]})
                }

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