const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("taxhelp")
        .setDescription("Overview of all tax types and how to use them."),

    async execute(interaction) {
        const bracketNote = "**Bracket format:** `50000:10,100000:20,30`\n" +
            "Each pair is `threshold:rate%`. The trailing number (no colon) is the top bracket rate — everything above the last threshold.\n" +
            "Example above: first $50k @ 10%, next $50k @ 20%, everything above $100k @ 30%.\n" +
            "Omitting a top rate leaves income above the last threshold untaxed.";

        const embed = new EmbedBuilder()
            .setTitle("Tax System Overview")
            .setColor("Blue")
            .addFields(
                {
                    name: "🏦  Sales Tax",
                    value: "Applied automatically at point of sale on purchases.\n" +
                        "**Configure:** `/treasury tax-service set-sales-tax type:<Flat|Percentage> value:<amount>`\n" +
                        "Flat adds a fixed amount; Percentage adds a % on top of the price.",
                    inline: false
                },
                {
                    name: "💵  Income Tax",
                    value: "Progressive bracket tax applied automatically when members use `/collect-income`.\n" +
                        "**Set brackets:** `/tax type:Income brackets:<brackets>`\n" +
                        "Brackets are stored server-wide and applied to every salary payout until changed.\n" +
                        "If no brackets are set, no income tax is deducted on collection.",
                    inline: false
                },
                {
                    name: "🏛️  PEX (Wealth Tax)",
                    value: "Progressive bracket tax on members' **bank** balances.\n" +
                        "**Apply:** `/tax type:PEX brackets:<brackets> [target-role:@role] [preview:true]`\n" +
                        "Omit `target-role` to sweep all registered members.",
                    inline: false
                },
                {
                    name: "🧾  VAT (Business Tax)",
                    value: "Progressive bracket tax on all **business account** balances in the server.\n" +
                        "**Apply:** `/tax type:VAT brackets:<brackets> [preview:true]`\n" +
                        "`target-role` has no effect on VAT — it always sweeps all businesses.",
                    inline: false
                },
                {
                    name: "📐  Bracket Format",
                    value: bracketNote,
                    inline: false
                }
            )
            .setFooter({ text: "Use preview:true with PEX and VAT to see the breakdown before collecting." });

        return interaction.reply({ embeds: [embed] });
    }
};
