// Packages
const fs = require('fs');
const { Client, Intents, Collection, MessageEmbed } = require('discord.js');
const mcping = require('mcping-js');

// Config
const { statusInterval, commandRefreshInterval, mcServerPort, version } = require('./config.json');
const { token, mcServerIP } = require('./hidden.json');
const deployCommands = require('./deploy-commands');

// Creates the bot client
const client = new Client({
	intents: [
		[Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGE_REACTIONS, Intents.FLAGS.GUILD_MEMBERS, Intents.FLAGS.GUILD_MESSAGES],
	],
	partials: ['MESSAGE', 'USER', 'REACTION'],
});


client.commands = new Collection();
const commandFolders = fs.readdirSync('./commands');

// Gather commands from folders
for(const folder of commandFolders) {
	const commandFiles = fs.readdirSync(`./commands/${folder}`).filter(file => file.endsWith('.js'));
	for (const file of commandFiles) {
		const command = require(`./commands/${folder}/${file}`);
		client.commands.set(command.data.name, command);
	}
}

// Runs when the bot is online
client.once('ready', () => {
	updateCommands();

	console.log('\nThe bot is active');

	displayServer();
	setInterval(displayServer, statusInterval * 1000);
});

// Refreshes the commands on startup
const updateCommands = () => {
	const raw = fs.readFileSync('./storage.json');
	const data = JSON.parse(raw);

	const currentTime = Date.now();

	// Refreshes commands only if it hasn't within the last 30 minutes
	if(data.commandUpdate < currentTime) {
		deployCommands.execute(client);
		data.commandUpdate = currentTime + (commandRefreshInterval * 60000);

		// Updates time
		fs.writeFileSync('./storage.json', JSON.stringify(data));
	} else {
		console.log('Commands will be refreshed on startup in ' + Math.floor((data.commandUpdate - currentTime) / 60000) + ' minutes');
	}
};


// Updates the bot's status periodically
const displayServer = () => {
	const server = new mcping.MinecraftServer(mcServerIP, mcServerPort);

	let activity = '';
	let status = 'dnd';

	server.ping(1000, 757, (err, res) => {
		// Server offline
		if (!(typeof err === 'undefined' || err === null)) {

			client.user.setPresence({
				activities: [{
					name: 'an offline server :(',
					type: 'PLAYING',
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
				type: 'PLAYING',
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

		const errorEmbed = new MessageEmbed()
			.setTitle('Error')
			.setColor(0xff1414)
			.setDescription('There was an error trying to execute that command!')
			.setFooter(`Version ${version}`);

		return interaction.reply({
			embeds : [errorEmbed],
			ephemeral: true,
		});
	}
});

// Listens for reaction changes for the reaction roles
client.on('messageReactionAdd', async (reaction, user) => {
	reactionRoleHandler(reaction, user, 'add');
});

client.on('messageReactionRemove', async (reaction, user) => {
	reactionRoleHandler(reaction, user, 'remove');
});

async function reactionRoleHandler(reaction, user, method) {
	if(user.id == client.user.id) return;

	// Reads from the database
	const data = JSON.parse(fs.readFileSync('./storage.json'));
	const reactionMessages = data.reactionMessages;

	// Reaction partials
	if(reaction.message.partial) await reaction.message.fetch();
	if(reaction.partial) await reaction.fetch();

	// User partials
	if(user.partial) await user.fetch();

	// Checks if the reaction was to a reaction message
	if(!reactionMessages[reaction.message.guildId]) return;
	if(!reactionMessages[reaction.message.guildId][reaction.message.id]) return;

	let role;
	// Tries to find the role in the server
	for(const storageRole of reactionMessages[reaction.message.guildId][reaction.message.id]) {
		if(storageRole[1] == reaction.emoji.name) {
			role = reaction.message.guild.roles.cache.get(storageRole[0]);
		}
	}

	if(role) {
		const member = await reaction.message.guild.members.cache.find((mem) => mem.id === user.id);
		try {
			// Gives the user the role
			switch (method) {
			case 'add':
				// NOTE: Does not work when the user has not been cached (no messages sent after restart)
				await member.roles.add(role);
				break;
			case 'remove':
				await member.roles.remove(role);
				break;
			}

		} catch (error) {
			console.log(error);
		}
	} else {
		// Role doesn't exist
		console.error(`Role for reaction ${reaction.emoji.name} does not exist!`);
	}
}

// Logs the bot in
client.login(token);