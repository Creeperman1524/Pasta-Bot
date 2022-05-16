const { MessageEmbed } = require('discord.js');
const { version } = require('../config.json');

// Sets the version for the bot
function newEmbed() {
	return new MessageEmbed()
		.setFooter({ text: `Version ${version}` });
}

// All of the embed colors for the bot
const colors = {
	helpCommand: '0x1cff2b',
	infoCommand: '0x0088ff',
	pingCommand: '0xff00ff',
	paperCommand: '0x03fcfc',
	serverBackupCommand: '0xd303fc',
	serverPingCommand: '0x854f2b',
	serverIPCommand: '0xf99703',
	serverMapCommand: '0x9000ff',
	serverSeedCommand: '0xff006a',
	serverPaperCommand: '0x5fc2d4',
	minesweeperCommand: '0x232323',
	reactionRolesCommand: '0x3274ba',

	success: '0x009f00',
	warn: '0xfdff63',
	error: '0xff1414',
};

module.exports = {
	newEmbed, colors,
};