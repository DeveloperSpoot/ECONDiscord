const discord = require("discord.js");
const {ActionRowBuilder, StringSelectMenuBuilder, ComponentType, ButtonBuilder, ButtonStyle} = require("discord.js");
function test(){}
exports.embedAction = async function (interaction, title, description, button) {
    const embed = new discord.EmbedBuilder()
        .setTitle(title)
        .setColor("Blue")
        .setDescription(description)
        .setTimestamp()
        .setFooter({
            text: `Unlock more with premium.`
        });

        const action = new ButtonBuilder()
			.setCustomId('action')
			.setLabel(button)
			.setStyle(ButtonStyle.Secondary);

		const cancel = new ButtonBuilder()
			.setCustomId('cancel')
			.setLabel('Cancel')
			.setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder()
    .addComponents(cancel, action)

    const respFilter = i => i.user.id === interaction.user.id;

    const response = await interaction.editReply({embeds: [embed], components: [row]})
    let ack = false;
    let allIsWell = false;
    
    try{
        const actionConfirmed = await response.awaitMessageComponent({filter: respFilter, time:7200_000})

        if(actionConfirmed.customId === "cancel"){ embed.setColor("Orange").setDescription("Interaction cancelled by user."); await actionConfirmed.update({embeds: [embed], components: []}); ack=false; allIsWell=false;}
        else {
            ack = actionConfirmed;
            allIsWell = true;
        }

    }catch(e){
        console.log(e)

        if(e.message === "Collector received no interactions before ending with reason: time"){
            embed.setColor("Orange")
            .setDescription("This interaction has expired, please run the command again.")
            
            await interaction.editReply({embeds: [embed], components: []})
            return [ack, allIsWell];
        }

        embed.setColor("Red")
        .setDescription(`**ERROR:** ${e.message}`)

        await interaction.editReply({embeds: [embed], components: []})
    }

    return [ack, allIsWell];
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
        filter, componentType: ComponentType.SelectMenu, time: (1_000)
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
