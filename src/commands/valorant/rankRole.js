const { SlashCommandBuilder } = require('@discordjs/builders');
const { newEmbed, colors } = require('../../util/embeds.js');
const { logger } = require('../../logging.js');

const database = require('../../util/database.js');
const valorantConfigSchema = require('../../schemas/valorantConfig.js');

// const header = {
//	'Authorization': process.env.valorantToken,
// };

async function linkCommand(interaction) {
	let data = await valorantConfigSchema.findOne({ userID: interaction.user.id });

	// Checks to see if the user is in the databse
	if(!data) {
		logger.child({ mode: 'DATABASE', metaData: { userID: interaction.user.id } }).info('Creating new valorant config');
		const valorantConfig = await valorantConfigSchema.create({
			userID: interaction.user.id,
		});
		database.writeToDatabase(valorantConfig, 'NEW VALORANT CONFIG');

		data = await valorantConfigSchema.findOne({ userID: interaction.user.id });
	}

	// Checks the format of the provided account
	const input = interaction.options.getString('account');

	const regex = /^(?<name>.{3,16})#(?<tagline>.{3,5})$/;
	const match = input.match(regex);

	if(match == null) {
		// Incorrect format
		const formatErrorEmbed = newEmbed()
			.setTitle('Incorrect Format!')
			.setColor(colors.warn)
			.setDescription(`The account \`${input}\` has an invalid format. Please use the format of \`<name>#<tagline>\``);

		await interaction.editReply({
			embeds: [formatErrorEmbed],
		});

		return;
	}

	const name = match.groups.name;
	const tagline = match.groups.tagline;

	// Saves the account information to the valorant config
	const newValorantConfig = await valorantConfigSchema.findOneAndUpdate({ userID: interaction.user.id }, {
		name: name,
		tagline: tagline,
	});
	database.writeToDatabase(newValorantConfig, 'UPDATED VALORANT CONFIG');

	const confirmationEmbed = newEmbed()
		.setTitle('Account Linked!')
		.setColor(colors.valorantCommand)
		.setDescription(`Your discord account is now linked with the account \`${input}\``);

	await interaction.editReply({
		embeds: [confirmationEmbed],
	});
}

module.exports = {
	data: new SlashCommandBuilder()
		.setName('valorant')
		.setDescription('Commands dealing with Valorant')

		// link account
		.addSubcommand(subcommand => subcommand
			.setName('link')
			.setDescription('Link your discord account to a riot id')
			.addStringOption(option => option
				.setName('account')
				.setDescription('Your riot ID in the format <name>#<tagline>')
				.setRequired(true),
			),
		),

	// // update role
	// .addSubcommand(subcommand => subcommand
	//	.setName('update-role')
	//	.setDescription('Update your valorant rank for servers which have roles based on rank'),
	// ),

	category: 'valorant',

	async execute(interaction) {
		switch (interaction.options.getSubcommand()) {
		case 'link':
			linkCommand(interaction);
			break;
		// case 'update-role':
		//	console.log('update role');
		//	break;
		}
	},
};
