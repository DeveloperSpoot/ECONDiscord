module.exports = {
    configure(subcommand) {
        return subcommand
            .setName('temp')
            .setDescription('temp desc');
    },

    async execute(interaction) {
       
    }
};