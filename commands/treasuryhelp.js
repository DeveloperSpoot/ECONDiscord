const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("treasuryhelp")
        .setDescription("Treasury operational guide — commands for departments, businesses, payroll, taxes, and bonds."),

    async execute(interaction) {
        const embeds = [];

        // ── 1. Overview & Core ────────────────────────────────────────────────
        embeds.push(new EmbedBuilder()
            .setTitle("🏛️  Treasury — Overview & Core Commands")
            .setColor("Gold")
            .setDescription(
                "The Treasury is the government's operational account. It funds departments, manages businesses, " +
                "collects taxes, issues bonds, and controls the economy's starting conditions.\n\n" +
                "**Access:** `/authorize add @user` (server owner only). Administrators always have access."
            )
            .addFields(
                {
                    name: "📊  Information",
                    value:
                        "`/treasury balance` — View the treasury balance.\n" +
                        "`/treasury statistics` — Full economic statistics snapshot.",
                    inline: false
                },
                {
                    name: "⚙️  Configuration",
                    value:
                        "`/treasury set-currency symbol:` — Change the currency symbol shown on all money displays.\n" +
                        "`/treasury set-starting-balance amount:` — Set the balance new members receive on registration.\n" +
                        "`/setlogchannel channel:` — Set one channel to receive ALL transaction and activity logs.\n" +
                        "`/treasury clean-up` — Removes and liquidates accounts of members who left the server.",
                    inline: false
                },
                {
                    name: "💱  Price Inflation / Deflation",
                    value:
                        "`/treasury inflate percentage-amount:` — Raise all item prices by a percentage.\n" +
                        "`/treasury deflate percentage-amount:` — Lower all item prices by a percentage.",
                    inline: false
                }
            )
        );

        // ── 2. Departments ────────────────────────────────────────────────────
        embeds.push(new EmbedBuilder()
            .setTitle("🏢  Departments")
            .setColor("Gold")
            .setDescription(
                "Departments are government branches (e.g. Police, Ministry of Finance). " +
                "Each has its own balance, budget, roles, and payroll."
            )
            .addFields(
                {
                    name: "📋  Setup",
                    value:
                        "`/treasury add-department name: head-role: member-role: description: budget: max-balance:` — Create a department.\n" +
                        "`/treasury remove-department department:` — Dissolve a department (balance returned to treasury).\n" +
                        "`/treasury edit-department department: [name] [head-role] [member-role] [description] [budget] [max-balance]` — Edit any department field.",
                    inline: false
                },
                {
                    name: "💰  Funding",
                    value:
                        "`/treasury fund-department department: amount:` — Transfer treasury funds into a department's balance.\n" +
                        "`/treasury set-budget-timeout dep-timeout:` — Set how often departments can claim their budget (in days).\n" +
                        "`/transfer department-to-treasury department: amount:` — Return department funds to treasury (requires dept management).",
                    inline: false
                },
                {
                    name: "👥  Paying From a Department",
                    value:
                        "`/dep pay pay-member user: amount: [reason]` — Send funds from the department to a member's bank.\n" +
                        "`/dep pay pay-business business: amount: [reason]` — Send funds to a business account.\n" +
                        "`/dep pay pay-department department: amount: [reason]` — Send funds to another department.",
                    inline: false
                },
                {
                    name: "🔍  Fines & Fees",
                    value:
                        "`/treasury view-fines` — List all unpaid fines issued by departments.\n" +
                        "`/treasury view-fees` — List issued fees.\n" +
                        "`/treasury dismiss-fine fine:` — Cancel a fine without collection.",
                    inline: false
                }
            )
        );

        // ── 3. Businesses ─────────────────────────────────────────────────────
        embeds.push(new EmbedBuilder()
            .setTitle("🏪  Businesses")
            .setColor("Gold")
            .setDescription(
                "Businesses are registered private entities in the economy. " +
                "They have their own accounts, employees, items, and payroll."
            )
            .addFields(
                {
                    name: "📋  Setup",
                    value:
                        "`/treasury add-business name: owner: description: selfserved: role:` — Register a new business.\n" +
                        "`/treasury remove-business business:` — Deregister a business.\n" +
                        "`/treasury edit-business business: [name] [description] [owner] [selfserved] [role]` — Edit business fields.",
                    inline: false
                },
                {
                    name: "💳  Transfers",
                    value:
                        "`/bus pay pay-member user: amount:` — Pay a member from the business (subject to payroll tax).\n" +
                        "`/bus pay pay-business business: amount:` — Pay another business.\n" +
                        "`/transfer business-to-treasury business: amount:` — Return business funds to treasury (requires manager).\n" +
                        "`/transfer business-to-department business: department: amount:` — Send from business to department.",
                    inline: false
                },
                {
                    name: "🛒  Items & Sales",
                    value:
                        "Items are managed via `/bus item` commands (add, edit, remove).\n" +
                        "Members buy with `/buy` or `/bus quick-sell` (counter-side sale).\n" +
                        "Sales are subject to sales tax if configured.",
                    inline: false
                }
            )
        );

        // ── 4. Payroll & Stipends ─────────────────────────────────────────────
        embeds.push(new EmbedBuilder()
            .setTitle("💵  Payroll, Salaries & Stipends")
            .setColor("Gold")
            .addFields(
                {
                    name: "Payroll (manual batch)",
                    value:
                        "`/payroll execute` — Run payroll for your active business or department. Pays all employees their set wage in one command. Subject to payroll tax.",
                    inline: false
                },
                {
                    name: "Salary (automatic, periodic)",
                    value:
                        "`/salary set entity: user: amount: period-days:` — Configure an automatic salary for a member or role, paid periodically.\n" +
                        "`/collect-income` — Members run this to collect any unpaid salary cycles from all entities they're paid by. Income tax brackets are applied automatically at collection.",
                    inline: false
                },
                {
                    name: "Stipend (government UBI)",
                    value:
                        "`/treasury set-stipend stipend: timeout:` — Set a universal stipend amount and cooldown (in hours) that any registered member can claim.\n" +
                        "`/stipend` — Members claim their stipend.",
                    inline: false
                }
            )
        );

        // ── 5. Taxation ───────────────────────────────────────────────────────
        embeds.push(new EmbedBuilder()
            .setTitle("🧾  Taxation")
            .setColor("Gold")
            .setDescription("There are four tax types. All are collected automatically at point of event.")
            .addFields(
                {
                    name: "🏦  Sales Tax",
                    value:
                        "`/treasury tax-service set-sales-tax type: value:` — Set a flat or percentage tax applied to all item purchases.\n" +
                        "Collected automatically at point of sale and sent to treasury.",
                    inline: false
                },
                {
                    name: "📋  Payroll Tax",
                    value:
                        "`/treasury tax-service set-payroll-tax type: value:` — Set a flat or percentage tax applied when businesses/departments pay members.\n" +
                        "Deducted from the payer (not the recipient) and sent to treasury.",
                    inline: false
                },
                {
                    name: "💵  Income Tax (bracket)",
                    value:
                        "`/tax type:Income brackets:` — Store progressive income tax brackets server-wide.\n" +
                        "Applied automatically when members use `/collect-income`. Members pay tax on gross salary before receiving net.\n" +
                        "**Bracket format:** `50000:10,100000:20,30` → first $50k @ 10%, next $50k @ 20%, above $100k @ 30%.",
                    inline: false
                },
                {
                    name: "🏛️  PEX — Wealth Tax",
                    value:
                        "`/tax type:PEX brackets: [target-role] [preview:true]` — Progressive bracket tax sweep on all member **bank** balances.\n" +
                        "Omit `target-role` to sweep all registered members. Use `preview:true` to see impact before collecting.",
                    inline: false
                },
                {
                    name: "🧾  VAT — Business Tax",
                    value:
                        "`/tax type:VAT brackets: [preview:true]` — Progressive bracket tax sweep on all **business account** balances.\n" +
                        "Always sweeps all businesses regardless of role filter.",
                    inline: false
                }
            )
        );

        // ── 6. Bonds ──────────────────────────────────────────────────────────
        embeds.push(new EmbedBuilder()
            .setTitle("📜  Sovereign Bonds (Treasury Side)")
            .setColor("Gold")
            .setDescription(
                "The Treasury can issue bonds to raise funds. Buyers pay now, you repay more later. " +
                "This creates foreign investment and diplomatic ties — bond holders want your economy stable."
            )
            .addFields(
                {
                    name: "📋  Commands",
                    value:
                        "`/treasury bonds issue face-value: yield: maturity-days:` — List a bond for sale. No money moves until purchased.\n" +
                        "`/treasury bonds list` — View all bonds this server has issued and their status.\n" +
                        "`/treasury bonds redeem bond-id:` — Pay out a matured bond. Debits treasury, credits the holder.",
                    inline: false
                },
                {
                    name: "⚙️  How Bonds Work",
                    value:
                        "**Purchase price** = `faceValue / (1 + yieldRate)` — buyers pay less than face value.\n" +
                        "**At maturity:** you pay face value back to the holder (they profit the difference).\n" +
                        "**If you can't pay:** the bond is marked **defaulted** — visible to all holders. Reputational consequence.\n\n" +
                        "Individual buyers use `/bonds buy`. Foreign CBs use `/centralbank bonds buy` (their purchase also inflates your C_n as a reserve).",
                    inline: false
                },
                {
                    name: "📐  Example",
                    value:
                        "Issue: face value $10,000 · yield 5% · 30-day maturity\n" +
                        "Purchase price: $10,000 / 1.05 = **$9,524**\n" +
                        "Buyer pays $9,524 now → treasury receives $9,524 immediately.\n" +
                        "After 30 days: treasury pays out **$10,000**. Buyer earns $476.",
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
                    name: "Treasury Authorization",
                    value:
                        "`/authorize add user:@user` — Grant treasury access (server owner only).\n" +
                        "`/authorize remove user:@user` — Revoke treasury access.\n\n" +
                        "Authorized users can run all treasury commands. This is separate from CB authorization.",
                    inline: false
                },
                {
                    name: "Entanglement (Shared Economy)",
                    value:
                        "`/treasury entanglement add` — Generate a one-time code to share with another server.\n" +
                        "`/treasury entanglement join code:` — Join another server's economy (shares treasury and balances).\n" +
                        "`/treasury entanglement disengage` — Sever entanglement, restoring this server's independent economy.",
                    inline: false
                }
            )
            .setFooter({ text: "Use /cbhelp for Central Bank operations · /taxhelp for tax bracket syntax · /help for member commands" })
        );

        return interaction.reply({ embeds });
    }
};
