const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageEmbed } = require('discord.js');
const { newEmbed, colors } = require('../../util/embeds.js');
const { logger } = require('../../logging.js');

const database = require('../../util/database.js');
const guildConfigSchema = require('../../schemas/guildConfigs.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('reactionrole')
		.setDescription('Customizes a reaction role message')

		// Add reaction message
		.addSubcommand(subcommand => subcommand
			.setName('create')
			.setDescription('Creates a new message for role reactions')
			.addChannelOption(option =>
				option.setName('channel')
					.setDescription('The channel to host the reaction message')
					.setRequired(true),
			)
			.addStringOption(option =>
				option.setName('title')
					.setDescription('The title of the reaction message')
					.setRequired(true),
			),
		)

		// Add role
		.addSubcommand(subcommand => subcommand
			.setName('add')
			.setDescription('Adds a role to the message')
			.addStringOption(option =>
				option.setName('messagelink')
					.setDescription('The reaction message to edit')
					.setRequired(true),
			)
			.addRoleOption(option =>
				option.setName('role')
					.setDescription('The role the user will recieve')
					.setRequired(true),
			)
			.addStringOption(option =>
				option.setName('emoji')
					.setDescription('The emoji for this role')
					.setRequired(true),
			),
		)

		// Remove role
		.addSubcommand(subcommand => subcommand
			.setName('remove')
			.setDescription('Removes a role from the message')
			.addStringOption(option =>
				option.setName('messagelink')
					.setDescription('The reaction message to edit')
					.setRequired(true),
			)
			.addRoleOption(option =>
				option.setName('role')
					.setDescription('The role to remove from the message')
					.setRequired(true),
			),
		)

		// Delete reaction message
		.addSubcommand(subcommand => subcommand
			.setName('delete')
			.setDescription('Deletes a role reaction message')
			.addStringOption(option =>
				option.setName('messagelink')
					.setDescription('The reaction message to remove')
					.setRequired(true),
			),
		)

		.setDefaultPermission(false),
	permissions: ['MESSAGES'],
	category: 'admin',

	async execute(interaction) {
		await interaction.deferReply();
		switch (interaction.options.getSubcommand()) {
		case 'create':
			createReactionMessage(interaction);
			break;
		case 'add':
			addRoletoMessage(interaction);
			break;
		case 'remove':
			removeRolefromMessage(interaction);
			break;
		case 'delete':
			deleteReactionMessage(interaction);
			break;
		}
	},
};

async function createReactionMessage(interaction) {
	// Reads from the database
	let data = await guildConfigSchema.findOne({ guildID: interaction.guildId });

	// Checks to see if the guild has any saved data
	if(!data) {
		logger.child({ mode: 'DATABASE', metaData: { guildID: interaction.guildId } }).info('Creating new guild configs file for reaction roles');
		// Creates an empty object of reactionMessages
		const guildConfigs = await guildConfigSchema.create({
			guildID: interaction.guildId,
			reactionMessages: {},
			lastEdited: Date.now(),
		});
		database.writeToDatabase(guildConfigs, 'NEW REACTION ROLES GUILD CONFIG');

		data = await guildConfigSchema.findOne({ guildID: interaction.guildId });
	}

	const reactionMessages = data.reactionMessages;

	// Sends the base message
	const channel = interaction.options.getChannel('channel');
	if(channel.type == 'GUILD_TEXT') {
		const baseEmbed = newEmbed()
			.setTitle(interaction.options.getString('title'))
			.setDescription('React to this message to change your roles!')
			.setColor(colors.reactionRolesCommand);

		await channel.send({ embeds: [baseEmbed] }).then(async (msg) => {
			// Creates an empty object of reactionMessages
			reactionMessages[msg.id] = [];
			const newReactionMessage = await guildConfigSchema.findOneAndUpdate({
				guildID: interaction.guildId,
				reactionMessages: reactionMessages,
				lastEdited: Date.now(),
			});
			database.writeToDatabase(newReactionMessage, 'NEW REACTION ROLE MESSAGE');

			const replyEmbed = newEmbed()
				.setTitle('Success!')
				.setColor(colors.success)
				.setDescription('Your reaction message was successfully created :D\nRun `/reactionrole add` to add roles to your message!')
				.addFields({
					name: 'Jump to that message',
					value: `[Click here](${msg.url})`,
				});

			interaction.editReply({
				embeds: [replyEmbed],
			});

		});
	} else {
		interaction.editReply({
			content: 'Please select a valid channel!',
			ephemeral: true,
		});
	}
}

async function deleteReactionMessage(interaction) {
	const data = await guildConfigSchema.findOne({ guildID: interaction.guildId });

	if(!data) {
		interaction.editReply({
			content: 'This server doesn\'t seem to have a reaction role message!',
			ephemeral: true,
		});
		return;
	}

	const reactionMessages = data.reactionMessages;
	const message = await findMessage(interaction, reactionMessages);

	if(message) {
		message.delete()
			.catch(logger.child({
				mode: 'REACTION ROLE',
				metaData: {
					user: interaction.user.username,
					userid: interaction.user.id,
					guild: interaction.guild.name,
					guildid: interaction.guild.id,
				},
			}).error);
		delete reactionMessages[message.id];
		const deletedReactionMessage = await guildConfigSchema.findOneAndUpdate({
			guildID: interaction.guildId,
			reactionMessages: reactionMessages,
			lastEdited: Date.now(),
		});
		database.writeToDatabase(deletedReactionMessage, 'DELETED REACTION ROLE MESSAGE');

		const replyEmbed = newEmbed()
			.setTitle('Success!')
			.setColor(colors.success)
			.setDescription('Your reaction message was safely removed');

		interaction.editReply({ embeds: [replyEmbed] });

	} else {
		interaction.editReply({
			content: 'It seems that message isn\'t from this server',
			ephemeral: true,
		});
	}
}

