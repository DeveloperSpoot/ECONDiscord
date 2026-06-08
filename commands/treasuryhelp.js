const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("treasuryhelp")
        .setDescription("Treasury operational guide — departments, businesses, payroll, taxes, and bonds."),

    async execute(interaction) {
        const embeds = [];

        // ── 1. Overview & Core ────────────────────────────────────────────────
        embeds.push(new EmbedBuilder()
            .setTitle("🏛️  Treasury — Overview")
            .setColor("Gold")
            .setDescription("Government operational account. Funds departments, manages businesses, collects taxes, issues bonds.\n**Access:** `/authorize add @user` (owner only). Admins always have access.")
            .addFields(
                { name: "📊  Info", value: "`/treasury balance` · `/treasury balance-all` · `/treasury statistics`", inline: false },
                {
                    name: "⚙️  Config",
                    value:
                        "`/treasury set-currency symbol:` — Currency symbol.\n" +
                        "`/treasury set-starting-balance amount:` — New member starting balance.\n" +
                        "`/setlogchannel channel:` — Log channel for all transactions.\n" +
                        "`/treasury clean-up` — Liquidate departed members' accounts.\n" +
                        "`/treasury inflate|deflate percentage-amount:` — Adjust all item prices.",
                    inline: false
                }
            )
        );

        // ── 2. Departments ────────────────────────────────────────────────────
        embeds.push(new EmbedBuilder()
            .setTitle("🏢  Departments")
            .setColor("Gold")
            .addFields(
                {
                    name: "📋  Setup",
                    value:
                        "`/treasury add-department name: head-role: member-role: description: budget: max-balance:`\n" +
                        "`/treasury remove-department department:` · `/treasury edit-department department: [fields...]`",
                    inline: false
                },
                {
                    name: "💰  Funding",
                    value:
                        "`/treasury fund-department department: amount:` — Treasury → department.\n" +
                        "`/treasury set-budget-timeout dep-timeout:` — Budget claim cooldown (days).\n" +
                        "`/transfer department-to-treasury department: amount:` — Return funds to treasury.",
                    inline: false
                },
                {
                    name: "👥  Payments",
                    value:
                        "`/dep pay pay-member user: amount:` · `/dep pay pay-business business: amount:` · `/dep pay pay-department department: amount:`",
                    inline: false
                },
                {
                    name: "🔍  Fines & Fees",
                    value: "`/treasury view-fines` · `/treasury view-fees` · `/treasury dismiss-fine fine:`",
                    inline: false
                }
            )
        );

        // ── 3. Businesses ─────────────────────────────────────────────────────
        embeds.push(new EmbedBuilder()
            .setTitle("🏪  Businesses")
            .setColor("Gold")
            .addFields(
                {
                    name: "📋  Setup",
                    value:
                        "`/treasury add-business name: owner: description: selfserved: role:`\n" +
                        "`/treasury remove-business business:` · `/treasury edit-business business: [fields...]`",
                    inline: false
                },
                {
                    name: "💳  Payments & Transfers",
                    value:
                        "`/bus pay pay-member user: amount:` — Pay member (payroll tax applies).\n" +
                        "`/bus pay pay-business business: amount:` — Pay another business.\n" +
                        "`/transfer business-to-treasury|department business: [department:] amount:`",
                    inline: false
                },
                {
                    name: "🛒  Items",
                    value: "Manage via `/bus item add|edit|remove`. Members buy with `/buy` or `/bus quick-sell`. Sales tax applies if set.",
                    inline: false
                }
            )
        );

        // ── 4. Payroll & Stipends ─────────────────────────────────────────────
        embeds.push(new EmbedBuilder()
            .setTitle("💵  Payroll, Salaries & Stipends")
            .setColor("Gold")
            .addFields(
                { name: "Payroll", value: "`/payroll execute` — Batch pay all employees. Subject to payroll tax.", inline: false },
                {
                    name: "Salary",
                    value:
                        "`/salary set entity: user: amount: period-days:` — Recurring salary for a member or role.\n" +
                        "`/collect-income` — Members collect unpaid cycles. Income tax applied automatically.",
                    inline: false
                },
                {
                    name: "Stipend",
                    value: "`/treasury set-stipend stipend: timeout:` — Universal claimable amount + cooldown.\n`/stipend` — Members claim.",
                    inline: false
                }
            )
        );

        // ── 5. Taxation ───────────────────────────────────────────────────────
        embeds.push(new EmbedBuilder()
            .setTitle("🧾  Taxation")
            .setColor("Gold")
            .addFields(
                { name: "🏦  Sales Tax", value: "`/treasury tax-service set-sales-tax type: value:` — Flat or % on item purchases.", inline: true },
                { name: "📋  Payroll Tax", value: "`/treasury tax-service set-payroll-tax type: value:` — Flat or % on wages paid.", inline: true },
                {
                    name: "💵  Income Tax",
                    value:
                        "`/tax type:Income brackets:` — Set progressive brackets, applied at `/collect-income`.\n" +
                        "Format: `50000:10,100000:20,30` → 10% up to $50k, 20% up to $100k, 30% above.",
                    inline: false
                },
                { name: "🏛️  PEX (Wealth)", value: "`/tax type:PEX brackets: [target-role] [preview:true]` — Sweep member bank balances.", inline: false },
                { name: "🧾  VAT (Business)", value: "`/tax type:VAT brackets: [preview:true]` — Sweep all business accounts.", inline: false }
            )
        );

        // ── 6. Bonds ──────────────────────────────────────────────────────────
        embeds.push(new EmbedBuilder()
            .setTitle("📜  Sovereign Bonds")
            .setColor("Gold")
            .addFields(
                {
                    name: "📋  Commands",
                    value:
                        "`/treasury bonds issue face-value: yield: maturity-days:` — List bond for sale.\n" +
                        "`/treasury bonds list` — View all bonds this server has issued.\n" +
                        "`/treasury bonds redeem bond-id:` — Pay out at maturity (face value to holder).\n" +
                        "`/treasury bonds buyback bond-id:` — Buy back an active bond early, returning purchase price to the holder (no yield).",
                    inline: false
                },
                {
                    name: "⚙️  How It Works",
                    value:
                        "Purchase price = `faceValue / (1 + yield)`. Treasury receives price immediately; pays face value at maturity.\n" +
                        "If treasury can't cover face value at redemption, the bond is marked **defaulted**.\n\n" +
                        "**Buyers:** citizens and businesses use `/bonds buy` (must be run from your server). Foreign CBs use `/centralbank bonds buy` (their payment is FOREX-converted; their CB balance is debited in their own currency).\n\n" +
                        "**Buyback:** `/treasury bonds buyback` lets you cancel an active bond early. The holder receives only the original purchase price — no yield premium. Useful for clearing debt obligations before maturity.",
                    inline: false
                },
                {
                    name: "📐  Example",
                    value:
                        "Face $10,000 · yield 5% · 30d → price **$9,524**.\n" +
                        "Treasury gets $9,524 now, pays $10,000 at maturity.\n" +
                        "If you run `/treasury bonds buyback` before maturity, you pay $9,524 back and the obligation ends.",
                    inline: false
                }
            )
        );

        // ── 7. Authorization & Entanglement ───────────────────────────────────
        embeds.push(new EmbedBuilder()
            .setTitle("🔑  Authorization & Entanglement")
            .setColor("Gold")
            .addFields(
                {
                    name: "Full Treasury Authorization",
                    value:
                        "`/authorize add|remove user:@user` — Grant/revoke full treasury access for a user (server owner or Administrators).\n" +
                        "`/authorize add|remove role:@role` — Grant/revoke full treasury access for an entire role — anyone holding it gains access.\n" +
                        "Provide **either** `user:` or `role:`, not both. Separate from CB auth.",
                    inline: false
                },
                {
                    name: "Business Manager Authorization",
                    value:
                        "`/treasury business-auth add|remove user:@user` — Grant/revoke business manager access for a user (owner only).\n" +
                        "`/treasury business-auth add|remove role:@role` — Grant/revoke business manager access for an entire role.\n" +
                        "Provide **either** `user:` or `role:`, not both.\n\n" +
                        "Business managers can run `/treasury add-business`, `/treasury edit-business`, and `/treasury remove-business` **without** having full treasury access. They cannot access treasury balance, taxes, departments, or other treasury settings.",
                    inline: false
                },
                {
                    name: "Public Commands",
                    value: "`/treasury balance-all` — Anyone can view all government balances (treasury, CB, all departments). No auth required.",
                    inline: false
                },
                {
                    name: "Entanglement",
                    value:
                        "`/treasury entanglement add` — Generate join code.\n" +
                        "`/treasury entanglement join code:` — Share economy with another server.\n" +
                        "`/treasury entanglement disengage` — Restore independent economy.",
                    inline: false
                }
            )
            .setFooter({ text: "/cbhelp — Central Bank · /bondshelp — Bonds for citizens & businesses · /taxhelp — bracket syntax · /help — member commands" })
        );

        return interaction.reply({ embeds });
    }
};
