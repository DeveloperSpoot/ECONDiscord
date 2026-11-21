const {SimpleEmbed, ErrorEmbed} = require("../../../utils/embedUtil");

const {PermManager} = require("../../../dataCrusher/Headquarters");

const getActiveEntity = require("../../../DRY/getActiveEntity");
const {
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ComponentType,
} = require("discord.js");

module.exports = {
    configure(subcommand) {
        return subcommand
            .setName('add-employee')
            .setDescription('Add a new employee to your business and set their perms.')
            .addUserOption((option) =>
                option
                    .setName("user")
                    .setDescription("The person you would like to add to the team!")
                    .setRequired(true)
            )
    },

    async execute(interaction) {
        const {business, busName} = await getActiveEntity.Business(interaction);

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
        const menu = new StringSelectMenuBuilder()
            .setCustomId("permSelector")
            .setPlaceholder(
                "Please choose the permissions you would like to grant to this individual."
            );
        const perms = [
            {
                label: "Admin",
                description: "Has all of the abilities that the owner has.",
                value: "admin",
            },
            {
                label: "Manager",
                description: "Supervisor abilities plus item/staff management.",
                value: "manager",
            },
            {
                label: "Supervisor",
                description: "Lead abilities plus transaction management.",
                value: "supervisor",
            },
            {
                label: "Lead",
                description: "Can provide POS overrides.",
                value: "lead",
            },
            {
                label: "POS Access",
                description: "Can process transactions on the POS.",
                value: "pos",
            },
            {
                label: "View Only Access",
                description: "Can view company ledger and POS records.",
                value: "view-only",
            },
        ];
        menu.addOptions(perms);
        const row = new ActionRowBuilder();
        row.addComponents(menu);
        const embed = await SimpleEmbed(
            interaction,
            "Please select the permission level you would like to grant to " +
            interaction.options.getMember("user").displayName,
            null,
            "Green",
            null
        );
        await interaction.reply({
            embeds: [embed],
            components: [row],
        });
        const filter = (i) => {
            return i.user.id === interaction.user.id;
        };
        await interaction.channel
            .awaitMessageComponent({
                filter,
                componentType: ComponentType.SelectMenu,
                time: 60000,
            })
            .then(async (selection) => {
                if (selection.customId === "permSelector") {
                    const perms = new Map();
                    perms.set("level", selection.values[0]);
                    await business.hireEmployee(
                        interaction.options.getMember("user").user.id,
                        selection.values[0],
                        interaction.options.getMember("user")
                    );
                    const embed = await SimpleEmbed(
                        interaction,
                        "Employee Added Successfully!",
                        "The employee was added successfully!",
                        "Green",
                        null
                    );
                    await interaction.editReply({
                        embeds: [embed],
                        components: [],
                    });
                }
            })
            .catch((err) => console.log(err));
    }
};