const {ErrorEmbed} = require("../../utils/embedUtil");
const {Op} = require("sequelize");
const SQL = require("../Server");

module.exports = {
    getAccount: async function (interaction, AdvLog, includeName) {
        let Cred;
        let CName;
        let Deb;
        let DName;
        switch (AdvLog.creditType) {
            case 'Treasury': {
                Cred = await SQL.models.Guilds.findByPk(AdvLog.creditAccount);
                (includeName ? (CName = await interaction.guild.name) : (CName = null))
                break
            }
            case 'Department': {
                Cred = await SQL.models.Department.findByPk(AdvLog.creditAccount);
                if(Cred === null) {return}
                (includeName ? (CName = Cred.name) : (CName = null))
                break
            }
            case 'Account': {
                Cred = await SQL.models.Accounts.findByPk(AdvLog.creditAccount);
                if (includeName) {
                    if(Cred === null) {return}
                    if(Cred.type === 'business'){
                        CName = Cred.name
                    }else {
                        const Owner = await Cred.getGuildMember();
                        CName = "User Left "+Owner.id

                        try {
                            const DisUser = await interaction.guild.members.fetch(Owner.id);
                            CName = DisUser.displayName;
                        }catch(err){
                            CName = "User Left "+Owner.id
                            if(err.message==='Unknown Member')return;
                            console.log(err)
                        }
                    }
                } else {
                    CName = null
                }
                break
            }
        }
        switch (AdvLog.debitType) {
            case 'Treasury': {
                Deb = await SQL.models.Guilds.findByPk(AdvLog.debitAccount);
                (includeName ? (DName = await interaction.guild.name) : (DName = null))
                break
            }
            case 'Department': {
                Deb = await SQL.models.Department.findByPk(AdvLog.debitAccount);
                if(Deb === null) {return DName = "DeletedDepartment"};
                (includeName ? (DName = Deb.name) : (DName = null))
                break
            }
            case 'Account': {
                Deb = await SQL.models.Accounts.findByPk(AdvLog.debitAccount);
                if (includeName) {
                    if(Deb === null) {return DName = "DeletedAccount"};
                    if(Deb.type === 'business'){
                        DName = Deb.name
                    }else{
                        const Owner = await Deb.getGuildMember();
                        DName = "User Left "+Owner.id

                        try {
                            const DisUser = await interaction.guild.members.fetch(Owner.id);
                            DName = DisUser.displayName;
                        }catch(err){
                            DName = "User Left "+Owner.id
                            if(err.message==='Unknown Member')return;
                            console.log(err)
                        }
                    }

                } else {
                    DName = null
                }
                break
            }
        }
        return {
            credit: Cred,
            debit: Deb,
            creditName: CName,
            debitName: DName
        }
    },
    getBasicName: async function (interaction, Log) {
        const Cred = await SQL.models.Accounts.findByPk(Log.creditAccount);

        let CredOwner;
        let CredDisUser;
        
        if(Cred == null){
            CredDisUser = {displayName: "DeletedAccount"}
        }else if(Cred?.type == "business"){
            CredOwner = null
            CredDisUser = {}
            CredDisUser.displayName = Cred.name
        }else{
             CredOwner = await Cred.getGuildMember({raw: true});
             CredDisUser = {displayName: "User Left "+CredOwner.id}
             try {
                CredDisUser = await interaction.guild.members.fetch(CredOwner.id)
             }catch(err){
                 CredDisUser = {displayName: "User Left "+CredOwner.id}
                 if(err.message==='Unknown Member')return;
                 console.log(err)
             }
        }

        const Deb = await SQL.models.Accounts.findByPk(Log.debitAccount);
        let DebOwner;
        let DebDisUser;

        if(Deb == null){
            DebDisUser = {displayName: "DeletedAccount"}
        }else if(Deb.type == "business"){
            DebOwner = null
            DebDisUser = {};
            DebDisUser.displayName = Deb.name
        }else {
             DebOwner = await Deb.getGuildMember({raw: true});
             DebDisUser = {displayName: "User Left "+DebOwner.id}
             try {
                 DebDisUser = await interaction.guild.members.fetch(DebOwner.id)
             }catch (err) {
                 DebDisUser = {displayName: "User Left "+DebOwner.id}
                 if(err.message==='Unknown Member')return;
                 console.log(err)
             }

        }
        return {
            creditName: CredDisUser.displayName,
            debitName: DebDisUser.displayName
        }
    }
}