const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageEmbed } = require('discord.js');
const { version } = require('../../config.json');
const fs = require('fs');

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
	const data = readFromDatabase();
	const reactionMessages = data.reactionMessages;

	if(!reactionMessages[interaction.guildId]) reactionMessages[interaction.guildId] = {};
	const reactionGuild = reactionMessages[interaction.guildId];

	// Sends the base message
	const channel = interaction.options.getChannel('channel');
	if(channel.type == 'GUILD_TEXT') {
		const baseEmbed = new MessageEmbed()
			.setTitle(interaction.options.getString('title'))
			.setDescription('React to this message to change your roles!')
			.setColor(0x3274ba)
			.setFooter(`Version ${version}`);

		await channel.send({ embeds: [baseEmbed] }).then((msg) => {
			reactionGuild[msg.id] = [];

			const replyEmbed = new MessageEmbed()
				.setTitle('Success!')
				.setColor(0x009f00)
				.setDescription('Your reaction message was successfully created :D\nRun `/reactionrole add` to add roles to your message!')
				.addFields({
					name: 'Jump to that message',
					value: `[Click here](${msg.url})`,
				})
				.setFooter(`Version ${version}`);

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

	writeToDatabase(data);
}

async function deleteReactionMessage(interaction) {
	const data = readFromDatabase();
	const reactionMessages = data.reactionMessages;

	if(!reactionMessages[interaction.guildId]) reactionMessages[interaction.guildId] = {};
	const reactionGuild = reactionMessages[interaction.guildId];

	const message = await findMessage(interaction, reactionGuild);

	if(message) {
		message.delete()
			.catch(console.error);
		delete reactionGuild[message.id];

		const replyEmbed = new MessageEmbed()
			.setTitle('Success!')
			.setColor(0x009f00)
			.setDescription('Your reaction message was safely removed')
			.setFooter(`Version ${version}`);

		interaction.editReply({ embeds: [replyEmbed] });

	} else {
		interaction.editReply({
			content: 'It seems that message isn\'t from this server',
			ephemeral: true,
		});
	}


	writeToDatabase(data);
}

async function addRoletoMessage(interaction) {
	const data = readFromDatabase();
	const reactionMessages = data.reactionMessages;

	if(!reactionMessages[interaction.guildId]) reactionMessages[interaction.guildId] = {};
	const reactionGuild = reactionMessages[interaction.guildId];

	const message = await findMessage(interaction, reactionGuild);

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

	// Responds to the user
	const replyEmbed = new MessageEmbed()
		.setTitle('Success!')
		.setColor(0x009f00)
		.setDescription(`<@&${role.id}> was successfully added and binded with the emoji ${emoji}!`)
		.setFooter(`Version ${version}`);

	interaction.editReply({ embeds: [replyEmbed] });

	// Edits database
	reactionGuild[message.id].push([role.id, emoji]);

	writeToDatabase(data);
}

async function removeRolefromMessage(interaction) {
	const data = readFromDatabase();
	const reactionMessages = data.reactionMessages;

	if(!reactionMessages[interaction.guildId]) reactionMessages[interaction.guildId] = {};
	const reactionGuild = reactionMessages[interaction.guildId];

	const message = await findMessage(interaction, reactionGuild);

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
	for (const storageRole of reactionGuild[message.id]) {
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
	for(let i = 0; i < reactionGuild[message.id].length; i++) {
		if(reactionGuild[message.id][i][0] == role.id) {
			emoji = reactionGuild[message.id][i][1];
			reactionGuild[message.id].splice(i, 1);
		}
	}

	// Removes the reactions
	await message.reactions.cache.get(emoji).remove();

	// Responds to the user
	const replyEmbed = new MessageEmbed()
		.setTitle('Success!')
		.setColor(0x009f00)
		.setDescription(`<@&${role.id}> was safely removed from the role reaction message!`)
		.setFooter(`Version ${version}`);

	interaction.editReply({ embeds: [replyEmbed] });

	writeToDatabase(data);
}


function readFromDatabase() {
	const raw = fs.readFileSync('./storage.json');
	return JSON.parse(raw);
}

function writeToDatabase(data) {
	fs.writeFileSync('./storage.json', JSON.stringify(data));
}

// Searched for a valid reaction message in the server
async function findMessage(interaction, reactionGuild) {
	const messageLink = interaction.options.getString('messagelink');
	const messageID = messageLink.slice(-18);

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