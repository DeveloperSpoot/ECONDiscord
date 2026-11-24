const getActiveEntity = require("../../../DRY/getActiveEntity.js");
const { ErrorEmbed } = require("../../../utils/embedUtil.js");
const { PermManager, RetrieveData, GuildHQ, DepartmentHQ } = require("../../../dataCrusher/Headquarters.js");
const discord = require("discord.js");

module.exports = {
    configure(subcommand) {
        return subcommand
            .setName("department")
            .setDescription("Pay another department using department funds.")
            .addStringOption((option) =>
                option
                    .setName("department")
                    .setDescription("The department you wish to pay.")
                    .setAutocomplete(true)
                    .setRequired(true)
            )
            .addNumberOption((option) =>
                option
                    .setName("amount")
                    .setDescription("The amount you wish to payout.")
                    .setRequired(true)
            )
    },
    async autocomplete(interaction) {

        const { department } = await getActiveEntity.Department(interaction)

        if (department == null) return;

        const focusedOption = interaction.options.getFocused(true);

        switch (focusedOption.name) {
            case "department": {
                const Treasury = await RetrieveData.treasury(interaction.IDENT, false);
                const choices = await Treasury.getDepartments({ raw: true });
                if (choices.length === 0) {
                    return await interaction.respond([
                        {
                            name: "Error, no departments exist in this economy.",
                            value: "Error",
                        },
                    ]);
                }
                const filtered = choices.filter((choice) => {
                    return choice.name
                        .toLowerCase()
                        .startsWith(focusedOption.value.toLowerCase());
                });
                await interaction.respond(
                    filtered.map((choice) => ({ name: choice.name, value: choice.IDENT }))
                );
                break;
            }
        }
    },
    async execute(interaction) {

        const { business } = await getActiveEntity.Business(interaction)

        if (business == null) return;

        const guildManager = new GuildHQ(interaction);

        if (
            (await PermManager.Business.checkPerm(
                business,
                interaction,
                "supervisor"
            )) === false
        ) {
            return await ErrorEmbed(
                interaction,
                "Insufficient perms. Supervisor permission level required."
            );
        }

        await interaction.deferReply();

        if (
            Number(await business.getBalance()) -
            Number(interaction.options.getNumber("amount")) <
            0
        ) {
            const DeclineEmebed = new discord.EmbedBuilder()
                .setTitle(`Unable To Payout`)
                .setColor(discord.Colors["Red"])
                .setTimestamp()
                .setFooter({
                    text: `${interaction.guild.name} Economy System`,
                    iconURL: interaction.guild.iconURL(),
                })
                .setDescription(
                    "Unable to payout. Insufficient funds from the Business."
                );
            return interaction.editReply({ embeds: [DeclineEmebed] });
        }

        const department = await new DepartmentHQ(
            interaction,
            interaction.options.getString("department")
        );
        const dName = await department.getName();
        await business
            .payDepartment(department, interaction.options.getNumber("amount"))
            .catch(async (err) => {
                console.error(err);
                return await ErrorEmbed(
                    interaction,
                    `An error occurred: ${err.message}`,
                    false,
                    true
                );
            });
        const Emebed = new discord.EmbedBuilder()
            .setTitle(`Business To Department Payout Completed.`)
            .setColor(discord.Colors["Green"])
            .setTimestamp()
            .setFooter({
                text: `${interaction.guild.name} Economy System`,
                iconURL: interaction.guild.iconURL(),
            })
            .setDescription(
                `**${dName}** has been paid ${await guildManager.formatMoney(
                    interaction.options.getNumber("amount")
                )} using Department funds.`
            );
        interaction.editReply({ embeds: [Emebed] });
    }
};