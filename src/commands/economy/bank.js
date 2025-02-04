const { SlashCommandBuilder } = require('discord.js');
const { newEmbed, colors } = require('../../util/embeds.js');
const { logger } = require('../../logging.js');

const database = require('../../util/database.js');
const bankSchema = require('../../schemas/bank.js');
const { leaderboard } = require('../../util/leaderboard.js');

// Creates an account for a user
async function createAccount(userID) {
	logger.child({ mode: 'DATABASE', metaData: { userID: userID } }).info('Creating new user account for the bank');
	const bankBalance = await bankSchema.create({ userID: userID });
	database.writeToDatabase(bankBalance, 'NEW BANK ACCOUNT');

	return await bankSchema.findOne({ userID: userID });
}

// Sends an error to the user
function sendError(interaction, message) {
	const errorEmbed = newEmbed()
		.setTitle('Bank Error')
		.setColor(colors.error)
		.setDescription(message);
	interaction.editReply({ embeds: [errorEmbed] });
	return;
}

// Gets the balance of the current user or another user
async function getBalanceEmbed(interaction) {
	// Boolean whether the user is searching for another user
	const otherUser = interaction.options.getUser('user') != null;

	// Cannot get the balance of a bot
	if (otherUser && interaction.options.getUser('user').bot) return sendError(interaction, 'You cannot check the balance of a bot!');

	const userID = otherUser ? interaction.options.getUser('user').id : interaction.user.id;
	let stats = await bankSchema.findOne({ userID: userID });

	// If the user inputted a user that's not in the database, creates a new one
	if (!stats) stats = await createAccount(userID);

	// Formatting is weird to fix mobile formatting issues
	const balanceEmbed = newEmbed()
		.setTitle('User Balance')
		.setColor(colors.bankCommand)
		.setDescription(`**User - <@${userID}>**

**Balance**: \`${stats.balance}\` :pizza:
		`);

	interaction.editReply({ embeds: [balanceEmbed] });
}

// Tranfers pizza points from one user to another
async function transferPizza(interaction) {
	const user = interaction.options.getUser('user');
	const amount = interaction.options.getInteger('amount');

	// Cannot transfer to money yourself
	if (user.id == interaction.user.id || user.bot) return sendError(interaction, 'You cannot transfer :pizza: to that user!');

	// Cannot transfer a non-positive amount
	if (amount < 1) return sendError(interaction, 'You cannot transfer a non-positive amount of :pizza:!');

	// Cannot transfer more than what the sender has
	const senderAccount = await bankSchema.findOne({ userID: interaction.user.id });
	if (senderAccount.balance < amount) return sendError(interaction, 'You do not have enough :pizza: to transfer that amount!');

	// Create a new account if the sender doesn't have one
	const receiverStats = await bankSchema.findOne({ userID: user.id });
	if (!receiverStats) createAccount(user.id);

	// Create a new account if the receiver doesn't have one
	const senderStats = await bankSchema.findOne({ userID: interaction.user.id });
	if (!senderStats) createAccount(interaction.user.id);

	// Updates the database
	await bankSchema.findOneAndUpdate({ userID: interaction.user.id }, { $inc: { balance: -amount } });
	await bankSchema.findOneAndUpdate({ userID: user.id }, { $inc: { balance: amount } });

	const transferEmbed = newEmbed()
		.setTitle('Transfer Complete')
		.setColor(colors.bankCommand)
		.setDescription(`Successfully transferred \`${amount}\` :pizza: to <@${user.id}>`);
	interaction.editReply({ embeds: [transferEmbed] });
}

// Sends the current balance leadearboard to the user
async function leaderboards(interaction) {
	if (interaction.options.getString('type') == 'wealth') { // Wealthiest users

		const users = await bankSchema.find();

		// Creates the embed
		const wealthiestEmbed = newEmbed()
			.setTitle('Leaderboard - :pizza: in the Bank')
			.setColor(colors.bankCommand)
			.setDescription(leaderboard(users, false, 'balance', interaction.user.id));
		interaction.editReply({ embeds: [wealthiestEmbed] });

	} else if (interaction.options.getString('type') == 'earnings') { // Most earnings
		const users = await bankSchema.find({ lifetimeEarnings: { $gt: 0 } });

		// Creates the embed
		const mostEarningsEmbed = newEmbed()
			.setTitle('Leaderboard - :pizza: Earned')
			.setColor(colors.bankCommand)
			.setDescription(leaderboard(users, false, 'lifetimeEarnings', interaction.user.id));
		interaction.editReply({ embeds: [mostEarningsEmbed] });

	}
}

module.exports = {
	data: new SlashCommandBuilder()
		.setName('bank')
		.setDescription('Commands related to the bank')

		// balance
		.addSubcommand(subcommand => subcommand
			.setName('balance')
			.setDescription('Get the balance of a user')
			.addUserOption(option => option
				.setName('user')
				.setDescription('The user to check the balance of'),
			),
		)

		// transfer
		.addSubcommand(subcommand => subcommand
			.setName('transfer')
			.setDescription('Transfer pizza points to another user')
			.addUserOption(option =>
				option.setName('user')
					.setDescription('The user to transfer pizza points to')
					.setRequired(true),
			)
			.addIntegerOption(option =>
				option.setName('amount')
					.setDescription('The amount of pizza points to transfer')
					.setRequired(true),
			),
		)

		// leaderboard
		.addSubcommand(subcommand => subcommand
			.setName('leaderboard')
			.setDescription('Check the leaderboard of the most wealthy users')
			.addStringOption(option => option
				.setName('type')
				.setDescription('The type of leaderboard to show')
				.setRequired(true)
				.addChoices(
					{ name: 'wealthiest', value: 'wealth' },
					{ name: 'most earned', value: 'earnings' },
					// { name: 'most lost', value: 'debts' },
				),
			),
		),
	category: 'economy',

	async execute(interaction) {
		switch (interaction.options.getSubcommand()) {
			case 'balance':
				getBalanceEmbed(interaction);
				break;
			case 'transfer':
				transferPizza(interaction);
				break;
			case 'leaderboard':
				leaderboards(interaction);
				break;
		}
	},
};

