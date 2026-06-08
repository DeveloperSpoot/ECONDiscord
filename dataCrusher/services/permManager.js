const keyV = require("keyv")
const {Op} = require("sequelize");
const SQL = require("../Server");
const { PermissionsBitField } = require("discord.js");

const permissionCache = new keyV();

const permTypes = new Map([["owner", 7],["admin", 6], ["lead", 5],["manager", 4], ["supervisor", 3], ["pos", 2], ["view-only", 1]]) // Permission levels are all strings, which is hard t compare, thus this enum of sorts, is needed to compare permissions. Using a Map allows us to pass the perm (String) directly and compare it.
async function getGuildMember(disID, guildID) {
    const options = {
        [Op.and]: [
            {guild: String(guildID)},
            {id: String(disID)}]
    }

    return await SQL.models.GuildMembers.findOne({ where: options, raw: true})
}

async function checkTreasuryAuth(interaction, user){
    if(interaction.IDENT !== interaction.guildId){return false}
    if(interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) && interaction.IDENT === interaction.guildId){
        return true
    }
    
    const User = await getGuildMember(user.id, interaction.IDENT);
    if(User === null){
        return null
    }
    return await SQL.models.AuthorizedUsers.findOne({where: {id: User.IDENT}})
}

module.exports = {
    Business: {
    /***************************************************************************************************************
     * Checks if a user has the required permission that is passed through.
     * @param {BusinessHQ} business The business Object of which the permission is from.
     * @param {Object} interaction The Discord interaction, of which the Member shall be verified.
     * @param {String} perm The permission in which the user is required to have.
     * @returns {Promise<boolean>}
     **************************************************************************************************************/
    checkPerm: async(business, interaction, perm)=>{
        const cacheMember = await permissionCache.get(`${interaction.user.id}-${business.IDENT}`);
        const treasuerAuth = await checkTreasuryAuth(interaction, interaction.user);

        if(interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)){
            return true;
        }

        if(treasuerAuth ){
            return true;
        }
        
        if(cacheMember !== undefined){ // No Need to call the database if we already have the permissions, which is updated every 5 minutes when needed.
            if(await business.getOwner() === cacheMember.id){return true} // Bypass for the owner of the business, which is needed because the owner is not an employee.

            if(permTypes.get(cacheMember.level) >= permTypes.get(perm)){
                return true
            }else{
                interaction.reply(`You are not authorized to perform such action, ${perm}+ permission level required.`)
                return false
            }
        }else{
            const businessOwner = await business.getOwner();
            const employee = await business.getEmployeeByDiscord(interaction.user.id, interaction.IDENT);
            const guildMember = await getGuildMember(interaction.user.id, interaction.IDENT);

            if(businessOwner === guildMember.IDENT){
                await permissionCache.set(`${interaction.user.id}-${business.IDENT}`, {id: guildMember.IDENT, level: "owner"}, 300000);
                return true
            }
            if(employee === null){return false} // If the employee does not exist (AKA NOT an employee), return false.

            await permissionCache.set(`${interaction.user.id}-${business.IDENT}`, employee, 300000); // Caching the permissions in case the user gos on to perform more actions within 5 minutes.
            if(permTypes.get(employee.level) >= permTypes.get(perm)){
                return true
            }else{
                interaction.reply(`You are not authorized to perform such action, ${perm}+ permission level required.`)
                return false
            }
        }
    },
    /***************************************************************************************************************
     * Compares two users, confirming rather or not the user has a higher hierarchy then the checkee.
     * @param {BusinessHQ} business The business IDENT of which the permission is from.
     * @param {Object} interaction The Discord interaction of which the member, shall be checked to have a higher hierarchy.
     * @param {Object} checkee Discord user object, in which the users' permissions should be compared to.
     * @returns {Promise<boolean>}
     **************************************************************************************************************/
    compareUsers: async(business, interaction, checkee)=>{
        const cacheMember = await permissionCache.get(`${interaction.member.id}-${business.IDENT}`);
        const cacheCheckee = await permissionCache.get(`${checkee.id}-${business.IDENT}`);
        const treasuerAuth = await checkTreasuryAuth(interaction, interaction.user)

        if(interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)){
            return true;
        }

        if(treasuerAuth ){
            return true;
        }

        if(typeof cacheMember !== 'undefined' && typeof cacheCheckee!== 'undefined'){

            if(await business.getOwner() === cacheMember.id){return true}
            if(permTypes.get(cacheMember.level) > permTypes.get(cacheCheckee.level)){
                return true
            }else{
                interaction.reply(`You are not authorized to perform such action.`)
                return false
            }
        }else{
            const employee = await business.getEmployeeByDiscord(interaction.member.id, interaction.member.guild.id);
            const employeeToCompare = await business.getEmployeeByDiscord(checkee.id, interaction.member.guild.id)
            const guildMember = await getGuildMember(interaction.member.id, interaction.member.guild.id);

            if(employee === null){return false}
            if(await business.getOwner() === guildMember.IDENT){
                await permissionCache.set(`${interaction.member.id}-${business.IDENT}`, {id: guildMember.IDENT, level: "owner"}, 300000);
                return true
            }

            await permissionCache.set(`${interaction.member.id}-${business.IDENT}`, employee, 300000);
            await permissionCache.set(`${checkee.id}-${business.IDENT}`, employeeToCompare, 300000)

            if(permTypes.get(employee.level) > permTypes.get(employeeToCompare.level)){
                return true
            }else{
                interaction.reply(`You are not authorized to perform such action.`)
                return false
            }
        }
    },
    /***************************************************************************************************************
     * Removes cached business permission of a discord member. This is only required when a permission has been __revoked__.
     * @param {BusinessHQ} business The business IDENT of which the permission is from.
     * @param {Object} interaction The Discord interaction of which Member permissions shall be invalidated.
     * @returns {Promise<Boolean>} Returns succession status (true/false).
     **************************************************************************************************************/
    invalidate: async(business, interaction)=>{
        return await permissionCache.delete(`${interaction.member.id}-${business.IDENT}`);
    },
    // Server-level "business manager" authorization — allows managing businesses without full treasury access
    checkAuthorization: async function(interaction, user) {
        const User = await getGuildMember(user.id, interaction.IDENT);
        if (interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) return true;
        if (User === null) return null;
        return await SQL.models.AuthorizedUsers.findOne({ where: { id: User.IDENT, type: 'business' } });
    },
    authorize: async function(interaction, user) {
        const User = await getGuildMember(user.id, interaction.IDENT);
        return await SQL.models.AuthorizedUsers.findOrCreate({
            where: { id: User.IDENT, guild: interaction.IDENT, type: 'business' },
            defaults: { id: User.IDENT, guild: interaction.IDENT, type: 'business' }
        });
    },
    deauthorize: async function(interaction, user) {
        const User = await getGuildMember(user.id, interaction.IDENT);
        return await SQL.models.AuthorizedUsers.destroy({ where: { id: User.IDENT, guild: interaction.IDENT, type: 'business' } });
    }
    },
    Department: {
        checkPerm: async function(interaction, department, perm){
            const treasuerAuth = await checkTreasuryAuth(interaction, interaction.user)

            if(interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)){
                return true;
            }

            if(treasuerAuth ){
                return true;
            }
                const departmentRoles = await department.getRoles();
                let auth = false;
                console.warn('USER ROLES', interaction.member.roles.cache)
                for(const DR of departmentRoles){
                    if(interaction.member.roles.cache.some(r => r.id === DR.id)){
                        console.warn('1 P', DR)
                        if(DR.permissions.find(v => v === "Department-Head")) {
                            console.error("DH AUTH")
                            return auth = true;
                        }
                        if(DR.permissions.find(v => v === "Department-Management")) {
                            console.error("DM AUTH")
                            return auth = true;
                        }
                        if(DR.permissions.find(v => v === perm)) {
                            console.error("PERM AUTH")
                            return auth = true;
                        }
                    }
                }
                return auth
        }
    },
    Treasury: {
        checkAuthorization: async function(interaction, user){
            const User = await getGuildMember(user.id, interaction.IDENT);
            if(interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)){
                return true;
            }

            if(User === null){
                return null
            }
            return await SQL.models.AuthorizedUsers.findOne({where: {id: User.IDENT, type: 'treasury'}})
        },
        deauthorize: async function(interaction, user){
            const User = await getGuildMember(user.id, interaction.IDENT);
            return await SQL.models.AuthorizedUsers.destroy({where: {id: User.IDENT, type: 'treasury'}});
        }
    },
    CentralBank: {
        checkAuthorization: async function(interaction, user){
            const User = await getGuildMember(user.id, interaction.IDENT);
            if(interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)){
                return true;
            }

            if(User === null){
                return null
            }
            return await SQL.models.AuthorizedUsers.findOne({where: {id: User.IDENT, type: 'centralbank'}})
        },
        deauthorize: async function(interaction, user){
            const User = await getGuildMember(user.id, interaction.IDENT);
            return await SQL.models.AuthorizedUsers.destroy({where: {id: User.IDENT, type: 'centralbank'}});
        }
    },
}
