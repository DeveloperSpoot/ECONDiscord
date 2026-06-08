const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("bondshelp")
        .setDescription("How bonds work — buying, selling, transferring, and cross-server mechanics."),

    async execute(interaction) {
        const embeds = [];

        // ── 1. What Are Bonds ─────────────────────────────────────────────────
        embeds.push(new EmbedBuilder()
            .setTitle("📜  Sovereign Bonds — Overview")
            .setColor("Green")
            .setDescription(
                "Sovereign bonds are debt instruments issued by a server's Treasury. " +
                "You lend money now and get back more later — the **face value** — at maturity. " +
                "The difference between what you pay and what you receive is your **yield**."
            )
            .addFields(
                {
                    name: "💡  Key Terms",
                    value:
                        "**Purchase Price** — What you pay now. Always less than face value.\n" +
                        "**Face Value** — What the issuer pays you at maturity.\n" +
                        "**Yield** — Your profit. `faceValue - purchasePrice`.\n" +
                        "**Maturity** — The date the bond is redeemable. The issuer must run `/treasury bonds redeem` to pay you out.\n" +
                        "**Default** — If the issuer's treasury can't cover the face value at maturity, the bond defaults and you receive nothing.",
                    inline: false
                },
                {
                    name: "📐  Example",
                    value:
                        "A bond is issued with face value **$10,000**, yield **5%**, maturity **30 days**.\n" +
                        "Purchase price = `10,000 / (1 + 0.05)` = **$9,524**.\n" +
                        "You pay $9,524 today and receive $10,000 in 30 days — a profit of **$476**.",
                    inline: false
                }
            )
        );

        // ── 2. Listing & Buying ───────────────────────────────────────────────
        embeds.push(new EmbedBuilder()
            .setTitle("🛒  Listing & Buying Bonds")
            .setColor("Green")
            .addFields(
                {
                    name: "🔍  Browse Available Bonds",
                    value:
                        "`/bonds list` — Shows all bonds currently available for purchase across every server the bot is in.\n" +
                        "Each entry shows the issuer, face value, purchase price, yield %, and maturity period.\n" +
                        "Copy the full bond ID to use with `/bonds buy`.",
                    inline: false
                },
                {
                    name: "💳  Buy with Personal Bank",
                    value:
                        "```\n/bonds buy bond-id:<id>\n```\n" +
                        "Deducts the purchase price from your personal bank account and activates the bond in your name. " +
                        "**You must run this command from within the issuer's server** (see cross-server section below).",
                    inline: false
                },
                {
                    name: "🏪  Buy with a Business Account",
                    value:
                        "```\n/bonds buy bond-id:<id> business:<your-business>\n```\n" +
                        "Use the optional `business:` field (autocomplete) to buy with one of your business accounts instead of your personal bank. " +
                        "The bond is held in the business's name. Payout at maturity goes back to the business account.",
                    inline: false
                }
            )
        );

        // ── 3. Cross-Server Mechanics ─────────────────────────────────────────
        embeds.push(new EmbedBuilder()
            .setTitle("🌐  Cross-Server Bond Purchases")
            .setColor("Green")
            .setDescription(
                "Bonds from other servers are priced in **that server's currency**. " +
                "To buy one, you need to be holding that currency — and you run the command from within their server."
            )
            .addFields(
                {
                    name: "⚙️  The Process",
                    value:
                        "1. Find a bond you want via `/bonds list`. Note the issuer server.\n" +
                        "2. Go to the **issuer's Discord server**.\n" +
                        "3. Convert your currency: `/forex exchange amount: target-server:<your server>` to get the issuer's currency into your account there.\n" +
                        "   — *Requires a liquidity pool between the two servers. A CB from either server must fund it first via `/forex pool deposit`.*\n" +
                        "4. Run `/bonds buy bond-id:<id>` **from within the issuer's server**.\n\n" +
                        "Your bank account in the issuer's server is debited — no cross-server money transplant occurs. " +
                        "The bond payout at maturity also lands in your account in the issuer's server.",
                    inline: false
                },
                {
                    name: "💧  Liquidity Pools",
                    value:
                        "Currency exchange between servers requires a pre-funded liquidity pool. " +
                        "Each pool holds both servers' currencies and is managed by their CBs. " +
                        "If you get an error about insufficient liquidity, ask the issuing server's CB to run `/forex pool deposit`.",
                    inline: false
                }
            )
        );

        // ── 4. Your Holdings & Transfers ─────────────────────────────────────
        embeds.push(new EmbedBuilder()
            .setTitle("📂  Holdings & Transferring Bonds")
            .setColor("Green")
            .addFields(
                {
                    name: "📋  View Your Holdings",
                    value:
                        "`/bonds holdings` — Lists all active bonds you hold personally, with issuer, face value, and maturity countdown.",
                    inline: false
                },
                {
                    name: "🔄  Transfer a Bond",
                    value:
                        "```\n/bonds transfer bond-id:<id> to:@user\n```\n" +
                        "Transfer any bond you hold to another registered user — **free, no payment required**.\n" +
                        "The recipient must be registered in the same server (the issuer's server) since the maturity payout goes to their account there.\n\n" +
                        "This enables a natural secondary market: agree on a price off-bot, execute the transfer, and send payment separately via `/transfer`.",
                    inline: false
                },
                {
                    name: "💡  Secondary Market",
                    value:
                        "There is no built-in order book — bond trading is peer-to-peer. " +
                        "Agree on a price with your counterparty, send them payment via `/transfer`, and they send you the bond via `/bonds transfer`. " +
                        "Bond value fluctuates with FOREX rates and the issuer's economic health.",
                    inline: false
                }
            )
        );

        // ── 5. Maturity & Default ─────────────────────────────────────────────
        embeds.push(new EmbedBuilder()
            .setTitle("⏳  Maturity, Redemption & Default")
            .setColor("Green")
            .addFields(
                {
                    name: "✅  Redemption",
                    value:
                        "When a bond matures, the **issuer** must run `/treasury bonds redeem bond-id:` to pay you out. " +
                        "This is not automatic — watch your maturity dates and follow up with the issuer if needed.\n\n" +
                        "Payout goes to your **personal bank** (or business account if you bought with one) in the issuer's server.",
                    inline: false
                },
                {
                    name: "⚠️  Early Buyback",
                    value:
                        "An issuer may choose to buy back a bond early via `/treasury bonds buyback`. " +
                        "You receive the original **purchase price only** — no yield. " +
                        "This ends the bond early and you lose your expected profit.",
                    inline: false
                },
                {
                    name: "🔴  Default",
                    value:
                        "If the issuer's treasury doesn't have enough to cover the face value at maturity, " +
                        "the bond is marked **defaulted** and you receive nothing. " +
                        "Research the issuer's economy before buying — check `/forex strength` on their server and whether their treasury looks solvent.",
                    inline: false
                }
            )
            .setFooter({ text: "/bonds list · /bonds buy · /bonds holdings · /bonds transfer · /treasuryhelp for issuer-side commands · /cbhelp for CB bond strategy" })
        );

        return interaction.reply({ embeds });
    }
};
