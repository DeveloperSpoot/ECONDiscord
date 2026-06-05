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

# 6. Foreign Reserves

Foreign reserves are holdings of **another server's currency**. They are accumulated **only through CB bond purchases** — there is no direct reserve buy/sell mechanism. Each bond purchase creates a reserve entry that inflates the issuer's `C_n` until the bond matures.

## Commands

| Command | Description |
|---|---|
| `/centralbank reserves view` | List all foreign currency holdings and current exchange rates |

## How Reserves Affect Exchange Rates

Every unit of Server B's currency held as reserves by **any** other server counts toward Server B's total circulation (`C_n`). Since the strength formula is:

$$S = \frac{\alpha(M + V) + \beta E}{C_n}$$

a larger `C_n` means a weaker currency. Bond purchases are the mechanism for building reserve positions.

## Currency Attack Strategy

1. Accumulate CB funds (print, or receive incoming bond proceeds).
2. `/centralbank bonds buy` — purchase bonds from the target server.
3. Hold them until maturity — the target's `C_n` stays inflated and their exchange rate stays weak.
4. You also earn yield on maturity, making this profitable as well as geopolitically effective.

## Currency Defence Strategy

If foreign CBs are holding bonds you issued, your `C_n` is inflated. Options:

1. Tax citizens → funds go to Treasury.
2. `/centralbank transfer` Treasury → CB.
3. `/centralbank destroy` → `C_n` drops → currency strengthens.

Reserve pressure from bond-holding CBs naturally unwinds when bonds mature and are redeemed.

---

# 7. Sovereign Bonds (CB as Buyer)

The CB can purchase bonds issued by other servers' Treasuries. CB bond holdings count as **reserve assets** — they inflate the issuer's `C_n` the same way regular reserves do, but they earn a **yield** (you receive more than you paid at maturity).

| Command | Description |
|---|---|
| `/centralbank bonds buy bond-id:` | Purchase an available bond using CB funds |
| `/centralbank bonds holdings` | View all bonds this CB holds, maturity dates, and face values |

## How CB Bond Purchases Work

When your CB buys a bond from Server B:

1. Your `cbBalance` decreases by the **purchase price converted to your currency** at the live FOREX rate.
2. Server B's treasury receives the purchase price in their own currency immediately.
3. A foreign reserve entry is created — **Server B's `C_n` increases** (their currency weakens).
4. At maturity, Server B pays back the **face value, converted to your currency** at the then-current rate.
5. The reserve position unwinds on redemption (their `C_n` returns to normal).

## Bond Strategy

| Approach | Effect |
|---|---|
| **Offensive** | Buy bonds of a target → inflates their `C_n` (weakens currency) AND earns yield |
| **Cooperative** | Buy bonds of an ally → funds their economy + aligns incentives (you want them stable so they can repay) |
| **Risk** | If the issuer defaults, the reserve unwinds but you lose the face value premium |

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

**What counts in $C_n$:** All personal wallet and bank balances, all business accounts, all department balances, the Treasury balance, the CB balance, and any units of your currency held as reserves by other servers.

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

3. **Bonds are a dual-use weapon.** Buying another server's bonds inflates their C_n (weakening their currency) while also earning you yield at maturity. The attack and the profit come together.

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
| View foreign reserve holdings | `/centralbank reserves view` |
| Buy a sovereign bond | `/centralbank bonds buy bond-id:` |
| View CB bond holdings | `/centralbank bonds holdings` |
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
