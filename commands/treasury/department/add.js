const { ErrorEmbed } = require("../../../utils/embedUtil");
const discord = require("discord.js");
const { PermManager, CreateData } = require("../../../dataCrusher/Headquarters");

module.exports = {
    configure(subcommand) {
        return subcommand
            .setName('add')
            .setDescription('Creates a department.')
            .addStringOption((option) =>
                option
                    .setName('department-name')
                    .setDescription('The name of the department in which you wish to create.')
                    .setRequired(true)
            )
            .addRoleOption((option) =>
                option
                    .setName('department-head-role')
                    .setDescription('The role in which the department head will have.')
                    .setRequired(true)
            )
            .addRoleOption((option) =>
                option
                    .setName('department-role')
                    .setDescription('The role in which all department members will have.')
                    .setRequired(true)
            )
            .addStringOption(option =>
                option
                    .setName('department-description')
                    .setDescription('The description of the department.')
                    .setRequired(false)
                    .setAutocomplete(false)
            )
            .addNumberOption((option) =>
                option
                    .setName('department-budget')
                    .setDescription('The amount of money the department may claim periodically.')
                    .setRequired(false)
                    .setAutocomplete(false)
            )
            .addNumberOption((option) =>
                option
                    .setName('department-max-balance')
                    .setDescription('This limits budget claiming based on the department balance.')
                    .setRequired(false)
                    .setAutocomplete(false))
    },

    async execute(interaction) {

        if (interaction.IDENT !== interaction.guildId) {
            return await ErrorEmbed(interaction, "Sub Servers of an Entanglement may not manage the treasury. Treasury settings changes and interactions must be conducted on the main server.")
        }

        if (await PermManager.Treasury.checkAuthorization(interaction, interaction.user) == null && interaction.user.id !== interaction.guild.ownerId) {
            return await ErrorEmbed(
                interaction,
                "You are not authorized manage the Treasury."
            );
        }

        const Name = interaction.options.getString('department-name');
        const HeadRole = interaction.options.getRole('department-head-role');
        const MemberRole = interaction.options.getRole('department-role');
        const Desc = interaction.options.getString('department-description');
        const Budget = interaction.options.getNumber('department-budget');
        const MaxBal = interaction.options.getNumber('department-max-balance');

        await interaction.deferReply();
        await CreateData.department(interaction, Name, HeadRole.id, MemberRole.id, Desc, Budget, MaxBal).catch(async err => {
            console.log(err);
            await ErrorEmbed(interaction, `An error occurred: ${err.message}`, false, true)
            return;
        })
        const SuccessEmbed = new discord.EmbedBuilder()
            .setTitle(`Successfully Created ${Name}`,)
            .setColor(discord.Colors['Green'])
            .setTimestamp()
            .setFooter({
                text: `${interaction.guild.name} Economy System`, iconURL: interaction.guild.iconURL(),
            })
            .setDescription(`**Department Head Role:** ${HeadRole}\n **Member Role:** ${MemberRole}\n **Budget:** $${Budget}\n **Max Balance:** ${MaxBal}\n **Description:** ${Desc}`);
        interaction.editReply({ embeds: [SuccessEmbed] })

    }
};