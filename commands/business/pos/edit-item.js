const getActiveEntity = require("../../../DRY/getActiveEntity");
const { SimpleEmbed, ErrorEmbed } = require("../../../utils/embedUtil");
const { PermManager } = require("../../../dataCrusher/Headquarters");
const {
    EmbedBuilder
} = require("discord.js");

module.exports = {
    configure(subcommand) {
        return subcommand
            .setName('edit-item')
            .setDescription('Edit an item.')
            .setDescription("Edit an item.")
            .addStringOption((option) =>
                option
                    .setName("item")
                    .setRequired(true)
                    .setDescription("The item you wish to edit.")
                    .setAutocomplete(true)
            )
            .addStringOption((option) =>
                option
                    .setName("name")
                    .setDescription("The name of the item.")
                    .setRequired(false)
            )
            .addStringOption((option) =>
                option
                    .setName("description")
                    .setDescription("The description of the item. Be creative!")
                    .setRequired(false)
            )
            .addNumberOption((option) =>
                option
                    .setName("price")
                    .setDescription("The price of the item. Can include cents.")
                    .setRequired(false)
            )
            .addBooleanOption((option) =>
                option
                    .setName("own-multiple")
                    .setDescription(
                        "If true, the item can be added to the customer's inventory multiple times."
                    )
                    .setRequired(false)
            )
            .addBooleanOption((option) =>
                option
                    .setName("quick-access")
                    .setDescription(
                        "Should the item be accessible through quick access, allowing sellers to sell multiple items at once."
                    )
                    .setRequired(false)
            )
    },

    async autocomplete(interaction) {


        const [ business, busName ] = await getActiveEntity.Business(interaction)

        if (business == null) return;

        const MoneyFormat = new Intl.NumberFormat("en-us");
        const focusedOption = interaction.options.getFocused(true);

        switch (focusedOption.name) {

            case "item":
                {
                    const choices = await business.getAllItems();
                    const filtered = choices.filter((choice) => {
                        return choice.name
                            .toLowerCase()
                            .startsWith(focusedOption.value.toLowerCase());
                    });
                    await interaction.respond(
                        filtered
                            .map((choice) => {
                                if (String(choice.name).length > 25) {
                                    choice.name = String(choice.name).substring(0, 25);
                                }
                                return {
                                    name: `${choice.name} | ${MoneyFormat.format(choice.price)}`,
                                    value: choice.IDENT,
                                };
                            })
                            .slice(0, 20)
                    );
                }
                break;

        }
    },

    async execute(interaction) {
        const { business } = await getActiveEntity.Business(interaction)

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
        const Embed = new EmbedBuilder()
            .setColor("Green")
            .setTimestamp()
            .setFooter({
                text: `${interaction.guild.name} Economy System`,
                iconURL: interaction.guild.iconURL(),
            });

        const Item = interaction.options.getString("item");
        const Name = interaction.options.getString("name");
        const Desc = interaction.options.getString("description");
        const Price = interaction.options.getNumber("price");
        const QuickA = interaction.options.getBoolean("quick-access");
        const Multiple = interaction.options.getBoolean("own-multiple");

        let EmbedDesc = "";

        if (typeof Name !== "undefined" && Name !== null) {
            await business.editItem.name(Item, Name, business).catch((err) => {
                return ErrorEmbed(interaction, err.message, false, true);
            });

            EmbedDesc =
                EmbedDesc +
                "\n Successfully changed the item name to ``" +
                Name +
                "``.";
        }

        if (typeof Desc !== "undefined" && Desc !== null) {
            await business.editItem
                .description(Item, Desc, business)
                .catch((err) => {
                    return ErrorEmbed(interaction, err.message, false, true);
                });

            EmbedDesc =
                EmbedDesc +
                "\n Successfully changed the item description to ``" +
                Desc +
                "``.";
        }

        if (typeof Price !== "undefined" && Price !== null) {
            await business.editItem
                .price(Item, Price, business)
                .catch((err) => {
                    return ErrorEmbed(interaction, err.message, false, true);
                });

            EmbedDesc =
                EmbedDesc +
                "\n Successfully changed the item price to ``" +
                Price +
                "``.";
        }

        if (typeof Multiple !== "undefined" && Multiple !== null) {
            await business.editItem
                .ownMultiple(Item, Multiple, business)
                .catch((err) => {
                    return ErrorEmbed(interaction, err.message, false, true);
                });
            EmbedDesc =
                EmbedDesc +
                "\n Successfully changed the item owm-multiple setting to ``" +
                Multiple +
                "``.";
        }

        if (typeof QuickA !== "undefined" && QuickA !== null) {
            await business.editItem
                .quickAccess(Item, QuickA, business)
                .catch((err) => {
                    return ErrorEmbed(interaction, err.message, false, true);
                });
            EmbedDesc =
                EmbedDesc +
                "\n Successfully changed the item quick-access setting to ``" +
                QuickA +
                "``.";
        }

        Embed.setDescription(EmbedDesc);
        return interaction.editReply({ embeds: [Embed] });
    }
};