async function addRoletoMessage(interaction) {
	const data = await guildConfigSchema.findOne({ guildID: interaction.guildId });

	if(!data) {
		interaction.editReply({
			content: 'This server doesn\'t seem to have a reaction role message!',
			ephemeral: true,
		});
		return;
	}

	const reactionMessages = data.reactionMessages;
	const message = await findMessage(interaction, reactionMessages);

	// Checks if the message exists
	if(!message) {
		interaction.editReply({
			content: 'It seems that message isn\'t from this server',
			ephemeral: true,
		});
		return;
	}

	// Gets the options
	const role = interaction.options.getRole('role');
	const emoji = interaction.options.getString('emoji');

	// Checks if the role is valid
	if(role.name == '@everyone') {
		interaction.editReply({
			content: 'That\'s an invalid role!',
			ephemeral: true,
		});
		return;
	}

	// Check if it's a valid emoji
	try {
		await message.react(emoji);
	} catch (error) {
		interaction.editReply({
			content: 'That\'s an invalid emoji!',
			ephemeral: true,
		});
		return;
	}

	// Edits the message
	const lastEmbed = message.embeds[0];
	const fields = lastEmbed.fields;

	const newField = {
		name: `React with ${emoji}`,
		value: `<@&${role.id}>`,
		inline: true,
	};
	fields.push(newField);

	const addRoleEmbed = new MessageEmbed(lastEmbed);
	addRoleEmbed.fields = fields;
	message.edit({ embeds: [addRoleEmbed] });

	// Edits database
	reactionMessages[message.id].push([role.id, emoji]);

	const newRole = await guildConfigSchema.findOneAndUpdate({
		guildID: interaction.guildId,
		reactionMessages: reactionMessages,
		lastEdited: Date.now(),
	});
	database.writeToDatabase(newRole, 'ADDED REACTION ROLE');

	// Responds to the user
	const replyEmbed = newEmbed()
		.setTitle('Success!')
		.setColor(colors.success)
		.setDescription(`<@&${role.id}> was successfully added and binded with the emoji ${emoji}!`);

	interaction.editReply({ embeds: [replyEmbed] });
}

async function removeRolefromMessage(interaction) {
	const data = await guildConfigSchema.findOne({ guildID: interaction.guildId });

	if(!data) {
		interaction.editReply({
			content: 'This server doesn\'t seem to have a reaction role message!',
			ephemeral: true,
		});
		return;
	}

	const reactionMessages = data.reactionMessages;
	const message = await findMessage(interaction, reactionMessages);

	// Checks if the message exists
	if(!message) {
		interaction.editReply({
			content: 'It seems that message isn\'t from this server',
			ephemeral: true,
		});
		return;
	}

	// Gets the options
	const role = interaction.options.getRole('role');

	// Checks if the role is in the message
	let found = false;
	for (const storageRole of reactionMessages[message.id]) {
		if(storageRole[0] == role.id) {
			found = true;
			break;
		}
	}

	if(!found) {
		interaction.editReply({
			content: 'That role is not used in that reaction message!',
			ephemeral: true,
		});
		return;
	}

	// Edits the message and removes the reactions
	const lastEmbed = message.embeds[0];
	const fields = lastEmbed.fields;

	for(let i = 0; i < fields.length; i++) {
		if(fields[i].value == `<@&${role.id}>`) {
			delete fields[i];
		}
	}

	const addRoleEmbed = new MessageEmbed(lastEmbed);
	addRoleEmbed.fields = fields;
	message.edit({ embeds: [addRoleEmbed] });

	// Removes from database
	let emoji;
	for(let i = 0; i < reactionMessages[message.id].length; i++) {
		if(reactionMessages[message.id][i][0] == role.id) {
			emoji = reactionMessages[message.id][i][1];
			reactionMessages[message.id].splice(i, 1);
		}
	}

	const deleteRole = await guildConfigSchema.findOneAndUpdate({
		guildID: interaction.guildId,
		reactionMessages: reactionMessages,
		lastEdited: Date.now(),
	});
	database.writeToDatabase(deleteRole, 'REMOVED REACTION ROLE');

	// Removes the reactions
	await message.reactions.cache.get(emoji).remove();

	// Responds to the user
	const replyEmbed = newEmbed()
		.setTitle('Success!')
		.setColor(colors.success)
		.setDescription(`<@&${role.id}> was safely removed from the role reaction message!`);

	interaction.editReply({ embeds: [replyEmbed] });
}

// Searched for a valid reaction message in the server
async function findMessage(interaction, reactionGuild) {
	const messageLink = interaction.options.getString('messagelink');
	const messageID = messageLink.split('/')[6];

	// If that message isn't a reaction message
	if(!reactionGuild[messageID]) {
		interaction.editReply({
			content: 'That message link isn\'t a valid reaction message!',
			ephemeral: true,
		});
		return;
	}

	// Loops through all channels to find the message
	let message = null;
	for(const channel of interaction.guild.channels.cache) {
		if(channel[1].type == 'GUILD_TEXT') {
			try {
				message = await channel[1].messages.fetch(messageID);
			} catch (error) {
				// console.log(error);
			}
		}
	}

	return message;
}
