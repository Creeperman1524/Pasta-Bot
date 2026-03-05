import {
	ChannelType,
	EmbedBuilder,
	EmbedField,
	Message,
	SlashCommandBuilder,
	TextChannel
} from 'discord.js';
import { newEmbed, colors } from '../../util/embeds';
import { logger } from '../../logging';

import database from '../../util/database';
import guildConfigSchema from '../../schemas/guildConfigs.schema';
import { Command, ModChatInputCommandInteraction } from '../../util/types/command';
import { ReactionMessages } from '../../util/types/reactionMessage';

export default {
	data: new SlashCommandBuilder()
		.setName('reactionrole')
		.setDescription('Customizes a reaction role message')

		// Add reaction message
		.addSubcommand((subcommand) =>
			subcommand
				.setName('create')
				.setDescription('Creates a new message for role reactions')
				.addChannelOption((option) =>
					option
						.setName('channel')
						.setDescription('The channel to host the reaction message')
						.setRequired(true)
				)
				.addStringOption((option) =>
					option
						.setName('title')
						.setDescription('The title of the reaction message')
						.setRequired(true)
				)
		)

		// Add role
		.addSubcommand((subcommand) =>
			subcommand
				.setName('add')
				.setDescription('Adds a role to the message')
				.addStringOption((option) =>
					option
						.setName('messagelink')
						.setDescription('The reaction message to edit')
						.setRequired(true)
				)
				.addRoleOption((option) =>
					option
						.setName('role')
						.setDescription('The role the user will recieve')
						.setRequired(true)
				)
				.addStringOption((option) =>
					option
						.setName('emoji')
						.setDescription('The emoji for this role')
						.setRequired(true)
				)
		)

		// Remove role
		.addSubcommand((subcommand) =>
			subcommand
				.setName('remove')
				.setDescription('Removes a role from the message')
				.addStringOption((option) =>
					option
						.setName('messagelink')
						.setDescription('The reaction message to edit')
						.setRequired(true)
				)
				.addRoleOption((option) =>
					option
						.setName('role')
						.setDescription('The role to remove from the message')
						.setRequired(true)
				)
		)

		// Delete reaction message
		.addSubcommand((subcommand) =>
			subcommand
				.setName('delete')
				.setDescription('Deletes a role reaction message')
				.addStringOption((option) =>
					option
						.setName('messagelink')
						.setDescription('The reaction message to remove')
						.setRequired(true)
				)
		)

		.setDefaultMemberPermissions(0), // TODO: this should be updated with better permission
	category: 'admin',

	async execute(interaction) {
		switch (interaction.options.getSubcommand()) {
			case 'create':
				await createReactionMessage(interaction);
				break;
			case 'add':
				await addRoletoMessage(interaction);
				break;
			case 'remove':
				await removeRolefromMessage(interaction);
				break;
			case 'delete':
				await deleteReactionMessage(interaction);
				break;
		}
	}
} as Command;

async function createReactionMessage(interaction: ModChatInputCommandInteraction) {
	// Find the guild data, creating a new entry if needed
	const data = await guildConfigSchema.findOneAndUpdate(
		{ guildID: interaction.guildId },
		{ $setOnInsert: { guildID: interaction.guildId } },
		{ upsert: true, new: true }
	);

	const reactionMessages = data.reactionMessages ?? {};

	// Sends the base message
	const channel = interaction.options.getChannel('channel');

	if (!channel || channel.type !== ChannelType.GuildText) {
		interaction.editReply({ content: 'Please select a valid channel!' });
		return;
	}

	const baseEmbed = newEmbed()
		.setTitle(interaction.options.getString('title'))
		.setDescription('React to this message to change your roles!')
		.setColor(colors.reactionRolesCommand);

	await (channel as TextChannel).send({ embeds: [baseEmbed] }).then(async (msg) => {
		// Creates an empty object of reactionMessages
		reactionMessages[msg.id] = [];
		const newReactionMessage = await guildConfigSchema.findOneAndUpdate(
			{ guildID: interaction.guildId },
			{ reactionMessages: reactionMessages }
		);

		if (!newReactionMessage) {
			interaction.editReply({
				content: 'Could not update the database! Something has gone wrong'
			});
			logger
				.child({
					mode: 'REACTION ROLE',
					metaData: {
						user: interaction.user.username,
						userid: interaction.user.id,
						guild: interaction.guild?.name,
						guildid: interaction.guild?.id
					}
				})
				.error(
					`Could not update database for guild '${interaction.guild?.name}' with reactionMessages '${reactionMessages}'`
				);
			return;
		}

		database.writeToDatabase(newReactionMessage, 'NEW REACTION ROLE MESSAGE');

		const replyEmbed = newEmbed()
			.setTitle('Success!')
			.setColor(colors.success)
			.setDescription(
				'Your reaction message was successfully created :D\nRun `/reactionrole add` to add roles to your message!'
			)
			.addFields({
				name: 'Jump to that message',
				value: `[Click here](${msg.url})`
			});

		interaction.editReply({
			embeds: [replyEmbed]
		});
	});
}

