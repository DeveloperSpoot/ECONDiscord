// FOREX Server Strength Formula
// S_n = (α·(M_n + V_n) + β·E_n) / C_n
//
// M_n = messages counted in last 30 days
// V_n = VC minutes in last 30 days
// E_n = transaction count in last 30 days
// C_n = total money in circulation (sum of all account balances + treasury)
//
// To change the formula: edit only this file.

const ALPHA = 1.0; // weight: server activity (messages + VC minutes)
const BETA  = 2.0; // weight: economic productivity (transaction count)

/**
 * Computes the economic strength score for a server.
 * @param {number} M - Message count (last 30 days)
 * @param {number} V - VC minutes (last 30 days)
 * @param {number} E - Transaction count (last 30 days)
 * @param {number} C - Total money in circulation
 * @returns {number}
 */
function serverStrength(M, V, E, C) {
    if (C <= 0) return 0;
    return (ALPHA * (M + V) + BETA * E) / C;
}

/**
 * Convert an amount from server A's currency to server B's currency.
 * @param {number} amountA
 * @param {number} strengthA
 * @param {number} strengthB
 * @returns {number}
 */
function convertCurrency(amountA, strengthA, strengthB) {
    if (strengthB <= 0) return 0;
    return amountA * (strengthA / strengthB);
}

module.exports = { serverStrength, convertCurrency, ALPHA, BETA };
