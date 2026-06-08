const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("cbhelp")
        .setDescription("Central Bank operational guide — commands, mechanics, and strategies."),

    async execute(interaction) {
        const embeds = [];

        // ── 1. Overview & Balance ─────────────────────────────────────────────
        embeds.push(new EmbedBuilder()
            .setTitle("🏦  Central Bank — Overview & Balance")
            .setColor("Blue")
            .setDescription(
                "The Central Bank manages the money supply, foreign reserves, and sovereign bond holdings. " +
                "It is separate from the Treasury — the Treasury funds government operations, the CB controls monetary policy.\n\n" +
                "**Access:** `/centralbank authorize add @user` (server owner only).\n" +
                "All CB command results are public."
            )
            .addFields(
                {
                    name: "💰  Balance & Supply",
                    value:
                        "`/centralbank balance` — View the CB's current balance.\n" +
                        "`/centralbank money-supply` — Full breakdown: wallets, banks, businesses, departments, treasury, CB.\n" +
                        "`/centralbank report` — Macro dashboard: total supply, strength score, reserves, printed total.",
                    inline: false
                },
                {
                    name: "🖨️  Print Money",
                    value:
                        "`/centralbank print amount: memo:` — Creates new money, credited to the CB balance.\n" +
                        "Shows expansion % relative to total circulation. Printed money exists in the CB — deploy it via `/centralbank transfer`.",
                    inline: false
                },
                {
                    name: "🔥  Destroy Money",
                    value:
                        "`/centralbank destroy amount: memo:` — Permanently removes money from the CB balance and total circulation.\n" +
                        "**This is the primary tool for reducing C_n to defend your currency.** " +
                        "The CB can only destroy what it holds — to destroy more, first fund the CB via treasury transfer.",
                    inline: false
                },
                {
                    name: "↔️  Transfer",
                    value:
                        "`/centralbank transfer direction: amount: memo:` — Move funds between the CB and Treasury.\n" +
                        "Directions: `Central Bank → Treasury` (deploy CB funds) or `Treasury → Central Bank` (fund the CB for destruction or bond purchases).",
                    inline: false
                }
            )
        );

        // ── 2. Foreign Reserves & Liquidity Pools ─────────────────────────────
        embeds.push(new EmbedBuilder()
            .setTitle("🌐  Foreign Reserves & Liquidity Pools")
            .setColor("Blue")
            .setDescription(
                "Cross-server money flows are mediated by **nostro/vostro liquidity pools** — one pool per server pair. " +
                "Each pool holds both currencies and acts as a buffer for exchanges and bond purchases. " +
                "Because money moves within the same server's C_n domain, exchange rates are not distorted by transfers."
            )
            .addFields(
                {
                    name: "📋  Commands",
                    value:
                        "`/centralbank reserves view` — View all liquidity pools and active CB bond holdings (mark-to-market).\n" +
                        "`/forex pool deposit target-server: amount:` — Deposit domestic CB funds into the pool with another server.\n" +
                        "`/forex pool withdraw target-server: amount:` — Withdraw your side of the pool back to CB.\n" +
                        "`/forex pool view` — See all pools and their current balances.",
                    inline: false
                },
                {
                    name: "💧  How the Pool Works",
                    value:
                        "**Seeding:** Your CB deposits A$ into the A-B pool from cbBalance. C_n unchanged — pool balances are included in C_n.\n\n" +
                        "**Exchange:** User's A$ → pool A-side (C_n unchanged) → pool B-side releases B$ → user (C_n unchanged).\n\n" +
                        "**Bond purchase:** CB A's costInHome → pool A-side → pool B-side releases purchasePrice → B's treasury (C_n unchanged).\n\n" +
                        "If the pool runs out of the target currency, exchanges and bond purchases fail until the CB refills it.",
                    inline: false
                },
                {
                    name: "🛡️  Currency Defence",
                    value:
                        "Currency strength (`S = activity / C_n`) is now driven by real economic activity, not transfer mechanics.\n\n" +
                        "To strengthen: `/centralbank destroy` — reduces C_n directly.\n" +
                        "To accumulate foreign exposure: buy foreign bonds (pool-settled), or deposit into cross-server pools.\n" +
                        "Pool liquidity management becomes a tool of economic statecraft.",
                    inline: false
                }
            )
        );

        // ── 3. Sovereign Bonds ────────────────────────────────────────────────
        embeds.push(new EmbedBuilder()
            .setTitle("📜  Sovereign Bonds (CB Side)")
            .setColor("Blue")
            .setDescription(
                "CBs can purchase bonds issued by other servers' Treasuries as reserve assets. " +
                "Unlike regular reserves (direct currency holdings), bonds earn a yield — you receive more than you paid at maturity. " +
                "However, they also inflate the issuer's C_n (weakening their currency) and carry default risk."
            )
            .addFields(
                {
                    name: "📋  Commands",
                    value:
                        "`/centralbank bonds buy bond-id:` — Purchase an available bond using CB funds. The bond is recorded as a reserve asset.\n" +
                        "`/centralbank bonds transfer bond-id: to-guild:` — Transfer a CB-held bond to another server's CB. Free — no payment. ForexReserves pressure moves with it.\n" +
                        "`/centralbank bonds holdings` — View all bonds this CB holds, their maturity dates, and total face value.",
                    inline: false
                },
                {
                    name: "⚙️  How CB Bond Purchases Work",
                    value:
                        "When your CB buys a bond from Server B:\n" +
                        "• A **liquidity pool** for the A-B pair must exist (seed it with `/forex pool deposit` first)\n" +
                        "• Your `cbBalance` decreases by `costInHome` — the purchase price **converted to your currency** at the live FOREX rate\n" +
                        "• `costInHome` enters the pool's A-side; `purchasePrice` exits the pool's B-side → Server B's treasury\n" +
                        "• **Neither server's C_n changes** — pool balances are included in both C_ns\n" +
                        "• At maturity, Server B pays back `faceValue`, **converted to your currency** at the then-current rate\n\n" +
                        "Bond IDs are found via `/bonds list` (public) or `/treasury bonds list` on the issuing server.",
                    inline: false
                },
                {
                    name: "⚔️  Bond Strategy",
                    value:
                        "**Offensive:** Buy bonds of a target → drains their pool's liquidity (harder for others to get their currency) AND earns yield.\n" +
                        "**Cooperative:** Buy bonds of an ally → funds their economy + aligns incentives (you want them stable so they can repay).\n" +
                        "**Diplomatic transfer:** Use `/centralbank bonds transfer` to hand a bond to another CB — useful for alliances, debt settlement, or restructuring holdings without liquidation.\n" +
                        "**Risk:** If the issuer defaults you lose the face value premium. If the pool runs dry, bond purchases block — keep pools funded.",
                    inline: false
                }
            )
        );

        // ── 4. FOREX Mechanics ────────────────────────────────────────────────
        embeds.push(new EmbedBuilder()
            .setTitle("📊  FOREX Mechanics — How Exchange Rates Work")
            .setColor("Blue")
            .addFields(
                {
                    name: "The Formula",
                    value:
                        "```\nS = (α·(M + V) + β·E) / C\n\nα = 1.0  β = 2.0\n```\n" +
                        "**M** = messages in last 30 days  \n" +
                        "**V** = VC minutes in last 30 days  \n" +
                        "**E** = transactions in last 30 days (weighted 2×)  \n" +
                        "**C** = total money in circulation (all accounts + treasury + CB + foreign-held reserves)",
                    inline: false
                },
                {
                    name: "What C Includes",
                    value:
                        "• All personal wallet + bank balances\n" +
                        "• All business account balances\n" +
                        "• All department balances\n" +
                        "• Treasury balance\n" +
                        "• CB balance\n" +
                        "• **Units of your currency held as reserves by OTHER servers** ← this is what attacks exploit",
                    inline: false
                },
                {
                    name: "Cold-Start Fallback",
                    value:
                        "If a server has no recorded activity yet, M and E are estimated from registered member count " +
                        "(5 msgs/member/month, 1 tx/member/month). This levels the playing field for new servers.",
                    inline: false
                },
                {
                    name: "Exchange Rate",
                    value:
                        "```\nreceived = amount × (S_home / S_target)\n```\n" +
                        "View live rates: `/forex rate target-server:`\n" +
                        "View your server's metrics: `/forex strength`\n" +
                        "Execute an exchange: `/forex exchange amount: target-server:`",
                    inline: false
                }
            )
            .setFooter({ text: "Formula weights (α, β) and cold-start constants live in utils/forexStrength.js" })
        );

        // ── 5. Authorization ──────────────────────────────────────────────────
        embeds.push(new EmbedBuilder()
            .setTitle("🔑  CB Authorization")
            .setColor("Blue")
            .addFields(
                {
                    name: "Managing Access",
                    value:
                        "`/centralbank authorize add user:@user` — Grant a user CB access (server owner only).\n" +
                        "`/centralbank authorize remove user:@user` — Revoke CB access (server owner only).\n\n" +
                        "CB authorization is completely separate from treasury authorization — you can give different people control of each.",
                    inline: false
                },
                {
                    name: "Who Can Use CB Commands",
                    value:
                        "• Server owner (always)\n" +
                        "• Discord Administrators (always)\n" +
                        "• Users explicitly authorized via `/centralbank authorize add`",
                    inline: false
                }
            )
            .setFooter({ text: "Use /bondshelp for the citizen bond guide · /treasuryhelp for treasury operations · /taxhelp for bracket syntax · /help for general commands" })
        );

        return interaction.reply({ embeds });
    }
};
