require('dotenv').config();
const SQL = require("./dataCrusher/Server");

(async () => {
    try {
        await SQL.authenticate()
        console.log("Connection established successfully.")
    } catch (err) {
        console.log("Unable to establish connection:", err)
    }
    /***************************************************************************************************************
     * INFO: If sync ever fails, ensure to drop (delete) any enums in the database (through intellij, under object types).
     **************************************************************************************************************/
    try {
        // await SQL.sync({ force: true });
        // await SQL.models.Accounts.sync();
     //   await SQL.models.Inventory.sync({alter: true})
     //    await SQL.models.Department.sync()
     //    await SQL.models.DepartmentRoles.sync()
     //       await SQL.models.DepartmentMembers.sync()
     //    await SQL.models.Citation.sync()
     //     await SQL.models.Fee.sync()
         //await SQL.models.Guilds.sync({alter: true})
        // await SQL.models.Guilds.sync(.sync({alter: true})
        // await SQL.models.GuildMembersc({alter:true})
     //    await SQL.sync({force: true})
     //    await SQL.models.AdvTransactionLogs.sync({force: true})
     //    await SQL.models.Shift.sync({alter: true})
     //   await SQL.models.RolePay.sync({alter: true})
       //  await SQL.models.Accounts.sync({alter: true})
       //  console.log("Database has been synced successfully.")
    }catch(err){
        console.log("Unable to sync database:", err)
    }

    // try {
    //    const b = await Guilds.create({
    //         IDENT: "901182775116300338",
    //         balance: 0.00,
    //         loggingChannel: null
    //     })
    //
    //      console.log("Data successfully created.", b.get())
    // }catch(err){
    //     console.log(err)
    // }
})()

require('./deploy-commands.js')
const fs = require("node:fs");
const path = require("node:path");
const fetch = require("node-fetch");
const {Client, Collection, GatewayIntentBits, Partials, InteractionType, WebhookClient, EmbedBuilder, ButtonBuilder,
    ButtonStyle, ActionRowBuilder, MessageFlags
} = require("discord.js");
const {Guilds, DiscordUsers, GuildMembers, ModalAccounts} = require("./dataCrusher/models/Modals");
const {RetrieveData, UpdateData, UserHQ} = require("./dataCrusher/Headquarters");
const {activeCleanUp, preimumCache} = require("./dataCrusher/Headquarters").CacheManager;
const Entanglement = require("./dataCrusher/services/entanglement")

const {ErrorEmbed} = require("./utils/embedUtil");
const {serverJoin, serverLeave} = require("./dataCrusher/services/notify");
const {request} = require("undici");
require("dotenv").config();

const client = new Client({intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers], partials: [Partials.Channel]});

client.commands = new Collection();
const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs
    .readdirSync(commandsPath)
    .filter((file) => file.endsWith(".js"));

const eventsPath = path.join(__dirname, "events");
const eventFiles = fs
    .readdirSync(eventsPath)
    .filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    client.commands.set(command.data.name, command);
}

/*
    PREIMUM COMMANDS LIST
    ["quick-sell", "set-currency", "set-payroll-tax", "set-sales-tax"
 */
let preimumCMDS = ["quick-sell", "set-currency", "set-payroll-tax", "set-sales-tax", "inflate", "deflate"];
let serverbypass = (process.env.serverbypass).split(", ") // Bypasses premium checks. Format: "serverid, serverid"

