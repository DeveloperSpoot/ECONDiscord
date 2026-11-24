const {
    MessageFlags
} = require("discord.js");
const { ErrorEmbed } = require("../../../utils/embedUtil");
const {
    PermManager,
    UserHQ,
    GuildHQ,
} = require("../../../dataCrusher/Headquarters");
const discord = require("discord.js");
const getActiveEntity = require("../../../DRY/getActiveEntity");

module.exports = {
    configure(subcommand) {
        return subcommand
            .setName("fine")
            .setDescription(
                "Issue a fine to a user, which is to be paid later."
            )
            .addUserOption((userOp) =>
                userOp
                    .setName("user")
                    .setDescription("The user you wish to issue a fine to.")
                    .setRequired(true)
            )
            .addStringOption((stringOp) =>
                stringOp
                    .setName("character")
                    .setDescription("The Roleplay character of the user.")
                    .setRequired(true)
            )
            .addStringOption((stringOp) =>
                stringOp
                    .setName("cad-record-id")
                    .setDescription("The cad record ID for the fine.")
                    .setRequired(true)
            )
            .addNumberOption((numberOp) =>
                numberOp
                    .setName("amount")
                    .setDescription("The amount of the fine you wish to issue.")
                    .setRequired(true)
            )
    },

    async execute(interaction) {
        const [Department, depName] = await getActiveEntity.Department(interaction)

        if (Department == null) return;

        if (
            (await PermManager.Department.checkPerm(
                interaction,
                Department,
                "Submit-Citations"
            )) === false
        ) {
            return await ErrorEmbed(
                interaction,
                "Insufficient perms. Submit-Fines permission level required."
            );
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });


        const guildManager = new GuildHQ(interaction)

        const Member = interaction.options.getUser("user");
        const citationID = interaction.options.getString("cad-record-id");
        const amount = interaction.options.getNumber("amount");
        const character = interaction.options.getString("character");

        const violator = await new UserHQ(interaction, Member.id);
        const issuer = await new UserHQ(interaction, interaction.user.id);

        const Citation = { citationID, character, violator, issuer, amount };

        await Department.issueCitation(Citation);

        const SusEmebed = new discord.EmbedBuilder()
            .setDescription(
                `You've been issued a fine from \`\`${await Department.getName()}\`\`. To pay this Fine, run \`\`/fines pay\`\`.`
            )
            .addFields([
                { name: "Cad Record ID", value: `${citationID}`, inline: true },
                { name: "Character", value: `${character}`, inline: true },
                { name: "Issuer", value: `${interaction.user}`, inline: true },
                { name: "Violator", value: `${Member}`, inline: true },
                {
                    name: "Amount",
                    value: `${await guildManager.formatMoney(amount)}`,
                    inline: true,
                },
            ])
            .setColor(discord.Colors["White"])
            .setTimestamp()
            .setFooter({
                text: `${interaction.guild.name} Economy System`,
                iconURL: interaction.guild.iconURL(),
            });

        await Member.send({ embeds: [SusEmebed] }).catch((err) => {
            SusEmebed.setDescription(
                `Unable to notify ${Member} due to their DMs being off.`
            );
        });

        SusEmebed.setDescription(
            `Successfully issued fine under \`\`${await Department.getName()}\`\`.`
        ).setColor("Green");
        interaction.editReply({ embeds: [SusEmebed] });
    }
};