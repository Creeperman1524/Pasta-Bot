// Setup
const fs = require('fs');
const Discord = require('discord.js');
const cooldowns = new Discord.Collection();
const mcping = require('mcping-js');

// Config
const {
	prefix,
	version,
	pingInterval,
	mcServerPort,
} = require('./config.json');

const {
	token,
	mcServerIP,
} = require('./hidden.json');

// Creates the bot client
const bot = new Discord.Client();

// Dynamically adds commands
bot.commands = new Discord.Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js')); // Retrieves all the comamnd files

// Adds the commands to the bot.comamnds array
for (const file of commandFiles) {
	const command = require(`./commands/${file}`);
	bot.commands.set(command.name, command);
}


// Determines when the bot starts running
bot.on('ready', () => {
	getStatus();
	console.log('The bot is active');
	bot.setInterval(getStatus, pingInterval * 1000);
});

// Dynamically sets the bot's status
const getStatus = () => {
	const server = new mcping.MinecraftServer(mcServerIP, mcServerPort);

	let activity = '';
	let status = 'dnd';

	server.ping(1000, 754, (err, res) => {
		// Server offline
		if (!(typeof err === 'undefined' || err === null)) {

			bot.user.setPresence({
				activity: {
					name: 'an offline server',
					type: 'WATCHING',
				},
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
		bot.user.setPresence({
			activity: {
				name: activity,
				type: 'WATCHING',
			},
			status: status,
		});
	});
};

// Command Handeling
bot.on('message', (message) => {
	if (!message.content.startsWith(prefix) || message.author.bot) return; // Return if message doesn't start with prefix or is from a bot

	const args = message.content.slice(prefix.length).trim().split(/ +/); // Splits the message into arguments
	const commandName = args.shift().toLowerCase(); // Lowercases everything

	const command = bot.commands.get(commandName) || bot.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName)); // Determines the command using the aliases

	if (!command) return; // If the command doesn't exist, return

	// DM command handler
	if (command.guildOnly && message.channel.type === 'dm') {
		const dmEmbed = new Discord.MessageEmbed()
			.setTitle('Incorrect Usgage')
			.setColor(0xfdff63)
			.setDescription('`I can\'t execute that command inside DMs!`')
			.setFooter(`Version ${version}`);
		return message.channel.send(dmEmbed);
	}


	// Checks if the user needs more arguments
	if (command.args && !args.length) {
		let reply = 'You didn\'t provide any arguments';

		if (command.usage) { // If the command usage is avaliable, tell the user
			reply += `\nThe proper useage would be: \`${prefix}${commandName} ${command.usage}\``;
		}
		const noArgsEmbed = new Discord.MessageEmbed()
			.setTitle('Incorrect Usage')
			.setColor(0xfdff63)
			.setDescription(reply)
			.setFooter(`Version ${version}`);

		return message.channel.send(noArgsEmbed);
	}

	// Checks if the command is on cooldown
	if (!cooldowns.has(command.name)) {
		cooldowns.set(command.name, new Discord.Collection());
	}

	const now = Date.now();
	const timestamps = cooldowns.get(command.name);
	const cooldownAmount = (command.cooldown || 3) * 1000;

	if (timestamps.has(message.author.id)) {
		const expirationTime = timestamps.get(message.author.id) + cooldownAmount;

		if (now < expirationTime) {
			const timeLeft = (expirationTime - now) / 1000;

			const cooldownEmbed = new Discord.MessageEmbed()
				.setTitle('Error')
				.setColor(0xff1414)
				.setDescription(`\`Please wait ${timeLeft.toFixed(1)} more second(s) before reusing the \`${command.name}\` command.\``)
				.setFooter(`Version ${version}`);

			return message.channel.send(cooldownEmbed);
		}
	}

	// Cooldown cleanup
	timestamps.set(message.author.id, now);
	setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);

	// Checks to see if it can run the command, if not, error
	try {
		command.execute(message, args, bot);
	} catch (error) {
		console.error(error);

		const errorEmbed = new Discord.MessageEmbed()
			.setTitle('Error')
			.setColor(0xff1414)
			.setDescription('There was an error trying to execute that command!')
			.setFooter(`Version ${version}`);

		message.channel.send(errorEmbed);
	}
});

// Logs the bot in
bot.login(token);