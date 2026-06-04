const { scheduleForexUpdates } = require('../dataCrusher/services/forexUpdate');

module.exports = {
	name: 'ready',
	once: true,
	execute(client) {
		console.log(`Ready! Logged in as ${client.user.tag}`);
		scheduleForexUpdates(client);
	},
};