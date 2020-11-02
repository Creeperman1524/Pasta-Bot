const Discord = require('discord.js');

module.exports = {
    name: 'help',
    description: 'Displays this help message',
    aliases: ["commands"],
    execute(message, args) {
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
    }
}