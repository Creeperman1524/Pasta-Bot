const { EmbedBuilder } = require('discord.js');
const { version } = require('../config.json');

/**
 * Gives a standardized embed that commands can use
 * @returns {EmbedBuilder} The standardized embed
 */
function newEmbed() {
	if (process.env.NODE_ENV == 'dev') {
		return new EmbedBuilder()
			.setFooter({ text: `v${version} - DEV` });
	} else {
		return new EmbedBuilder()
			.setFooter({ text: `v${version}` });
	}
}

/**
 * Truncates and adds ellipses (...) to a string of text if longer than the value provided
 * @param {String} text The text that should be tested
 * @param {number} length The maximum length the text should have
 * @returns {String} the truncated text (if applicable)
 */
function truncateText(text, length) {
	if (text.length <= length - 3) return text;

	return `${text.slice(0, length - 3) }\u2026`;
}

/**
 * Specific colors that the bot can use and easily be modified
 */
const colors = {
	helpCommand: 0x1cff2b,
	infoCommand: 0x0088ff,
	pingCommand: 0xff00ff,
	serverPingCommand: 0x854f2b,
	serverIPCommand: 0xf99703,
	serverSeedCommand: 0xff006a,
	serverMapCommand: 0x9000ff,
	serverWakeupCommand: 0x5fc2d4,
	minesweeperCommand: 0x232323,
	reactionRolesCommand: 0x3274ba,
	tictactoeCommand: 0xdecc00,
	valorantCommand: 0xbd3944,
	configCommand: 0x646464,

	success: 0x009f00,
	warn: 0xfdff63,
	error: 0xff1414,
};

module.exports = {
	newEmbed, colors, truncateText,
};
