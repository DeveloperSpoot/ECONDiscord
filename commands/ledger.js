const {Interaction, EmbedBuilder, SlashCommandBuilder, Colors, AttachmentBuilder} = require("discord.js");
const {activeBusiness, activeDepartment} = require("../dataCrusher/Headquarters").CacheManager;
const {RetrieveData} = require("../dataCrusher/Headquarters.js");
const {ErrorEmbed} = require("../utils/embedUtil");
const {LedgerGenerator} = require("../utils/LedgerGenerator");
const {PermManager} = require("../dataCrusher/Headquarters");
module.exports = {
    data: new SlashCommandBuilder()
        .setName('ledger')
        .setDescription('Retrieves account(s) transactions and returns them as a PDF.')
        .addSubcommand(subcommand => subcommand.setName('business-ledger').setDescription('Ledgers business account(s).'))
        .addSubcommand(subcommand => subcommand.setName('personal-ledger').setDescription('Ledgers a personal account(s)'))
        .addSubcommand(subcommand => subcommand.setName('department').setDescription('Ledgers department account(s)'))
        .addSubcommand(subcommand => subcommand.setName('treasury').setDescription('Ledgers the Treasury account. Requires Auth.'))
        .addSubcommand(subcommand => subcommand.setName('user').setDescription('Ledgers the requested user accounts.')
            .addUserOption(option => option.setName('user').setDescription('The user you wish to ledger.').setRequired(true))),
    async execute(interaction) {
        if (!interaction.guild) {
            return await ErrorEmbed(interaction, "This can only be used in a server!");
        }

        switch(interaction.options.getSubcommand()){
            case 'business-ledger': {
                await interaction.deferReply({ ephemeral:true});
                if (await activeBusiness.get(`${interaction.IDENT}-${interaction.user.id}`) == null) {
                    return await ErrorEmbed(interaction, "Please select a business first by using /set business!");
                }
                const ADVdata = await RetrieveData.advAccountLedger(interaction, await activeBusiness.get(`${interaction.IDENT}-${interaction.user.id}`))
                const ledgerData = await RetrieveData.accountLedger(interaction, await activeBusiness.get(`${interaction.IDENT}-${interaction.user.id}`))
                const BUS = ADVdata.concat(ledgerData);
                const LedgerBus = await LedgerGenerator(interaction,await activeBusiness.get(`${interaction.IDENT}-${interaction.user.id}`), BUS)


                const attachBus = new AttachmentBuilder(Buffer.from(LedgerBus), {name: "Business-Ledger.csv"})

                interaction.editReply("Attaching Business Ledger now.", { flags: MessageFlags.Ephemeral })
                interaction.followUp( {files: [attachBus], flags: MessageFlags.Ephemeral })
                break;
            }
            case 'personal-ledger': {
                await interaction.deferReply({ ephemeral:true});
                const userAccounts = await RetrieveData.userBasicAccounts(interaction, interaction.member);

                const ADVbankLedger = await RetrieveData.advAccountLedger(interaction, userAccounts.bank.IDENT);
                const BASEbankLedger = await RetrieveData.accountLedger(interaction, userAccounts.bank.IDENT);
                const BankLedger = ADVbankLedger.concat(BASEbankLedger);

                const ADVwalletLedger = await RetrieveData.advAccountLedger(interaction, userAccounts.wallet.IDENT);
                const BASEwalletLedger = await RetrieveData.accountLedger(interaction, userAccounts.wallet.IDENT);
                const WalletLedger = ADVwalletLedger.concat(BASEwalletLedger);

                const LedgerBank = await LedgerGenerator(interaction,`BANK | ${userAccounts.bank.IDENT}`, BankLedger)
                const LedgerWallet = await LedgerGenerator(interaction, `WALLET | ${userAccounts.wallet.IDENT}`, WalletLedger)


                const attachBank = new AttachmentBuilder(Buffer.from(LedgerBank), {name: "Bank-Ledger.csv"})
                const attachWallet = new AttachmentBuilder(Buffer.from(LedgerWallet), {name: "Wallet-Ledger.csv"})

                interaction.editReply("Attaching both Wallet and Bank Ledgers now.", { flags: MessageFlags.Ephemeral })
                interaction.followUp( {files: [attachBank, attachWallet], flags: MessageFlags.Ephemeral })
                break;
            }
            case 'department': {
                await interaction.deferReply({ ephemeral:true});
                if (await activeDepartment.get(`${interaction.IDENT}-${interaction.user.id}`) == null) {
                    return await ErrorEmbed(interaction, "Please select a department first by using /set department!");
                }
                const ActiveDepartment = await activeDepartment.get(`${interaction.IDENT}-${interaction.user.id}`)

                const ledgerData = await RetrieveData.advAccountLedger(interaction, ActiveDepartment)
                const LedgerDep = await LedgerGenerator(interaction,`DEPARTMENT | ${ActiveDepartment}`, ledgerData)

                const attachDepartment = new AttachmentBuilder(Buffer.from(LedgerDep), {name: "Department-Ledger.csv"})

                interaction.editReply("Attaching department ledger now..", { flags: MessageFlags.Ephemeral })
                interaction.followUp( {files: [attachDepartment], flags: MessageFlags.Ephemeral })
                break;
            }
            case 'treasury': {
                if(await PermManager.Treasury.checkAuthorization(interaction, interaction.user) == null && interaction.user.id !== interaction.guild.ownerId){
                    return await ErrorEmbed(
                        interaction,
                        "You are not authorized to manage the Treasury."
                    );
                }
                await interaction.deferReply({ ephemeral:true});
                const ledgerData = await RetrieveData.advAccountLedger(interaction, interaction.IDENT)
                const LedgerDep = await LedgerGenerator(interaction,`TREASURY | ${interaction.IDENT}`, ledgerData)

                const attachTreasury = new AttachmentBuilder(Buffer.from(LedgerDep), {name: "Treasury-Ledger.csv"})

                interaction.editReply("Attaching Treasury ledger now..", { flags: MessageFlags.Ephemeral })
                interaction.followUp( {files: [attachTreasury], flags: MessageFlags.Ephemeral })
                break;
            }
            case 'user': {
                if(await PermManager.Treasury.checkAuthorization(interaction, interaction.user) == null && interaction.user.id !== interaction.guild.ownerId){
                    return await ErrorEmbed(
                        interaction,
                        "You are not authorized to manage the Treasury and thus not authorized to perform this action.."
                    );
                }
                await interaction.deferReply({ ephemeral:true});
                const UserToLedger = await interaction.options.getUser('user');
                UserToLedger.guild = {};
                UserToLedger.guild.id = interaction.IDENT

                const userAccounts = await RetrieveData.userBasicAccounts(interaction, UserToLedger);

                const ADVbankLedger = await RetrieveData.advAccountLedger(interaction, userAccounts.bank.IDENT);
                const BASEbankLedger = await RetrieveData.accountLedger(interaction, userAccounts.bank.IDENT);
                const BankLedger = ADVbankLedger.concat(BASEbankLedger);

                const ADVwalletLedger = await RetrieveData.advAccountLedger(interaction, userAccounts.wallet.IDENT);
                const BASEwalletLedger = await RetrieveData.accountLedger(interaction, userAccounts.wallet.IDENT);
                const WalletLedger = ADVwalletLedger.concat(BASEwalletLedger);

                const LedgerBank = await LedgerGenerator(interaction,`BANK | ${userAccounts.bank.IDENT}`, BankLedger)
                const LedgerWallet = await LedgerGenerator(interaction, `WALLET | ${userAccounts.wallet.IDENT}`, WalletLedger)


                const attachBank = new AttachmentBuilder(Buffer.from(LedgerBank), {name: "Bank-Ledger.csv"})
                const attachWallet = new AttachmentBuilder(Buffer.from(LedgerWallet), {name: "Wallet-Ledger.csv"})


                interaction.editReply("Attaching both Wallet and Bank Ledgers now.", { flags: MessageFlags.Ephemeral })
                interaction.followUp( {files: [attachBank, attachWallet], flags: MessageFlags.Ephemeral })
                break;
            }
        }
    },
};
