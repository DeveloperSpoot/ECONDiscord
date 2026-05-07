const {ErrorEmbed} = require("../../utils/embedUtil");
const {Op, DataTypes} = require("sequelize");
const SQL = require("../Server");
const Notify = require("./notify")
const {colorEmbed} = require("../../customPackage/colorBar");
const IRS = require("./irs");
const Guild = require("./guild");

async function getGuildMember(disID, guildID) {
    const options = {
        [Op.and]: [
            {guild: String(guildID)},
            {id: String(disID)}]
    }

    return await SQL.models.GuildMembers.findOne({where: options, raw: true})
}

function Department(interaction, IDENT) {
    this.interaction = interaction;
    this.interaction.DepartmentIDENT = IDENT;
    this.IDENT = IDENT;
}

async function LogGeneral(interaction, color, title, description, ...fields){
    try{
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

    let Channel = (await SQL.models.Department.findByPk(String(interaction.DepartmentIDENT), {raw: true}));

    if(Channel.generalLogChannel != null && Channel.generalLogChannel){
        try{
            Channel =  await interaction.guild.channels.fetch(Channel.generalLogChannel);
        }catch (err){
            return;
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

    let Channel = (await SQL.models.Department.findByPk(String(interaction.DepartmentIDENT), {raw: true}));

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


Department.prototype = {
    setGeneralLog: async function(channel){
        return await SQL.models.Department.update({generalLogChannel: channel.id}, {where: {IDENT: this.IDENT}})
    },
    setActivityLog: async function(channel){
        return await SQL.models.Department.update({activityLogChannel: channel.id}, {where: {IDENT: this.IDENT}})

    },
    clearShifts: async function(){
        try{
            const depName = await this.getName();
            await LogActivity(this.interaction, "Orange", "Shifts Cleared", `All logged shifts for ${depName} have been cleared by <@${this.interaction.user.id}>.`)
            return await SQL.models.Shift.destroy({where: {entityIDENT: this.IDENT}})
        }catch(err){
            console.log(err)
        }
    },
    removeShift: async function(selectedShift){
        try {
            const depName = await this.getName();
            await LogActivity(this.interaction, "Orange", "Shift Removed", `A shift logged has been removed from ${depName} by <@${this.interaction.user.id}>.`)
            return await SQL.models.Shift.destroy({where: {IDENT: selectedShift}});
        }catch(err){
            console.log(err)
        }
    },
    executeShiftPayout: async function(processEmbed, ShiftSummaries){
        const depBalance = await this.getBalance();
        const exeMsg = "<a:loading:1121922926313218120> Executing Payroll... \n";
        let desc = ""
        let fullyProcessed = true;

        for(const userKey of Object.keys(ShiftSummaries)){
            const curUser = ShiftSummaries[userKey]
            const UsersHQ = ShiftSummaries[userKey].userHQ;
            const amount = curUser.grandTotal
            const usersAccounts = await UsersHQ.getBasicAccounts();
            const account = usersAccounts.bank

            const revenueService = new IRS(this.interaction);
            const amountAT = await revenueService.calculatePayrollTax(amount);

            if(0 > (Number(depBalance)-Number(curUser.grandTotal))){
                desc = desc + `\\🔴 Unable To Process Payroll For ${curUser.displayName}. Insufficient Funds. \n`
                fullyProcessed = false;

                processEmbed.setDescription(exeMsg+desc)
                await this.interaction.editReply({embeds: [processEmbed]})
                continue
            }

            await SQL.models.Department.update({balance: (Number(depBalance)-Number(amountAT.total))}, {where: {IDENT: this.IDENT}});
            await SQL.models.Accounts.update({balance: (Number(account.balance)+Number(amountAT.total))}, {where: {IDENT: account.IDENT}});

            await revenueService.filePayrollTax(amountAT.tax, this, 'Department');

            let reason = "PAYROLL Through ECON Shifts. Total Hours:"+curUser.totalTime+"."

            const Transaction =  await SQL.models.AdvTransactionLogs.create({
                guild: this.interaction.IDENT,
                amount: amountAT.total,
                creditAccount: this.IDENT,
                debitAccount: account.IDENT,
                creditType: "Department",
                debitType: "Account",
                memo: reason
            }).catch(err=>console.log(err))

            if (amount >= 5000){
                await Notify.flagNotification(this.interaction, Transaction)
            }
            desc = desc + `\\🟢 Processed Payroll For ${curUser.displayName}. \n`

            processEmbed.setDescription(exeMsg+desc)
            await this.interaction.editReply({embeds: [processEmbed]})
        }

        if(fullyProcessed === false){
            processEmbed.setDescription("There was an error with one or more payroll executions.\n"+desc)
                .setTitle('Unable To Fully Process Payroll Through ECON Shifts.')
                .setColor("Red")
            await this.interaction.editReply({embeds: [processEmbed]})
            await LogActivity(this.interaction, 'Orange', 'Shift Payroll Partially Distributed', desc)

            return
        }

        processEmbed.setDescription(desc)
            .setTitle('Successfully Processed Payroll Through ECON Shifts.')
            .setColor("Green")
        await this.interaction.editReply({embeds: [processEmbed]})
        await LogActivity(this.interaction, 'Green', 'Shift Payroll Distributed', desc)

    },
    getBasePay: async function(){
        const dep = await SQL.models.Department.findByPk(this.IDENT, {raw: true})

        return dep.basePay
    },
    setBasePay: async function(amount){
        return await SQL.models.Department.update({basePay: Number(amount)}, {where: {IDENT: this.IDENT}});
    },
    getAdditionalPayRoles: async function(){
        return await SQL.models.RolePay.findAll({where: {entityIDENT: this.IDENT}, raw: true})
    },
    addRolePay: async function(role, amount){
        try{
            const depName = await this.getName();

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
                    entityType: 'department',
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
                entityType: 'department',
                GuildIDENT: this.interaction.guild.id,
                additionalPay: Number(amount)
            });

            await LogGeneral(this.interaction, 'Green', 'Role Pay Binded', `A new Additional Pay Role (<@${role.id}>) was binded. Additional Pay for this role has been set to \`\`${MoneyFormat.format(amount)}\`\`.`)
            return createdRole;
        }catch(err){
            console.log(err)
        }
    },
    removeRolePay: async function(role){
        try{
            const dataResult = await SQL.models.RolePay.destroy({
                where: {
                    [Op.and]: [
                        {id: role.id},
                        {entityIDENT: this.IDENT}
                    ]
                }
            })

            await LogGeneral(this.interaction, "Red", "Role Pay Removed", `The Additional Pay from <@#${role.id}> has been removed.`)
        }catch(err){
            console.log(err)
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

            const depName = await this.getName();
            await LogActivity(this.interaction, "Green", "Shift Logged", `A new shift has been logged to **${depName}**.`,
                {name: 'Logged By', value: `<@${this.interaction.user.id}> (${this.interaction.member.displayName})`, inline: true},
                {name: 'Hours logged', value: totalHours, inline: true})

            return dataResult
        }catch(e){
            console.warn(e);
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
    getMemberRole: async function(){
        const Department = await SQL.models.Department.findByPk(this.IDENT, {raw: true})
        return Department.memberRole;
    },
    getFees: async function(viewAll){
        const Department = await SQL.models.Department.findByPk(this.IDENT, {raw: false})

        if(!viewAll) return await Department.getFees({limit: 15, raw: true})
        return await Department.getFees({raw: true})
    },
    getCitations: async function(){
        const Department = await SQL.models.Department.findByPk(this.IDENT, {raw: false})
        return await Department.getCitations({raw: true});
    },
    issueFee: async function(FEE, Account, client){
        if((Number(Account.balance)-Number(FEE.amount))<0){
            return 'Insufficient Funds'
        }
        const Treausry = await SQL.models.Guilds.findByPk(this.interaction.IDENT);

        await SQL.models.AdvTransactionLogs.create({
            guild: this.interaction.IDENT,
            amount: FEE.amount,
            creditAccount: Account.IDENT,
            debitAccount: this.interaction.IDENT,
            creditType: "Account",
            debitType: "Treasury",
            memo: String(`${await this.getName()} Fee For ${FEE.reason}.`)
        }).catch(err=>console.log(err))
        await SQL.models.Guilds.update({balance: ((Number(Treausry.balance)+Number(FEE.amount)))}, {where: {IDENT: this.interaction.IDENT}});
        await SQL.models.Accounts.update({balance: (Number(Account.balance)-Number(FEE.amount))}, {where: {IDENT: Account.IDENT}})
        const depName = await this.getName();
        const guildManager = new Guild(this.interaction);
        await LogActivity(this.interaction, 'Orange', "Fee Issued", `A Fee Has Been Issued To <@${FEE.client.id}> By \`\`${depName}\`\`.`, {name: "Amount", value: `${await guildManager.formatMoney(FEE.amount)}`, inline: true},
            {name: 'Reason', value: FEE.reason, inline: true}, {name: 'Issued By', value: `<@${FEE.issuer.id}>`, line: true})

        return await SQL.models.Fee.create({
            guild: this.interaction.IDENT,
            fee: FEE.reason,
            amount: FEE.amount,
            client: FEE.client.IDENT,
            issuer: FEE.issuer.IDENT,
            department: this.IDENT
        })
    },
    issueCitation: async function (CITATION){
        try{
            await CITATION.issuer.getIDENT();
            await CITATION.violator.getIDENT()
            const dataResult = await SQL.models.Citation.create({
                guild: this.interaction.IDENT,
                cadRecordID: CITATION.citationID,
                character: CITATION.character,
                amount: CITATION.amount,
                violator: CITATION.violator.IDENT,
                issuer: CITATION.issuer.IDENT,
                department: this.IDENT
            })

            const depName = await this.getName();
            const guildManager = new Guild(this.interaction);
            await LogActivity(this.interaction, 'Orange', "Fine Issued", `A Fine Has Been Issued To <@${CITATION.violator.id}> By \`\`${depName}\`\`.`, {name: "Amount", value: `${await guildManager.formatMoney(CITATION.amount)}`, inline: true},
                {name: 'Fine-ID', value: CITATION.citationID, inline: true}, {name: 'Issued By', value: `<@${CITATION.issuer.id}>`, inline: true})

            return dataResult
        }catch(err){
            console.log(err)
        }
    },
    editDepartment: {
        name: async function(Department, name){
            try {
                const depName = await Department.getName()
                await LogGeneral(Department.interaction, 'Orange', 'Department Name Changed', `${depName} name has been changed to \`\`${name}\`\`.`)
            }catch(err){
                console.log(err)
                await ErrorEmbed(Department.interaction, err.message, true, false)
            }
            return await SQL.models.Department.update({name: name}, {where: {IDENT: Department.IDENT}})
        },
        description: async function(Department,description){
            try {
                const depName = await Department.getName()
                await LogGeneral(Department.interaction, 'Orange', 'Department Description Changed', `${depName} description has been changed to \n > ${description}.`)
            }catch(err){
                console.log(err)
                await ErrorEmbed(Department.interaction, err.message, true, false)
            }
            return await SQL.models.Department.update({description: description}, {where: {IDENT: Department.IDENT}})
        },
        headRole: async function (Department,headRole){
            const DEPARTMENT = await SQL.models.Department.findByPk(Department.IDENT);

            //Updates the role-bind
            await SQL.models.DepartmentRoles.update({id: headRole.id, permissions: ["Member", "Department-Head"]}, {where: {
                    [Op.and]: [
                        {DepartmentIDENT: Department.IDENT},
                        {id: DEPARTMENT.headRole}
                    ]}})

            try {
                const depName = await Department.getName()
                await LogGeneral(Department.interaction, 'Orange', 'Department Head Role Changed', `${depName} Head Role has been changed to <@&${headRole.id}>.`)
            }catch(err){
                console.log(err)
                await ErrorEmbed(Department.interaction, err.message, true, false)
            }
            //Updates the department infomation to reflect the change.
            return await SQL.models.Department.update({headRole: headRole.id}, {where: {IDENT: Department.IDENT}}).catch(async err=>{
                console.warn(err)
                await ErrorEmbed(this.interaction, err.message)
            })
        },
        departmentRole: async function(Department,departmentRole){

            const DEPARTMENT = await SQL.models.Department.findByPk(Department.IDENT);

            //Updates the role-bind
            await SQL.models.DepartmentRoles.update({id: departmentRole.id, permissions: ["Member"]}, {where: {
                    [Op.and]: [
                        {DepartmentIDENT: Department.IDENT},
                        {id: DEPARTMENT.memberRole}
                    ]}})
            try {
                const depName = await Department.getName()
                await LogGeneral(Department.interaction, 'Orange', 'Department Role Changed', `${depName} Role has been changed to <@&${departmentRole.id}>.`)
            }catch(err){
                console.log(err)
                await ErrorEmbed(Department.interaction, err.message, true, false)
            }
            //Updates the department info to reflect the changes.
            return await SQL.models.Department.update({memberRole: departmentRole.id}, {where: {IDENT: Department.IDENT}})
        },
        departmentBudget: async function(Department, departmentBudget){
            try {
                const depName = await Department.getName()
                await LogGeneral(Department.interaction, 'Orange', 'Department Budget Changed', `${depName} budget has been changed to \`\`${departmentBudget}\`\`.`)
            }catch(err){
                console.log(err)
                await ErrorEmbed(Department.interaction, err.message, true, false)
            }
            return await SQL.models.Department.update({budget: departmentBudget}, {where: {IDENT: Department.IDENT}})
        },
        maxBalance: async function(Department, maxBal){
            try {
                const depName = await Department.getName()
                const guildManager = new Guild(Department.interaction);

                await LogGeneral(Department.interaction, 'Orange', 'Department Max Balance Changed', `${depName} max balance has been changed to ${await guildManager.formatMoney(maxBal)}.`)
            }catch(err){
                console.log(err)
                await ErrorEmbed(Department.interaction, err.message, true, false)
            }
            return await SQL.models.Department.update({maxBalance: maxBal}, {where: {IDENT: Department.IDENT}})
        }
    },
    addRoleBind: async function (role, permissions){
        let violaton = null;
        try {
            permissions.push("Member")
            const depName = await this.getName()
            
            let foundBind = await SQL.models.DepartmentRoles.findOne({
                where: {
                    [Op.and]: [
                        {DepartmentIDENT: this.IDENT},
                        {GuildIDENT: this.interaction.guild.id},
                        {id: role.id},
                    ]
                }
            });

            if (await foundBind.permissions.find(v=> v === "Department-Head")){
                violaton ="The Department Head Role cannot be added as a role-bind. This role may not be edited through role-bind commands."
              throw new Error(violaton)
            }
            
            await LogGeneral(this.interaction, 'Green', 'New Department Role', `<@&${role.id}> has been binded to ${depName}.`)
            
            if(foundBind){
                let updatedBind = await SQL.models.DepartmentRoles.update({
                    DepartmentIDENT: this.IDENT,
                    GuildIDENT: this.interaction.guild.id,
                    id: role.id,
                    permissions: permissions
                },
                {
                    where: {
                        [Op.and]: [
                            {DepartmentIDENT: this.IDENT},
                            {GuildIDENT: this.interaction.guild.id},
                            {id: role.id},
                        ]
                    }
                });
                
                
                return updatedBind
            }
            
            let createdBind = await SQL.models.DepartmentRoles.create({
                DepartmentIDENT: this.IDENT,
                GuildIDENT: this.interaction.guild.id,
                id: role.id,
                permissions: permissions
            });

            return createdBind
        }catch(err){
            console.log(err)
            await ErrorEmbed(this.interaction, err.message, false, false)
        }


     
        if(violaton !== ""){
            console.error("Throwing validation error")
            throw new Error(violaton)
        }

        return await SQL.models.DepartmentRoles.create({
            DepartmentIDENT: this.IDENT,
            GuildIDENT: this.interaction.IDENT,
            id: role.id,
            permissions: permissions
        }).catch(async err => {
            console.error(err);
            return await ErrorEmbed(this.interaction, `An error occurred: ${err.message}`, false,true)
        })
    },
    removeRoleBind: async function (interaction, role){
         let foundBind = await SQL.models.DepartmentRoles.findOne({
                where: {
                    [Op.and]: [
                        {DepartmentIDENT: this.IDENT},
                        {GuildIDENT: this.interaction.guild.id},
                        {id: role.id},
                    ]
                }
            });

        if (await foundBind.permissions.find(v=> v === "Department-Head")){
            violaton ="The Department Head Role cannot be removed. This role may not be edited through role-bind commands."
              throw new Error(violaton)
        }

        try {
            const depName = await this.getName()
            await LogGeneral(interaction, 'Orange', 'Department Role Removed', `<@&${role.id}> has been removed from ${depName}.`)
        }catch(err){
            console.log(err)
            await ErrorEmbed(interaction, err.message, true, false)
        }
        return await SQL.models.DepartmentRoles.destroy({where: {IDENT: role.IDENT}}).catch(err=>console.error(err))
    },
    getName: async function(){
        const department = await SQL.models.Department.findByPk(String(this.IDENT), {raw: true})
        return department.name;
    },
    getBalance: async function(){
        const department = await SQL.models.Department.findByPk(this.IDENT, {raw: true})
        return department.balance;
    },
    getMaxBalance: async function(){
        const department = await SQL.models.Department.findByPk(this.IDENT, {raw: true})
        return department.maxBalance;
    },
    getRoles: async function(){
        return await SQL.models.DepartmentRoles.findAll({where: {DepartmentIDENT: this.IDENT}, raw: true}).catch(err=> console.error(err))
    },
    dissolve: async function(){
        try {
            const depName = await this.getName()
            await LogGeneral(this.interaction, 'Red', 'Department Dissolved', `${depName} has been dissolved (deleted).`)
        }catch(err){
            console.log(err)
            await ErrorEmbed(this.interaction, err.message, true, false)
        }
        return await SQL.models.Department.destroy({where: {IDENT: this.IDENT}, force: true}).catch(async err => {
            console.error(err);
            return await ErrorEmbed(this.interaction, `An error occurred: ${err.message}`, false,true)
        })
    },
    getBudgetTimestamp: async function(){
        const Department = await SQL.models.Department.findByPk(this.IDENT, {raw: true})
        return Department.budgetTimestamp
    },
    getShiftSettings: async function(){
        const Department = await SQL.models.Department.findByPk(this.IDENT, {raw: true})
        let shiftSettings = {};

        shiftSettings.basePay = Department.basePay;
        return shiftSettings;
    },
    claimBudget: async function(){
        const Department = await SQL.models.Department.findByPk(this.IDENT, {raw: true})
        const Time = new Date();
        let allottedBudget = Department.budget
        const Treausry = await SQL.models.Guilds.findByPk(this.interaction.IDENT);

        const Balance = Department.balance
        const MaxBal = Department.maxBalance

        try{
            if(MaxBal !== null && Number(Balance) >= Number(MaxBal)){
                return "Maxed Balance"
            }


            if((Number(Balance)+Number(allottedBudget)) > Number(MaxBal) && MaxBal !== null){
                allottedBudget = Number(allottedBudget) - ((Number(Balance)+Number(allottedBudget))-Number(MaxBal));
            }

            await SQL.models.AdvTransactionLogs.create({
                guild: this.interaction.IDENT,
                amount: allottedBudget,
                creditAccount: this.interaction.IDENT,
                debitAccount: this.IDENT,
                creditType: "Treasury",
                debitType: "Department",
                memo: "Claimed Budget."
            }).catch(err=>console.log(err))
            await SQL.models.Guilds.update({balance: ((Number(Treausry.balance)-Number(allottedBudget)))}, {where: {IDENT: this.interaction.IDENT}});
             await SQL.models.Department.update({balance: (Number(allottedBudget)+Number(Department.balance)), budgetTimestamp: Time}, {where: {IDENT: this.IDENT}})
        }catch(err){
            console.log(err);
            return await ErrorEmbed(this.interaction, err.message, false, false)
        }

    },
    getBudget: async function(){
        const Department = await SQL.models.Department.findByPk(this.IDENT, {raw: true})
        return Department.budget;
    },
    payMember: async function(user, amount){
        const accounts = await user.getBasicAccounts();
        const depBalance = await this.getBalance();

        const revenueService = new IRS(this.interaction);
        const amountAT = await revenueService.calculatePayrollTax(amount);

        await SQL.models.Department.update({balance: (Number(depBalance)-Number(amountAT.total))}, {where: {IDENT: this.IDENT}});
        await SQL.models.Accounts.update({balance: (Number(accounts.bank.balance)+Number(amountAT.total))}, {where: {IDENT: accounts.bank.IDENT}});

        await revenueService.filePayrollTax(amountAT.tax, this, 'Department')

        let reason = "DEPARTMENT PAYOUT"

        const Transaction =  await SQL.models.AdvTransactionLogs.create({
            guild: this.interaction.IDENT,
            amount: amountAT.total,
            creditAccount: this.IDENT,
            debitAccount: accounts.bank.IDENT,
            creditType: "Department",
            debitType: "Account",
            memo: reason
        }).catch(err=>console.log(err))

        // if (amount >= 5000){
        //     await Notify.flagNotification(this.interaction, Transaction)
        // }
        return Transaction
    },
    processPayroll: async function (account, amount) {
        const depBalance = await this.getBalance();

        if (0 > (Number(depBalance) - Number(amount))) {
            return "Insufficient Funds"
        }

        const revenueService = new IRS(this.interaction);
        const amountAT = await revenueService.calculatePayrollTax(amount);

        await SQL.models.Department.update({balance: (Number(depBalance) - Number(amountAT.total))}, {where: {IDENT: this.IDENT}});
        await SQL.models.Accounts.update({balance: (Number(account.balance) + Number(amountAT.total))}, {where: {IDENT: account.IDENT}});

        await revenueService.filePayrollTax(amountAT.tax, this, 'Department')

        let reason = "PAYROLL"

        const Transaction = await SQL.models.AdvTransactionLogs.create({
            guild: this.interaction.IDENT,
            amount: amountAT.total,
            creditAccount: this.IDENT,
            debitAccount: account.IDENT,
            creditType: "Department",
            debitType: "Account",
            memo: reason
        }).catch(err => console.log(err))

        // if (amount >= 5000){
        //     await Notify.flagNotification(this.interaction, Transaction)
        // }
        return Transaction
    },
    payBusiness: async function (business, amount) {
        const balance = await business.getBalance();
        const depBalance = await this.getBalance();
        await SQL.models.Department.update({balance: (Number(depBalance) - Number(amount))}, {where: {IDENT: this.IDENT}});
        await SQL.models.Accounts.update({balance: (Number(balance) + Number(amount))}, {where: {IDENT: business.IDENT}});
        const Transaction = await SQL.models.AdvTransactionLogs.create({
            guild: this.interaction.IDENT,
            amount: amount,
            creditAccount: this.IDENT,
            debitAccount: business.IDENT,
            creditType: "Department",
            debitType: "Account",
            memo: "DEPARTMENT PAYOUT"
        }).catch(err => console.log(err))

        const guildManager = new Guild(this.interaction);
        const depName = await this.getName()
        const paidBusName = await business.getName()

        await LogGeneral(this.interaction, "Green", "Business Paid", `${paidBusName} has been paid ${await guildManager.formatMoney(amount)} from ${depName}.`)

        // if (amount >= 5000){
        //     await Notify.flagNotification(this.interaction, Transaction)
        // }
        return Transaction
    },
    payDepartment: async function(department, amount){
        const balance = await department.getBalance();
        const depBalance = await this.getBalance();
        await SQL.models.Department.update({balance: (Number(depBalance)-Number(amount))}, {where: {IDENT: this.IDENT}});
        await SQL.models.Department.update({balance: (Number(balance)+Number(amount))}, {where: {IDENT: department.IDENT}});
        const Transaction = await SQL.models.AdvTransactionLogs.create({
            guild: this.interaction.IDENT,
            amount: amount,
            creditAccount: this.IDENT,
            debitAccount: department.IDENT,
            creditType: "Department",
            debitType: "Department",
            memo: "DEPARTMENT PAYOUT"
        }).catch(err=>console.log(err))

        const guildManager = new Guild(this.interaction);
        const depName = await this.getName()
        const paidDepName = await department.getName()

        await LogGeneral(this.interaction, "Green", "Department Paid", `${paidDepName} has been paid ${await guildManager.formatMoney(amount)} from ${depName}.`)


        // if (amount >= 5000){
        //     await Notify.flagNotification(this.interaction, Transaction)
        // }
        return Transaction
    },
    getFullDetail: async function(){
        return await SQL.models.Department.findByPk(this.IDENT, {raw: true})
    }
}

module.exports = Department;