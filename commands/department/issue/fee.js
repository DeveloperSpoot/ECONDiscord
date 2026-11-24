module.exports = {
    configure(subcommand) {
        return subcommand
            .setName("fee")
            .setDescription(
                "Issue a fee to a user, which is to be paid upon being issued."
            )
            .addUserOption((userOp) =>
                userOp
                    .setName("user")
                    .setDescription("The user you wish to issue the fee to.")
                    .setRequired(true)
            )
            .addStringOption((stringOp) =>
                stringOp
                    .setName("reason")
                    .setDescription("The Roleplay character of the user.")
                    .setRequired(true)
            )
            .addNumberOption((numberOp) =>
                numberOp
                    .setName("amount")
                    .setDescription("The amount of the fee you wish to issue.")
                    .setRequired(true)
            )
    },

    async execute(interaction) {

    }
};