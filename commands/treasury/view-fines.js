const {
    EmbedBuilder, AttachmentBuilder,
} = require("discord.js");
const { ErrorEmbed } = require("../../utils/embedUtil");
const { RetrieveData, PermManager, DepartmentHQ, GuildHQ } = require("../../dataCrusher/Headquarters");
const { csvGenerator } = require("../../utils/csvGenerator");

module.exports = {
    configure(subcommand) {
        return subcommand
            .setName('view-fines')
            .setDescription('View all department unpaid fines.')
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

        await interaction.deferReply()

        const guildManager = new GuildHQ(interaction);

        const citationCollection = await Treasury.getCitations({ raw: true });
        console.log(citationCollection)

        if (citationCollection.length > 30) {

            let collection = [{}]

            for (const cite of citationCollection) {
                let Department = await new DepartmentHQ(interaction, cite.department)
                const depName = await Department.getName()
                let violatorID = await RetrieveData.userByIDENT(cite.violator);
                let issuerID = await RetrieveData.userByIDENT(cite.issuer)
                let violator = null, issuer = null;

                try {
                    violator = await interaction.guild.members.fetch(violatorID.id)
                    issuer = await interaction.guild.members.fetch(issuerID.id)

                } catch (e) {
                    console.log("Returning due to unknown member");
                    console.log(e)
                    continue;
                }

                if (violator === null) { violator = { user: { username: "Member No Longer In Server" } } }
                if (issuer === null) { issuer = { user: { username: "Member No Longer In Server" } } }

                collection.push({ Department: depName, Violator: violator.user.username, Character: cite.character, RecordID: cite.cadRecordID, Amount: cite.amount, Issuer: issuer.user.username })
            }

            const citationCSVcollection = await csvGenerator(['Department', 'Violator', 'Character', 'RecordID', 'Amount', 'Issuer'], collection)
            const citationsAttachment = new AttachmentBuilder(Buffer.from(citationCSVcollection), { name: `${interaction.guild.name}-Citations.csv` })

            const csvEmbed = new EmbedBuilder()
                .setTitle('\\✅ Attaching CSV file now.')
                .setTimestamp()
                .setColor('Green')
                .setFooter({
                    text: `${interaction.guild.name} Economy System`, iconURL: interaction.guild.iconURL(),
                });

            await interaction.editReply({ embeds: [csvEmbed] })
            interaction.followUp({ files: [citationsAttachment] })

            return
        }

        let citationFileds = "``Department | Violator | Character | Record ID | Amount | Issuer``\n";

        for (const cite of citationCollection) {
            let Department = await new DepartmentHQ(interaction, cite.department)
            const depName = await Department.getName()
            let violatorID = await RetrieveData.userByIDENT(cite.violator);
            let issuerID = await RetrieveData.userByIDENT(cite.issuer)
            let violator = null, issuer = null;

            try {
                violator = await interaction.guild.members.fetch(violatorID.id)
                issuer = await interaction.guild.members.fetch(issuerID.id)

            } catch (e) {
                console.log("Returning due to unknown member");
                console.log(e)
                continue;
            }

            if (violator === null) { violator = { user: { username: "Member No Longer In Server" } } }
            if (issuer === null) { issuer = { user: { username: "Member No Longer In Server" } } }


            citationFileds = citationFileds + `${depName} | ${violator.user.username} | ${cite.character} | ${cite.cadRecordID} | ${await guildManager.formatMoney(cite.amount)} | ${issuer.user.username}\n`
        }

        const citeEmbed = new EmbedBuilder()
            .setTitle(`${interaction.guild.name} Server | Unpaid Fines`)
            .setDescription(citationFileds)
            .setColor('Greyple')
            .setTimestamp()
            .setFooter({
                text: `${interaction.guild.name} Economy System`, iconURL: interaction.guild.iconURL(),
            });

        interaction.editReply({ embeds: [citeEmbed] })
    }
};