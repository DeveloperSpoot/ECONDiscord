const {Interaction, EmbedBuilder, SlashCommandBuilder, Colors} = require("discord.js");
const {RetrieveData, CreateData} = require("../dataCrusher/Headquarters.js");
const {currentPromotion} = require("../utils/PromotionUtil");
const {GuildHQ} = require("../dataCrusher/Headquarters");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("balance")
        .setDescription("Retrieves your current balance or another user's balance.")
        .addUserOption((option) =>
            option.setName("user").setDescription("The user to check the balance of.")
        ),
    /**@param {Interaction} interaction*/ //Telling VSCode that this is a function
    async execute(interaction) {
        if (!interaction.guild) {
            return interaction.reply('This can only be used in a server!');
        }
        const memberToCheck =
            interaction.options.getMember("user") || interaction.member;
        const accounts = await RetrieveData.userBasicAccounts(interaction, memberToCheck);
        if (!accounts.bank) {
            return interaction.reply(
                "This person does not have any accounts registered to the economy!"
            );
        }

        const guildManager = new GuildHQ(interaction);
        const embed = new EmbedBuilder()
        .setTitle(`${memberToCheck.displayName}'s Balance`)
        .setDescription(
            "Here is the information that you requested. Use it wisely!"
        )
        .addFields([
            {name: "Bank", value: (await guildManager.formatMoney(accounts.bank.balance))},
            {name: "Wallet", value: (await guildManager.formatMoney(accounts.wallet.balance))}
        ])
            .setColor(Colors.Green)
            .setFooter({
                text: interaction.guild.name + " Economy System",
                iconURL: interaction.guild.iconURL(),
            });
        const ispremium = await guildManager.getPremiumStatus();

        if(ispremium){
            await interaction.reply({embeds: [embed]});
        }else{
            const promoEmbed = await currentPromotion(ispremium);
            await interaction.reply({embeds: [embed, promoEmbed]});
        }


    },
};
