const {
    EmbedBuilder
} = require("discord.js");
const { ErrorEmbed } = require("../../../utils/embedUtil");
const { PermManager, DepartmentHQ, RetrieveData, GuildHQ } = require("../../../dataCrusher/Headquarters");

module.exports = {
    configure(subcommand) {
        return subcommand
            .setName('edit')
            .setDescription('Edit a Department.')
            .addStringOption(option => option.setName('department').setRequired(true).setDescription('The department you wish to edit.').setAutocomplete(true))
            .addStringOption((option) =>
                option
                    .setName('department-name')
                    .setDescription('The name of the department in which you wish to create.')
                    .setRequired(false)
            )
            .addRoleOption((option) =>
                option
                    .setName('department-head-role')
                    .setDescription('The role in which the department head will have.')
                    .setRequired(false)
            )
            .addRoleOption((option) =>
                option
                    .setName('department-role')
                    .setDescription('The role in which all department members will have.')
                    .setRequired(false)
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

    async autocomplete(interaction) {
        if (await PermManager.Treasury.checkAuthorization(interaction, interaction.user) == null && interaction.user.id !== interaction.guild.ownerId) {
            return await interaction.respond([{
                name: "Error, You are not authorized manage the Treasury.",
                value: "Error"
            }]);
        }
        const focusedOption = interaction.options.getFocused(true);

        const Treasury = await RetrieveData.treasury(interaction.IDENT, false);

        switch (focusedOption.name) {

            case 'department': {
                const choices = await Treasury.getDepartments({ raw: true });
                if (choices.length === 0) {
                    return await interaction.respond([{
                        name: "Error, no departments exist in this economy.",
                        value: "Error"
                    }]);
                }
                const filtered = choices.filter(choice => {
                    return choice.name.toLowerCase().startsWith(focusedOption.value.toLowerCase())
                });
                await interaction.respond(
                    filtered.map(choice => ({ name: choice.name, value: choice.IDENT })),
                );
            } break

        }

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

        const guildManager = new GuildHQ(interaction);

        await interaction.deferReply();
        const Embed = new EmbedBuilder()
            .setColor('Green')
            .setTimestamp()
            .setFooter({
                text: `${interaction.guild.name} Economy System`, iconURL: interaction.guild.iconURL(),
            });

        const Department = interaction.options.getString('department');
        const Name = interaction.options.getString('department-name');
        const Desc = interaction.options.getString('department-description');
        const HeadRole = interaction.options.getRole('department-head-role');
        const DepartmentRole = interaction.options.getRole('department-role');
        const DepartmentBudget = interaction.options.getNumber('department-budget');
        const MaxBal = interaction.options.getNumber('department-max-balance')

        const DEPARTMENT = await new DepartmentHQ(interaction, Department);
        let EmbedDesc = "Nothing selected to edit.";

        if (typeof Name !== "undefined" && Name !== null) {
            await DEPARTMENT.editDepartment.name(DEPARTMENT, Name).catch(err => {
                return ErrorEmbed(interaction, err.message, false, true);
            });

            EmbedDesc = EmbedDesc + '\n Successfully changed the department name to ``' + Name + '``.'
        }

        if (typeof Desc !== "undefined" && Desc !== null) {
            await DEPARTMENT.editDepartment.description(DEPARTMENT, Desc).catch(err => {
                return ErrorEmbed(interaction, err.message, false, true);
            });

            EmbedDesc = EmbedDesc + '\n Successfully changed the department description to ``' + Desc + '``.'
        }

        if (typeof HeadRole !== "undefined" && HeadRole !== null) {
            await DEPARTMENT.editDepartment.headRole(DEPARTMENT, HeadRole).catch(err => {
                return ErrorEmbed(interaction, err.message, false, true);
            });

            EmbedDesc = EmbedDesc + `\n Successfully changed the department head role to ${HeadRole}.`
        }

        if (typeof DepartmentRole !== "undefined" && DepartmentRole !== null) {
            await DEPARTMENT.editDepartment.departmentRole(DEPARTMENT, DepartmentRole).catch(err => {
                return ErrorEmbed(interaction, err.message, false, true);
            });

            EmbedDesc = EmbedDesc + `\n Successfully changed the department role to ${DepartmentRole}.`

        }

        if (typeof DepartmentBudget !== "undefined" && DepartmentBudget !== null) {
            await DEPARTMENT.editDepartment.departmentBudget(DEPARTMENT, DepartmentBudget).catch(err => {
                return ErrorEmbed(interaction, err.message, false, true);
            });

            EmbedDesc = EmbedDesc + '\n Successfully changed the department budget to ' + await guildManager.formatMoney(DepartmentBudget) + '.'

        }

        if (typeof MaxBal !== "undefined" && MaxBal !== null) {
            await DEPARTMENT.editDepartment.maxBalance(DEPARTMENT, MaxBal).catch(err => {
                return ErrorEmbed(interaction, err.message, false, true);
            });

            EmbedDesc = EmbedDesc + '\n Successfully changed the department max balance to ``' + MaxBal + '``.'
        }

        Embed.setDescription(EmbedDesc)
        return interaction.editReply({ embeds: [Embed] })
    }
};