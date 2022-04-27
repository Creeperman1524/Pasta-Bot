const fs = require('fs');
const {	REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');

const { clientId, token } = require('./hidden.json');
const { logger } = require('./logging.js');

const rest = new REST({ version: '9' }).setToken(token);

const commands = [];
const guildIDs = [];

module.exports = {
	async execute(client) {
		client.guilds.cache.forEach(guild => {
			guildIDs.push(guild.id);
		});

		await updateCommands(client);

		logger.child({ mode: 'DEPLOY' }).warn('Bypassing application (/) permission check (discord permission system v2)');
		// await updateCommandPermissions(client);
	},
};

// Refreshes all of the commands
async function updateCommands() {
	const commandData = [];
	const commandFolders = fs.readdirSync('./commands');

	logger.child({ mode: 'DEPLOY' }).info('Started refreshing application (/) commands...');

	// Gather commands from folders
	for(const folder of commandFolders) {
		const commandFiles = fs.readdirSync(`./commands/${folder}`).filter(file => file.endsWith('.js'));
		for (const file of commandFiles) {
			const command = require(`./commands/${folder}/${file}`);
			commands.push(command);
			if(command.data) {
				commandData.push(command.data.toJSON());
				logger.child({ mode: 'DEPLOY' }).debug(`Pushing '${command.data.name}' to command list`);
			}
		}
	}

	// Updates global slash commands
	try {
		await rest.put(
			Routes.applicationCommands(clientId),
			{ body: commandData },
		);
		logger.child({ mode: 'DEPLOY' }).info('Successfully reloaded application (/) commands.');
	} catch (error) {
		logger.child({ mode: 'DEPLOY' }).warn('Could not reload application (/) commands');
		logger.child({ mode: 'DEPLOY' }).error(error);
	}
}

// Refreshes the command permissions
async function updateCommandPermissions(client) {
	// Updates permission for each guild
	try {
		logger.child({ mode: 'DEPLOY' }).info('Started refreshing application (/) command permissions...');

		for(const id of guildIDs) {
			const fullPermissions = [];
			for(const command of await client.application.commands.fetch()) {
				const permission = generatePermissions(command[1], client.guilds.cache.get(id));
				if(permission) fullPermissions.push(permission);
			}
			await rest.put(
				Routes.guildApplicationCommandsPermissions(clientId, id),
				{ body: fullPermissions },
			);
		}
		logger.child({ mode: 'DEPLOY' }).info('Successfully reloaded application (/) command permissions.');
	} catch (error) {
		logger.child({ mode: 'DEPLOY' }).warn('Could not reload application (/) command permissions');
		logger.child({ mode: 'DEPLOY' }).error(error);
	}
}

// Valid permissions: OWNER, ADMIN, MESSAGES
function generatePermissions(discordCommand, guild) {
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

	// Owner permission
	if(command.permissions[0] == 'OWNER') {
		commandPermission.permissions.push({
			id: '284842415289008138',
			type: 2,
			permission: true,
		});
		logger.child({ mode: 'DEPLOY' }).debug(`Added OWNER permission to '${command.data.name}' in '${guild.name}' (${guild.id})'`);
	}

	// Administrator permission
	if(command.permissions[0] == 'ADMIN') {
		let count = 0;
		guild.roles.cache.forEach(role => {
			if(role.permissions.has('ADMINISTRATOR') && count < 10) {
				commandPermission.permissions.push({
					id: role.id,
					type: 1,
					permission: true,
				});
				logger.child({ mode: 'DEPLOY' }).debug(`Added ADMIN permission to '${command.data.name}' with role '${role.name}' (${role.id}) in '${guild.name}' (${guild.id})`);
				count++;
			}
		});
	}

	if(command.permissions[0] == 'MESSAGES') {
		let count = 0;
		guild.roles.cache.forEach(role => {
			if(role.permissions.has('MANAGE_MESSAGES') && count < 10) {
				commandPermission.permissions.push({
					id: role.id,
					type: 1,
					permission: true,
				});
				logger.child({ mode: 'DEPLOY' }).debug(`Added MESSAGES permission to '${command.data.name}' with role '${role.name}' (${role.id}) in '${guild.name}' (${guild.id})`);
				count++;
			}
		});
	}

	return commandPermission;
}