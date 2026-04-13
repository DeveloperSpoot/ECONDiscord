const { DataTypes} = require("sequelize");
const DB = require("../Server.js");

const PERMISSIONS = ['Department-Head', 'Member', 'Department-Management', 'Payroll-Management', 'Shift-Management', 'Finance-Management', 'Citation-Management', 'Vehicle-Management', 'Inventory-Management', 'Submit-ShiftLogs', 'Submit-Citations', 'Submit-Incidents'];

function buildPermissionsField(defaultValue, allowNull) {
    const isSQLite = DB.getDialect && DB.getDialect() === "sqlite";
    if (isSQLite) {
        return {
            type: DataTypes.TEXT,
            allowNull,
            defaultValue: JSON.stringify(defaultValue ?? []),
            get() {
                const raw = this.getDataValue("permissions");
                if (!raw) {
                    return [];
                }
                try {
                    return JSON.parse(raw);
                } catch (err) {
                    console.error("Failed to parse department role permissions", err);
                    return [];
                }
            },
            set(value) {
                const next = Array.isArray(value) ? value : [];
                this.setDataValue("permissions", JSON.stringify(next));
            }
        };
    }

    return {
        type: DataTypes.ARRAY(DataTypes.ENUM(...PERMISSIONS)),
        allowNull,
        defaultValue
    };
}

const DepartmentRoles = DB.define("DepartmentRoles", {
    IDENT: {
        primaryKey: true,
        type: DataTypes.UUID,
        allowNull: false,
        defaultValue: DataTypes.UUIDV4
    },
    permissions: buildPermissionsField(['Member'], false),
    id: {
        type: DataTypes.TEXT,
        allowNull: false,
    }
})
module.exports = DepartmentRoles;
DepartmentRoles.belongsTo(DB.models.Guilds, {foreignKey: 'GuildIDENT'});
DB.models.Guilds.hasMany(DepartmentRoles);
DepartmentRoles.belongsTo(DB.models.Department, {foreignKey: 'DepartmentIDENT'});
DB.models.Department.hasMany(DepartmentRoles);
