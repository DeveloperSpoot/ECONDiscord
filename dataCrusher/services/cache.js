const keyV = require("keyv");
const a = new keyV();
const b = new keyV();
const c = {}
const d = new keyV();
const shifts = new keyV();
const preimumServers = new keyV();
const currencies = new keyV();
const internalRevenueService = new keyV();
const etgCodes = new keyV({ttl: 120_000})
const etg = new keyV();
exports.activeBusiness = a;
exports.activeDepartment = b;
exports.leaderboards = c;
exports.activeCleanUp = d;
exports.activeShifts = shifts;
exports.preimumCache = preimumServers;
exports.currencyCache = currencies;
exports.irsCache = internalRevenueService;
exports.entanglementCodes = etgCodes;
exports.entanglementCache = etg;
