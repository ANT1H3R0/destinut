const fs = require('node:fs');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { clientId, guildId, token } = require('./config.json');
// const emojiservers = require('./emojiservers.json');

let commands = [];
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
	const command = require(`./commands/${file}`);
	commands.push(command.data.toJSON());
}

const rest = new REST({ version: '9' }).setToken(token);

if (process.env.GLOBAL == 'true') {
    rest.put(Routes.applicationCommands(clientId), { body: commands })
    .then(() => console.log("Global commands registered successfully!"))
    .catch(console.error);
    // commands = [];
}

if (process.env.WIPEGUILD == 'true') {
    rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: [] })
    .then(() => console.log("Guild commands wiped successfully!"))
    .catch(console.error);
} else if (process.env.EMOJI != 'true') {
    rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands })
    .then(() => console.log("Guild commands registered successfully!"))
    .catch(console.error);
}

// if (process.env.EMOJI == 'true') {
//     for (const server of emojiservers) {
//         rest.put(Routes.applicationGuildCommands(clientId, server), { body: commands })
//         .then(() => console.log("Guild commands registered successfully!"))
//         .catch(() => console.log('brokey'));
//     }
// }