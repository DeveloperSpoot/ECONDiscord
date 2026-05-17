const {Interaction, EmbedBuilder, SlashCommandBuilder, Colors, MessageFlags} = require("discord.js");
const {RetrieveData, BusinessHQ, CreateData, UpdateData, UserHQ, GuildHQ} = require("../dataCrusher/Headquarters.js");
const { ErrorEmbed } = require("../utils/embedUtil.js");
const { LogGeneral } = require("../dataCrusher/services/guild");

const MoneyFormat = new Intl.NumberFormat('en-us', {currency: 'USD', style: 'currency'})
module.exports = {
    data: new SlashCommandBuilder()
        .setName("fines")
        .setDescription("Command used to view and pay fines.")
        .addSubcommand((subCmd)=>
            subCmd.setName('view').setDescription('View your fines.'))
        .addSubcommand((subCmd)=>
            subCmd.setName('pay').setDescription('Pay a fine that was issued to you.')
            .addStringOption((stringOp)=>
            stringOp.setName('fine').setDescription('The fine you wish to pay.')
            .setRequired(true)
            .setAutocomplete(true))),
    async autocomplete(interaction){

        const focusedOption = interaction.options.getFocused(true);

        switch (focusedOption.name) {
            case "fine": {
                const User = new UserHQ(interaction, interaction.user.id);
                await User.getIDENT()

                const choices = await User.getCitations();

                if(choices === null){
                    return await interaction.respond([{
                        name: "You have no active citations.",
                        value: "Error"
                    }]);
                }
                const filtered = choices.filter(choice => {
                    if(choice.cadRecordID.startsWith(focusedOption.value)) return choice.cadRecordID.startsWith(focusedOption.value)
                    if(choice.character.toLowerCase().startsWith(focusedOption.value)) return choice.character.toLowerCase().startsWith(focusedOption.value)
                });
                const MoneyFormat = new Intl.NumberFormat('en-us')
                await interaction.respond(
                    filtered.map(choice => {
                        return ({name: `${choice.cadRecordID} | ${choice.character} | ${MoneyFormat.format(choice.amount)}`, value:choice.IDENT})
                    }).slice(0, 20)

                );
            }
                break
            case "other": {

            }
                break
        }
    },
    async execute(interaction) {
        const guildManager = new GuildHQ(interaction);
        switch (interaction.options.getSubcommand()){
            case 'view': {
                await interaction.deferReply({flags: MessageFlags.Ephemeral});
                const User = new UserHQ(interaction, interaction.user.id);
                await User.getIDENT()
                const userCitations = await User.getCitations();
                let desc = ""
                const Embed = new EmbedBuilder()
                .setColor('White')
                .setTimestamp()
                .setFooter({
                    text: `${interaction.guild.name} Economy System`, iconURL: interaction.guild.iconURL(),
                });

                if(userCitations === null || !userCitations || userCitations.length === 0){
                    return await ErrorEmbed(interaction, 'You do not have any active fines.')
                }
                
                for(const citation of userCitations){
                    const Issuer = await RetrieveData.userByIDENT(citation.issuer)
                    desc = desc + `\n **${citation.cadRecordID}** | **Issued By** <@${Issuer.id}> **Amount Due:**${await guildManager.formatMoney(citation.amount)}`
                } 
                Embed.setDescription(desc)
                interaction.editReply({embeds: [Embed]});

            }break
            case 'pay': {
                await interaction.deferReply();
                const Citation = interaction.options.getString('fine');

                const User = new UserHQ(interaction, interaction.user.id);
                const Accounts = await User.getBasicAccounts();
                
                const citationPromise = await User.payCitation(Citation, Accounts.wallet);

                if(citationPromise === 'Invalid'){
                    return await ErrorEmbed(interaction, `Invalid fine provided. Mae sure to select a valid fine from the autocomplete bar.`)
                }

                if(citationPromise === 'Insufficient Funds'){
                    return await ErrorEmbed(interaction, `Insufficient funds, please make sure funds are available in your wallet.`)
                }


                const SusEmebed = new EmbedBuilder()
                .setColor('Green')
                .setDescription(`You have successfully paid Fine \`\`${citationPromise.cadRecordID}\`\`. More details available on your personal ledger.`)
                .setTimestamp()
                .setFooter({
                    text: `${interaction.guild.name} Economy System`, iconURL: interaction.guild.iconURL(),
                });

                await interaction.editReply({embeds: [SusEmebed]});
                await LogGeneral(interaction, 'Green', 'Fine Paid', `<@${interaction.user.id}> paid a fine.`, {name: 'Amount', value: await guildManager.formatMoney(citationPromise.amount), inline: true}).catch(console.error);
            }break
        }
    },
};
