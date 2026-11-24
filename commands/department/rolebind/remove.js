const {
    SelectMenuBuilder,
    ActionRowBuilder,
    ComponentType
} = require("discord.js");
const { ErrorEmbed, SimpleEmbed } = require("../../../utils/embedUtil");
const { PermManager } = require("../../../dataCrusher/Headquarters");
const getActiveEntity = require("../../../DRY/getActiveEntity");

module.exports = {
    configure(subcommand) {
        return subcommand
            .setName("remove")
            .setDescription(
                "Unbind a discord role from a permission set and/or pay policies."
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

        await interaction.deferReply();
        
        const Roles = await Department.getRoles();
        const menu = new SelectMenuBuilder()
            .setCustomId("roleSelector")
            .setPlaceholder("Please choose the role you would like disband.");
        const options = [];
        for (var key in Roles) {
         
            const data = Roles[key];
            const disRole = await interaction.guild.roles.fetch(Roles[key].id);
            if (!disRole) {
                continue;
            }
            options.push({
                label: disRole.name,
                description: `${String(data.permissions).substring(0, 47)}...`,
                value: key,
            });
        }
        if (options.length === 0) {
            return interaction.editReply(
                "No department roles exist in this economy!"
            );
        }
        menu.addOptions(options);
        const row = new ActionRowBuilder().addComponents(menu);
        await interaction.editReply({
            content:
                "Please choose the department role you would like to interact with.",
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
                if (selection.customId === "roleSelector") {
                    await Department.removeRoleBind(
                        interaction,
                        Roles[selection.values]
                    )

                    const embed = await SimpleEmbed(
                        interaction,
                        "Role Removed Successfully!",
                        `<@&${Roles[selection.values].id
                        }> was removed from the department successfully.`,
                        "Green",
                        null
                    );
                    await interaction.editReply({
                        embeds: [embed],
                        components: [],
                    });
                }
            })
            .catch(async (e) => {
                if (
                    e.message ===
                    "Collector received no interactions before ending with reason: time"
                ) {
                    return await ErrorEmbed(
                        interaction,
                        `You did not select an option within the alotted amount of time.`,
                        false,
                        false
                    );
                }
                await ErrorEmbed(
                    interaction,
                    `Error Message: ${e.message}`,
                    false,
                    false
                );
                console.log(e);
            });
    }
};