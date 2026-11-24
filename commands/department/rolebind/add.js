const {
    SelectMenuBuilder,
    ActionRowBuilder,
    ComponentType,
    PermissionsBitField,
} = require("discord.js");
const { ErrorEmbed, SimpleEmbed } = require("../../../utils/embedUtil");
const { PermManager } = require("../../../dataCrusher/Headquarters");
const getActiveEntity = require("../../../DRY/getActiveEntity");

module.exports = {
    configure(subcommand) {
        return subcommand
            .setName("add")
            .setDescription(
                "Bind a discord role to a permission set and/or pay policies."
            )
            .addRoleOption((option) =>
                option
                    .setName("role")
                    .setDescription(
                        "The role you would like to bind to perms/pay policies."
                    )
                    .setRequired(true)
            )
    },

    async execute(interaction) {
        const [Department, depName] = await getActiveEntity.Department(interaction)

        if (Department == null) return;

        if (
            (await PermManager.Department.checkPerm(
                interaction,
                Department,
                "Department-Management"
            )) === false
        ) {
            return await ErrorEmbed(
                interaction,
                "Insufficient perms. Department-Management permission level required."
            );
        }
        const guildManager = new GuildHQ(interaction)
        const role = interaction.options.getRole("role");

        const highestRole = interaction.member.roles.highest;

        if (
            role.rawPosition >= highestRole.rawPosition &&
            !interaction.member.permissions.has(
                PermissionsBitField.Flags.Administrator
            )
        ) {
            return await ErrorEmbed(
                interaction,
                `Insufficient authority. <@&${role.id}>'s position is higher than your roles.`,
                true,
                false
            );
        }
        await interaction.deferReply();

        const menu = new SelectMenuBuilder()
            .setCustomId("permSelector")
            .setPlaceholder(
                "Please choose the permissions you would like to grant to this individual."
            )
            .setMinValues(1)
            .setMaxValues(6);

        const perms = [
            {
                label: "Department Management",
                description:
                    "Add role bindings, change description, links and payroll behavior",
                value: "Department-Management",
            },
            {
                label: "Payroll Management",
                description:
                    "Perform payrolls, review approved shift logs, adjust payrolls.",
                value: "Payroll-Management",
            },
            {
                label: "Shift Log Management",
                description: "Manage shift logs.",
                value: "Shift-Management",
            },
            {
                label: "Finance Management",
                description:
                    "View account ledger, issue department payments, request funding.",
                value: "Finance-Management",
            },
            {
                label: "Fine Management",
                description: "Issue Fines, review fines, delete fines.",
                value: "Citation-Management",
            },
            {
                label: "Submit Fines & Fees",
                description: "Submit Fines and Fees.",
                value: "Submit-Citations",
            }
        ];
        menu.addOptions(perms);
        const row = new ActionRowBuilder();
        row.addComponents(menu);
        const embed = await SimpleEmbed(
            interaction,
            `Select Permissions`,
            `Please select the permission level you would like to grant to <@&${role.id}>`,
            "Green",
            null
        );
        await interaction.editReply({
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
                    await Department.addRoleBind(role, selection.values);

                    // if(rolebindError){
                    //   return await ErrorEmbed(
                    //   interaction,
                    //   rolebindError.message,
                    //   false,
                    //   false
                    // );
                    // }
                    const embed = await SimpleEmbed(
                        interaction,
                        "Role Binded Successfully!",
                        `<@&${role.id}> was binded to department successfully.`,
                        "Green",
                        null
                    );
                    await interaction.editReply({
                        embeds: [embed],
                        components: [],
                    });
                }
            })
            .catch(async (err) => {
                if (
                    err.message ===
                    "Collector received no interactions before ending with reason: time"
                ) {
                    return await ErrorEmbed(
                        interaction,
                        `You did not select an option within the alotted amount of time.`,
                        false,
                        false
                    );
                }
                console.log(err);
            });

    }
};