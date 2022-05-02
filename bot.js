const fs = require('node:fs');
const { Client, Collection, Intents, MessageEmbed, MessageActionRow, MessageButton } = require('discord.js');
const { token, databaseUrl } = require('./config.json');
const { update, get, getMod } = require('./name_db');
const firebase = require('firebase-admin');
const fetch = require('node-fetch');
const { CronJob } = require('cron');
// const destiny = require('./destiny');

const serviceAccount = require('./firebase.json');
firebase.initializeApp({
    credential: firebase.credential.cert(serviceAccount),
    databaseURL: databaseUrl
});
const db = firebase.database();

var ref = db.ref('/');

const destiny = require('./destiny');

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_EMOJIS_AND_STICKERS] });

client.commands = new Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
	if (file.startsWith('dev-')) continue;
	const command = require(`./commands/${file}`);
	// Set a new item in the Collection
	// With the key as the command name and the value as the exported module
	client.commands.set(command.data.name, command);
}

ref.on('value', (snapshot) => {
	fs.writeFile('./localDb.json', JSON.stringify(snapshot.val()), (err) => {});
})

client.once('ready', async () => {
	console.log(`we ready bois\nOnline as ${client.user.tag}`);

	let remind = async () => {
		// console.log('running');
		if (!fs.existsSync('./reminders.json')) return;
		const f = fs.readFileSync('./reminders.json');
		const reminders = JSON.parse(f);
		// console.log(reminders);
		const ada = await destiny.GetVendor('80316063333486592', '3', '4611686018467536715', '2305843009305427911', '350061650', '304,305,309,400,402,310');
		for (const itemObj of Object.values(ada.sales.data)) {
            await destiny.get_item_with_hash('DestinyInventoryItemDefinition', itemObj.itemHash).then(async item => {
				if (Object.keys(reminders).includes(`${itemObj.itemHash}`)) {
					// console.log('found');
					const perk = await destiny.get_item_with_hash('DestinySandboxPerkDefinition', item.perks[0].perkHash);
					for (const id of reminders[item.hash]) {
						const user = await client.users.fetch(id);
						const embed = new MessageEmbed()
							.setTitle(perk.displayProperties.name)
							.setDescription(perk.displayProperties.description)
							.setThumbnail(`https://bungie.net${perk.displayProperties.icon}`);
						const row = new MessageActionRow()
							.addComponents(
								new MessageButton()
									.setCustomId(`unsubscribe-${itemObj.itemHash}`)
									.setLabel('Unsubscribe')
									.setStyle('DANGER')
							)
						user.send({ content: 'Ada is selling a mod that you need today! Click unsubscribe if you would no longer like to receive notifications about this mod.', embeds: [embed], components: [row] });
					}
				}
			});
		}
		// console.log('done');
	}

	let modReminder = new CronJob('00 01 17 * * *', remind);

	modReminder.start();

	if (process.env.FORCEREMIND == 'true') {
		await new Promise(resolve => setTimeout(resolve, 5000));
		remind();
	}
});

client.on('interactionCreate', async interaction => {
    if (interaction.isCommand()) {
		const command = client.commands.get(interaction.commandName);

		if (!command) return;

		try {
			await command.execute(interaction);
		} catch (error) {
			console.error(error);
			await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
		}
	}
	if (interaction.isAutocomplete()) {
		let get_item = interaction.commandName == 'modremind' ? async (name) => await getMod(name) : async (name) => await get(name);
		const typed = interaction.options.getString('name');
		const names = await get_item(typed);
		const namesList = [];
		for (const [name, hash] of Object.entries(names)) {
			namesList.push({ name: name, value: name });
		}
		interaction.respond(namesList);
	}
	if (interaction.isButton() && interaction.customId.startsWith('unsubscribe')) {
		const f = fs.readFileSync('./reminders.json');
		let reminders = JSON.parse(f);
		const modId = interaction.customId.substring(12);
		reminders[modId] = reminders[modId].filter((value, index, arr) => value != interaction.user.id);
		fs.writeFileSync('./reminders.json', JSON.stringify(reminders));
		interaction.update({ content: 'Unsubscribed!', embeds: [], components: [] });
	}
})

async function update_manifest() {
	if (process.env.MANIFEST != 'false') {
		console.log('Updating manifest...');
		if (!fs.existsSync('./manifest')) {
			fs.mkdir('./manifest', () => {});
		}
		const res = await fetch('https://www.bungie.net/Platform/Destiny2/Manifest');
		const js = await res.json();
		paths = js['Response']['jsonWorldComponentContentPaths']['en'];
		let prog = 0;
		for (const [key, value] of Object.entries(paths)) {
			prog += 1 / Object.keys(paths).length * 100;
			console.log(`Progress: ${Math.round(prog)}%`);
			const endpoint = `https://www.bungie.net${value}`;
			file = await fetch(endpoint).then(res => res.text());
			await fs.writeFileSync(`./manifest/${key}.json`, file);
		}
	}
	if (process.env.UPDATENAMES != 'false')
		update();
}

// update manifest
update_manifest().then(res => client.login(token));
