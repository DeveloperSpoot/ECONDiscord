const {RetrieveData, CreateData, UpdateData,GuildHQ,RevenueService} = require("../dataCrusher/Headquarters.js");
const {Interaction, SlashCommandBuilder, EmbedBuilder, Colors, MessageFlags} = require("discord.js");
const {NotificationHQ, BusinessHQ} = require("../dataCrusher/Headquarters");
const { LogGeneral } = require("../dataCrusher/services/guild");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("give")
        .setDescription("Moves money from your wallet to another entity.")
        .addSubcommand(subCmd =>
            subCmd.setName("to-business")
                .setDescription("Give money to a business entity.")
                .addStringOption(op => op.setName("business")
                    .setDescription("The business you want to give to.")
                    .setAutocomplete(true).setRequired(true))
                .addNumberOption(op => op.setName("amount")
                    .setDescription("The amount you wish to give.")
                    .setRequired(true))
                .addStringOption((option) =>
                    option.setName("memo").setDescription("The reason for the transaction.")
                )
        )
        .addSubcommand(cmd => cmd.setName("to-user").setDescription("Give money to a user.")
            .addUserOption((option) =>
                option
                    .setName("user")
                    .setDescription("The user to give the money to.")
                    .setRequired(true)
            )
            .addNumberOption((option) =>
                option
                    .setName("amount")
                    .setDescription("The amount of money to give.")
                    .setRequired(true)
            )
            .addStringOption((option) =>
                option.setName("memo").setDescription("The reason for the transaction or a note.")
            )
        ),
    async autocomplete(interaction){

        const focusedOption = interaction.options.getFocused(true);

        const Treasury = await RetrieveData.treasury(interaction.IDENT, false)

        switch(focusedOption.name){
            case 'department': {
                const choices = await Treasury.getDepartments({raw: true});
                if (choices.length === 0) {
                    return await interaction.respond([{
                        name: "Error, no departments exist in this economy.",
                        value: "Error"
                    }]);
                }
                const filtered = choices.filter(choice => {
                    return choice.name.toLowerCase().startsWith(focusedOption.value.toLowerCase())
                });
                await interaction.respond(
                    filtered.map(choice => ({name: choice.name, value: choice.IDENT})),
                );
            }break
            case 'business': {
                const choices = await RetrieveData.accountsByType(interaction, 'business')
                if (choices.length === 0) {
                    return await interaction.respond([{
                        name: "Error, no businesses exist in this economy.",
                        value: "Error"
                    }]);
                }
                const filtered = choices.filter(choice => {
                    return choice.name.toLowerCase().startsWith(focusedOption.value.toLowerCase())
                });
                await interaction.respond(
                    filtered.map(choice => ({name: choice.name, value: choice.IDENT})),
                );
            }break

        }
    },
    /**@param {Interaction} interaction*/ //Telling VSCode what the params of this function are.
    async execute(interaction) {
        if (!interaction.guild) {
            return interaction.reply('This can only be used in a server!');
        }

        const guildManager = new GuildHQ(interaction);
        const giver = interaction.member;
        const giverAccounts = await RetrieveData.userBasicAccounts(interaction, giver);

        if (!giverAccounts.wallet) {
            return interaction.reply({
                content: "You do not have any accounts registered to the economy!",
                flags: MessageFlags.Ephemeral,
            });
        }

        switch(interaction.options.getSubcommand()){
            case "to-user": {
                const memberToCheck = interaction.options.getMember("user");
                const receiverAccounts = await RetrieveData.userBasicAccounts(interaction, memberToCheck);
        
        
                await UpdateData.accountBalance(
                    interaction,
                    receiverAccounts.wallet.id,
                    giverAccounts.wallet.id,
                    interaction.options.getNumber("amount")
                )
                    .then(async (result) => {
                        if (result === "Insufficient Funds") {
                            return interaction.reply({
                                content: "You do not have enough money to give that amount!",
                                flags: MessageFlags.Ephemeral,
                            });
                        }
                        const embed = new EmbedBuilder()
                            .setTitle(`Transaction Complete`)
                            .setDescription(
                                "The transaction was completed successfully! The transaction details are below and the receiver will be notified."
                            )
                            .addFields([
                                {
                                    name: "Amount Given",
                                    value: (await guildManager.formatMoney(interaction.options.getNumber("amount")))
                                },
                                {name: "Memo", value: (interaction.options.getString("memo") || "No Reason Given")}
                            ])
                            .setColor(Colors.Green)
                            .setFooter({
                                text: interaction.guild.name + " Economy System",
                                iconURL: interaction.guild.iconURL(),
                            });
                       const Transaction =  await CreateData.basicTransaction(
                            interaction,
                            receiverAccounts.wallet.id,
                            giverAccounts.wallet.id,
                            interaction.options.getNumber("amount"),
                            interaction.options.getString("memo")
                        );
                        if(Transaction.amount >= 5000) { await NotificationHQ.flagNotification(interaction, Transaction);}
                        const User = interaction.options.getMember("user");
                        await interaction.reply({embeds: [embed], flags: MessageFlags.Ephemeral}).catch(e => console.log(e));
                        await LogGeneral(interaction, 'Green', 'Funds Issued', `<@${interaction.user.id}> issued funds to <@${User.id}>.`, {name: 'Amount', value: await guildManager.formatMoney(interaction.options.getNumber("amount")), inline: true}).catch(console.error);
                        await User
                            .send(
                                `${giver.displayName} gave you ${await guildManager.formatMoney(
                                    interaction.options.getNumber("amount")
                                )} for ${
                                    interaction.options.getString("memo") || "no reason"
                                }!`
                            )
                            .catch(async (e) =>
                                interaction.channel.send(
                                    `<@${
                                        User.id
                                    }>, you have your DMs off for this server, which is why we are pinging you! \n > ${
                                        giver.displayName
                                    } gave you ${await guildManager.formatMoney(
                                        interaction.options.getNumber("amount")
                                    )} for ${
                                        interaction.options.getString("memo") || "no reason"
                                    }!`
                                )
                            );
                    });

                    break;
            }

            case 'to-business': {
                await interaction.deferReply();
                const amount = interaction.options.getNumber("amount");
                const customerAccounts = await RetrieveData.userBasicAccounts(interaction, interaction.member);
                const busIDENT = interaction.options.getString("business");

                const business = new BusinessHQ(interaction, busIDENT);
                const transactionStatus = await UpdateData.accountBalance(interaction, business.IDENT, customerAccounts.wallet.IDENT, amount);

                let susEmbed = new EmbedBuilder()
                .setColor("Green")
                 await CreateData.basicTransaction(
                    interaction,
                    business.IDENT,
                     customerAccounts.wallet.id,
                    interaction.options.getNumber("amount"),
                    interaction.options.getString("memo")
                );
                if(transactionStatus==="Insufficient Funds"){
                    susEmbed.setTitle("TRANSACTION ABORTED")
                    susEmbed.setDescription("The transaction was aborted due to Insufficient Funds. Make sure the funds are in your wallet.")
                    susEmbed.setColor('Red');
            
                    interaction.editReply({embeds: [susEmbed]})
                    return
                }

                const businessName = await business.getName();
                susEmbed.setTitle("Transaction Completed")
                susEmbed.setDescription(`Successfully paid the business ${await guildManager.formatMoney(amount)}`);

                await interaction.editReply({embeds: [susEmbed]})
                await LogGeneral(interaction, 'Green', 'Funds Issued', `<@${interaction.user.id}> issued funds to ${businessName}.`, {name: 'Amount', value: await guildManager.formatMoney(amount), inline: true}).catch(console.error);
                break
            }
        }
  
       
    },
};
