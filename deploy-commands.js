const fs = require('node:fs');
const path = require('node:path');
const {REST} = require('@discordjs/rest');
const {Routes} = require('discord.js');
require("dotenv").config();

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    commands.push(command.data.toJSON());
}

const rest = new REST().setToken(process.env.token);

(async ()=>{
    try{
        console.log(`Refreshing ${commands.length} application commands.`)
        const data = await rest.put(
            Routes.applicationCommands(process.env.clientid),
            {body: commands}
        );
        
        console.log(`Loaded ${data.length} application commands`)
    }catch(err){
        console.error(err)
    }
})();


// rest.put(Routes.applicationGuildCommands(process.env.clientId, '975399648070099007'), {body: commands})
//     .then(() => console.log('Successfully registered application commands.'))
//     .catch(console.error);
// rest.put(Routes.applicationGuildCommands(process.env.clientId, '541746859606147083'), {body: commands})
//     .then(() => console.log('Successfully registered application commands for CZLC.'))
//     .catch(console.error);