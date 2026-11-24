const { BusinessHQ, DepartmentHQ } = require("../dataCrusher/Headquarters");
const { activeBusiness, activeDepartment } = require("../dataCrusher/Headquarters").CacheManager;
const {ErrorEmbed} = require("../utils/embedUtil")

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
    if (interaction.isAutocomplete()) {
        await interaction.respond([
            {
                name: "Error, please set a business first using the set command.",
                value: "Error",
            },
        ]);
        return [null, null]
    };

    const activeBus = await activeBusiness.get(`${interaction.IDENT}-${interaction.user.id}`)

    if (activeBus == null) {
        await ErrorEmbed(interaction,
            "Please select a business first by using /set business!"
        );

        return [null, null]
    }

    const business = new BusinessHQ(
        interaction,
        await activeBusiness.get(`${interaction.IDENT}-${interaction.user.id}`)
    );
    const busName = await business.getName();

    return [business, busName]
}

async function Department(interaction) {
    if (interaction.isAutocomplete()) {
        await interaction.respond([
            {
                name: "Error, please set a business first using the set command.",
                value: "Error",
            },
        ]);
        return [null, null]
    };

    const activeDep = await activeDepartment.get(`${interaction.IDENT}-${interaction.user.id}`)

    if (activeDep == null) {
        await ErrorEmbed(interaction,
            "Please select a business first by using /set business!"
        );

        return [null, null]
    }

    const department = new DepartmentHQ(
        interaction,
        await activeDep
    );
    const depName = await department.getName();

    return [department, depName]
}

module.exports = { Business, Department }