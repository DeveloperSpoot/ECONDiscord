const {
EmbedBuilder
} = require("discord.js");
const { ErrorEmbed } = require("../../../utils/embedUtil");
const { PermManager, GuildHQ } = require("../../../dataCrusher/Headquarters");


module.exports = {
    configure(subcommand) {
        return subcommand
            .setName("inflate")
            .setDescription("Inflates ALL prices of ALL items by the inputed percentage.")
            .addNumberOption(numOp =>
                numOp.setName("percentage-amount")
                    .setDescription("The percetnage of which you want to the prices to be inflated by.")
                    .setRequired(true)
            )
    },

    async execute(interaction) {

        if (interaction.IDENT !== interaction.guildId) {
            return await ErrorEmbed(interaction, "Sub Servers of an Entanglement may not manage the treasury. Treasury settings changes and interactions must be conducted on the main server.")
        }

        if (await PermManager.Treasury.checkAuthorization(interaction, interaction.user) == null && interaction.user.id !== interaction.guild.ownerId) {
            return await ErrorEmbed(
                interaction,
                "You are not authorized manage the Treasury."
            );
        }

        const guildManager = new GuildHQ(interaction);

        let amount = interaction.options.getNumber("percentage-amount");
        
                        try {
                            await interaction.deferReply();
                            await guildManager.inflatePrices(amount);
        
                            const successEmbed = new EmbedBuilder()
                                .setDescription(`Successfully inflated all item prices by **${amount}%**.`)
                                .setColor("Green");
        
                            return interaction.editReply({ embeds: [successEmbed] });
                        } catch (err) {
                            console.log(err)
                            return await ErrorEmbed(interaction, err.message, false, false)
                        }
    }
};