module.exports = {
    configure(subcommand) {
        return subcommand
            .setName("add")
            .setDescription(
                "Bind a discord role to a permission set and/or pay policies."
            )
            .addRoleOption((option) =>
                option
                    .setName("role")
                    .setDescription(
                        "The role you would like to bind to perms/pay policies."
                    )
                    .setRequired(true)
            )
    },

    async execute(interaction) {

    }
};