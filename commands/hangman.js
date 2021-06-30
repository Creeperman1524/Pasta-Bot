module.exports = {
	name: 'hangman',
	description: 'Start a game of hangman',
	aliases: ['hm'],
	args: true,
	usage: '<start|help>',
	guildOnly: false,
	cooldown: 30,
	execute(message, args) {
		console.log(message, args);
	},
};