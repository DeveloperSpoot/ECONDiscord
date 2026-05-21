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
                        "The CB can only destroy what it holds — to destroy more, first fund the CB from treasury or sell foreign reserves.",
                    inline: false
                },
                {
                    name: "↔️  Transfer",
                    value:
                        "`/centralbank transfer direction: amount: memo:` — Move funds between the CB and Treasury.\n" +
                        "Directions: `Central Bank → Treasury` (deploy CB funds) or `Treasury → Central Bank` (fund the CB for destruction or reserve purchases).",
                    inline: false
                }
            )
        );

        // ── 2. Foreign Reserves ───────────────────────────────────────────────
        embeds.push(new EmbedBuilder()
            .setTitle("🌐  Foreign Reserves")
            .setColor("Blue")
            .setDescription(
                "Reserves are holdings of another server's currency. They are a key geopolitical tool — " +
                "large reserve positions directly affect exchange rates."
            )
            .addFields(
                {
                    name: "📋  Commands",
                    value:
                        "`/centralbank reserves view` — List all foreign currency holdings and current exchange rates.\n" +
                        "`/centralbank reserves buy foreign-server: amount:` — Spend CB funds to acquire units of another server's currency.\n" +
                        "`/centralbank reserves sell foreign-server: amount:` — Sell held reserves back, receiving domestic currency into the CB.",
                    inline: false
                },
                {
                    name: "📐  How Reserves Affect Exchange Rates",
                    value:
                        "Every unit of Server B's currency held by ANY other server counts toward Server B's **C_n** (total circulation).\n" +
                        "Since `S = activity / C_n`, a larger C_n means a weaker currency.\n\n" +
                        "**Buying** Server B's reserves → inflates B's C_n → B's currency weakens.\n" +
                        "**Holding** reserves sustains the pressure.\n" +
                        "**Selling** reserves → deflates B's C_n → B's currency recovers.",
                    inline: false
                },
                {
                    name: "⚔️  Currency Attack",
                    value:
                        "1. Accumulate CB funds (print or receive bond proceeds).\n" +
                        "2. `/centralbank reserves buy` large quantities of the target server's currency.\n" +
                        "3. Hold them — the target's C_n stays inflated and their exchange rate stays weak.\n" +
                        "4. Sell when you want to exit (you recover your funds at the then-current rate).",
                    inline: false
                },
                {
                    name: "🛡️  Currency Defence",
                    value:
                        "Your C_n is inflated if others hold your currency. Counter-strategy:\n\n" +
                        "**With foreign reserves:** Sell them → cbBalance rises → `/centralbank destroy` → C_n drops.\n" +
                        "**Without reserves:** Tax citizens → treasury → transfer to CB → destroy. Real economic cost — incentive to stockpile reserves early.\n\n" +
                        "Self-reserve purchase is blocked. Use the sell+destroy chain.",
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
                        "`/centralbank bonds holdings` — View all bonds this CB holds, their maturity dates, and total face value.",
                    inline: false
                },
                {
                    name: "⚙️  How CB Bond Purchases Work",
                    value:
                        "When a CB buys a bond:\n" +
                        "• CB pays `purchasePrice` from `cbBalance`\n" +
                        "• Issuer's treasury receives `purchasePrice`\n" +
                        "• A `ForexReserves` entry is created for `purchasePrice` — **this inflates the issuer's C_n**\n" +
                        "• At maturity, the issuer pays back `faceValue` (which is greater than `purchasePrice`)\n" +
                        "• The reserve position is unwound on redemption\n\n" +
                        "Bond IDs are found via `/bonds list` (public) or `/treasury bonds list` on the issuing server.",
                    inline: false
                },
                {
                    name: "⚖️  Bond Strategy",
                    value:
                        "**Offensive:** Buy bonds of a target server → inflates their C_n (weakens currency) AND earns yield.\n" +
                        "**Cooperative:** Buy bonds of an ally → funds their economy + aligns your interests (you want them to repay, so you want their economy stable).\n" +
                        "**Risk:** If the issuer defaults, the reserve unwinds but you lose the face value premium.",
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
            .setFooter({ text: "Use /taxhelp for tax bracket setup · /treasuryhelp for treasury operations · /help for general commands" })
        );

        return interaction.reply({ embeds });
    }
};
