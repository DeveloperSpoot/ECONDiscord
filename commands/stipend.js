const {Interaction, EmbedBuilder, SlashCommandBuilder, Colors} = require("discord.js");
const {ErrorEmbed} = require("../utils/embedUtil");
const {UserHQ, UpdateData, RetrieveData, GuildHQ} = require("../dataCrusher/Headquarters");
const discord = require("discord.js");
const {currentPromotion} = require("../utils/PromotionUtil");
const { LogGeneral } = require("../dataCrusher/services/guild");
module.exports = {
    data: new SlashCommandBuilder()
        .setName('stipend')
        .setDescription('claims the allotted stipend.'),
    async execute(interaction) {
        if (!interaction.guild) {
            return await ErrorEmbed(interaction, "This can only be used in a server!");
        }

        await interaction.deferReply();
        const MoneyFormat = new Intl.NumberFormat('en-us', {currency: 'USD', style: 'currency'})

        const User = new UserHQ(interaction, interaction.user.id);
        let LastTime = await User.getStipendTimestamp();
        const Treasury = await RetrieveData.treasury(interaction.IDENT);
        const Timeout = (Number(Treasury.stipendTimeout)* 60 * 60 *1000);
        const TIMEOUTTIME = new Date(Number(Date.parse(LastTime))+Number(Timeout))
        const CurrentTime = new Date(Date.now());
        const guildManager = new GuildHQ(interaction);
        const ispremium = await guildManager.getPremiumStatus();
        const promoEmbed = await currentPromotion(ispremium);

        if((Number(Treasury.balance) - Number(Treasury.stipend)<=0)){
            const DeclineEmebed = new discord.EmbedBuilder()
                .setTitle(`Could Not Claim Stipend`,)
                .setColor(discord.Colors['Red'])
                .setTimestamp()
                .setFooter({
                    text: `${interaction.guild.name} Economy System`, iconURL: interaction.guild.iconURL(),
                })
                .setDescription('Unable to claim Stipend. Insufficient funds from the Treasury.')

            if(ispremium){
                return interaction.editReply({embeds: [DeclineEmebed]});
            }
           return interaction.editReply({embeds: [DeclineEmebed, promoEmbed]});
        }

        if(!LastTime || CurrentTime >= TIMEOUTTIME){
            await UpdateData.accountStipend(interaction, User).catch(async err=>{
                console.error(err);
               return await ErrorEmbed(interaction, `An error occurred: ${err.message}`, false, true)
            })
            const SucessfulEmebed = new discord.EmbedBuilder()
                .setTitle(`Claimed Stipend`,)
                .setColor(discord.Colors['Green'])
                .setTimestamp()
                .setFooter({
                    text: `${interaction.guild.name} Economy System`, iconURL: interaction.guild.iconURL(),
                })

                .setDescription(`You have claimed a stipend of ${await guildManager.formatMoney(Treasury.stipend)}.`+ " You can claim again <t:"+ (Math.floor(Number((Date.now())+Number(Timeout))/1000)) + ":R>.")

            if(ispremium){
                await interaction.editReply({embeds: [SucessfulEmebed]})
            } else {
                await interaction.editReply({embeds: [SucessfulEmebed, promoEmbed]})
            }
            await LogGeneral(interaction, 'Green', 'Stipend Claimed', `<@${interaction.user.id}> claimed their stipend.`, {name: 'Amount', value: await guildManager.formatMoney(Treasury.stipend), inline: true}).catch(console.error);
            return;
        }

        const DeclineEmebed = new discord.EmbedBuilder()
            .setTitle(`Could Not Claim Stipend`,)
            .setColor(discord.Colors['Red'])
            .setTimestamp()
            .setFooter({
                text: `${interaction.guild.name} Economy System`, iconURL: interaction.guild.iconURL(),
            })
            .setDescription("Unable to claim stipend. You may claim again <t:"+(Math.floor((Number(Date.parse(LastTime))+Number(Timeout))/1000))+":R>.")

        if(ispremium){
            return interaction.editReply({embeds: [DeclineEmebed]})
        }
        return interaction.editReply({embeds: [DeclineEmebed, promoEmbed]})
    },
};