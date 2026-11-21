const getActiveEntity = require("../../../DRY/getActiveEntity");
const {SimpleEmbed, ErrorEmbed} = require("../../../utils/embedUtil");
const {PermManager} = require("../../../dataCrusher/Headquarters");

module.exports = {
    configure(subcommand) {
        return subcommand
            .setName('remove-item')
            .setDescription('Remove an item from the selected business.')
            .addStringOption((option) =>
                option
                    .setName("item")
                    .setDescription("The item you want to delete.")
                    .setRequired(true)
                    .setAutocomplete(true)
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

        try {
            const item = interaction.options.getString("item");
            const busItem = await business.getSpecItem(item);

            const embed = await SimpleEmbed(
                interaction,
                "Successfully deleted item",
                `${busItem.name} has been deleted!`,
                "Green",
                null
            );
            await business.discontinueItem(item);
            interaction.editReply({
                embeds: [embed],
                components: [],
            });
        } catch (err) {
            console.error(err);

             return await ErrorEmbed(
                interaction,
                `An error occured: ${err.message}`
            );
        }
    }
};