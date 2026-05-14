const discord = require("discord.js");
const {ActionRowBuilder, StringSelectMenuBuilder, ComponentType} = require("discord.js");

exports.SimpleEmbed = async function (interaction, title, description, color, fields) {
    const embed = new discord.EmbedBuilder()
        .setTitle(title)
        .setColor(discord.Colors[color])
        .setTimestamp()
        .setFooter({
            text: `${interaction.guild.name} Economy System`, iconURL: interaction.guild.iconURL(),
        });

    if (description != null) {
        embed.setDescription(description)
    }

    if (fields === null) {
        return embed
    }

    const newFields = []
    for (const field of fields) {
        newFields.push({name: `${field[0]}`, value: `${field[1]}`});
    }
    embed.setFields(newFields);
    return embed;
}

exports.ErrorEmbed = async function (interaction, description, emp, sendtoUser) {
    if(emp === true){emp = discord.MessageFlags.Ephemeral}
    if(emp === false){emp = null}
    if(sendtoUser === null){sendtoUser = false}
    const embed = new discord.EmbedBuilder()
        .setTitle('Error')
        .setDescription(description)
        .setColor(discord.Colors.Red)
        .setTimestamp();


    if(sendtoUser){
        try {
           await interaction.user.send({embeds: [embed]})
        } catch(error){
          return
        }
        return
    }

    if (interaction.deferred === true) {
        return await interaction.editReply({content: '', embeds: [embed], components: []});
    }


    if (interaction.isRepliable()) {

            return await interaction.reply({embeds: [embed], flags: emp});

    }
}

exports.SelectMenu = async function (interaction, thingToSelect, data) {
    let SELECTION = null;
    const menu = new StringSelectMenuBuilder()
        .setCustomId(`${thingToSelect}Selector`)
        .setPlaceholder("Please choose a " + thingToSelect + ".");
    menu.addOptions(data);
    const row = new ActionRowBuilder().addComponents(menu)
    await interaction.reply({
        content: `Please choose the ${thingToSelect} you would like to interact with.`, components: [row]
    });

    const filter = i => {
        return i.user.id === interaction.user.id;
    };
    await interaction.channel.awaitMessageComponent({
        filter, componentType: ComponentType.SelectMenu, time: 60000
    }).then(async selection => {
        const results = selection.values[0];

        if (selection.customId === `${thingToSelect}Selector`) {
            return SELECTION = results;
        }
    }).catch(e => interaction.editReply({
        content: 'You did not select an option within the allotted amount of time.', components: []
    }))
    return SELECTION
}
