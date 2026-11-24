const { SimpleEmbed, ErrorEmbed } = require("../../../utils/embedUtil");
const { PermManager, CreateData } = require("../../../dataCrusher/Headquarters");

module.exports = {
    configure(subcommand) {
        return subcommand
            .setName("add")
            .setDescription(
                "Add a new business to the economy."
            )
            .addStringOption((option) =>
                option
                    .setName("name")
                    .setRequired(true)
                    .setDescription("The name of the business.")
            )
            .addStringOption((option) =>
                option
                    .setName("description")
                    .setRequired(true)
                    .setDescription("The description of the business.")
            )
            .addUserOption((option) =>
                option
                    .setName("owner")
                    .setRequired(true)
                    .setDescription("The owner of the business. Has all perms. ")
            )
            .addBooleanOption((option) =>
                option
                    .setName("selfserved")
                    .setRequired(true)
                    .setDescription("Wether or not users can buy items from this business directly on their own.")
            )
            .addRoleOption((option) =>
                option
                    .setName("role")
                    .setRequired(false)
                    .setDescription("The role that all business members have.")
            )
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
        //Create constants for the options.
        const name = interaction.options.getString("name");
        const description = interaction.options.getString("description");
        const owner = interaction.options.getUser("owner").id;
        const selfServed = interaction.options.getBoolean("selfserved");
        let role = interaction.options.getRole("role") ?? null;

        if (role !== null) {
            role = role.id;
        }

        //Create the business.
        await CreateData.businessAccount(
            interaction,
            name,
            description,
            owner,
            selfServed,
            role
        )
            .then(async (result) => {
                const embed = await SimpleEmbed(
                    interaction,
                    "Successfully created business!",
                    `${name} has been created!`,
                    "Green",
                    null
                );
                return interaction.editReply({ embeds: [embed] });
            })
            .catch(async (error) => {
                console.log(error);
                return await ErrorEmbed(interaction, "Error creating business! " + error.message);
            });
    }
};