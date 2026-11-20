module.exports = {
    configure(subcommand) {
        return subcommand
            .setName("remove-employee")
            .setDescription("Remove an employee from your business.")
            .addUserOption((option)=> 
            option
                .setName("employee")
                .setDescription("The employee you would like to terminate.")
                .setRequired(true)
            )
    },

    async execute(interaction) {
       
    }
};