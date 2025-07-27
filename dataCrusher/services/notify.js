const SQL = require("../Server");
const Discord = require("discord.js");
const TransactionHQ = require('./advTransaction')

const CentralFeqs = {Flag: '1077829583811903609', Inflation: '1077829583811903609', Authorize: '1077829583811903609'};
const CZFeqs = {Flag: '1062936569813684254', Inflation: '1062954607988445254', Authorize: '1062954849832013905'}
//BLUE #006EFFFF //GREEN #47de78 // ORANGE #d9a35c

async function sendDualNotification(interaction, FEQ, Message){
    return
    // if(interaction.guildId !== '901182775116300338' && interaction.guildId !== '541746859606147083'){return}
    // if(interaction.guildId == '901182775116300338'){
    //     const Channel = await interaction.guild.channels.fetch(CentralFeqs[FEQ]);
    //     console.warn("CHANNEL", Channel)
    //     return await Channel.send({embeds: [Message]});
    // }
    //
    // const Central = interaction.client.guilds.cache.get("975399648070099007");
    //
    // const CZCh = await interaction.guild.channels.fetch(CZFeqs[FEQ]);
    //
    // // await CentralCH.send({embeds: [Message]});
    // await CZCh.send({embeds: [Message]});
}

module.exports = {
    serverJoin: async (guild, client)=>{
        const embed = new Discord.EmbedBuilder()
            .setColor("#7fd100")
            .setTitle("Server Added")
            .addFields([
                {name: "Server", value: String(guild.name), inline: true},
                {name: "Members", value: String(guild.memberCount), inline: true},

            ])
            .setTimestamp()
            .setFooter({
                text: `Server ID: ${guild.id} `, iconURL: guild.iconURL(),
            })

       const server = await client.guilds.cache.get("716542987898716181");
       const ch = await server.channels.fetch("1398816732700737596")
        ch.send({embeds: [embed]})
    },
    serverLeave: async (guild, client)=>{
        const embed = new Discord.EmbedBuilder()
            .setColor("#ff2222")
            .setTitle("Server Removed")
            .setDescription('All Data Has Been Deleted For This Server.')
            .addFields([
                {name: "Server", value: String(guild.name), inline: true},
                {name: "Members", value: String(guild.memberCount), inline: true},

            ])
            .setTimestamp()
            .setFooter({
                text: `Server ID: ${guild.id} `, iconURL: guild.iconURL(),
            })

        const server = await client.guilds.cache.get("716542987898716181");
        const ch = await server.channels.fetch("1398816732700737596")
        ch.send({embeds: [embed]})
    },
    flagNotification: async (interaction, transaction)=>{
        return;
        // let Info;
        // if (transaction.creditType && transaction.debitType) {
        //     Info = await TransactionHQ.getAccount(interaction, transaction, true);
        // } else {
        //     Info = await TransactionHQ.getBasicName(interaction, transaction)
        // }
        // const embed = new Discord.EmbedBuilder()
        //     .setColor("#ffa929")
        //     .setTitle("Transaction Flagged")
        //     .addFields([
        //         {name: "Credit", value: Info.creditName, inline: true},
        //         {name: "Debit", value: Info.debitName, inline: true},
        //         {name: "Amount", value: transaction.amount, inline: true}
        //
        //     ])
        //     .setTimestamp()
        //     .setFooter({
        //         text: `${interaction.guild.name}`, iconURL: interaction.guild.iconURL()
        //     });
        // return await sendDualNotification(interaction,"Flag", embed);
        },
    inflationNotification: async(interaction, amount)=>{
        return;
        // const embed = new Discord.EmbedBuilder()
        //     .setColor("#ff5b24")
        //     .setTitle("ECONOMY INFLATED")
        //     .setDescription(`The ${interaction.guild.name} Economy has been inflated by $${amount} by ${interaction.user} (${interaction.user.username}).`)
        //     .setTimestamp()
        //     .setFooter({
        //         text: `${interaction.guild.name}`, iconURL: interaction.guild.iconURL()
        //     });
        // return await sendDualNotification(interaction,"Inflation", embed);
    },
    authoirzationNotification: async(interaction, user)=>{
        return
        // const embed = new Discord.EmbedBuilder()
        //     .setColor("#ff1100")
        //     .setTitle("USER AUTHORIZED")
        //     .setDescription(`${user} (${user.username}) has been **authorized** by ${interaction.user} (${interaction.user.username}).`)
        //     .setTimestamp()
        //     .setFooter({
        //         text: `${interaction.guild.name}`, iconURL: "https://media.giphy.com/media/3og0IOa1X349KZ8E1i/giphy.gif"
        //     });
        // return await sendDualNotification(interaction,"Authorize", embed);
    }
}
