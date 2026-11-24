const { ErrorEmbed } = require("../../utils/embedUtil");
const discord = require("discord.js");
const { RetrieveData, UpdateData, PermManager, DepartmentHQ} = require("../../dataCrusher/Headquarters");
module.exports = {
    configure(subcommand) {
        return subcommand
            .setName('fund-department')
            .setDescription('Transfer funds from the treasury account to the department.')
            .addStringOption(option =>
                option
                    .setName('department')
                    .setDescription('The department you wish to fund.')
                    .setAutocomplete(true)
                    .setRequired(true))
            .addNumberOption(option =>
                option
                    .setName('amount')
                    .setDescription('The amount you wish to fund.')
                    .setAutocomplete(false)
                    .setRequired(true))
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
        const MoneyFormat = new Intl.NumberFormat('en-us');

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

        await interaction.deferReply();
        const Treasury = await RetrieveData.treasury(interaction.IDENT, true)
        if ((Number(await Treasury.balance) - Number(interaction.options.getNumber('amount')) <= 0)) {
            const DeclineEmebed = new discord.EmbedBuilder()
                .setTitle(`Unable To Fund Department`,)
                .setColor(discord.Colors['Red'])
                .setTimestamp()
                .setFooter({
                    text: `${interaction.guild.name} Economy System`, iconURL: interaction.guild.iconURL(),
                })
                .setDescription('Unable to fund department. Insufficient funds from Treasury.')
            return interaction.editReply({ embeds: [DeclineEmebed] });
        }
        const amount = interaction.options.getNumber('amount');
        const department = await new DepartmentHQ(interaction, interaction.options.getString('department'))

        await UpdateData.departmentBalance(interaction, department, amount)

        const Emebed = new discord.EmbedBuilder()
            .setTitle(`Department Funded.`,)
            .setColor(discord.Colors['Green'])
            .setTimestamp()
            .setFooter({
                text: `${interaction.guild.name} Economy System`, iconURL: interaction.guild.iconURL(),
            })
            .setDescription(`**${await department.getName()}** has been funded ${await guildManager.formatMoney(amount)} using Treasury funds.`)
        interaction.editReply({ embeds: [Emebed] })
    }
};