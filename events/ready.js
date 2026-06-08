const { scheduleForexUpdates } = require('../dataCrusher/services/forexUpdate');
const { scheduleFeeUpdates } = require('../dataCrusher/services/feeUpdate');

module.exports = {
	name: 'clientReady',
	once: true,
	execute(client) {
		console.log(`Ready! Logged in as ${client.user.tag}`);
		scheduleForexUpdates(client);
		scheduleFeeUpdates(client);
	},
};