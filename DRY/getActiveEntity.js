const {BusinessHQ, DepartmentHQ} = require("../dataCrusher/Headquarters");
const {activeBusiness, activeDepartment} = require("../dataCrusher/Headquarters").CacheManager;


/**
 * TODO
 * 
 * getActiveEntity helper function, returns the user from cache and the active entity.
 * 
 * I.E. 
 * const (business, busName) = await getActiveEntity.Business(interaction)
 * const (department, depName) = await getActiveEntity.Department(interaction)
 */

async function Business(interaction) {
    const activeBus = await activeBusiness.get(`${interaction.IDENT}-${interaction.user.id}`)

    if(activeBus == null){
        await ErrorEmbed(interaction,
                "Please select a business first by using /set business!"
              );
        
        return (null, null)
    }

    const business = new BusinessHQ(
          interaction,
          await activeBusiness.get(`${interaction.IDENT}-${interaction.user.id}`)
        );
    const busName = await business.getName();

    return (business, busName)
}

async function Department(interaction){
    const activeDep = await activeDepartment.get(`${interaction.IDENT}-${interaction.user.id}`)

    if(activeDep == null){
        await ErrorEmbed(interaction,
                "Please select a business first by using /set business!"
              );
        
        return (null, null)
    }

    const department = new BusinessHQ(
          interaction,
          await activeDep
        );
    const depName = await business.getName();

    return (department, depName)
}

module.exports = {Business, Department}