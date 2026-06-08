const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("userguide")
        .setDescription("A quick rundown of the commands every member should know — money, income, fines, businesses, and more."),

    async execute(interaction) {
        const embeds = [];

        // ── 1. Getting Started ────────────────────────────────────────────────
        embeds.push(new EmbedBuilder()
            .setTitle("👋  Welcome to the Economy")
            .setColor("Green")
            .setDescription(
                "`/register` — Join the economy. Creates your **bank** and **wallet** accounts and grants a starting balance.\n" +
                "`/balance [user]` — Check your (or someone else's) bank and wallet balances.\n" +
                "`/details business|department` — Look up info about a business or department.\n" +
                "`/leaderboard` — See the richest members of the server.\n\n" +
                "**Bank vs. Wallet:** your **bank** is for safekeeping and transfers; your **wallet** is for everyday spending and trading. The `/atm` lets you move money between the two."
            )
        );

        // ── 2. Your Money ─────────────────────────────────────────────────────
        embeds.push(new EmbedBuilder()
            .setTitle("💰  Managing Your Money")
            .setColor("Green")
            .addFields(
                {
                    name: "🏧  ATM",
                    value: "`/atm` — Opens a quick menu to **deposit**, **withdraw**, or check your **balance** (moves funds between bank and wallet).",
                    inline: false
                },
                {
                    name: "🤝  Giving & Transfers",
                    value:
                        "`/give to-user user: amount:` — Send money straight from your bank account to another member's bank account.\n" +
                        "`/give to-business business: amount:` — Pay a business from your wallet.\n" +
                        "`/transfer member-to-member|member-to-treasury|member-to-department` — More transfer options from your bank account.",
                    inline: false
                }
            )
        );

        // ── 3. Earning Money ──────────────────────────────────────────────────
        embeds.push(new EmbedBuilder()
            .setTitle("💵  Earning Money")
            .setColor("Green")
            .addFields(
                {
                    name: "🧾  Collect Income",
                    value: "`/collect-income [entity-type] [preview]` — Claim unpaid wages owed to you from departments and/or businesses you work for (salary, payroll, role pay). Income tax is applied automatically if your server has it set up.",
                    inline: false
                },
                {
                    name: "🎁  Stipend",
                    value: "`/stipend` — Claim a free, recurring payout set by the treasury (subject to a cooldown).",
                    inline: false
                },
                {
                    name: "🏢  Employment & Roles",
                    value: "If you're employed by a department or business, payments to you (salary, base pay, additional role pay) accumulate automatically — use `/collect-income` to claim them.",
                    inline: false
                }
            )
        );

        // ── 4. Fines & Fees ───────────────────────────────────────────────────
        embeds.push(new EmbedBuilder()
            .setTitle("🚨  Fines & Fees")
            .setColor("Orange")
            .addFields(
                {
                    name: "Fines",
                    value:
                        "`/fines view` — See fines issued against you.\n" +
                        "`/fines pay fine:` — Pay off a fine from your accounts.",
                    inline: false
                },
                {
                    name: "Fees",
                    value:
                        "Departments can issue you a **fee** — you'll receive a DM with options for how to pay it (one-time fees).\n" +
                        "Some fees are **recurring**: once set up, the amount is **automatically and silently deducted from your bank account** every set number of days. You'll get a DM each time it's charged — or if it fails due to insufficient bank funds (it'll retry the next day).",
                    inline: false
                }
            )
        );

        // ── 5. Businesses & Shopping ──────────────────────────────────────────
        embeds.push(new EmbedBuilder()
            .setTitle("🏪  Businesses & Shopping")
            .setColor("Green")
            .addFields(
                {
                    name: "🛒  Buying Items",
                    value: "`/bus buy-item item: [quantity]` — Purchase an item from a self-served business. Sales tax may apply.",
                    inline: false
                },
                {
                    name: "📦  Inventory",
                    value: "`/inventory view [user]` — View your (or another member's) owned items.\n`/inventory deplete item: amount:` — Use up items from your inventory.",
                    inline: false
                },
                {
                    name: "💼  Working at a Business",
                    value: "`/bus pay pay-member` is used by **owners** to pay staff — but as an employee, your pay shows up via `/collect-income`. Owners can `/set business:` to manage their business directly.",
                    inline: false
                }
            )
        );

        // ── 6. Bonds ──────────────────────────────────────────────────────────
        embeds.push(new EmbedBuilder()
            .setTitle("📜  Sovereign Bonds")
            .setColor("Gold")
            .setDescription(
                "Bonds are a way to invest your money with the treasury for a guaranteed return.\n\n" +
                "`/bonds list` — Browse bonds available for purchase (across all servers).\n" +
                "`/bonds buy bond-id: [business]` — Purchase a bond using your bank account (or a business account).\n" +
                "`/bonds holdings` — View the bonds you currently hold.\n" +
                "`/bonds transfer bond-id: to:` — Gift a bond you hold to another registered member, free of charge.\n\n" +
                "*See `/bondshelp` for the full mechanics — pricing, yield, maturity, and defaults.*"
            )
        );

        // ── 7. Records & Extras ───────────────────────────────────────────────
        embeds.push(new EmbedBuilder()
            .setTitle("📚  Records & Extras")
            .setColor("Blue")
            .addFields(
                { name: "🧾  Ledger", value: "`/ledger personal-ledger` — Get a PDF record of your account transactions.", inline: false },
                { name: "🎰  Casino", value: "`/casino play-slots bet:` · `/casino play-blackjack bet:` — Try your luck (if enabled on this server).", inline: false },
                { name: "🌐  Default Set", value: "`/set business|department` — Choose which business or department your management commands apply to (for owners/staff).", inline: false }
            )
            .setFooter({ text: "/help — bot overview · /treasuryhelp · /cbhelp · /bondshelp · /taxhelp — deeper guides" })
        );

        return interaction.reply({ embeds });
    }
};
