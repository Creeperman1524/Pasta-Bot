const Discord = require('discord.js');
const {
    prefix,
    version
} = require('../config.json');

//Gets the current time at build time
const buildDate = new Date()

module.exports = {
    name: 'help',
    description: 'Displays a help message',
    aliases: ["commands"],
    usage: "[command name]",
    execute(message, args) {
        const fields = [];
        const {
            commands
        } = message.client;

        //If the user doesn't want a specific command
        if (!args.length) {
            //Stores the command name and descriptions into separate arrays
            const names = commands.map(command => command.name);
            const description = commands.map(commandDesc => commandDesc.description);

            for (i = 0; i < names.length; i++) {
                fields.push({
                    name: `${prefix}${names[i]}`,
                    value: `\`${description[i]}\``,
                    //inline: true,
                })
            }

            //Creates the embed for the help page
            const helpEmbed = new Discord.MessageEmbed()
                .setTitle('Commands')
                .setURL('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
                .setColor(0xd40d12)
                .setDescription("A list of all the current commands")
                .addFields(fields)
                .setTimestamp(buildDate)
                .setFooter(`Version ${version}`);
            return message.channel.send(helpEmbed);

        }
        const name = args[0].toLowerCase();
        const command = commands.get(name) || commands.find(c => c.aliases && c.aliases.includes(name));

        if (!command) {
            return message.reply("That's not a valid command!");
        }

        const preciseFields = [];

        //Aliases
        if (command.aliases) {
            preciseFields.push({
                name: "Aliases",
                value: `\`${prefix}${command.aliases}\``,
                inline: true
            })
        }

        //Command arguments
        if (command.args) {
            preciseFields.push({
                name: "Arguments Required",
                value: `\`${command.args}\``,
                inline: true
            })
        }

        //Usage
        if (command.usage) {
            preciseFields.push({
                name: "Usage",
                value: `\`${prefix}${command.name} ${command.usage}\``,
                inline: true
            })
        }

        //Guild Only
        if (command.guildOnly) {
            preciseFields.push({
                name: "Guild Only",
                value: `\`${command.guildOnly}\``,
                inline: true
            })
        }

        //Cool down
        if (command.cooldown) {
            preciseFields.push({
                name: "Cooldown",
                value: `\`${command.cooldown} seconds\``,
                inline: true
            })
        }

        //Creates the embed
        const preciseHelpEmbed = new Discord.MessageEmbed()
            .setTitle(`Commands - ${prefix}${name}`)
            .setURL('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
            .setColor(0xfca503)
            .setDescription(command.description)
            .addFields(preciseFields)
            .setFooter(`Version ${version}`);
        return message.channel.send(preciseHelpEmbed);
    }
}