async function deleteReactionMessage(interaction: ModChatInputCommandInteraction) {
	const data = await guildConfigSchema.findOne({ guildID: interaction.guildId });

	if (!data?.reactionMessages || Object.keys(data.reactionMessages).length == 0) {
		interaction.editReply({
			content: "This server doesn't seem to have a reaction role message!"
		});
		return;
	}

	const reactionMessages = data.reactionMessages;
	const message = await findMessage(interaction, reactionMessages);

	if (!message) {
		interaction.editReply({ content: "It seems that message isn't from this server" });
		return;
	}

	message.delete().catch(
		logger.child({
			mode: 'REACTION ROLE',
			metaData: {
				user: interaction.user.username,
				userid: interaction.user.id,
				guild: interaction.guild?.name,
				guildid: interaction.guild?.id
			}
		}).error
	);
	delete reactionMessages[message.id];
	const deletedReactionMessage = await guildConfigSchema.findOneAndUpdate(
		{ guildID: interaction.guildId },
		{ reactionMessages: reactionMessages }
	);

	if (!deletedReactionMessage) {
		interaction.editReply({
			content: 'Could not update the database! Something has gone wrong'
		});
		logger
			.child({
				mode: 'REACTION ROLE',
				metaData: {
					user: interaction.user.username,
					userid: interaction.user.id,
					guild: interaction.guild?.name,
					guildid: interaction.guild?.id
				}
			})
			.error(
				`Could not update database for guild '${interaction.guild?.name}' with reactionMessages '${reactionMessages}'`
			);
		return;
	}

	database.writeToDatabase(deletedReactionMessage, 'DELETED REACTION ROLE MESSAGE');

	const replyEmbed = newEmbed()
		.setTitle('Success!')
		.setColor(colors.success)
		.setDescription('Your reaction message was safely removed');

	interaction.editReply({ embeds: [replyEmbed] });
}

async function addRoletoMessage(interaction: ModChatInputCommandInteraction) {
	const data = await guildConfigSchema.findOne({ guildID: interaction.guildId });

	if (!data?.reactionMessages || Object.keys(data.reactionMessages).length == 0) {
		interaction.editReply({
			content: "This server doesn't seem to have a reaction role message!"
		});
		return;
	}

	const reactionMessages = data.reactionMessages;
	const message = await findMessage(interaction, reactionMessages);

	// Checks if the message exists
	if (!message) {
		interaction.editReply({ content: "It seems that message isn't from this server" });
		return;
	}

	// Gets the options
	const role = interaction.options.getRole('role');
	const emoji = interaction.options.getString('emoji');

	if (!role || !emoji) {
		interaction.editReply({ content: 'Please provide a role and/or emoji!' });
		return;
	}

	// Checks if the role is valid
	if (role.name == '@everyone') {
		interaction.editReply({ content: "That's an invalid role!" });
		return;
	}

	// Check if it's a valid emoji
	try {
		await message.react(emoji);
	} catch {
		interaction.editReply({ content: "That's an invalid emoji!" });
		return;
	}

	// Edits the message
	const lastEmbed = message.embeds[0];
	const fields = lastEmbed.fields;

	const newField = {
		name: `React with ${emoji}`,
		value: `<@&${role.id}>`,
		inline: true
	} as EmbedField;
	fields.push(newField);

	const addRoleEmbed = EmbedBuilder.from(lastEmbed).setFields(fields);
	message.edit({ embeds: [addRoleEmbed] });

	// Edits database
	reactionMessages[message.id].push([role.id, emoji]);

	const newRole = await guildConfigSchema.findOneAndUpdate(
		{ guildID: interaction.guildId },
		{ reactionMessages: reactionMessages }
	);

	if (!newRole) {
		interaction.editReply({
			content: 'Could not update the database! Something has gone wrong'
		});
		logger
			.child({
				mode: 'REACTION ROLE',
				metaData: {
					user: interaction.user.username,
					userid: interaction.user.id,
					guild: interaction.guild?.name,
					guildid: interaction.guild?.id
				}
			})
			.error(
				`Could not update database for guild '${interaction.guild?.name}' with reactionMessages '${reactionMessages}'`
			);
		return;
	}

	database.writeToDatabase(newRole, 'ADDED REACTION ROLE');

	// Responds to the user
	const replyEmbed = newEmbed()
		.setTitle('Success!')
		.setColor(colors.success)
		.setDescription(
			`<@&${role.id}> was successfully added and binded with the emoji ${emoji}!`
		);

	interaction.editReply({ embeds: [replyEmbed] });
}

