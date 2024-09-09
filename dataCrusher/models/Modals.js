const Accounts = require("./Accounts");
const DiscordUsers = require("./DiscordUsers.js");
const Guilds = require("./Guilds.js");
const GuildMembers = require("./GuildMembers.js");
const TransactionLogs = require("./TransactionLogs.js");
const MoneyPrints = require("./MoneyPrints");
const Items = require("./Items.js");
const AuthorizedUsers = require("./AuthorizedUsers.js");
const Employees = require("./Employees.js");
const SellRecords = require("./SellRecords");
const Inventory = require("./Inventory");
const Department = require("./Department");
const DepartmentMembers = require("./DepartmentMembers");
const DepartmentRoles = require("./DepartmentRoles");
const AdvTransactionLogs = require("./AdvTransactionLogs.js");
const Citation = require("./Citation");
const Fee = require("./Fee")
const Shift = require("./Shift")
const RolePay = require("./RolePay")

module.exports = {
    DiscordUsers: DiscordUsers,
    Guilds: Guilds,
    TransactionLogs: TransactionLogs,
    AdvTransactionLogs: AdvTransactionLogs,
    GuildMembers: GuildMembers,
    ModalAccounts: Accounts,
    MoneyPrints: MoneyPrints,
    Items: Items,
    ModalAuthorizedUsers: AuthorizedUsers,
    Employees: Employees,
    SellRecords: SellRecords,
    Inventory: Inventory,
    Department: Department,
    DepartmentMembers: DepartmentMembers,
    DepartmentRoles: DepartmentRoles,
    Citation: Citation,
    Fee: Fee,
    Shift: Shift,
    RolePay: RolePay
}
