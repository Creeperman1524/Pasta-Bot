const fs = require('fs');
const {	REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');

const { clientId, token } = require('./hidden.json');

const rest = new REST({ version: '9' }).setToken(token);

const commands = [];
const guildIDs = [];

module.exports = {
	async execute(client) {
		client.guilds.cache.forEach(guild => {
			guildIDs.push(guild.id);
		});

		await updateCommands();

		await updateCommandPermissions(client);
	},
};

// Refreshes all of the commands
async function updateCommands() {
	const commandData = [];
	const commandFolders = fs.readdirSync('./commands');

	// Gather commands from folders
	for(const folder of commandFolders) {
		const commandFiles = fs.readdirSync(`./commands/${folder}`).filter(file => file.endsWith('.js'));
		for (const file of commandFiles) {
			const command = require(`./commands/${folder}/${file}`);
			commands.push(command);
			if(command.data) {
				commandData.push(command.data.toJSON());
			}
		}
	}

	// Updates global slash commands
	try {
		console.log('Started refreshing application (/) commands...');

		await rest.put(
			Routes.applicationCommands(clientId),
			{ body: commandData },
		);
		console.log('Successfully reloaded application (/) commands.');
	} catch (error) {
		console.warn('Could not reload application (/) commands from ');
		console.error(error);
	}
}

// Refreshes the command permissions
async function updateCommandPermissions(client) {
	// Updates permission for each guild
	try {
		console.log('Started refreshing application (/) command permissions...');

		for(const id of guildIDs) {
			const fullPermissions = [];
			for(const command of await client.application.commands.fetch()) {
				const permission = generatePermissions(command[1]);
				if(permission) fullPermissions.push(permission);
			}
			await rest.put(
				Routes.guildApplicationCommandsPermissions(clientId, id),
				{ body: fullPermissions },
			);
		}
		console.log('Successfully reloaded application (/) command permissions.');
	} catch (error) {
		console.warn('Could not reload application (/) command permissions from');
		console.error(error);
	}
}

// Valid permissions: OWNER
function generatePermissions(discordCommand) {
	// Pairs API command and file command
	let command;
	for(const cmd of commands) {
		if (cmd.data.name == discordCommand.name) command = cmd;
	}

	// If there are no permissions
	if(!command.permissions) return null;

	// Base permission object
	const commandPermission = {
		id: discordCommand.id,
		permissions: [],
	};

	if(command.permissions[0] == 'OWNER') {
		commandPermission.permissions.push({
			id: '284842415289008138',
			type: 2,
			permission: true,
		});
	}

	return commandPermission;
}