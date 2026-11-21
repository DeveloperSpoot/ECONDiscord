const fs = require('node:fs');
const path = require('node:path');

const createCommand = require('../commands/commandHandler.js');

module.exports = function loadCommands(client) {
    const commandsPath = path.join(__dirname, '../commands');

    for (const entry of fs.readdirSync(commandsPath, { withFileTypes: true })) {
        // Existing standalone commands (pay.js, balance.js, etc.)
        if (entry.isFile() && entry.name.endsWith('.js')) {
            if (entry.name === 'commandHandler.js') continue;

            const command = require(path.join(commandsPath, entry.name));
            client.commands.set(command.data.name, command);
            continue;
        }

        // Directory-based commands (department/, business/, shift/)
        if (entry.isDirectory()) {
            const commandPath = path.join(commandsPath, entry.name);
            const indexPath = path.join(commandPath, 'index.js');

            if (!fs.existsSync(indexPath)) continue;

            const metadata = require(indexPath);
            console.log("Index Path: ", indexPath)
            console.log("meta: ", metadata)
            const command = createCommand(commandPath, metadata);

            client.commands.set(command.data.name, command);
        }
    }
};