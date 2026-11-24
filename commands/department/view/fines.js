const {
    EmbedBuilder,
    AttachmentBuilder,
} = require("discord.js");
const { ErrorEmbed } = require("../../../utils/embedUtil");
const {
    RetrieveData,
    PermManager,
    GuildHQ,
} = require("../../../dataCrusher/Headquarters");
const { csvGenerator } = require("../../../utils/csvGenerator");
const getActiveEntity = require("../../../DRY/getActiveEntity");

module.exports = {
    configure(subcommand) {
        return subcommand
            .setName("fines")
            .setDescription("View all department unpaid fines.")
    },

    async execute(interaction) {
        const [Department, depName] = await getActiveEntity.Department(interaction)

        if (Department == null) return;

        if (
            (await PermManager.Department.checkPerm(
                interaction,
                Department,
                "Citation-Management"
            )) === false
        ) {
            return await ErrorEmbed(
                interaction,
                "Insufficient perms. Fine-Management permission level required."
            );
        }

        await interaction.deferReply();

        const guildManager = new GuildHQ(interaction)

        const citationCollection = await Department.getCitations().catch(
            async (err) => {
                console.warn(err);
                await ErrorEmbed(this.interaction, err.message);
            }
        );

        if (citationCollection.length > 25) {
            let collection = [{}];

            for (const cite of citationCollection) {
                let violatorID = await RetrieveData.userByIDENT(cite.violator);
                let issuerID = await RetrieveData.userByIDENT(cite.issuer);
                let violator = null,
                    issuer = null;

                try {
                    violator = await interaction.guild.members.fetch(violatorID.id);
                    issuer = await interaction.guild.members.fetch(issuerID.id);
                } catch (e) {
                    console.log("Returning due to unknown member");
                    console.log(e);
                    continue;
                }

                if (violator === null) {
                    violator = { user: { username: "Member No Longer In Server" } };
                }
                if (issuer === null) {
                    issuer = { user: { username: "Member No Longer In Server" } };
                }

                collection.push({
                    Violator: violator.user.username,
                    Character: cite.character,
                    RecordID: cite.cadRecordID,
                    Amount: cite.amount,
                    Issuer: issuer.user.username,
                });
            }

            const citationCSVcollection = await csvGenerator(
                ["Violator", "Character", "RecordID", "Amount", "Issuer"],
                collection
            );
            const depName = await Department.getName();
            const citationsAttachment = new AttachmentBuilder(
                Buffer.from(citationCSVcollection),
                { name: `${depName}-Fines.csv` }
            );

            const csvEmbed = new EmbedBuilder()
                .setTitle("\\✅ Attaching CSV file now.")
                .setTimestamp()
                .setColor("Green")
                .setFooter({
                    text: `${interaction.guild.name} Economy System`,
                    iconURL: interaction.guild.iconURL(),
                });

            await interaction.editReply({ embeds: [csvEmbed] });
            interaction.followUp({ files: [citationsAttachment] });

            return;
        }

        let citationFileds =
            "``Violator | Character | Record ID | Amount | Issuer``\n";

        for (const cite of citationCollection) {
            let violatorID = await RetrieveData.userByIDENT(cite.violator);
            let issuerID = await RetrieveData.userByIDENT(cite.issuer);
            let violator = null,
                issuer = null;

            try {
                violator = await interaction.guild.members.fetch(violatorID.id);
                issuer = await interaction.guild.members.fetch(issuerID.id);
            } catch (e) {
                console.log("Returning due to unknown member");
                console.log(e);
                continue;
            }

            if (violator === null) {
                violator = { user: { username: "Member No Longer In Server" } };
            }
            if (issuer === null) {
                issuer = { user: { username: "Member No Longer In Server" } };
            }

            citationFileds =
                citationFileds +
                `${violator.user.username} | ${cite.character} | ${cite.cadRecordID
                } | ${await guildManager.formatMoney(cite.amount)} | ${issuer.user.username
                }\n`;
        }

        const citeEmbed = new EmbedBuilder()
            .setTitle(`${await Department.getName()} Unpaid Fines`)
            .setDescription(citationFileds)
            .setColor("White")
            .setTimestamp()
            .setFooter({
                text: `${interaction.guild.name} Economy System`,
                iconURL: interaction.guild.iconURL(),
            });

        interaction.editReply({ embeds: [citeEmbed] });
    }
};