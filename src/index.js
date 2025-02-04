require('dotenv').config();
const fs = require('fs');
const { Client, Collection, Events, GatewayIntentBits, Partials } = require('discord.js');

const { logger } = require('./logging.js');
const { runTasks } = require('./tasks');
const { newEmbed, colors } = require('./util/embeds.js');

const database = require('./util/database.js');
const guildConfigSchema = require('./schemas/guildConfigs.js');
const bankSchema = require('./schemas/bank.js');

// Creates the bot client
const client = new Client({
	intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessageReactions, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages],
	partials: [Partials.Message, Partials.User, Partials.Reaction],
});


client.commands = new Collection();
const commandFolders = fs.readdirSync('./src/commands');

// A collection used for awarding pizza points every minute
client.pizzaPointsCooldown = new Collection();

// Gather commands from folders
for (const folder of commandFolders) {
	const commandFiles = fs.readdirSync(`./src/commands/${folder}`).filter(file => file.endsWith('.js'));
	for (const file of commandFiles) {
		const command = require(`./commands/${folder}/${file}`);
		client.commands.set(command.data.name, command);
	}
}

// Runs when the bot is online
client.once(Events.ClientReady, async () => {
	logger.child({ mode: 'STARTUP' }).info('Bot is initializing...');
	await runTasks(client);
	logger.child({ mode: 'STARTUP' }).info('Bot is active');
});

// Interaction handling
client.on(Events.InteractionCreate, async interaction => {
	if (interaction.isCommand()) interactionCommand(interaction);
	if (interaction.isAutocomplete()) autocompleteCommand(interaction);
});

// Command handling
async function interactionCommand(interaction) {
	const command = client.commands.get(interaction.commandName); // Gets the corresponding command

	if (!command) return; // If the command doesn't exist, return

	await interaction.deferReply();

	// Tries to run the command
	try {
		logger.child({
			mode: 'COMMAND',
			metaData: {
				user: interaction.user.username,
				userid: interaction.user.id,
				guild: interaction.guild.name,
				guildid: interaction.guild.id,
				subcommand: interaction.options._subcommand,
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
				subcommand: interaction.options._subcommand,
			},
		}).error(error);

		const errorEmbed = newEmbed()
			.setTitle('Error')
			.setColor(colors.error)
			.setDescription('There was an error trying to execute that command!');

		return interaction.editReply({
			embeds: [errorEmbed],
			ephemeral: true,
		});
	}
}

async function autocompleteCommand(interaction) {
	const command = client.commands.get(interaction.commandName);

	try {
		 command.autocomplete(interaction);
	} catch (error) {
		logger.child({
			mode: 'AUTOCOMPLETE',
			metaData: {
				user: interaction.user.username,
				userid: interaction.user.id,
				guild: interaction.guild.name,
				guildid: interaction.guild.id,
				command: interaction.commandName,
				commandid: interaction.commandId,
			},
		}).error(error);
	}

}

// Awards a random amount of pizza points to the user when they send a message on a 1 minute cooldown
client.on(Events.MessageCreate, async message => {
	if (message.author.bot) return;

	const userID = message.author.id;

	// Checks if the user is on cooldown (1 minute timer)
	if (client.pizzaPointsCooldown.has(userID) && (client.pizzaPointsCooldown.get(userID) > Date.now())) return;

	const account = await bankSchema.findOne({ userID: userID });

	// Checks to see if the user is in the database
	if (!account) {
		logger.child({ mode: 'DATABASE', metaData: { userID: userID } }).info('Creating new user account for the bank from message rewards');
		const bankBalance = await bankSchema.create({ userID: userID });
		database.writeToDatabase(bankBalance, 'NEW BANK ACCOUNT');
	}

	// Awards the user and adds the cooldown
	const randomAmount = Math.floor(Math.random() * 4) + 2; // 2 - 5
	await bankSchema.findOneAndUpdate({ userID: userID }, { $inc: { balance: randomAmount, messageEarnings: randomAmount, lifetimeEarnings: randomAmount } });
	client.pizzaPointsCooldown.set(userID, Date.now() + 1 * 60 * 1000);
});

// Listens for reaction changes for the reaction roles
client.on(Events.MessageReactionAdd, async (reaction, user) => {
	reactionRoleHandler(reaction, user, 'add');
});

client.on(Events.MessageReactionRemove, async (reaction, user) => {
	reactionRoleHandler(reaction, user, 'remove');
});

async function reactionRoleHandler(reaction, user, method) {
	if (user.id == client.user.id) return;

	// Reads from the database
	const data = await guildConfigSchema.findOne({ guildID: reaction.message.guildId });

	// Checks to see if the guild has a reaction role message
	if (!data) return;
	if (!data.reactionMessages) return;

	// Reaction partials
	if (reaction.message.partial) await reaction.message.fetch();
	if (reaction.partial) await reaction.fetch();

	// User partials
	if (user.partial) await user.fetch();

	// Checks if the reaction was to a reaction message
	const reactionMessages = data.reactionMessages;
	if (!reactionMessages[reaction.message.id]) return;

	let role;
	// Tries to find the role in the server
	for (const storageRole of reactionMessages[reaction.message.id]) {
		if (storageRole[1] == reaction.emoji.name) {
			role = await reaction.message.guild.roles.fetch(storageRole[0]);
		}
	}

	if (role) {
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
client.login(process.env.token);
