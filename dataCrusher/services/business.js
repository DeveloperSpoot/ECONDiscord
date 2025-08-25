const {ErrorEmbed} = require("../../utils/embedUtil");
const {Op} = require("sequelize");
const SQL = require("../Server");
const Notify = require("./notify");
const {AttachmentBuilder} = require("discord.js");
const {colorEmbed} = require("../../customPackage/colorBar");
const IRS = require("./irs");
const GuildHQ = require("./guild");

async function getGuildMember(disID, guildID) {
    const options = {
        [Op.and]: [
            {guild: String(guildID)},
            {id: String(disID)}]
    }

    return await SQL.models.GuildMembers.findOne({where: options, raw: true})
}

function Business(interaction, IDENT) {
    this.interaction = interaction;
    this.interaction.BusinessIDENT = IDENT;
    this.IDENT = IDENT;
}

async function LogGeneral(interaction, color, title, description, ...fields){
    try {
    if(interaction.guildId !== interaction.IDENT){return;}
        const [ColorEmbed] = await colorEmbed(interaction, color, title, description, ...fields)

     let GuildChannel =  (await SQL.models.Guilds.findByPk(String(interaction.IDENT), {raw: true}));

    if(GuildChannel.generalLogChannel != null && GuildChannel.generalLogChannel){
        try{
            GuildChannel =  await interaction.guild.channels.fetch(GuildChannel.generalLogChannel);
        }catch(err){
            return;
        }
        await GuildChannel.send({embeds: [ColorEmbed]})
    }

     let Channel = (await SQL.models.Accounts.findByPk(String(interaction.BusinessIDENT), {raw: true}));


    if(Channel.generalLogChannel != null && Channel.generalLogChannel){
        try{
            Channel =  await interaction.guild.channels.fetch(Channel.generalLogChannel);
        }catch(err){
            return
        }
        await Channel.send({embeds: [ColorEmbed]})
     }
    }catch(err){
        console.log(err)
    }
}

async function LogActivity(interaction, color, title, description, ...fields){
    try{
    if(interaction.guildId !== interaction.IDENT){return;}
    const [ColorEmbed] = await colorEmbed(interaction, color, title, description, ...fields)

    let GuildChannel =  (await SQL.models.Guilds.findByPk(String(interaction.IDENT), {raw: true}));

    if(GuildChannel.activityLogChannel != null && GuildChannel.activityLogChannel){
        try{
            GuildChannel =  await interaction.guild.channels.fetch(GuildChannel.activityLogChannel);
        }catch(err){
            return
        }
        await GuildChannel.send({embeds: [ColorEmbed]})
    }

    let Channel = (await SQL.models.Accounts.findByPk(String(interaction.BusinessIDENT), {raw: true}));

    if(Channel.activityLogChannel != null && Channel.activityLogChannel){
        try{
            Channel =  await interaction.guild.channels.fetch(Channel.activityLogChannel);
        }catch(err){
            return
        }
        await Channel.send({embeds: [ColorEmbed]})
    }
    }catch(err){
        console.log(err)
    }
}


const MoneyFormat = new Intl.NumberFormat('en-us', {currency: 'USD', style: 'currency'})

