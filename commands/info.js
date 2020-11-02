const Discord = require('discord.js');

module.exports = {
    name: 'info',
    description: "Displays some info about the bot's current stats",
    execute(message, args) {
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
    }
};