# Plan: FOREX + Central Bank Systems

## Context
The current bot has no cross-server currency exchange and only a basic treasury. This implements:
1. A **FOREX system** where exchange rates between servers are derived from a server strength formula based on activity (messages, VC) and economic productivity (transactions) vs money in circulation.
2. A **Central Bank** with money supply management, print operations, foreign reserve management, and a macro dashboard.

Exchange flow: instant conversion — user exchanges Server A currency → receives equivalent in Server B currency directly in their Server B bank account (must be registered in both servers). Most IRL-accurate and intuitive.

---

## FOREX Equation (isolated in its own util)

`utils/forexStrength.js` — **the only place the formula lives**:

```javascript
const ALPHA = 1.0;  // weight: server activity (messages + VC minutes)
const BETA  = 2.0;  // weight: economic productivity (transaction count)

// S_n = (α·(M_n + V_n) + β·E_n) / C_n
function serverStrength(M, V, E, C) {
    if (C <= 0) return 0;
    return (ALPHA * (M + V) + BETA * E) / C;
}

// money_b = money_a · (S_a / S_b)
function convertCurrency(amountA, strengthA, strengthB) {
    if (strengthB <= 0) return 0;
    return amountA * (strengthA / strengthB);
}

module.exports = { serverStrength, convertCurrency, ALPHA, BETA };
```

To change the formula: edit only this file.

---

## Metrics — how M, V, E, C are computed

| Metric | Source |
|---|---|
| **M_n** (messages/month) | `ActivityLog.messageCount` summed over last 30 days for guild |
| **V_n** (VC minutes/month) | `ActivityLog.vcMinutes` summed over last 30 days for guild |
| **E_n** (transactions/month) | `AdvTransactionLogs.count` WHERE guild=n AND createdAt >= 30 days ago |
| **C_n** (money in circulation) | `SUM(Accounts.balance)` WHERE guild=n + `Guilds.balance` (treasury) |

---

## New Data Models

### `dataCrusher/models/ActivityLog.js`
```
IDENT:        UUID (PK)
guild:        TEXT (FK → Guilds)
date:         DATEONLY
messageCount: INTEGER default 0
vcMinutes:    DECIMAL(10,2) default 0
```
Unique constraint on (guild, date). Written via Sequelize `upsert()`.

### `dataCrusher/models/ForexReserves.js`
```
IDENT:         UUID (PK)
guild:         TEXT (FK → Guilds)   — the server holding the reserve
foreignGuild:  TEXT                 — the server whose currency is held
amount:        DECIMAL(20,2) default 0
```
Unique constraint on (guild, foreignGuild).

### New fields on `dataCrusher/models/Guilds.js`
None beyond what's already been added. All CB config fits within existing schema.

---

## New Event Listeners

### `events/messageCreate.js`
- Ignore DMs and bot messages
- **Spam guards:**
  - Per-user cooldown: in-memory `Map<userId_guildId, lastCountedTimestamp>` — only count a message if the user hasn't had one counted in the last **15 seconds**
  - Minimum length: ignore messages under **4 characters**
  - Ignore messages starting with a command prefix or mention (starts with `/` or `<@`)
- If guards pass: upsert `ActivityLog` for `(guild.id, today)`, increment `messageCount += 1`

