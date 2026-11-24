const { ErrorEmbed } = require("../../../utils/embedUtil");
const {
    PermManager,
    BusinessHQ,
    GuildHQ,
    RetrieveData
} = require("../../../dataCrusher/Headquarters");

const discord = require("discord.js");
const getActiveEntity = require("../../../DRY/getActiveEntity");

module.exports = {
    configure(subcommand) {
        return subcommand
            .setName("business")
            .setDescription("Pay a business using the department funds.")
            .addStringOption((option) =>
                option
                    .setName("business")
                    .setDescription("The business you wish to pay.")
                    .setRequired(true)
                    .setAutocomplete(true)
            )
            .addNumberOption((option) =>
                option
                    .setName("amount")
                    .setDescription("The amount you wish to payout.")
                    .setRequired(true)
            )
    },

    async autocomplete(interaction) {
        const [Department, depName] = await getActiveEntity.Department(interaction);

        if (Department == null) return;

        const focusedOption = interaction.options.getFocused(true);

        switch (focusedOption.name) {
            case "business":
                {
                    const choices = await RetrieveData.accountsByType(
                        interaction,
                        "business"
                    );
                    if (choices.length === 0) {
                        return await interaction.respond([
                            {
                                name: "Error, no businesses exist in this economy.",
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
                        filtered.map((choice) => ({
                            name: choice.name,
                            value: choice.IDENT,
                        }))
                    );
                }
                break;
        }
    },

    async execute(interaction) {

        const [Department, depName] = await getActiveEntity.Department(interaction)

        if (Department == null) return;

        if (
            (await PermManager.Department.checkPerm(
                interaction,
                Department,
                "Payroll-Management"
            )) === false
        ) {
            return await ErrorEmbed(
                interaction,
                "Insufficient perms. Department-Management permission level required."
            );
        }

        await interaction.deferReply();

        const guildManager = new GuildHQ(interaction);

        if (
            Number(await Department.getBalance()) -
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
                    "Unable to payout. Insufficient funds from the Department."
                );
            return interaction.editReply({ embeds: [DeclineEmebed] });
        }

        const business = await new BusinessHQ(
            interaction,
            interaction.options.getString("business")
        );
        const bName = await business.getName();
        await Department.payBusiness(
            business,
            interaction.options.getNumber("amount")
        ).catch(async (err) => {
            console.error(err);
            return await ErrorEmbed(
                interaction,
                `An error occurred: ${err.message}`,
                false,
                true
            );
        });
        const Emebed = new discord.EmbedBuilder()
            .setTitle(`Department Payout Completed.`)
            .setColor(discord.Colors["Green"])
            .setTimestamp()
            .setFooter({
                text: `${interaction.guild.name} Economy System`,
                iconURL: interaction.guild.iconURL(),
            })
            .setDescription(
                `**${bName}** has been paid ${await guildManager.formatMoney(
                    interaction.options.getNumber("amount")
                )} using Department funds.`
            );
        interaction.editReply({ embeds: [Emebed] });
    }
};