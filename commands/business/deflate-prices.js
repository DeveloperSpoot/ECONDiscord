const getActiveEntity = require("../../DRY/getActiveEntity");
const { ErrorEmbed } = require("../../utils/embedUtil");
const {PermManager} = require("../../dataCrusher/Headquarters")
const {
    EmbedBuilder,
} = require("discord.js");
module.exports = {
    configure(subcommand) {
        return subcommand
            .setName("deflate-prices")
            .setDescription(
                "Deflates all prices of items by the inputed percentage."
            )
            .addNumberOption((numOp) =>
                numOp
                    .setName("percentage-amount")
                    .setDescription(
                        "The percetnage of which you want to the prices to be deflated by."
                    )
                    .setRequired(true)
            )
    },

    async execute(interaction) {
        const [ business, busName ] = await getActiveEntity.Business(interaction)

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

        let amount = interaction.options.getNumber("percentage-amount");

        try {
            await interaction.deferReply();
            await business.deflatePrices(amount);

            const successEmbed = new EmbedBuilder()
                .setDescription(
                    `Successfully deflated item prices by **-${amount}%**.`
                )
                .setColor("Green");

            return interaction.editReply({ embeds: [successEmbed] });
        } catch (err) {
            console.log(err);
            return await ErrorEmbed(interaction, err.message, false, false);
        }
    }
};