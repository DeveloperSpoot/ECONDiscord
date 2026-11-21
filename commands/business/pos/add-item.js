const getActiveEntity = require("../../../DRY/getActiveEntity");
const {SimpleEmbed, ErrorEmbed} = require("../../../utils/embedUtil");
const {PermManager} = require("../../../dataCrusher/Headquarters");

module.exports = {
    configure(subcommand) {
        return subcommand
            .setName('add-item')
            .setDescription('Add a new item to your business')
            .addStringOption((option) =>
                option
                    .setName("name")
                    .setDescription("The name of the item.")
                    .setRequired(true)
            )
            .addStringOption((option) =>
                option
                    .setName("description")
                    .setDescription("The description of the item. Be creative!")
                    .setRequired(true)
            )
            .addNumberOption((option) =>
                option
                    .setName("price")
                    .setDescription("The price of the item. Can include cents.")
                    .setRequired(true)
            )
            .addBooleanOption((option) =>
                option
                    .setName("own-multiple")
                    .setDescription(
                        "If true, the item can be added to the customer's inventory multiple times."
                    )
                    .setRequired(true)
            )
            .addBooleanOption((option) =>
                option
                    .setName("quick-access")
                    .setDescription(
                        "If true, the item will be accessible through quick access, allowing the sell multiple items at once."
                    )
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

        const item = new Map();
        item.set("name", interaction.options.getString("name"));
        item.set("description", interaction.options.getString("description"));
        item.set("price", interaction.options.getNumber("price"));
        item.set(
            "quickAccess",
            interaction.options.getBoolean("quick-access")
        );
        item.set(
            "ownMultiple",
            interaction.options.getBoolean("own-multiple")
        );

        if (String(item.get("name")).length > 25) {
            return await ErrorEmbed(
                interaction,
                "The item name cannot exceed 25 characters. You attempted to use ``" +
                String(item.get("name")).length +
                "`` characters.",
                true,
                false
            );
        }
        await business.addItem(item);
        const embed = await SimpleEmbed(
            interaction,
            "Item Added Successfully!",
            "The item was created successfully! The details are below!",
            "Green",
            item
        );
        await interaction.editReply({
            embeds: [embed],
        });
    }
};