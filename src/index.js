const fs = require('fs');
const { Client, Intents, Collection } = require('discord.js');

const { logger } = require('./logging.js');
const { runTasks } = require('./tasks');
const { newEmbed, colors } = require('./util/embeds.js');
const { readFromDatabase } = require('./util/database.js');
const { token } = require('./hidden.json');

// Creates the bot client
const client = new Client({
	intents: [
		[Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGE_REACTIONS, Intents.FLAGS.GUILD_MEMBERS, Intents.FLAGS.GUILD_MESSAGES],
	],
	partials: ['MESSAGE', 'USER', 'REACTION'],
});


client.commands = new Collection();
const commandFolders = fs.readdirSync('./src/commands');

// Gather commands from folders
for(const folder of commandFolders) {
	const commandFiles = fs.readdirSync(`./src/commands/${folder}`).filter(file => file.endsWith('.js'));
	for (const file of commandFiles) {
		const command = require(`./commands/${folder}/${file}`);
		client.commands.set(command.data.name, command);
	}
}

// Runs when the bot is online
client.once('ready', async () => {
	logger.child({ mode: 'STARTUP' }).info('Bot is initializing...');
	await runTasks(client);
	logger.child({ mode: 'STARTUP' }).info('Bot is active');
});

// Command Handeling
client.on('interactionCreate', async interaction => {
	if (!interaction.isCommand()) return;

	const command = client.commands.get(interaction.commandName); // Gets the corresponding command

	if (!command) return; // If the command doesn't exist, return

	// Tries to run the command
	try {
		logger.child({
			mode: 'COMMAND',
			metaData: {
				user: interaction.user.username,
				userid: interaction.user.id,
				guild: interaction.guild.name,
				guildid: interaction.guild.id,
			},
		}).info(`Command '${interaction.commandName}' executed by '${interaction.user.username}' in guild '${interaction.guild.name}'`);

		await command.execute(interaction);
	} catch (error) {
		logger.child({
			mode: 'COMMAND',
			metaData: {
				user: interaction.user.username,
				userid: interaction.user.id,
				guild: interaction.guild.name,
				guildid: interaction.guild.id,
			},
		}).error(error);

		const errorEmbed = newEmbed()
			.setTitle('Error')
			.setColor(colors.error)
			.setDescription('There was an error trying to execute that command!');

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
	const data = readFromDatabase();
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
				logger.child({
					mode: 'REACTION ROLES',
					metaData: {
						user: user.username, userid: user.id,
						guild: reaction.message.guild.name, guildid: reaction.message.guildId,
						role: role.name, roleid: role.id,
					},
				}).info(`Added '${role.name}' to user '${member.user.username}' in guild '${reaction.message.guild.name}'`);
				break;
			case 'remove':
				await member.roles.remove(role);
				logger.child({
					mode: 'REACTION ROLES',
					metaData: {
						user: user.username, userid: user.id,
						guild: reaction.message.guild.name, guildid: reaction.message.guildId,
						role: role.name, roleid: role.id,
					},
				}).info(`Removed '${role.name}'to user '${member.user.username}' in guild '${reaction.message.guild.name}'`);
				break;
			}

		} catch (error) {
			logger.child({
				mode: 'REACTION ROLES',
				metaData: {
					user: user.username, userid: user.id,
					guild: reaction.message.guild.name, guildid: reaction.message.guildId,
					role: role.name, roleid: role.id,
				},
			}).error(error);
		}
	} else {
		// Role doesn't exist
		logger.child({
			mode: 'REACTION ROLES',
			metaData: {
				user: user.username, userid: user.id,
				guild: reaction.message.guild.name, guildid: reaction.message.guildId,
			},
		}).warn(`Role for reaction ${reaction.emoji.name} does not exist!`);
	}
}

// Logs the bot in
client.login(token);