const fetch = require('node-fetch')
const {Interaction, EmbedBuilder, SlashCommandBuilder, Colors, AttachmentBuilder} = require("discord.js");
const {RetrieveData, BusinessHQ, CreateData, UpdateData, UserHQ} = require("../dataCrusher/Headquarters.js");
const { ErrorEmbed } = require("../utils/embedUtil.js");
const {activeDepartment, activeBusiness} = require("../dataCrusher/services/cache");

const {DepartmentHQ, NotificationHQ, PermManager} = require("../dataCrusher/Headquarters");

const {csvGenerator} = require("../utils/csvGenerator");
const {SimpleEmbed} = require("../utils/embedUtil");

const MoneyFormat = new Intl.NumberFormat('en-us', {currency: 'USD', style: 'currency'})
module.exports = {
    data: new SlashCommandBuilder()
        .setName("payroll")
        .setDescription("Command used generate and execute payrolls.")
        .addSubcommand((subCmd)=>
            subCmd.setName('generate').setDescription('Generate payroll CSV file.')
                .addStringOption(stringOp=>
                stringOp.setName('type').setDescription('Type of payroll to generate').setRequired(true)
                    .addChoices(
                        {name: 'Business', value: 'business'},
                               {name: 'Department', value: 'department'}
                    )))
        .addSubcommand((subCmd)=>
            subCmd.setName('execute').setDescription('Command used to execute a CSV Payroll file.')
                .addStringOption((stringOp)=>
                    stringOp.setName('type').setDescription('Type of payroll to execute').setRequired(true)
                        .setRequired(true)
                        .addChoices(
                        {name: 'Business', value: 'business'},
                                {name: 'Department', value: 'department'}
                        ))
                .addAttachmentOption((attachOp =>
                    attachOp.setName('csv-file')
                    .setDescription('The CSV Payroll File you would like to execute.')
                    .setRequired(true)))),
    async execute(interaction) {
        const Type = interaction.options.getString('type');
        let EntityIDENT = null;
        switch(Type){
           case 'business': {
               const activeUSER = await new UserHQ(interaction, interaction.user.id);
               if (await activeUSER.getBusiness() == null) {
                   return await ErrorEmbed(interaction, "Please select a business first by using /set business!");
               }

               EntityIDENT = await activeBusiness.get(`${interaction.IDENT}-${interaction.user.id}`)

               const BUSINESS = await new BusinessHQ(interaction, EntityIDENT)
               if((await PermManager.Business.checkPerm(BUSINESS, interaction, 'supervisor') === false)){
                   return await ErrorEmbed(interaction, "Insufficient perms. Payroll-Management permission level required.")
               }

           }break
            case 'department': {
                const activeUSER = await new UserHQ(interaction, interaction.user.id);
                if (await activeUSER.getDepartment() == null) {
                    return await ErrorEmbed(interaction, "Please select a department first by using /set department!");
                }

                EntityIDENT = await activeDepartment.get(`${interaction.IDENT}-${interaction.user.id}`)

                const DEPARTMENT = await new DepartmentHQ(interaction, EntityIDENT)

                if((await PermManager.Department.checkPerm(interaction, DEPARTMENT, 'Payroll-Management') === false)){
                    return await ErrorEmbed(interaction, "Insufficient perms. Payroll-Management permission level required.")
                }

            }break
        }

        if(EntityIDENT === null){
            return await ErrorEmbed(interaction, "Please select a business or department first by using /set business or /set department!");
        }

        switch (interaction.options.getSubcommand()){
            case 'generate': {
                await interaction.deferReply({flags: MessageFlags.Ephemeral});

                const awaitEmbed = new EmbedBuilder()
                    .setTitle('Generating CSV Payroll File...')
                    .setColor('Orange')
                    .setDescription('**This could take a few minutes.** \n Do not move or delete any columns of the CSV file. ')
                    .setThumbnail("https://media.tenor.com/0JK1fHxqYGEAAAAi/loading.gif")

                interaction.editReply({embeds: [awaitEmbed]})

                switch(Type){
                    case 'business': {
                        const Business = await new BusinessHQ(interaction, EntityIDENT)
                        const BusName = await Business.getName();
                        const BusOwner = await Business.getOwner();
                        let Employees = await Business.getEmployees()
                        Employees.push({id: BusOwner})                        

                        for (const i of Employees){
                            const user = await RetrieveData.userByIDENT(i.id);
                            const discordUser = await interaction.guild.members.fetch(user.id)

                            i.displayName = discordUser.displayName;
                        }

                        const csv = await csvGenerator(["id", "displayName", "paycheckAmount"], Employees)
                        const csvAttachment = new AttachmentBuilder(Buffer.from(csv), {name: `${BusName}-Payroll.csv`})
                        awaitEmbed.setColor('Green')
                            .setTitle('Attaching CSV File...')
                            .setDescription('**CSV Payroll File generated. Now attaching file.**\n Do not move or delete any columns of the CSV file.')
                            .setThumbnail("https://media.tenor.com/AWKzZ19awFYAAAAi/checkmark-transparent.gif")

                        interaction.editReply({embeds: [awaitEmbed]})
                        interaction.followUp( {files: [csvAttachment], flags: MessageFlags.Ephemeral })

                    }break
                    case 'department': {
                        const Department = await new DepartmentHQ(interaction, EntityIDENT)
                        const DepName = await Department.getName();
                        const memberRole = await Department.getMemberRole();
                        const Role = await interaction.guild.roles.fetch(memberRole, {force: true});
                        await interaction.guild.members.fetch()
                        let depMembers = []

                        for (const i of Role.members){
                            const user = await RetrieveData.user(interaction, i[1].id);

                            let DepMember = {};
                            if(user === null){
                                console.warn("USER UNKNOWN)", user)
                                DepMember.id = "NOT REGISTERED";
                                DepMember.displayName = i[1].displayName
                                depMembers.push(DepMember)
                                continue
                            }
                            DepMember.id = user.IDENT;
                            DepMember.displayName = i[1].displayName

                            depMembers.push(DepMember)
                        }

                        const csv = await csvGenerator(["id", "displayName", "paycheckAmount"], depMembers)
                        const csvAttachment = new AttachmentBuilder(Buffer.from(csv), {name: `${DepName}-Payroll.csv`})
                        awaitEmbed.setColor('Green')
                            .setTitle('Attaching CSV File...')
                            .setDescription('**CSV Payroll File generated. Now attaching file.**\n Do not move or delete any columns of the CSV file.')
                            .setThumbnail("https://media.tenor.com/AWKzZ19awFYAAAAi/checkmark-transparent.gif")

                        interaction.editReply({embeds: [awaitEmbed]})
                        interaction.followUp( {files: [csvAttachment], flags: MessageFlags.Ephemeral })
                    }break
                }

            }break
            case 'execute': {
                const Type = interaction.options.getString('type');
                let EntityIDENT = null;
                switch(Type){
                    case 'business': {
                        if (await activeBusiness.get(`${interaction.IDENT}-${interaction.user.id}`) == null) {
                            return await ErrorEmbed(interaction, "Please select a business first by using /set business!");
                        }

                        EntityIDENT = await activeBusiness.get(`${interaction.IDENT}-${interaction.user.id}`)


                        const BUSINESS = await new BusinessHQ(interaction, EntityIDENT)
                        if((await PermManager.Business.checkPerm(BUSINESS, interaction, 'supervisor') === false)){
                            return await ErrorEmbed(interaction, "Insufficient perms. supervisor permission level required.")
                        }

                    }break
                    case 'department': {
                        if (await activeDepartment.get(`${interaction.IDENT}-${interaction.user.id}`) == null) {
                            return await ErrorEmbed(interaction, "Please select a department first by using /set department!");
                        }
                        EntityIDENT = await activeDepartment.get(`${interaction.IDENT}-${interaction.user.id}`)


                        const DEPARTMENT = await new DepartmentHQ(interaction, EntityIDENT)

                        if((await PermManager.Department.checkPerm(interaction, DEPARTMENT, 'Payroll-Management') === false)){
                            return await ErrorEmbed(interaction, "Insufficient perms. Payroll-Management permission level required.")
                        }

                    }break
                }

                if(EntityIDENT === null){
                    return await ErrorEmbed(interaction, "Please select a business or department first by using /set business or /set department!");
                }

                await interaction.deferReply();

                const awaitEmbed = new EmbedBuilder()
                    .setTitle('Executing CSV Payroll File...')
                    .setColor('Orange')
                    .setDescription('**This could take a few minutes.** Employees will NOT be notified.')
                    .setThumbnail("https://media.tenor.com/0JK1fHxqYGEAAAAi/loading.gif")

                interaction.editReply({embeds: [awaitEmbed]})

                const CsvFile = interaction.options.getAttachment('csv-file');
                const CSV = await fetch(CsvFile.url);
                let lines = String(await CSV.text()).split('\n');
                var results = [];
                var headers = lines[0].split(",")

                let Entity = null;
                
                for(let i = 0; i <lines.length; i++){
                    var obj = {}
                    if(lines[i] == undefined || lines[i].trim() == "") {
                        continue;
                    }

                    if(lines[i].split(",").length >= 5){
                        return await ErrorEmbed(interaction, "Unable to process payroll. CSV Row contains too many commas. If you are paying a large number such as ``X,XXX,XXX`` do **not** use commas. ``X,XXX`` Will work fine.")
                    }

                    if(lines[i].includes('"')){
                    const lastIndex = lines[i].lastIndexOf(',');

                    if (lastIndex !== -1) {
                        lines[i] =  lines[i].slice(0, lastIndex) + lines[i].slice(lastIndex + 1);
                    }

                    lines[i] = lines[i].replaceAll('"', ' ')

                    }

                    var words = lines[i].split(",");
                    for(var j = 0; j < words.length; j++) {
                        obj[headers[j].trim()] = words[j];
                    }

                    results.push(obj);
                }

                let embedLoadDesc = "**This could take a few minutes.** Employees will NOT be notified.\n"
                let EmbedDesc = "";
                let insufficientFunds = false;
                switch(Type){
                    case 'business': {

                        for(let employee = 0; employee <results.length; employee++){


                            if(String(results[employee].id).length <5){ console.log("Returned"); continue}

                            const UserAccounts = await RetrieveData.userBasicAccountsByIDENT(results[employee].id)

                           const result = await UpdateData.accountBalance(interaction, UserAccounts.bank.IDENT, EntityIDENT, Number(results[employee].paycheckAmount));
                                if (result === "Insufficient Funds") {
                                    EmbedDesc = EmbedDesc+`\n \\❌ Unable To Process ${results[employee].displayName}'s Paycheck. Insufficient Funds.`
                                     awaitEmbed.setDescription(embedLoadDesc+EmbedDesc)
                                    insufficientFunds = true;
                                     interaction.editReply({embeds: [awaitEmbed]})
                                    continue
                                }
                                const Transaction = await CreateData.basicTransaction(interaction, UserAccounts.bank.IDENT, EntityIDENT, Number(results[employee].paycheckAmount), "PAYROLL")
                                if(Transaction.amount >= 5000) { await NotificationHQ.flagNotification(interaction, Transaction);}
                                EmbedDesc = EmbedDesc+`\n \\✅ Processed ${results[employee].displayName}'s Paycheck.`
                                 awaitEmbed.setDescription(embedLoadDesc+EmbedDesc)
                             interaction.editReply({embeds: [awaitEmbed]})
                        }

                        if(insufficientFunds === true){
                            awaitEmbed.setTitle('Unable To Fully Execute CSV Payroll File')
                                .setColor('Red')
                                .setThumbnail('https://media.tenor.com/Gbp8h-dqDHkAAAAi/error.gif')
                                .setDescription("There was an error while processing payroll.\n"+EmbedDesc)
                            return  interaction.editReply({embeds: [awaitEmbed]})
                        }
                        awaitEmbed.setTitle('Executed Payroll CSV File')
                            .setColor('Green')
                            .setThumbnail("https://media.tenor.com/AWKzZ19awFYAAAAi/checkmark-transparent.gif")
                            .setDescription("CSV Payroll File Processed\n"+EmbedDesc)
                        return  interaction.editReply({embeds: [awaitEmbed]})

                    }break
                    case 'department': {
                        const Department = await new DepartmentHQ(interaction, EntityIDENT)
                        for(let employee = 0; employee <results.length; employee++){


                            if(String(results[employee].id).length <5){ console.log("Returned"); continue}
                            if(results[employee].id === "NOT REGISTERED"){
                                EmbedDesc = EmbedDesc+`\n \\⚠️ ${results[employee].displayName} is **NOT REGISTERED**.`
                                awaitEmbed.setDescription(embedLoadDesc+EmbedDesc)
                                interaction.editReply({embeds: [awaitEmbed]})
                                continue
                            }

                            const UserAccounts = await RetrieveData.userBasicAccountsByIDENT(results[employee].id)

                            const result = await Department.processPayroll(UserAccounts.bank, Number(results[employee].paycheckAmount));
                            if (result === "Insufficient Funds") {
                                EmbedDesc = EmbedDesc+`\n \\❌ Unable To Process ${results[employee].displayName}'s Paycheck. Insufficient Funds.`
                                awaitEmbed.setDescription(embedLoadDesc+EmbedDesc)
                                insufficientFunds = true;
                                interaction.editReply({embeds: [awaitEmbed]})
                                continue
                            }
                            EmbedDesc = EmbedDesc+`\n \\✅ Processed ${results[employee].displayName}'s Paycheck.`
                            awaitEmbed.setDescription(embedLoadDesc+EmbedDesc)
                            interaction.editReply({embeds: [awaitEmbed]})
                        }

                        if(insufficientFunds === true){
                            awaitEmbed.setTitle('Unable To Fully Execute CSV Payroll File')
                                .setColor('Red')
                                .setThumbnail('https://media.tenor.com/Gbp8h-dqDHkAAAAi/error.gif')
                                .setDescription("There was an error while processing payroll.\n"+EmbedDesc)
                            return  interaction.editReply({embeds: [awaitEmbed]})
                        }
                        awaitEmbed.setTitle('Executed Payroll CSV File')
                            .setColor('Green')
                            .setThumbnail("https://media.tenor.com/AWKzZ19awFYAAAAi/checkmark-transparent.gif")
                            .setDescription("CSV Payroll File Processed\n"+EmbedDesc)
                        return  interaction.editReply({embeds: [awaitEmbed]})
                    }break
                }
            }break
        }
    },
};