async function removeRolefromMessage(interaction: ModChatInputCommandInteraction) {
	const data = await guildConfigSchema.findOne({ guildID: interaction.guildId });

	if (!data?.reactionMessages || Object.keys(data.reactionMessages).length == 0) {
		interaction.editReply({
			content: "This server doesn't seem to have a reaction role message!"
		});
		return;
	}

	const reactionMessages = data.reactionMessages;
	const message = await findMessage(interaction, reactionMessages);

	// Checks if the message exists
	if (!message) {
		interaction.editReply({ content: "It seems that message isn't from this server" });
		return;
	}

	// Gets the options
	const role = interaction.options.getRole('role');

	if (!role) {
		interaction.editReply({ content: 'Please provide a role and/or emoji!' });
		return;
	}

	// Checks if the role is in the message
	let found = false;
	for (const storageRole of reactionMessages[message.id]) {
		if (storageRole[0] == role.id) {
			found = true;
			break;
		}
	}

	if (!found) {
		interaction.editReply({ content: 'That role is not used in that reaction message!' });
		return;
	}

	// Edits the message and removes the reactions
	const lastEmbed = message.embeds[0];
	const fields = lastEmbed.fields;

	for (let i = 0; i < fields.length; i++) {
		if (fields[i].value == `<@&${role.id}>`) {
			delete fields[i];
		}
	}

	const addRoleEmbed = EmbedBuilder.from(lastEmbed).setFields(fields);
	message.edit({ embeds: [addRoleEmbed] });

	// Removes from database
	let emoji: string = '';
	for (let i = 0; i < reactionMessages[message.id].length; i++) {
		if (reactionMessages[message.id][i][0] == role.id) {
			emoji = reactionMessages[message.id][i][1];
			reactionMessages[message.id].splice(i, 1);
		}
	}

	if (!emoji) {
	}

	const deleteRole = await guildConfigSchema.findOneAndUpdate(
		{ guildID: interaction.guildId },
		{ reactionMessages: reactionMessages }
	);

	if (!deleteRole) {
		interaction.editReply({
			content: 'Could not update the database! Something has gone wrong'
		});
		logger
			.child({
				mode: 'REACTION ROLE',
				metaData: {
					user: interaction.user.username,
					userid: interaction.user.id,
					guild: interaction.guild?.name,
					guildid: interaction.guild?.id
				}
			})
			.error(
				`Could not update database for guild '${interaction.guild?.name}' with reactionMessages '${reactionMessages}'`
			);
		return;
	}

	database.writeToDatabase(deleteRole, 'REMOVED REACTION ROLE');

	// Removes the reactions
	await message.reactions.cache.get(emoji)?.remove();

	// Responds to the user
	const replyEmbed = newEmbed()
		.setTitle('Success!')
		.setColor(colors.success)
		.setDescription(`<@&${role.id}> was safely removed from the role reaction message!`);

	interaction.editReply({ embeds: [replyEmbed] });
}

// Searched for a valid reaction message in the server
async function findMessage(
	interaction: ModChatInputCommandInteraction,
	reactionGuild: ReactionMessages
): Promise<Message<true> | null> {
	const messageLink = interaction.options.getString('messagelink') ?? '';
	const messageID = messageLink.split('/')[6];

	// If that message isn't a reaction message
	if (!reactionGuild[messageID]) {
		logger
			.child({
				mode: 'REACTION ROLE',
				metaData: {
					user: interaction.user.username,
					userid: interaction.user.id,
					guild: interaction.guild?.name,
					guildid: interaction.guild?.id
				}
			})
			.error(
				`Reaction message '${messageLink}' is not a valid reaction message for guild ${interaction.guild?.name}! `
			);
		return null;
	}

	if (!interaction.guild || !interaction.guild.channels.cache) {
		logger
			.child({
				mode: 'REACTION ROLE',
				metaData: {
					user: interaction.user.username,
					userid: interaction.user.id,
					guild: interaction.guild?.name,
					guildid: interaction.guild?.id
				}
			})
			.error(`Reaction message '${messageLink}' does not exist! Channel does not exist`);
		return null;
	}

	// Loops through all channels to find the message
	let message = null;
	for (const channel of interaction.guild?.channels.cache) {
		if (channel[1].type == ChannelType.GuildText) {
			try {
				message = await channel[1].messages.fetch(messageID);
			} catch (error) {
				logger
					.child({
						mode: 'REACTION ROLE',
						metaData: {
							user: interaction.user.username,
							userid: interaction.user.id,
							guild: interaction.guild?.name,
							guildid: interaction.guild?.id
						}
					})
					.error(
						`Reaction message '${messageLink}' does not exist! Message does not exist\n${error}`
					);
				return null;
			}
		}
	}

	return message;
}