client.on("interactionCreate", async interaction => {
    if (interaction.isAutocomplete()) return;

    const OGInteraction = interaction;
    let AlteredInteraction = OGInteraction;

    const ETG = new Entanglement(OGInteraction);
    const ETG_IDENT = await ETG.getEntanglement()

    if(ETG_IDENT != false){
        AlteredInteraction.IDENT = ETG_IDENT;
    }else{
        AlteredInteraction.IDENT = OGInteraction.guildId;
    }

    if(await activeCleanUp.get(interaction.guild?.id) && interaction.guild !== null){
        return await ErrorEmbed(interaction, '**Unable to perform commands while server cleanup is in progress.**\n To prevent inaccuracies of the server balance, all commands in the server are disabled. Try again in a few minutes.', false, false)
    }
    if (interaction.type !== InteractionType.ApplicationCommand) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) return;

    let subCommandProvided = false;

    try{
        interaction.options.getSubcommand();
        subCommandProvided = true;
    }catch(er){
        subCommandProvided = false;
    }

    let accessGranted = true;
    let accessUnknown = false;

    if(subCommandProvided && preimumCMDS.includes(interaction.options.getSubcommand()) && !serverbypass.includes(interaction.guildId)){
        let discordPremium = interaction.entitlements.filter(sku => sku.guildId === interaction.guildId && sku.isActive() && sku.deleted === false && sku.skuId === "1260839276069785653");
        if(discordPremium.size !== 0){
            accessUnknown = false;
            accessGranted = true;
        } else {
        accessGranted = false    
        }
    }

    if(!accessGranted){
        const action = new ButtonBuilder()
            .setStyle(ButtonStyle.Link)
            .setURL("https://discord.com/application-directory/1077139728538812416/store/1260839276069785653")
            .setLabel("Upgrade To Premium");

        const row = new ActionRowBuilder()
            .addComponents(action)
        const premiumNotice = new EmbedBuilder()
            .setColor('#2B2D31')
            .setTitle("Premium Command")
            .setURL("https://discord.com/application-directory/1077139728538812416/store/1260839276069785653")
            .setColor("Blue")
            .setDescription("This Command Is ONLY Available To Our **Premium Members**. To Gain Access To This Command, The Server Must Subscribe.")
        await interaction.reply({embeds: [premiumNotice], components: [row]});
        return
    }

    let numberOption;
    try {
        const Registered = await RetrieveData.user(interaction, interaction.user.id);

        if(interaction.commandName !== 'register' && Registered?.presence === "INACTIVE") {
            return await ErrorEmbed(interaction, `Welcome back to **${interaction.guild.name}**! Please Re-register to gain access to commands. To register, please run \`\`/register\`\`.`, false, false)

        }

        if (!Registered && interaction.commandName !== 'register' && interaction.commandName !== 'help') {
            return await ErrorEmbed(interaction, 'You must be registered to use commands. To register, please run ``/register``.', false, false)
        }
        let userOption = null;
        for (const op of interaction.options.data) {
            if (op.options) {
                for (const Op of op.options) {
                    if(Op.options){
                        for (const subOp of Op.options){
                            if (subOp.type === 10) {
                                numberOption = subOp.value;
                            }
                            if (subOp.type === 6) {
                                userOption = subOp.value;
                            }
                        }
                    }
                    if (Op.type === 10) {
                        numberOption = Op.value;
                    }
                    if (Op.type === 6) {
                        console.log(Op)
                        userOption = Op.value;
                    }
                }
            }
            if (op.type === 10) {
                numberOption = op.value;
            }
            if (op.type === 6) {
                console.log(op)
                userOption = op.value;
            }
        }

        if(numberOption && numberOption < 0){
            return await ErrorEmbed(interaction, `Number option may not be negative!`, false, false)
        }

        if (userOption) {

            const user = await RetrieveData.user(interaction, userOption);
            if (!user) {

                return await ErrorEmbed(interaction, `Requested user (<@${userOption}>) must be registered.`, false, false)
            }
        }
        await command.execute(AlteredInteraction);
    } catch (error) {
        console.error(error);
        await ErrorEmbed(interaction, error.message, false, false)
    }

});

