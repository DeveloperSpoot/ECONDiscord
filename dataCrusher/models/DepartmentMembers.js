const { DataTypes} = require("sequelize");
const DB = require("../Server.js");

const PERMISSIONS = ['Department-Head', 'Member', 'Department-Management', 'Payroll-Management', 'Shift-Management', 'Finance-Management', 'Citation-Management', 'Vehicle-Management', 'Inventory-Management', 'Submit-ShiftLogs', 'Submit-Citations', 'Submit-Incidents'];

function buildPermissionsField(allowNull) {
    const isSQLite = DB.getDialect && DB.getDialect() === "sqlite";
    if (isSQLite) {
        return {
            type: DataTypes.TEXT,
            allowNull,
            defaultValue: allowNull ? null : JSON.stringify([]),
            get() {
                const raw = this.getDataValue("permissions");
                if (!raw) {
                    return [];
                }
                try {
                    return JSON.parse(raw);
                } catch (err) {
                    console.error("Failed to parse department member permissions", err);
                    return [];
                }
            },
            set(value) {
                if (value == null) {
                    this.setDataValue("permissions", allowNull ? null : JSON.stringify([]));
                    return;
                }
                const next = Array.isArray(value) ? value : [];
                this.setDataValue("permissions", JSON.stringify(next));
            }
        };
    }

    return {
        type: DataTypes.ARRAY(DataTypes.ENUM(...PERMISSIONS)),
        allowNull
    };
}

const DepartmentMembers = DB.define("DepartmentMembers", {
    IDENT: {
        primaryKey: true,
        type: DataTypes.UUID,
        allowNull: false,
        defaultValue: DataTypes.UUIDV4
    },
    permissions: buildPermissionsField(true),
    rank: {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue: 'null'
    }

})
module.exports = DepartmentMembers;
DepartmentMembers.belongsTo(DB.models.Guilds, {foreignKey: 'GuildIDENT'});
DB.models.Guilds.hasMany(DepartmentMembers);
DepartmentMembers.belongsTo(DB.models.Department, {foreignKey: 'DepartmentIDENT'});
DB.models.Department.hasMany(DepartmentMembers);
DB.models.GuildMembers.hasMany(DepartmentMembers);
DepartmentMembers.belongsTo(DB.models.GuildMembers, {foreignKey: 'MemberIDENT'});
