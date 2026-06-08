const cron = require('node-cron');
const { Op } = require('sequelize');
const { EmbedBuilder } = require('discord.js');
const SQL = require('../Server');

async function formatMoney(guildId, amount) {
    const guildRecord = await SQL.models.Guilds.findByPk(guildId, { raw: true });
    const symbol = guildRecord?.customCurrency || '$';
    return `${symbol}${new Intl.NumberFormat('en-US').format(amount)}`;
}

function isDue(fee) {
    if (!fee.lastChargedAt) return true;
    const elapsedMs = Date.now() - new Date(fee.lastChargedAt).getTime();
    return elapsedMs >= fee.periodDays * 24 * 60 * 60 * 1000;
}

async function chargeFee(client, fee) {
    const violator = await SQL.models.GuildMembers.findByPk(fee.client, { raw: true });
    const department = await SQL.models.Department.findByPk(fee.department, { raw: true });
    if (!violator || !department) return;

    const bankAccount = await SQL.models.Accounts.findOne({
        where: { owner: fee.client, guild: fee.guild, type: 'personal-bank' }
    });
    if (!bankAccount) return;

    const discordGuild = client.guilds.cache.get(fee.guild);

    if (Number(bankAccount.balance) >= Number(fee.amount)) {
        const treasury = await SQL.models.Guilds.findByPk(fee.guild);

        await SQL.models.Accounts.update(
            { balance: Number(bankAccount.balance) - Number(fee.amount) },
            { where: { IDENT: bankAccount.IDENT } }
        );
        await SQL.models.Guilds.update(
            { balance: Number(treasury.balance) + Number(fee.amount) },
            { where: { IDENT: fee.guild } }
        );
        await SQL.models.AdvTransactionLogs.create({
            guild: fee.guild,
            amount: fee.amount,
            creditAccount: bankAccount.IDENT,
            debitAccount: fee.guild,
            creditType: "Account",
            debitType: "Treasury",
            memo: String(`${department.name} Recurring Fee For ${fee.fee}.`)
        }).catch(err => console.log(err));
        await SQL.models.Fee.update({ lastChargedAt: new Date() }, { where: { IDENT: fee.IDENT } });

        if (discordGuild) {
            const member = await discordGuild.members.fetch(violator.id).catch(() => null);
            if (member) {
                const embed = new EmbedBuilder()
                    .setColor("Orange")
                    .setTitle("Recurring Fee Charged")
                    .setDescription(`\`\`${department.name}\`\` has automatically deducted a recurring fee from your bank account.`)
                    .addFields(
                        { name: "Reason", value: fee.fee, inline: true },
                        { name: "Amount", value: await formatMoney(fee.guild, fee.amount), inline: true },
                        { name: "Next Charge", value: `In ${fee.periodDays} day(s)`, inline: true }
                    )
                    .setTimestamp();
                await member.send({ embeds: [embed] }).catch(() => {});
            }
        }
    } else {
        if (discordGuild) {
            const member = await discordGuild.members.fetch(violator.id).catch(() => null);
            if (member) {
                const embed = new EmbedBuilder()
                    .setColor("Red")
                    .setTitle("Recurring Fee — Charge Failed")
                    .setDescription(`\`\`${department.name}\`\` attempted to collect a recurring fee from your bank account, but your balance was insufficient. The charge will retry automatically tomorrow.`)
                    .addFields(
                        { name: "Reason", value: fee.fee, inline: true },
                        { name: "Amount Due", value: await formatMoney(fee.guild, fee.amount), inline: true },
                        { name: "Your Bank Balance", value: await formatMoney(fee.guild, bankAccount.balance), inline: true }
                    )
                    .setTimestamp();
                await member.send({ embeds: [embed] }).catch(() => {});
            }
        }
    }
}

async function runFeeUpdate(client) {
    const recurringFees = await SQL.models.Fee.findAll({
        where: { active: true, periodDays: { [Op.not]: null } },
        raw: true
    });

    for (const fee of recurringFees) {
        if (!isDue(fee)) continue;

        try {
            await chargeFee(client, fee);
        } catch (err) {
            console.error(`[FeeUpdate] Failed to process recurring fee ${fee.IDENT}:`, err);
        }
    }
}

function scheduleFeeUpdates(client) {
    cron.schedule('10 0 * * *', () => {
        runFeeUpdate(client).catch(err =>
            console.error('[FeeUpdate] Cron run failed:', err)
        );
    }, { timezone: 'UTC' });

    console.log('[FeeUpdate] Daily recurring fee charges scheduled for 00:10 UTC.');
}

module.exports = { scheduleFeeUpdates, runFeeUpdate };