client.on("interactionCreate", async interaction => {
    if (!interaction.isAutocomplete()) return;

    const OGInteraction = interaction;
    let AlteredInteraction = OGInteraction;

    const ETG = new Entanglement(OGInteraction);
    const ETG_IDENT = await ETG.getEntanglement()

    if(ETG_IDENT != false){
        AlteredInteraction.IDENT = ETG_IDENT;
    }else{
        AlteredInteraction.IDENT = OGInteraction.guildId;
    }

    const command = client.commands.get(interaction.commandName);

    let subCommandProvided = false;

    try{
        interaction.options.getSubcommand();
        subCommandProvided = true;
    }catch(er){
        subCommandProvided = false;
    }

    let accessGranted = true;
    let accessUnknown = false;

    if(subCommandProvided && preimumCMDS.includes(interaction.options.getSubcommand()) && !serverbypass.includes(interaction.guildId)){
        let discordPremium = interaction.entitlements.filter(sku => sku.guildId === interaction.guildId && sku.isActive() && sku.deleted === false && sku.skuId === "1260839276069785653");
        if(discordPremium.size !== 0){
            accessUnknown = false;
            accessGranted = true;
        } else {
        accessGranted = false    
        }
    }

    if(!accessGranted){
        const action = new ButtonBuilder()
            .setStyle(ButtonStyle.Link)
            .setURL("https://discord.com/application-directory/1077139728538812416/store/1260839276069785653")
            .setLabel("Upgrade To Premium");

        const row = new ActionRowBuilder()
            .addComponents(action)
        const premiumNotice = new EmbedBuilder()
            .setColor('#2B2D31')
            .setTitle("Premium Command")
            .setColor("Blue")
            .setURL("https://discord.com/application-directory/1077139728538812416/store/1260839276069785653")
            .setDescription("This Command Is ONLY Available To Our **Premium Members**. To Gain Access To This Command, The Server Must Subscribe.")
        await interaction.reply({embeds: [premiumNotice], components: [row]});
        return;
    }

    if (!command) return;

    try {

        const Registered = await RetrieveData.user(interaction, interaction.user.id);
        if(interaction.commandName !== 'register' && Registered.presence === "INACTIVE") {
            return await ErrorEmbed(interaction, `Welcome back to **${interaction.guild.name}**! Please Re-register to gain access to commands. To register, please run \`\`/register\`\`.`, false, false)

        }
        if (!Registered && interaction.commandName !== 'register') {
            return await ErrorEmbed(interaction, 'You must be registered to use this command.', false, true)
        }
        await command.autocomplete(interaction);
    } catch (error) {
        console.error(error);
        await interaction.reply({
            content: "There was an error while executing this command!",
            flags: MessageFlags.Ephemeral,
        });
    }
});

// client.on('guildMemberRemove', async (member)=>{
//     console.warn('GuildMemberRemoveEVENT', member)
//     const UserAccs = await RetrieveData.userBasicAccounts(member).catch(err=> console.error(err));
//
//     if(UserAccs === null || Object.keys(UserAccs).length === 0) return
//
//     const accsNet = Number(UserAccs.bank.balance) + Number(UserAccs.wallet.balance);
//     await UpdateData.inactivateMember(null, UserAccs.bank.owner, UserAccs, member).catch(err=> console.error(err))
//
//     const Treasury = await RetrieveData.treasury(member.guild.id, true).catch(err=> console.error(err));
//     const newBal = Number(Treasury.balance)+Number(accsNet)
//
//     await UpdateData.treasuryBalance(member.guild.id, newBal).catch(err=> console.error(err))
//     console.warn('GuildMemberRemoveEVENT', 'Inactivated user.')
// })

client.on('guildCreate', async (guild)=>{
    try {
       const b = await Guilds.create({
            IDENT: guild.id,
            balance: 0.00,
            loggingChannel: null
        })

         console.log("SERVER-JOINED| Data successfully created.", b.get())
    await serverJoin(guild, client)

    }catch(err){
        console.log("SERVER-JOINED", err)
    }

})

client.on('guildDelete', async (guild)=>{
    try {
        await UpdateData.deleteServer(guild.id)
        console.warn('SERVER-REMOVED', ' Server has been removed.')

        await serverLeave(guild, client)
    }catch(e){
        console.error("SERVER-REMOVED", e)
    }
})

for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
    } else {
        client.on(event.name, (...args) => event.execute(...args));
    }
}

client.login(process.env.token);
