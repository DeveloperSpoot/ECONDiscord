const { SimpleEmbed, ErrorEmbed } = require("../../../utils/embedUtil");

const { PermManager } = require("../../../dataCrusher/Headquarters");

const getActiveEntity = require("../../../DRY/getActiveEntity");

module.exports = {
    configure(subcommand) {
        return subcommand
            .setName("remove-employee")
            .setDescription("Remove an employee from your business.")
            .addUserOption((option) =>
                option
                    .setName("employee")
                    .setDescription("The employee you would like to terminate.")
                    .setRequired(true)
            )
    },

    async execute(interaction) {
        const { business, busName } = await getActiveEntity.Business(interaction);

        if (business == null) return;

        if (
            (await PermManager.Business.checkPerm(
                business,
                interaction,
                "manager"
            )) === false
        ) {
            return await ErrorEmbed(
                interaction,
                "Insufficient perms. Manager permission level required."
            );
        }

        await interaction.deferReply();

        const selectedMember = interaction.options.getUser("employee")

        const employee = await business.getEmployeeByDiscord(selectedMember.id, interaction.guild.id)
        if (employee == null) {
            return await ErrorEmbed(
                interaction,
                `Selected member (<@${selectedMember.id}>) is not an employee.`
            );
        }

        if ((await PermManager.Business.compareUsers(business, interaction, selectedMember)) === false) {
            return ErrorEmbed(
                interaction,
                "The user you are attemping to terminate has higher privileges than you."
            );
        }

        const embed = await SimpleEmbed(
            interaction,
            "Successfully deleted employee",
            `${selectedMember.displayName} has been deleted!`,
            "Green",
            null);

        await business.terminateEmployee(
            employee.IDENT,
            selectedMember
        );
        interaction.editReply({
            embeds: [embed],
            components: [],
        });

    }
};