Business.prototype = {
    getSelfServedStatus: async function(){

        let business = await SQL.models.Accounts.findByPk(this.IDENT, {raw: true});

        return business.selfServed;
    },
    inflatePrices: async function(amountPercent){
        let items = await this.getAllItems();

        items.forEach((item) => item.price = (1+(Number(amountPercent)/100))*Number(item.price))

        return items.forEach(async (item)=> await SQL.models.Items.update({price: item.price}, {where: {IDENT: item.IDENT}}));
    },
    deflatePrices: async function(amountPercent){
        let items = await this.getAllItems();

        items.forEach((item) => item.price = Number(item.price)-(((Number(amountPercent)/100))*Number(item.price)))

        return items.forEach(async (item)=> await SQL.models.Items.update({price: item.price}, {where: {IDENT: item.IDENT}}));
    },
    setGeneralLog: async function(channel){
      return await SQL.models.Accounts.update({generalLogChannel: channel.id}, {where: {IDENT: this.IDENT}})
    },
    setActivityLog: async function(channel){
        return await SQL.models.Accounts.update({activityLogChannel: channel.id}, {where: {IDENT: this.IDENT}})

    },
    clearShifts: async function(){
        try{
            const dataResult = await SQL.models.Shift.destroy({where: {entityIDENT: this.IDENT}})
            const busName = await this.getName();
            await LogActivity(this.interaction, "Orange", "Shifts Cleared", `All logged shifts for ${busName} have been cleared by <@${this.interaction.user.id}>.`)
            return dataResult
        }catch(e){
            console.warn(e);
            return ErrorEmbed(this.interaction, e.message)
        }

    },
    removeShift: async function(selectedShift){
        try{
            const dataResult = await SQL.models.Shift.destroy({where: {IDENT: selectedShift}});
            const busName = await this.getName();
            await LogActivity(this.interaction, "Orange", "Shift Removed", `A shift logged has been removed from ${busName} by <@${this.interaction.user.id}>.`)
            return dataResult
        }catch(e){
            console.warn(e);
            return ErrorEmbed(this.interaction, e.message)
        }
    },
    executeShiftPayout: async function(processEmbed, ShiftSummaries){
        const busBalance = await this.getBalance();
        const exeMsg = "<a:loading:1121922926313218120> Executing Payroll... \n";
        let desc = ""
        let fullyProcessed = true;

        for(const userKey of Object.keys(ShiftSummaries)){
            const curUser = ShiftSummaries[userKey]
            const UsersHQ = ShiftSummaries[userKey].userHQ;
            const amount = curUser.grandTotal
            const usersAccounts = await UsersHQ.getBasicAccounts();
            const account = usersAccounts.bank

            if(0 > (Number(busBalance)-Number(curUser.grandTotal))){
                desc = desc + `\\🔴 Unable To Process Payroll For ${curUser.displayName}. Insufficient Funds. \n`
                fullyProcessed = false;

                processEmbed.setDescription(exeMsg+desc)
                await this.interaction.editReply({embeds: [processEmbed]})
                continue
            }

            const revenueService = new IRS(this.interaction);
            const amountAT = await revenueService.calculatePayrollTax(amount);

            await SQL.models.Accounts.update({balance: (Number(busBalance)-Number(amountAT.total))}, {where: {IDENT: this.IDENT}});
            await SQL.models.Accounts.update({balance: (Number(account.balance)+Number(amountAT.total))}, {where: {IDENT: account.IDENT}});

            await revenueService.filePayrollTax(amountAT.tax, this, 'Account');

            let reason = "PAYROLL Through ECON Shifts. Total Hours:"+curUser.totalTime+"."

            const Transaction =  await SQL.models.AdvTransactionLogs.create({
                guild: this.interaction.IDENT,
                amount: amountAT.total,
                creditAccount: this.IDENT,
                debitAccount: account.IDENT,
                creditType: "Account",
                debitType: "Account",
                memo: reason
            }).catch(err=>console.log(err))

            // if (amount >= 5000){
            //     await Notify.flagNotification(this.interaction, Transaction)
            // }

            desc = desc + `\\🟢 Processed Payroll For ${curUser.displayName}. \n`
            processEmbed.setDescription(exeMsg+desc)
            await this.interaction.editReply({embeds: [processEmbed]})
        }

        if(fullyProcessed === false){
            processEmbed.setDescription("There was an error with one or more payroll executions.\n"+desc)
                .setTitle('Unable To Fully Process Payroll Through ECON Shifts.')
                .setColor("Red")
            await this.interaction.editReply({embeds: [processEmbed]})
            await LogActivity(this.interaction, 'Green', 'Shift Payroll Distributed', desc)

            return
        }

        processEmbed.setDescription(desc)
            .setTitle('Successfully Processed Payroll Through ECON Shifts.')
            .setColor("Green")
        await this.interaction.editReply({embeds: [processEmbed]})

        await LogActivity(this.interaction, 'Green', 'Shift Payroll Distributed', desc)

    },
    payDepartment: async function(department, amount){
        const depName = await department.getName();
        const balance = await department.getBalance();
        const businessBalance = await this.getBalance();
        await SQL.models.Accounts.update({balance: (Number(businessBalance)-Number(amount))}, {where: {IDENT: this.IDENT}});
        await SQL.models.Department.update({balance: (Number(balance)+Number(amount))}, {where: {IDENT: department.IDENT}});
        const guildManager = new GuildHQ(this.interaction);
        try{
            const dataResult = await SQL.models.AdvTransactionLogs.create({
                guild: this.interaction.IDENT,
                amount: amount,
                creditAccount: this.IDENT,
                debitAccount: department.IDENT,
                creditType: "Account",
                debitType: "Department",
                memo: "BUSINESS TO DEPARTMENT PAYOUT ("+depName+")."
            });

            const busName = await this.getName();
            await LogGeneral(this.interaction, "Green", "Department Paid", `${depName} has been paid ${await guildManager.formatMoney(amount)} from ${busName}.`)

            return dataResult
        }catch(e){
            console.warn(e);
            return ErrorEmbed(this.interaction, e.message)
        }
    },
    getAdditionalPayRoles: async function(){
      return await SQL.models.RolePay.findAll({where: {entityIDENT: this.IDENT}, raw: true})
    },
    addRolePay: async function(role, amount){

        try{

            let foundRole = await SQL.models.RolePay.findOne({
                where: {
                    [Op.and]: [
                        {id: role.id},
                        {entityIDENT: this.IDENT},
                        {GuildIDENT: this.interaction.guild.id}
                    ]
                }
            })

            if(foundRole){
                let updatedRole = await SQL.models.RolePay.update({
                    id: role.id,
                    entityIDENT: this.IDENT,
                    entityType: 'business',
                    GuildIDENT: this.interaction.guild.id,
                    additionalPay: Number(amount)
                }, 
                   {where:{
                      [Op.and]: [
                          {id: role.id},
                          {entityIDENT: this.IDENT},
                          {GuildIDENT: this.interaction.guild.id}
                      ]
                    }})
                    await LogGeneral(this.interaction, 'Green', 'Role Pay Bind Updated', `A Additional Pay Role (<@${role.id}>) was updated. Additional Pay for this role has been set to \`\`${MoneyFormat.format(amount)}\`\`.`)
                return updatedRole
            }

            let createdRole = await SQL.models.RolePay.create({
                id: role.id,
                entityIDENT: this.IDENT,
                entityType: 'business',
                GuildIDENT: this.interaction.guild.id,
                additionalPay: Number(amount)
            });


            await LogGeneral(this.interaction, 'Green', 'Role Pay Binded', `A new Additional Pay Role (<@${role.id}>) was binded. Additional Pay for this role has been set to \`\`${MoneyFormat.format(amount)}\`\`.`)
            return createdRole;
        }catch(e){
            console.warn(e);
            return ErrorEmbed(this.interaction, e.message)
        }
    },
    removeRolePay: async function(role){

        try{
            const dataResult = await SQL.models.RolePay.destroy({where: {[Op.and]: [
                        {id: role.id},
                        {entityIDENT: this.IDENT}
                    ]}})

            const busName = await this.getName();
            await LogGeneral(this.interaction, "Orange", "Additional Pay Disbanded", `\`\`${role.name}\`\`'s additional pay has been disbanded from **${busName}**. Disbanded by <@${this.interaction.user.id}>`)

            return dataResult
        }catch(e){
            console.warn(e);
            return ErrorEmbed(this.interaction, e.message)
        }
    },
    getBasePay: async function(){
        const business = await SQL.models.Accounts.findByPk(this.IDENT, {raw: true})
        return business.basePay
    },
    setBasePay: async function(amount){
        try{
            const dataResult = await SQL.models.Accounts.update({basePay: Number(amount)}, {where: {IDENT: this.IDENT}});

            const busName = await this.getName();
            const guildManager = new GuildHQ(this.interaction);
            await LogGeneral(this.interaction, "Green", "Base Pay Updated", `The Base Pay for **${busName}** has been updated to ${await guildManager.formatMoney(amount)}. Updated by <@${this.interaction.user.id}>`)

            return dataResult
        }catch(e){
            console.warn(e);
            return ErrorEmbed(this.interaction, e.message)
        }
    },
    recordShift: async function(activeShift, USER){
        const startTime = new Date(activeShift.start);
        const endTime = new Date(activeShift.end);

        const totalHours = Number(((endTime - startTime) / (1000 * 60 * 60))).toFixed(2);

        try{
            const dataResult = await SQL.models.Shift.create({
                GuildIDENT: this.interaction.IDENT,
                start: startTime,
                end: endTime,
                entityIDENT: activeShift.entityIDENT,
                entityType: activeShift.type,
                user: USER.IDENT,
            })

            const busName = await this.getName();
            await LogActivity(this.interaction, "Green", "Shift Logged", `A new shift has been logged to **${busName}**.`,
                {name: 'Logged By', value: `<@${this.interaction.user.id}> (${this.interaction.member.displayName})`, inline: true},
                {name: 'Hours logged', value: totalHours, inline: true})

            return dataResult
        }catch(e){
            console.warn(e);
            return ErrorEmbed(this.interaction, e.message)
        }
    },
    edit:{
        name: async function(business, name){
            try{
                const busName = await business.getName();
                const dataResult = await SQL.models.Accounts.update({name: name}, {where: {IDENT: business.IDENT}})

                await LogGeneral(business.interaction, "Blue", "Business Edited", `${busName} has been renamed to ${name}. Changed by <@${business.interaction.user.id}>.`)

                return dataResult
            }catch(e){
                console.warn(e);
                return ErrorEmbed(business.interaction, e.message)
            }
        },
        description: async function(business, description){
            try{
                const busName = await business.getName();
                const dataResult = await SQL.models.Accounts.update({description: description}, {where: {IDENT: business.IDENT}})

                await LogGeneral(business.interaction, "Blue", "Business Edited", `${busName}'s description has been changed. Changed by <@${business.interaction.user.id}>.`)

                return dataResult
            }catch(e){
                console.warn(e);
                return ErrorEmbed(business.interaction, e.message)
            }
        },
        owner: async function(business, owner, ownerMember){
            try{
                const busName = await business.getName();
                const dataResult = await SQL.models.Accounts.update({owner: owner}, {where: {IDENT: business.IDENT}})

                await LogGeneral(business.interaction, "Red", "Business Owner Changed", `${busName}'s owner has been changed to <@${ownerMember.id}>. Changed by <@${business.interaction.user.id}>.`)

                return dataResult
            }catch(e){
                console.warn(e);
                return ErrorEmbed(business.interaction, e.message)
            }
        },
        role: async function(business, role){
            try{
                const busName = await business.getName();
                const dataResult = await SQL.models.Accounts.update({role: role.id}, {where: {IDENT: business.IDENT}})

                await LogGeneral(business.interaction, "Blue", "Business Role Changed", `${busName}'s role has been changed to <@&${role.id}>. Changed by <@${business.interaction.user.id}>.`)

                return dataResult
            }catch(e){
                console.warn(e);
                return ErrorEmbed(business.interaction, e.message)
            }
        },
        selfServed:async function(business, selfServed){
            try{
                const busName = await business.getName();
                const dataResult = await SQL.models.Accounts.update({selfServed: selfServed}, {where: {IDENT: business.IDENT}})

                await LogGeneral(business.interaction, "Blue", "Business selfServed Changed", `${busName}'s selfServed has been changed to ${selfServed}. Changed by <@${business.interaction.user.id}>.`)

                return dataResult
            }catch(e){
                console.warn(e);
                return ErrorEmbed(business.interaction, e.message)
            }
        },
    },
    dissolve: async function(){
        const busName = await this.getName()
        await LogGeneral(this.interaction, "Red", "Business Dissolved", `${busName} has been dissolved by <@${this.interaction.user.id}>.`)
        await (await SQL.models.Accounts.findByPk(this.IDENT)).destroy();

    },
    hireEmployee: async function(employeeID, perms, employeeMember) {
        const user = await getGuildMember(employeeID, this.interaction.IDENT)
        try{
            const busName = await this.getName();

            const foundRecord = await SQL.models.Employees.findOne({
                where: {
                    [Op.and]: [
                        {id: user.IDENT},
                        {business: this.IDENT}
                    ]
                }
            });

            if(foundRecord){
                let updatedRecord = await SQL.models.Employees.update({
                    guild: String(this.interaction.guild.id),
                    business: this.IDENT,
                    id: user.IDENT,
                    level: perms
                }, {
                    where: {
                        [Op.and]: [
                            {id: user.IDENT},
                            {business: this.IDENT}
                        ]
                    }

                })
           
                await LogGeneral(this.interaction, "Green", "Employee Updated", `${employeeMember} has been Updated in ${busName}. Employee updated by <@${this.interaction.user.id}>`)
                return updatedRecord
            }

           let createdRecord =  await SQL.models.Employees.create({
                guild: String(this.interaction.guild.id),
                business: this.IDENT,
                id: user.IDENT,
                level: perms
            })

            await LogGeneral(this.interaction, "Green", "Employee Added", `${employeeMember} has been added to ${busName} as an employee. Employee added by <@${this.interaction.user.id}>`)

            return createdRecord
        }catch(e){
            console.warn(e);
            return ErrorEmbed(this.interaction, e.message)
        }
    },
    terminateEmployee: async function(employeeID, employeeMember){
        try{
            const dataResult = await (await SQL.models.Employees.findByPk(employeeID)).destroy()
            const employee = employeeMember.displayName;
            const busName = await this.getName();

            await LogGeneral(this.interaction, 'Orange', 'Employee Terminated', `${employee} has been terminated from ${busName}. Terminated by <@${this.interaction.user.id}>`)
            return dataResult;
        }catch(e){
           console.warn(e)
            return ErrorEmbed(this.interaction, e.message)
        }
    },
    addItem: async function(itemDetails){
        console.warn("IDENT", this.IDENT)
        const creator = await getGuildMember(this.interaction.user.id, this.interaction.IDENT)
        const busName = await this.getName();
        const item =  Object.fromEntries(itemDetails);
       //TODO Update log to include fields of name, item, price, description, and whom it was added by.
        try {
            const dataPosted = await SQL.models.Items.create({...item, guild: String(this.interaction.IDENT), business: this.IDENT, createdBy: creator.IDENT});
            await LogGeneral(this.interaction, 'Green', 'Item Created', `A new item priced at ${item.price}, called ${item.name} has been added to ${busName}`)
            return dataPosted;
        }catch(e){
            console.warn(e)
            return ErrorEmbed(this.interaction, e.message)
        }

    },
    editItem: {
        name: async function(itemIDENT, name, business){
            try{
                const busName = await business.getName();
                const itemName = await SQL.models.Items.findByPk(itemIDENT, {raw: true});
                const dataResult = await SQL.models.Items.update({name: name},{where: {IDENT: itemIDENT}})

                await LogGeneral(business.interaction, "Blue", "Item Changed", `${busName}'s item (${itemName.name}) name has been changed to ${name}.`)

                return dataResult
            }catch(e){
                console.warn(e);
                return ErrorEmbed(business.interaction, e.message)
            }

        },
        description: async function (itemIDENT, desc,business){
            try{
                const busName = await business.getName();
                const item = await SQL.models.Items.findByPk(itemIDENT, {raw: true});
                const dataResult = await SQL.models.Items.update({description: desc},{where: {IDENT: itemIDENT}})

                await LogGeneral(business.interaction, "Blue", "Item Changed", `${busName}'s item (${item.name}) description has been changed.`)

                return dataResult
            }catch(e){
                console.warn(e);
                return ErrorEmbed(business.interaction, e.message)
            }
        },
        price: async function(itemIDENT, price,business){
            try{
                const busName = await business.getName();
                const item = await SQL.models.Items.findByPk(itemIDENT, {raw: true});
                const dataResult = await SQL.models.Items.update({price: price},{where: {IDENT: itemIDENT}})

                await LogGeneral(business.interaction, "Blue", "Item Changed", `${busName}'s item (${item.name}) price has been changed to ${item.price}.`)

                return dataResult
            }catch(e){
                console.warn(e);
                return ErrorEmbed(business.interaction, e.message)
            }
        },
        ownMultiple: async function(itemIDENT, ownMultiple, business){
            try{
                const busName = await business.getName();
                const item = await SQL.models.Items.findByPk(itemIDENT, {raw: true});
                const dataResult = await SQL.models.Items.update({ownMultiple: ownMultiple},{where: {IDENT: itemIDENT}})

                await LogGeneral(business.interaction, "Blue", "Item Changed", `${busName}'s item (${item.name}) own-multiple has been changed to ${ownMultiple}.`)

                return dataResult
            }catch(e){
                console.warn(e);
                return ErrorEmbed(business.interaction, e.message)
            }
        },
        quickAccess: async function(itemIDENT, QuickA, business){
            try{
                const busName = await business.getName();
                const item = await SQL.models.Items.findByPk(itemIDENT, {raw: true});
                const dataResult = await SQL.models.Items.update({quickAccess: QuickA},{where: {IDENT: itemIDENT}})

                await LogGeneral(business.interaction, "Blue", "Item Changed", `${busName}'s item (${item.name}) quickAccess has been changed to ${QuickA}.`)

                return dataResult
            }catch(e){
                console.warn(e);
                return ErrorEmbed(business.interaction, e.message)
            }
        },
    },
    discontinueItem: async function(itemIDENT){
        try {
            const busName = await this.getName();

            const item = await SQL.models.Items.findByPk(itemIDENT, {raw: true});
            const dataPosted = await (await SQL.models.Items.findByPk(itemIDENT)).destroy()
            await LogGeneral(this.interaction, 'Orange', 'Item Discontinued', `${busName}'s item (${item.name}) as been removed.`)
            return dataPosted;
        }catch(e){
            console.warn(e)
            return ErrorEmbed(this.interaction, e.message)
        }
    },
    getPayrollPeriod: async function(fromDate, toDate){
        return await SQL.models.Shift.findAll({
            where: {
                [Op.and]: [
                    {entityIDENT: this.IDENT},
                    {
                        start: {
                            [Op.between]: [fromDate, toDate]
                        }
                    }
                ],
            }, raw: true
        })
    },
    getShifts: async function(){
        return await SQL.models.Shift.findAll({where: {entityIDENT: this.IDENT}, raw: true})
    },
    getSpecItem: async function(itemIDENT){

        return await SQL.models.Items.findByPk(itemIDENT, {raw: true});
    },
    getAllItems: async function(){
        const options = {
            [Op.and]: [
                {guild: String(this.interaction.IDENT)},
                {business:this.IDENT}
            ]
        }
        return await SQL.models.Items.findAll({where: options, raw: true});
    },
    getItems: async function(isQucikSell) {
        const options = {
            [Op.and]: [
                {guild: String(this.interaction.IDENT)},
                {business:this.IDENT},
                {quickAccess: isQucikSell}
            ]
        }
        return await SQL.models.Items.findAll({where: options, raw: true});
    },
    getEmployees: async function() {
        const options = {
            [Op.and]: [
                {guild: String(this.interaction.IDENT)},
                {business:this.IDENT}]
        }
        return await SQL.models.Employees.findAll({where: options, raw: true});
    },
    getEmployeeUser: async function(employeeID){
        return await SQL.models.GuildMembers.findByPk(employeeID, {raw: true})
    },
   getEmployeeByDiscord: async function (disID, guild) {
        const options = {
            [Op.and]: [
                {guild: String(guild)},
                {id: String(disID)}
            ]
        }
        const memberIDENT = await SQL.models.GuildMembers.findOne({where: options, raw:true});
       const options2 = {
           [Op.and]: [
               {business: this.IDENT},
               {id: String(memberIDENT.IDENT)}]
       }
        return await SQL.models.Employees.findOne({where: options2, raw: true})
    },
    getOwner: async function(){
        const business = await SQL.models.Accounts.findByPk(this.IDENT, {raw: true})
        return business.owner;
    },
    getName: async function(){
        const business = await SQL.models.Accounts.findByPk(this.IDENT, {raw: true})
        return business.name;
    },
    getBalance: async function(){
        const business = await SQL.models.Accounts.findByPk(this.IDENT, {raw: true})
        return business.balance;
    },
    getFullDetail: async function(){
        return await SQL.models.Accounts.findByPk(this.IDENT, {raw: true})
    }
}

module.exports = Business;