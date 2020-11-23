// Setup
const fs = require('fs');
const Discord = require('discord.js');
const cooldowns = new Discord.Collection();

// Config
const {
	prefix,
	token,
} = require('./config.json');

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


// Sets the bot's activity status
bot.on('ready', () => {
	bot.user.setStatus('online');
	bot.user.setActivity(' with pasta', {
		type: 'PLAYING',
	});
	console.log('The bot is active');
});

// Command Handeling
bot.on('message', (message) => {
	if (!message.content.startsWith(prefix) || message.author.bot) return; // Return if message doesn't start with prefix or is from a bot

	const args = message.content.slice(prefix.length).trim().split(/ +/); // Splits the message into arguments
	const commandName = args.shift().toLowerCase(); // Lowercases everything

	const command = bot.commands.get(commandName) || bot.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName)); // Determines the command using the aliases

	if (!command) return; // If the command doesn't exist, return

	// DM command handler
	if (command.guildOnly && message.channel.type === 'dm') {
		return message.reply('I can\'t execute that command inside DMs!');
	}


	// Checks if the user needs more arguments
	if (command.args && !args.length) {
		let reply = `You didn't provide any arguments, ${message.author}`;

		if (command.usage) { // If the command usage is avaliable, tell the user
			reply += `\nThe proper useage would be: \`${prefix}${commandName} ${command.usage}\``;
		}

		return message.channel.send(reply);
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
			return message.reply(`Please wait ${timeLeft.toFixed(1)} more second(s) before reusing the \`${command.name}\` command.`);
		}
	}

	// Cooldown cleanup
	timestamps.set(message.author.id, now);
	setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);

	// Checks to see if it can run the command, if not, error
	try {
		command.execute(message, args, bot);
	}
	catch (error) {
		console.error(error);
		message.reply('There was an error trying to execute that commmand!');
	}
});

// Logs the bot in
bot.login(token);