---
title: "Central Bank Chairman's Handbook"
subtitle: "Fortun.ai Economy System"
author: "Valaria Economic Authority"
date: "2026"
geometry: margin=2.5cm
fontsize: 11pt
colorlinks: true
linkcolor: blue
urlcolor: blue
header-includes:
  - \usepackage{booktabs}
  - \usepackage{fancyhdr}
  - \usepackage{xcolor}
  - \definecolor{gold}{RGB}{184, 134, 11}
  - \pagestyle{fancy}
  - \fancyhead[L]{\textcolor{gold}{\textbf{Central Bank Chairman's Handbook}}}
  - \fancyhead[R]{\thepage}
  - \fancyfoot[C]{\textcolor{gray}{\small Fortun.ai Economy System — Confidential}}
  - \renewcommand{\headrulewidth}{0.4pt}
---

\newpage

# Overview

The Central Bank (CB) is the monetary authority of your server's economy. It is **entirely separate from the Treasury** — the Treasury funds government operations and departments, while the CB controls the money supply, manages foreign reserves, and holds sovereign bonds.

**Access:** Only the server owner and users explicitly authorized via `/centralbank authorize add` can run CB commands. All CB command results are **public** — every member can see them.

---

# 1. Authorization

## Managing CB Access

| Command | Description |
|---|---|
| `/centralbank authorize add user:@user` | Grant a user full CB access (owner only) |
| `/centralbank authorize remove user:@user` | Revoke CB access (owner only) |

CB authorization is **completely separate** from Treasury authorization. You can give different people control of each institution. Discord Administrators and the server owner always retain CB access regardless.

---

# 2. Balance & Reporting

The CB holds its own balance (`cbBalance`) which is separate from the Treasury's `balance`. Money printed by the CB enters `cbBalance` — it does not go directly into circulation until deployed.

| Command | Description |
|---|---|
| `/centralbank balance` | View the CB's current internal balance |
| `/centralbank money-supply` | Full breakdown: wallets, banks, businesses, departments, treasury, CB |
| `/centralbank report` | Macro dashboard: total supply, strength score, reserves, total ever printed |

---

# 3. Printing Money

```
/centralbank print amount: memo:
```

Creates new money and credits it to the CB balance. The money **does not enter circulation immediately** — it sits in the CB until you deploy it via `/centralbank transfer`.

- The reply shows the expansion percentage relative to total circulation.
- Printed money's effect on the exchange rate only materialises once it circulates (enters wallets, businesses, treasury, etc.).
- Use `memo:` to document the reason (e.g., *"Stimulus package Q2"*).

**When to print:** Stimulus injections, funding sovereign expenditure, purchasing foreign reserves as a monetary policy tool.

**When not to print:** If your currency is already under attack (high C_n from foreign reserve accumulation), printing will worsen the exchange rate.

---

# 4. Destroying Money

```
/centralbank destroy amount: memo:
```

Permanently removes money from the CB balance **and** from total circulation (`C_n`). This is the **primary tool for strengthening your currency**.

> **Important:** The CB can only destroy money it holds. To destroy more than your current `cbBalance`, first fund the CB via `/centralbank transfer` Treasury → CB (see Section 5).

**When to destroy:** When your currency is weakening — especially if foreign servers are accumulating your currency as reserves, inflating your `C_n`.

---

# 5. Transferring Funds (CB and Treasury)

```
/centralbank transfer direction: amount: memo:
```

Moves funds between the CB and Treasury. Two directions:

- **Central Bank → Treasury:** Deploy CB funds into government operations (e.g., after printing stimulus money that needs to reach departments/citizens).
- **Treasury → Central Bank:** Fund the CB so it can destroy money or purchase foreign reserves without needing to print first.

---

# 6. Foreign Reserves & Liquidity Pools

Cross-server money flows are mediated by **nostro/vostro liquidity pools** — one pool per server pair. Each pool holds both servers' currencies and acts as a buffer for exchanges and bond purchases. Because money moves within the same server's C_n domain, the strength formula is not distorted by transfers.

## Commands

| Command | Description |
|---|---|
| `/centralbank reserves view` | View all liquidity pools and active CB bond holdings (mark-to-market) |
| `/forex pool deposit target-server: amount:` | Deposit domestic CB funds into the pool with another server |
| `/forex pool withdraw target-server: amount:` | Withdraw your side of the pool back to CB |
| `/forex pool view` | See all pools and their current balances |

## How the Pool Works

**Seeding:** Your CB runs `/forex pool deposit target-server:B amount:X`. `X` moves from your `cbBalance` into the pool's A-side. Since pool balances are included in `C_n`, your `C_n` is unchanged.

**Exchange:** A user running `/forex exchange amount:X target-server:B` causes:
- X A$ moves from their account → pool A-side (C_n of A unchanged)
- Equivalent B$ moves from pool B-side → their B-server account (C_n of B unchanged)

**If the pool is empty:** Exchanges and bond purchases fail until a CB refills it.

## Currency Attack Strategy

1. Accumulate CB funds (print, or receive incoming bond proceeds).
2. Ensure a pool exists with the target (`/forex pool deposit`).
3. `/centralbank bonds buy` — purchase bonds from the target server.
4. Bond proceeds flow into the target's treasury via the pool (pool-settled, C_n neutral).
5. At maturity you receive face value (with yield) back through the pool.
6. Holding many bonds drains the target's pool liquidity — making it harder for others to exchange into their currency — while earning you yield.

## Currency Defence Strategy

Currency strength (`S = activity / C_n`) is driven by real economic activity, not transfer mechanics. To strengthen:

1. Tax citizens → funds go to Treasury.
2. `/centralbank transfer` Treasury → CB.
3. `/centralbank destroy` → `C_n` drops → currency strengthens.

Maintaining pool liquidity is optional but enables trade. Refusing to seed a pool with another server is a form of economic isolation.

---

# 7. Sovereign Bonds (CB as Buyer)

The CB can purchase bonds issued by other servers' Treasuries. CB bond holdings are **reserve assets** — settled via the liquidity pool, earning a **yield** (you receive more than you paid at maturity).

| Command | Description |
|---|---|
| `/centralbank bonds buy bond-id:` | Purchase an available bond using CB funds (pool must exist) |
| `/centralbank bonds transfer bond-id: to-guild:` | Transfer a CB-held bond to another server's CB (free) |
| `/centralbank bonds holdings` | View all bonds this CB holds, maturity dates, and face values |

## How CB Bond Purchases Work

When your CB buys a bond from Server B:

1. A **liquidity pool** for the A-B pair must exist — seed it first with `/forex pool deposit`.
2. Your `cbBalance` decreases by `costInHome` — the purchase price **converted to your currency** at the live FOREX rate.
3. `costInHome` enters the pool's A-side; `purchasePrice` exits the pool's B-side → Server B's treasury immediately.
4. **Neither server's C_n changes** — the settlement is pool-mediated.
5. At maturity, Server B pays back the **face value, converted to your currency** at the then-current rate.

## Bond Strategy

| Approach | Effect |
|---|---|
| **Offensive** | Buy bonds of a target → drains their pool liquidity (limits others' access to their currency) AND earns yield |
| **Cooperative** | Buy bonds of an ally → funds their economy + aligns incentives (you want them stable so they can repay) |
| **Diplomatic** | Use `/centralbank bonds transfer` to hand a bond to another CB — useful for alliances or debt restructuring |
| **Risk** | If the issuer defaults, you lose the face value premium. If the pool runs dry, bond purchases block. |

---

# 8. FOREX Mechanics

## The Strength Formula

$$S = \frac{\alpha(M + V) + \beta E}{C_n}$$

| Variable | Meaning | Weight |
|---|---|---|
| $M$ | Messages sent in the last 30 days | $\alpha = 1.0$ |
| $V$ | Voice chat minutes in the last 30 days | $\alpha = 1.0$ |
| $E$ | Transactions in the last 30 days | $\beta = 2.0$ |
| $C_n$ | Total money in circulation | — |

**What counts in $C_n$:** All personal wallet and bank balances, all business accounts, all department balances, the Treasury balance, the CB balance, and any units of your currency sitting in cross-server liquidity pools.

## Exchange Rate

$$\text{received} = \text{amount} \times \frac{S_{\text{home}}}{S_{\text{target}}}$$

- A higher $S$ means a stronger currency.
- `/forex rate target-server:` — view the live rate between two servers.
- `/forex strength` — view your server's current metrics.
- `/forex exchange amount: target-server:` — execute a conversion.

## Cold-Start Behaviour

New servers with no recorded activity get estimated metrics based on their registered member count (5 messages/member/month, 1 transaction/member/month). This prevents new servers from having zero strength immediately.

---

# 9. Key Principles

1. **The CB balance is not in circulation until deployed.** Printing money only creates inflation potential — deploying it causes actual inflation.

2. **C_n is your primary lever.** Everything that affects exchange rates goes through the circulation figure. Control C_n to control your rate.

3. **Bonds are a dual-use weapon.** Buying another server's bonds drains their pool's liquidity (restricting cross-server currency access) while earning you yield at maturity. Pool management and bond strategy are intertwined.

4. **Bonds earn yield but carry risk.** A defaulted bond loses the face-value premium. Only buy bonds from servers you believe are economically stable or ones you can afford to pressure.

5. **Destroy, don't just hold.** Accumulating CB balance without destroying it does not strengthen your currency. The money must be permanently removed from `C_n`.

---

# 10. Quick Reference

| Goal | Action |
|---|---|
| See current CB balance | `/centralbank balance` |
| See full money supply breakdown | `/centralbank money-supply` |
| Create new money | `/centralbank print amount: memo:` |
| Remove money from circulation | `/centralbank destroy amount: memo:` |
| Move money CB → Treasury | `/centralbank transfer direction:CB→Treasury amount:` |
| Move money Treasury → CB | `/centralbank transfer direction:Treasury→CB amount:` |
| View reserves, pools & bond holdings | `/centralbank reserves view` |
| Buy a sovereign bond | `/centralbank bonds buy bond-id:` |
| Transfer CB bond to another CB | `/centralbank bonds transfer bond-id: to-guild:` |
| View CB bond holdings | `/centralbank bonds holdings` |
| Deposit into liquidity pool | `/forex pool deposit target-server: amount:` |
| Withdraw from liquidity pool | `/forex pool withdraw target-server: amount:` |
| View pool balances | `/forex pool view` |
| View exchange rates | `/forex rate target-server:` |
| View strength metrics | `/forex strength` |
| Execute currency exchange | `/forex exchange amount: target-server:` |
| Grant CB access | `/centralbank authorize add user:@user` |
| Revoke CB access | `/centralbank authorize remove user:@user` |

---

\vspace{1cm}
\begin{center}
\textit{This document is intended for the Central Bank Chairman and authorized personnel only.}
\end{center}
