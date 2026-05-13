const {CheckStringForNumber} = require("../utils/mathUtils")
const {RetrieveData, CreateData, UpdateData, GuildHQ, Snapml} = require("../dataCrusher/Headquarters.js");
const {
    Interaction, EmbedBuilder, ButtonBuilder, ActionRowBuilder, ModalBuilder, TextInputBuilder, SlashCommandBuilder,
    Colors, ButtonStyle, TextInputStyle,
    AttachmentBuilder
} = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("atm")
        .setDescription(
            "Automated teller system allowing for quick withdrawals and deposits."
        ),
    /**@param {Interaction} interaction*/ //Defined the Param so that VSC displays context clues of this param. (Developer Purposes).
    async execute(interaction) {
        const Timestamp = new Date().getMilliseconds();
        if (!interaction.guild) {
            return interaction.reply("This can only be used in a server!");
        }
        const guildManager = new GuildHQ(interaction);
        const row = new ActionRowBuilder();
        const depositButton = new ButtonBuilder()
            .setCustomId(`deposit${Timestamp}`)
            .setLabel("Deposit")
            .setStyle(ButtonStyle.Success);

        const withdrawButton = new ButtonBuilder()
        .setCustomId(`withdraw${Timestamp}`)
        .setLabel(`Withdraw`)
        .setStyle(ButtonStyle.Danger);
        
        const balanceButton = new ButtonBuilder()
        .setCustomId(`balance${Timestamp}`)
        .setLabel("Balance")
        .setStyle(ButtonStyle.Primary);
        
        row.addComponents(depositButton, withdrawButton);

        const accts = await RetrieveData.userBasicAccounts(interaction, interaction.member);
        
        const newAtmImage = await Snapml.getATM(interaction.member.displayName, Number(accts.bank.balance).toLocaleString("en-US"), Number(accts.wallet.balance).toLocaleString("en-US"))
        const imgAttach = new AttachmentBuilder(newAtmImage, {name:"ECON_atm.png"})

        const atmEmbed = new EmbedBuilder()
            // .setTitle("ATM")
            .setImage("attachment://ECON_atm.png")
            // .setColor(Colors.Green)
            .setFooter({
                text: interaction.guild.name + " Economy System",
                iconURL: interaction.guild.iconURL(),
            });
        await interaction.reply({embeds: [atmEmbed], components: [row], files: [imgAttach]});

        const buttonFilter = (i) =>
            (i.customId === `deposit${Timestamp}` ||
                i.customId === `withdraw${Timestamp}` ||
                i.customId === `balance${Timestamp}`) &&
            i.user.id === interaction.user.id;

        //Added a second filter because the Modal has a different customID than Buttons which is needed so components are not mixed up.
        const modalFilter = (i) =>
            i.customId === `depositModal${Timestamp}` && i.user.id === interaction.user.id;

        const buttonCollector = interaction.channel.createMessageComponentCollector(
            {buttonFilter, idle: 120000}
        );


        buttonCollector.on("collect", async (i) => {
            if (
                (i.customId === `deposit${Timestamp}` || i.customId === `withdraw${Timestamp}`) &&
                i.user.id === interaction.user.id
            ) {
                const action = () => {
                    if (i.customId === `deposit${Timestamp}`) {
                        return "Deposit";
                    } else {
                        return "Withdrawal";
                    }
                };
                //prompt the user to enter the amount they would like to deposit in the form of a modal
                const depositModal = new ModalBuilder()
                    .setCustomId(`depositModal${Timestamp}`)
                    .setTitle(`Bank ${action()}`);

                const depositAmtInput = new TextInputBuilder()
                    .setCustomId(`depositAmtInput${Timestamp}`)
                    .setLabel(`Please Enter ${action()} Amount`)
                    .setPlaceholder("0.00")
                    .setRequired(true)
                    .setStyle(TextInputStyle.Short);

                const depositMemoInput = new TextInputBuilder()
                    .setCustomId(`depositMemoInput${Timestamp}`)
                    .setLabel(`Please Enter ${action()} Memo`)
                    .setPlaceholder("Enter a memo here")
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false);

                const depositAmtActionRow = new ActionRowBuilder().addComponents(
                    depositAmtInput
                );

                const depositMemoActionRow = new ActionRowBuilder().addComponents(
                    depositMemoInput
                );

                depositModal.addComponents([depositAmtActionRow, depositMemoActionRow]);

                await i.showModal(depositModal);

                i.awaitModalSubmit({
                    modalFilter,
                    time: 120000,
                })
                    .then(async (res) => {
                        await res.deferReply();
                        if (res.customId === `depositModal${Timestamp}`) {
                            const amt = res.fields.getTextInputValue(`depositAmtInput${Timestamp}`);
                            const memo = res.fields.getTextInputValue(`depositMemoInput${Timestamp}`);
                            if (!CheckStringForNumber(amt)) {
                                return res.followUp(
                                    "Transaction Failed Due To Invalid Amount Entered."
                                );
                            }
                            const amtFloat = amt;
                            if (amtFloat > 0) {
                              
                                let params = [res, accts.bank.id, accts.wallet.id, amtFloat, `WITHDRAW | ${memo||"No memo provided."}`];
                                if (action() === "Withdrawal") {
                                    params = [res, accts.wallet.id, accts.bank.id, amtFloat, `DEPOSIT | ${memo||"No memo provided."}`];
                                }

                                await UpdateData.accountBalance.apply(this, params).then(
                                    async (result) => {
                                        if (result === "Insufficient Funds") {
                                            return res.followUp(
                                                "Transaction Failed Due To Insufficient Funds"
                                            );
                                        }
                                        const depSuccess = new EmbedBuilder()
                                            .setTitle(`${action()} Successful`)
                                            .setDescription(
                                                `Your ${action().toLowerCase()} of ${await guildManager.formatMoney(amtFloat)} was successful!`
                                            )
                                            .setColor(Colors.Green)
                                            .setFooter({
                                                text: interaction.guild.name + " Economy System",
                                                iconURL: interaction.guild.iconURL(),
                                            });
                                        CreateData.basicTransaction.apply(this, params).then(
                                            (newTrans) => {
                                                if (!newTrans) {
                                                    return res.followUp(
                                                        "Transaction Failed Due To Internal Error."
                                                    );
                                                }
                                                res.followUp({
                                                    embeds: [depSuccess],
                                                    components: [],
                                                });
                                            }
                                        );
                                    }
                                );
                            }
                        }
                    })
                    .catch((e) => {
                        if (e.code === "InteractionCollectorError") {
                            return i.followUp(`<@${i.user.id}> You took longer than 2 minutes to respond, interaction timeout.`)
                        }

                    });
            }
            if (i.customId === `balance${Timestamp}` && i.user.id === interaction.user.id) {
           
                const embed = new EmbedBuilder()
                    .setTitle(`${i.member.displayName}'s Balance`)
                    .setDescription(
                        "Here is the information that you requested. Use it wisely!"
                    )
                    .addFields([
                        {name: "Bank", value: (await guildManager.formatMoney(accts.bank.balance))},
                        {name: "Wallet", value: (await guildManager.formatMoney(accts.wallet.balance))}
                    ])
                    .setColor(Colors.Green)
                    .setFooter({
                        text: interaction.guild.name + " Economy System",
                        iconURL: interaction.guild.iconURL(),
                    });
                await i.reply({embeds: [embed]});
            }
        });
    },
};