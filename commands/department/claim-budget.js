const { ErrorEmbed } = require("../../utils/embedUtil");
const {
    RetrieveData,
    PermManager,
    GuildHQ
} = require("../../dataCrusher/Headquarters");
const discord = require("discord.js");
const getActiveEntity = require("../../DRY/getActiveEntity");

module.exports = {
    configure(subcommand) {
        return subcommand
            .setName("claim-budget")
            .setDescription(
                "Claim the allotted budget by treasury. A cooldown may be applicable."
            )
    },

    async execute(interaction) {

        const [Department, depName] = await getActiveEntity.Department(interaction)

        if (Department == null) return;


        if (
            (await PermManager.Department.checkPerm(
                interaction,
                Department,
                "Finance-Management"
            )) === false
        ) {
            return await ErrorEmbed(
                interaction,
                "Insufficient perms. Department-Management permission level required."
            );
        }

        await interaction.deferReply();

        const guildManager = new GuildHQ(interaction)

        let DepartmentBudget = await Department.getBudget();
        const MaxBal = await Department.getMaxBalance();

        const DepBalance = await Department.getBalance();

        let LastTime = await Department.getBudgetTimestamp();

        const Treasury = await RetrieveData.treasury(interaction.IDENT);
        const Timeout = Number(Treasury.budgetTimeout) * 60 * 60 * 1000;

        const TIMEOUTTIME = new Date(
            Number(Date.parse(LastTime)) + Number(Timeout)
        );
        const CurrentTime = new Date(Date.now());
        let alteredBudget = false;

        if (
            typeof MaxBal !== "undefined" &&
            MaxBal !== null &&
            Number(DepBalance) >= Number(MaxBal)
        ) {
            const DeclineEmebed = new discord.EmbedBuilder()
                .setTitle(`Could Not Claim The Allotted Budget.`)
                .setColor(discord.Colors["Red"])
                .setTimestamp()
                .setFooter({
                    text: `${interaction.guild.name} Economy System`,
                    iconURL: interaction.guild.iconURL(),
                })
                .setDescription(
                    `Unable to claim budget. The departments balance (${await guildManager.formatMoney(
                        DepBalance
                    )}) has reached the max balance allowed (\`\`${await guildManager.formatMoney(
                        MaxBal
                    )}\`\`).`
                );
            return interaction.editReply({ embeds: [DeclineEmebed] });
        }

        if (
            typeof MaxBal !== "undefined" &&
            MaxBal !== null &&
            Number(DepBalance) + Number(DepartmentBudget) > Number(MaxBal)
        ) {
            DepartmentBudget =
                Number(DepartmentBudget) -
                (Number(DepBalance) + Number(DepartmentBudget) - Number(MaxBal));
            alteredBudget = true;
        }

        if (Number(Treasury.balance) - Number(DepartmentBudget) < 0) {
            const DeclineEmebed = new discord.EmbedBuilder()
                .setTitle(`Could Not Claim The Allotted Budget.`)
                .setColor(discord.Colors["Red"])
                .setTimestamp()
                .setFooter({
                    text: `${interaction.guild.name} Economy System`,
                    iconURL: interaction.guild.iconURL(),
                })
                .setDescription(
                    "Unable to claim budget. Insufficient funds from the Treasury."
                );
            return interaction.editReply({ embeds: [DeclineEmebed] });
        }

        if (!LastTime || CurrentTime >= TIMEOUTTIME) {
            await Department.claimBudget().catch(async (err) => {
                console.error(err);
                return await ErrorEmbed(
                    interaction,
                    `An error occurred: ${err.message}`,
                    false,
                    true
                );
            });
            const SucessfulEmebed = new discord.EmbedBuilder()
                .setTitle(`Claimed Budget`)
                .setColor(discord.Colors["Green"])
                .setTimestamp()
                .setFooter({
                    text: `${interaction.guild.name} Economy System`,
                    iconURL: interaction.guild.iconURL(),
                })
                .setDescription(
                    `You have claimed the allotted budget of ${await guildManager.formatMoney(
                        DepartmentBudget
                    )}.` +
                    " You can claim your budget again <t:" +
                    Math.floor(Number(Date.now() + Number(Timeout)) / 1000) +
                    ":R>."
                );

            if (alteredBudget === true) {
                SucessfulEmebed.setDescription(
                    `Due to the departments max balance, you have claimed a **limited** budget of ${await guildManager.formatMoney(
                        DepartmentBudget
                    )}` +
                    " You can claim your budget again <t:" +
                    Math.floor(Number(Date.now() + Number(Timeout)) / 1000) +
                    ":R>."
                );
            }

            return interaction.editReply({ embeds: [SucessfulEmebed] });
        }

        const DeclineEmebed = new discord.EmbedBuilder()
            .setTitle(`Could Not Claim Budget`)
            .setColor(discord.Colors["Red"])
            .setTimestamp()
            .setFooter({
                text: `${interaction.guild.name} Economy System`,
                iconURL: interaction.guild.iconURL(),
            })
            .setDescription(
                "Unable to claim the allotted budget. You may calim your budget again " +
                "<t:" +
                Math.floor((Number(LastTime) + Timeout) / 1000) +
                ":R>."
            );

        return interaction.editReply({ embeds: [DeclineEmebed] });
    }
};