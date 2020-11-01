//Setup
const Discord = require('discord.js');
const config = require('./config.json');
const bot = new Discord.Client();

//Config
const token = config.token;
const prefix = config.prefix;

//Sets the bot's activity status
bot.on('ready', () => {
	bot.user.setStatus('online');
	bot.user.setActivity(' with pasta', {
		type: 'PLAYING'
	});
	console.log('The bot is active');
});

//Command Handeling
bot.on('message', (message) => {
	let args = message.content.substring(prefix.length).split(' ');

	switch (args[0]) {
		case 'pasta':
			message.channel.send('yum');
			break;

		case 'help':


			//Creates the embed for the help page
			const helpEmbed = new Discord.MessageEmbed()
				.setTitle('Commands')
				.setURL('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
				.setColor(0xd40d12)
				.setDescription("A list of all the current commands")
				.addFields({
					name: prefix + 'pasta',
					value: '`Pasta is good`',
					inline: true
				}, {
					name: prefix + 'help',
					value: '`Displays this help message`',
					inline: true
				}, {
					name: prefix + 'spaghet',
					value: '`Nobody toacha the spaghet`',
					inline: true
				}, {
					name: prefix + 'info',
					value: "`Displays some info about the bot's current status`",
					inline: true
				}, )
				.setFooter("Version 0.1")
			message.channel.send(helpEmbed);
			break;

		case 'spaghet':
			message.channel.send('somebody toucha my spghet');
			break;

		case 'info':
			const infoEmbed = new Discord.MessageEmbed()
				.setTitle('Information')
				.setColor(0x0088ff)
				.addFields({
					name: 'Version',
					value: '0.01',
				}, {
					name: 'Creator',
					value: 'Creeperman1524'
				})
				.setDescription('All the information you need for this bot')
				.setFooter('Version 0.1')
			message.channel.send(infoEmbed);
			break;
		case 'ping':
			message.channel.send("Pinging... :ping_pong: ").then(m => {

				var ping = bot.ws.ping;
				const pingEmbed = new Discord.MessageEmbed()
					.setTitle('Ping')
					.setColor(0xff00ff)
					.addFields({
						name: "Your Ping",
						value: m.createdTimestamp - message.createdTimestamp + " ms",
					}, {
						name: "Bot Ping",
						value: Math.round(bot.ws.ping) + " ms",
					})

				m.edit(pingEmbed);
			})
	}
});

//Logs the bot in
bot.login(token);