const {
    EmbedBuilder
} = require("discord.js");
const { ErrorEmbed } = require("../../../utils/embedUtil");
const { PermManager, RetrieveData, BusinessHQ, UserHQ, GuildHQ, EntanglementDrive } = require("../../../dataCrusher/Headquarters");

module.exports = {
    configure(subcommand) {
        return subcommand
            .setName('edit')
            .setDescription('Used to edit a selected business.')
            .addStringOption(stringOp =>
                stringOp.setName('business')
                    .setDescription('The business you wish to edit.')
                    .setAutocomplete(true)
                    .setRequired(true)
            )
            .addStringOption(stringOp =>
                stringOp.setName('name').setDescription('Edit the name of the business.').setRequired(false))
            .addStringOption(stringOp =>
                stringOp.setName('description').setDescription('Edit the description of the business.').setRequired(false))
            .addUserOption(userOp =>
                userOp.setName('owner').setDescription('Change the owner of the business').setRequired(false))
            .addBooleanOption((option) =>
                option.setName("selfserved").setRequired(false).setDescription("Wether or not users can buy items from this business directly on their own."))
            .addRoleOption(roleOp =>
                roleOp.setName('role').setDescription('Change the business role.').setRequired(false))
    },

    async autocomplete(interaction) {
        if (await PermManager.Treasury.checkAuthorization(interaction, interaction.user) == null && interaction.user.id !== interaction.guild.ownerId) {
            return await interaction.respond([{
                name: "Error, You are not authorized manage the Treasury.",
                value: "Error"
            }]);
        }
        const focusedOption = interaction.options.getFocused(true);

        switch (focusedOption.name) {

            case 'business': {
                const choices = await RetrieveData.accountsByType(interaction, 'business')
                if (choices.length === 0) {
                    return await interaction.respond([{
                        name: "Error, no businesses exist in this economy.",
                        value: "Error"
                    }]);
                }
                const filtered = choices.filter(choice => {
                    return choice.name.toLowerCase().startsWith(focusedOption.value.toLowerCase())
                });
                await interaction.respond(
                    filtered.map(choice => ({ name: choice.name, value: choice.IDENT })),
                );
            } break

        }

    },

    async execute(interaction) {

        if (interaction.IDENT !== interaction.guildId) {
            return await ErrorEmbed(interaction, "Sub Servers of an Entanglement may not manage the treasury. Treasury settings changes and interactions must be conducted on the main server.")
        }

        if (await PermManager.Treasury.checkAuthorization(interaction, interaction.user) == null && interaction.user.id !== interaction.guild.ownerId) {
            return await ErrorEmbed(
                interaction,
                "You are not authorized manage the Treasury."
            );
        }

        await interaction.deferReply();
        const Embed = new EmbedBuilder()
            .setColor('Green')
            .setTimestamp()
            .setFooter({
                text: `${interaction.guild.name} Economy System`, iconURL: interaction.guild.iconURL(),
            });

        const busIDENT = interaction.options.getString('business');
        const Name = interaction.options.getString('name');
        const Description = interaction.options.getString('description');
        const Owner = interaction.options.getUser('owner');
        const SelfServed = interaction.options.getBoolean('selfserved')
        const Role = interaction.options.getRole('role');

        const Business = await new BusinessHQ(interaction, busIDENT);

        let EmbedDesc = "";

        if (typeof Name !== "undefined" && Name !== null) {
            await Business.edit.name(Business, Name).catch(err => {
                return ErrorEmbed(interaction, err.message, false, true);
            });

            EmbedDesc = EmbedDesc + '\n Successfully changed the business name to ``' + Name + '``.'
        }

        if (typeof Description !== "undefined" && Description !== null) {
            await Business.edit.description(Business, Description).catch(err => {
                return ErrorEmbed(interaction, err.message, false, true);
            });

            EmbedDesc = EmbedDesc + '\n Successfully changed the business description to ``' + Description + '``.'
        }

        if (typeof Role !== "undefined" && Role !== null) {
            await Business.edit.role(Business, Role).catch(err => {
                return ErrorEmbed(interaction, err.message, false, true);
            });

            EmbedDesc = EmbedDesc + `\n Successfully changed the business role to ${Role}.`
        }

        if (typeof Owner !== "undefined" && Owner !== null) {
            const User = await new UserHQ(interaction, Owner.id);
            await User.getIDENT();
            await Business.edit.owner(Business, await User.getIDENT(), Owner).catch(err => {
                return ErrorEmbed(interaction, err.message, false, true);
            });

            EmbedDesc = EmbedDesc + `\n Successfully changed the business owner to ${Owner}.`

        }

        if (typeof SelfServed !== "undefined" && SelfServed !== null) {
            await Business.edit.selfServed(Business, SelfServed).catch(err => {
                return ErrorEmbed(interaction, err.message, false, true);
            });

            EmbedDesc = EmbedDesc + `\n Successfully changed the business SelfServed to ${SelfServed}.`

        }

        Embed.setDescription(EmbedDesc)
        return interaction.editReply({ embeds: [Embed] })


    }
};