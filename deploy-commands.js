const { REST } = require('@discordjs/rest');
const { Routes, Collection } = require('discord.js');
require('dotenv').config();

const loadCommands = require('./loaders/commandLoader');

const client = {
    commands: new Collection()
};

// Use the same loader as the bot
loadCommands(client);

// Extract slash command definitions
const commands = [...client.commands.values()]
    .map(command => command.data.toJSON());

const rest = new REST({ version: '10' })
    .setToken(process.env.token);

(async () => {
    try {
        console.log(`Refreshing ${commands.length} application commands.`);

        const data = await rest.put(
            Routes.applicationCommands(process.env.clientid),
            { body: commands }
        );

        console.log(`Loaded ${data.length} application commands.`);
    } catch (err) {
        console.error(err);
    }
})();