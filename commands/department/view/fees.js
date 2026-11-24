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
            .setName("fees")
            .setDescription("View (all) department fees issued.")
            .addBooleanOption((viewallOption) =>
                viewallOption
                    .setName("view-all")
                    .setDescription("View all department issued fees?")
            )
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
                "Insufficient perms. Citation-Management permission level required."
            );
        }
        await interaction.deferReply();

        const guildManager = new GuildHQ(interaction)

        const viewAll = interaction.options.getBoolean("view-all");
        const feesCollection = await Department.getFees(viewAll).catch(
            async (err) => {
                console.warn(err);
                await ErrorEmbed(this.interaction, err.message);
            }
        );

        if (viewAll) {
            let collection = [{}];

            for (const fee of feesCollection) {
                let client = await RetrieveData.userByIDENT(fee.client);
                client = await interaction.guild.members.fetch(client.id);
                let issuer = await RetrieveData.userByIDENT(fee.issuer);
                issuer = await interaction.guild.members.fetch(issuer.id);
                collection.push({
                    Client: client.user.username,
                    Fee: fee.fee,
                    Amount: fee.amount,
                    Issuer: issuer.user.username,
                });
            }

            const feeCSVcollection = await csvGenerator(
                ["Client", "Fee", "Amount", "Issuer"],
                collection
            );
            const depName = await Department.getName();
            const feesAttachment = new AttachmentBuilder(
                Buffer.from(feeCSVcollection),
                { name: `${depName}-Fees.csv` }
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
            interaction.followUp({ files: [feesAttachment] });

            return;
        }

        let feesFileds = "``Client | Fee | Amount | Issuer``\n";

        for (const fee of feesCollection) {
            let client = await RetrieveData.userByIDENT(fee.client);
            client = await interaction.guild.members.fetch(client.id);
            let issuer = await RetrieveData.userByIDENT(fee.issuer);
            issuer = await interaction.guild.members.fetch(issuer.id);

            feesFileds =
                feesFileds +
                `${client.user.username} | ${fee.fee
                } | ${await guildManager.formatMoney(fee.amount)} | ${issuer.user.username
                }\n`;
        }

        const feeEmbed = new EmbedBuilder()
            .setTitle(`${await Department.getName()} Issued Fees`)
            .setDescription(feesFileds)
            .setColor("Gold")
            .setTimestamp()
            .setFooter({
                text: `${interaction.guild.name} Economy System`,
                iconURL: interaction.guild.iconURL(),
            });

        interaction.editReply({ embeds: [feeEmbed] });
    }
};