const getActiveEntity = require("../../../DRY/getActiveEntity");
const { SimpleEmbed, ErrorEmbed } = require("../../../utils/embedUtil");
const {PermManager, CreateData, UpdateData, GuildHQ } = require("../../../dataCrusher/Headquarters.js");
const mathUtils = require('../utils/mathUtils.js')

module.exports = {
    configure(subcommand) {
        return subcommand
            .setName("pay-business")
            .setDescription("Pay a business from business funds.")
            .addStringOption((op) =>
                op
                    .setName("business")
                    .setDescription("The business you want to pay.")
                    .setAutocomplete(true)
                    .setRequired(true)
            )
            .addNumberOption((option) =>
                option
                    .setName("amount")
                    .setDescription("The amount you would like to pay.")
                    .setRequired(true)
            )
            .addStringOption((option) =>
                option
                    .setName("reason")
                    .setDescription("Reason for payment.")
                    .setRequired(true)
            )
    },
    async autocomplete(interaction) {

        const { business } = await getActiveEntity.Business(interaction)

        if (business == null) return;

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

        const busSelected = interaction.options.getString("business");
        const businessToPay = new BusinessHQ(interaction, busSelected);
        const busName = await businessToPay.getName();
        const roundedAmt = mathUtils.Round(
            interaction.options.getNumber("amount")
        );

        await UpdateData.accountBalance(
            interaction,
            businessToPay.IDENT,
            business.IDENT,
            roundedAmt
        ).then(async (result) => {
            if (result === "Insufficient Funds") {
                return await ErrorEmbed(
                    interaction,
                    "Insufficient Funds. Transaction Cancelled."
                );
            }
            await CreateData.basicTransaction(
                interaction,
                businessToPay.IDENT,
                business.IDENT,
                roundedAmt,
                interaction.options.getString("reason")
            );

            const embed = await SimpleEmbed(
                interaction,
                "Payment Complete!",
                `Your payment of ${await guildManager.formatMoney(
                    roundedAmt
                )} to ${busName} processed successfully!`,
                "Green",
                null
            );
            interaction.editReply({
                content: "",
                embeds: [embed],
                components: [],
            });
        });
    }
};