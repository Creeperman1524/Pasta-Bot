const { MessageActionRow, MessageButton } = require('discord.js');
const { logger } = require('../logging');

/**
 * Creates a paginated embed message with button interactions
 * @param {CommandInteraction} interaction The base interaction to respond to
 * @param {MessageEmbed[]} pages The embeds to be scrolled through, in order
 * @param {number} time The time the buttons should be active for (seconds)
 */
async function paginate(interaction, pages, time) {
	if(!interaction || !pages || !(pages?.length > 0) || !(time > 10000)) {
		logger.child({ mode: 'PAGINATION' }).error('Invalid parameters');
		interaction.editReply({ content: 'Something has gone wrong, please report this to the bot administrator', ephemeral: true });
	}

	// Creates the buttons
	let index = 0;
	const buttons = new MessageActionRow()
		.addComponents(
			new MessageButton() // Back button
				.setCustomId('1')
				.setLabel('⬅️')
				.setStyle('PRIMARY')
				.setDisabled(index === 0),
			new MessageButton() // Forward button
				.setCustomId('2')
				.setLabel('➡️')
				.setStyle('PRIMARY')
				.setDisabled(pages.length < index),
			new MessageButton() // Cancel button
				.setCustomId('3')
				.setLabel('❌')
				.setStyle('DANGER'),
		);

	// The message to send
	const data = {
		embeds: [pages[index]],
		components: [buttons],
		fetchReply: true,
	};

	// Replies to the message
	const msg = interaction.replied || interaction.deferred ? await interaction.followUp(data) : await interaction.reply(data);

	const col = msg.createMessageComponentCollector({
		filter: i => i.user.id === interaction.user.id, // The user who invoked the command can use it
		time,
	});

	// When a button is pressed
	col.on('collect', (i) => {
		if (i.customId == '1') index--;
		else if(i.customId === '2') index++;
		else return col.stop();

		// Updates buttons
		buttons.components[0].setDisabled(index === 0);
		buttons.components[1].setDisabled(index === pages.length - 1);

		i.update({
			components: [buttons],
			embeds: [pages[index]],
		});
	});

	// When timer is up/X is pressed
	col.on('end', () => {
		msg.edit({
			components: [],
		});
	});

}

module.exports = {
	paginate,
};