### `events/voiceStateUpdate.js`
- Module-level `Map vcJoinTimes` keyed by `${guildId}_${userId}`
- **Join** (oldState.channel null → newState.channel not null): store `Date.now()`
- **Leave** (newState.channel → null): compute `minutes`, upsert `ActivityLog.vcMinutes += minutes`
- **Switch channels**: treat as continuous session (don't reset timer)
- Known limitation: join times lost on bot restart (acceptable)

---

## New Service

### `dataCrusher/services/forexService.js`
```javascript
async function getGuildStrength(guildId) {
    // Query ActivityLog: SUM(messageCount), SUM(vcMinutes) last 30 days
    // Query AdvTransactionLogs: COUNT last 30 days
    // Query Accounts: SUM(balance) + Guilds.balance
    // Return { M, V, E, C, strength }
}
```
Used by both `/forex` and `/centralbank report`.

---

## New Commands

### `commands/forex.js`

`/forex exchange amount:number target-server:string`
- `target-server` autocomplete from `client.guilds.cache` (excluding current server)
- Validate user registered in both guilds
- Get source personal-bank; check sufficient balance
- `getGuildStrength()` for both → `serverStrength()` → `convertCurrency()`
- Deduct from source bank; credit target bank
- `AdvTransactionLogs` in both guilds
- Reply: rate, amount deducted, amount received, both server strengths

`/forex rate target-server:string`
- Shows exchange rate + full strength breakdown (M, V, E, C, S) for both servers
- Shows rate both ways (1 A = X B, 1 B = Y A)

`/forex strength`
- Shows current server's own M, V, E, C, S with 30-day window

---

### `commands/centralbank.js`

**Money Supply**

`/centralbank money-supply`
— `SUM(Accounts.balance)` by type + treasury. Shows breakdown.

**Print** *(migrated from `/treasury print-money`)*

`/centralbank print amount:number memo:string`
— Creates `MoneyPrints` record. Credits treasury. Logs money supply before/after and expansion %. The existing `/treasury print-money` subcommand is removed/deprecated from `commands/treasury.js`.

**Reserves**

`/centralbank reserves view`
— Shows all `ForexReserves` rows for this guild, with server names via `client.guilds.cache`. Shows current exchange rate alongside each holding.

`/centralbank reserves buy foreign-server:string amount:number`
— Buys foreign currency reserves:
  - Calculates exchange rate (via `getGuildStrength`)
  - Deducts `amount` in domestic currency from treasury
  - Credits `converted = amount × (S_domestic / S_foreign)` to `ForexReserves(guild, foreignGuild)`
  - Logs `AdvTransactionLogs` as Treasury → Reserve

`/centralbank reserves sell foreign-server:string amount:number`
— Sells foreign reserves back:
  - Checks `ForexReserves` has sufficient holding
  - Converts `amount` of foreign currency back to domestic at current rate
  - Removes from `ForexReserves`, credits domestic treasury
  - Logs `AdvTransactionLogs`

**Report**

`/centralbank report`
— Macro dashboard embed: total money supply, treasury balance, 30-day transaction volume, server strength breakdown (M/V/E/C/S), total reserves held (value in domestic currency at current rates), cumulative printed money (from `MoneyPrints`).

---

## Files Summary

| File | Action |
|---|---|
| `utils/forexStrength.js` | Create — equation lives here |
| `dataCrusher/models/ActivityLog.js` | Create — daily activity table |
| `dataCrusher/models/ForexReserves.js` | Create — CB foreign currency holdings |
| `dataCrusher/services/forexService.js` | Create — metric assembly + strength |
| `commands/forex.js` | Create |
| `commands/centralbank.js` | Create |
| `events/messageCreate.js` | Create — spam-guarded message counting |
| `events/voiceStateUpdate.js` | Create — VC minute tracking |
| `dataCrusher/models/Modals.js` | Add `ActivityLog`, `ForexReserves` exports |
| `dataCrusher/Headquarters.js` | Export `ForexService` |
| `commands/treasury.js` | Remove `print-money` subcommand |
| `index.js` | `SQL.sync()` picks up new tables automatically |

---

## Reuse

- `ErrorEmbed()` — `utils/embedUtil.js`
- `GuildHQ.formatMoney()` — `dataCrusher/services/guild.js`
- `SQL.models.AdvTransactionLogs.create()` — irs.js pattern for all money movement
- `SQL.models.Guilds.update()` / `findByPk()` — treasury updates
- `SQL.models.MoneyPrints.create()` — existing print record pattern (from treasury.js)
- Autocomplete pattern — `commands/payroll.js`
- Event file auto-loader — `index.js:341–349`
- `PermissionFlagsBits.Administrator` — `commands/tax.js`

---

## DB Migration

- `ActivityLog` and `ForexReserves`: new tables, created automatically by `SQL.sync()` on first restart — no alter needed
- No new columns on existing tables

---

## Verification

1. Send messages rapidly from same user → only 1 counted per 15s; short messages ignored
2. Join/leave VC → `ActivityLog.vcMinutes` accumulates correctly
3. `/forex strength` — shows non-zero metrics after activity
4. Two servers with different activity → `/forex rate` shows asymmetric rates
5. `/forex exchange 100 "Server B"` — balances correct on both sides, logs created
6. `/centralbank print 5000 "Stimulus"` — treasury increases, MoneyPrints record created, money supply reported
7. `/centralbank reserves buy "Server B" 1000` — treasury decreases, ForexReserves row created/updated
8. `/centralbank reserves sell "Server B" 500` — ForexReserves decreases, treasury increases
9. `/centralbank report` — all fields populated with live data
