module.exports = {
    configure(subcommand) {
        return subcommand
            .setName("fine")
            .setDescription(
                "Issue a fine to a user, which is to be paid later."
            )
            .addUserOption((userOp) =>
                userOp
                    .setName("user")
                    .setDescription("The user you wish to issue a fine to.")
                    .setRequired(true)
            )
            .addStringOption((stringOp) =>
                stringOp
                    .setName("character")
                    .setDescription("The Roleplay character of the user.")
                    .setRequired(true)
            )
            .addStringOption((stringOp) =>
                stringOp
                    .setName("cad-record-id")
                    .setDescription("The cad record ID for the fine.")
                    .setRequired(true)
            )
            .addNumberOption((numberOp) =>
                numberOp
                    .setName("amount")
                    .setDescription("The amount of the fine you wish to issue.")
                    .setRequired(true)
            )
    },

    async execute(interaction) {

    }
};