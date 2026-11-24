module.exports = {
    configure(subcommand) {
        return subcommand
            .setName("remove")
            .setDescription(
                "Unbind a discord role from a permission set and/or pay policies."
            )
    },

    async execute(interaction) {

    }
};