// Packages
const fs = require('fs');
const {
	Client,
	Intents,
	Collection,
} = require('discord.js');

const mcping = require('mcping-js');

// Config
const {
	pingInterval,
	mcServerPort,
} = require('./config.json');

const {
	token,
	mcServerIP,
} = require('./hidden.json');


// Creates the bot client
const client = new Client({
	intents: [
		[Intents.FLAGS.GUILDS],
	],
});

client.commands = new Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
	const command = require(`./commands/${file}`);
	client.commands.set(command.data.name, command);
}

// Runs when the bot is online
client.once('ready', () => {
	getStatus();
	console.log('The bot is active');
	setTimeout(getStatus, pingInterval * 1000);
});

// Updates the bot's status periodically
const getStatus = () => {
	const server = new mcping.MinecraftServer(mcServerIP, mcServerPort);

	let activity = '';
	let status = 'dnd';

	server.ping(1000, 756, (err, res) => {
		// Server offline
		if (!(typeof err === 'undefined' || err === null)) {

			client.user.setPresence({
				activities: [{
					name: 'an offline server :(',
					type: 'WATCHING',
				}],
				status: 'dnd',
			});

			// console.log(err);
			return;
		}

		// Server online with no players
		if (typeof res.players.sample === 'undefined') {
			status = 'idle';
			activity = res.players.online + '/' + res.players.max + ' players';
		}

		// Gets the online players
		let onlinePlayers = [];

		// Server online with players
		if (!(typeof res.players.sample === 'undefined')) {
			status = 'online';

			for (let i = 0; i < res.players.sample.length; i++) {
				onlinePlayers.push(res.players.sample[i].name);
			}
			onlinePlayers = onlinePlayers.sort().join(', ');

			activity = res.players.online + '/' + res.players.max + ' players -\n ' + onlinePlayers;
		}

		// Sets the activity to the amount of players on the server
		client.user.setPresence({
			activities: [{
				name: activity,
				type: 'WATCHING',
			}],
			status: status,
		});
	});
};

// Command Handeling
client.on('interactionCreate', async interaction => {
	if (!interaction.isCommand()) return;

	const command = client.commands.get(interaction.commandName); // Gets the corresponding command

	if (!command) return; // If the command doesn't exist, return

	// Tries to run the command
	try {
		await command.execute(interaction);
	} catch (error) {
		console.error(error);
		return interaction.reply({
			content: 'There was an error while executing this command!',
			ephemeral: true,
		});
	}
});

// Logs the bot in
client.login(token);