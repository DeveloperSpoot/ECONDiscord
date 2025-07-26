const {Interaction, EmbedBuilder, SlashCommandBuilder, Colors, MessageFlags} = require("discord.js");
//const RetrieveData = require("../dataCrusher/services/retrieve").retrieve
const {RetrieveData, CreateData} = require("../dataCrusher/Headquarters.js");
const {UserHQ, UpdateData} = require("../dataCrusher/Headquarters");
const {ErrorEmbed} = require("../utils/embedUtil");

module.exports = {
    //Building the command
    data: new SlashCommandBuilder()
        .setName("register")
        .setDescription("Registers user into the economy. Provides starting cash and creates accounts. "),

    async execute(interaction) {
        if (!interaction.guild) {
            return interaction.reply('This can only be used in a server!');
        }

        const accounts = await RetrieveData.userBasicAccounts(interaction, interaction.member); //Getting the user's accounts if they exist

        if (accounts === null || Object.keys(accounts).length === 0) {
            console.warn("Attempting to create user", accounts)
            //If no accounts exist, accounts are created
            await CreateData.user(interaction).catch(err=> console.error("User creation error", err));

            const bank = await CreateData.basicAccount(interaction, "personal-bank");
            console.warn("Bank created", bank)
            const wallet = await CreateData.basicAccount(interaction, "personal-wallet");
            console.warn("Wallet created", wallet)
            const embed = new EmbedBuilder()
                .setTitle("Welcome to the economy!")
                .setDescription("Here are your account details for future reference. Record them and keep them in a safe place. These are private and should only be used when paying for goods.")
                .addFields([
                    {name: "Bank Account ID", value: bank.get().IDENT},
                    {name: "Wallet Account ID", value: wallet.get().IDENT}
                ])
                .setColor(Colors.Blurple)
                .setFooter({
                    text: interaction.guild.name + " Economy System",
                    iconURL: interaction.guild.iconURL(),
                });
                const User = await new UserHQ(interaction, interaction.user.id);
                await User.claimStartingBalance();
               await interaction.reply({embeds: [embed], flags: MessageFlags.Ephemeral});
            return;
        } //If accounts exist already, the user is told they already have them along with their IDs
        const User = await new UserHQ(interaction, interaction.user.id);
        const UserIDENT = await User.getIDENT()
        const Presence = await User.getPresence()
        if(Presence === "INACTIVE"){
            await User.claimStartingBalance().catch(err=> {
                console.error(err)
                return  ErrorEmbed(interaction, err.message, false, false)
            });
            await UpdateData.memberPresence(UserIDENT, null).catch(err=> {
                console.error(err)
                return  ErrorEmbed(interaction, err.message, false, false)
            });
        }
        let embed = new EmbedBuilder()
            .setTitle("Welcome back to the economy!")
            .setDescription("Here are your account details for future reference. Record them and keep them in a safe place. These are private and should only be used when paying for goods.")
            .addFields([
                {name: "Bank Account ID", value: accounts.bank.id},
                {name: "Wallet Account ID", value: accounts.wallet.id}
            ])
            .setColor(Colors.Blurple)
            .setFooter({
                text: interaction.guild.name + " Economy System",
                iconURL: interaction.guild.iconURL(),
            });
        await interaction.reply({embeds: [embed], flags: MessageFlags.Ephemeral});
    },
};
