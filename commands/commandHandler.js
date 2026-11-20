const fs = require('node:fs');
const path = require('node:path');
const { SlashCommandBuilder } = require('discord.js');

module.exports = function createCommand(commandPath, metadata) {
    const subcommands = new Map();
    const groups = new Map();

    // Load direct subcommands
    for (const entry of fs.readdirSync(commandPath, { withFileTypes: true })) {
        if (entry.isFile() && entry.name.endsWith('.js') && entry.name !== 'index.js') {
            const name = path.basename(entry.name, '.js');
            subcommands.set(name, require(path.join(commandPath, entry.name)));
        }

        // Load subcommand groups
        if (entry.isDirectory()) {
            const groupPath = path.join(commandPath, entry.name);
            const groupIndex = path.join(groupPath, 'index.js');

            if (!fs.existsSync(groupIndex)) continue;

            const groupMetadata = require(groupIndex);
            const handlers = new Map();

            for (const file of fs.readdirSync(groupPath, { withFileTypes: true })) {
                if (file.isFile() && file.name.endsWith('.js') && file.name !== 'index.js') {
                    const name = path.basename(file.name, '.js');
                    handlers.set(name, require(path.join(groupPath, file.name)));
                }
            }

            groups.set(entry.name, {
                metadata: groupMetadata,
                handlers
            });
        }
    }

    // Build slash command automatically
    const data = new SlashCommandBuilder()
        .setName(metadata.name)
        .setDescription(metadata.description);

    for (const [name, handler] of subcommands) {
        data.addSubcommand(builder => handler.configure(builder));
    }

    for (const [name, group] of groups) {
        data.addSubcommandGroup(builder => {
            builder
                .setName(group.metadata.name)
                .setDescription(group.metadata.description);

            for (const [subcommandName, handler] of group.handlers) {
                builder.addSubcommand(builder => handler.configure(builder));
            }

            return builder;
        });
    }

    // Command Handler, routes the interactions to their actual command files, including autocomplete interactions.
    function getHandler(interaction) {
        const groupName = interaction.options.getSubcommandGroup(false);
        const subcommandName = interaction.options.getSubcommand();

        return groupName
            ? groups.get(groupName)?.handlers.get(subcommandName)
            : subcommands.get(subcommandName);
    }

    // Shared execution logic
    return {
        data,

        async execute(interaction) {
            const handler = getHandler(interaction);

            if (!handler) {
                throw new Error('Subcommand handler not found.');
            }

            return handler.execute(interaction);
        },

        async autocomplete(interaction) {
            const handler = getHandler(interaction);

            if (!handler?.autocomplete) {
                return interaction.respond([]);
            }

            return handler.autocomplete(interaction);
        }
    };
};