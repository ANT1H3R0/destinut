const { SlashCommandBuilder } = require('@discordjs/builders');
const fs = require('node:fs');
const { getMod } = require('../name_db');
const destiny = require('../destiny');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('modremind')
		.setDescription("Set a reminder for when Ada-1 or Banshee sells a mod you're looking for.")
        .addStringOption(option => 
            option
                .setName('name')
                .setDescription('Mod name')
                .setRequired(true)
                .setAutocomplete(true)
        ),
	execute: destiny.authed(async (interaction) => {
        await interaction.deferReply();
        const name = interaction.options.getString('name');
        const hash = await getMod(name).then(mods => Object.keys(mods).length == 0 ? -1 : Object.values(mods)[0]);
        // console.log(hash);
        if (hash == -1) {
            interaction.editReply('No mod found with that name!');
            return;
        }
        if (!fs.existsSync('./reminders.json'))
            fs.writeFileSync('./reminders.json', '{}');
        let f = fs.readFileSync('./reminders.json');
        let js = JSON.parse(f);
        if (!(hash in Object.keys(js)))
            js[hash] = [];
        js[hash].push(interaction.user.id);
        fs.writeFileSync('./reminders.json', JSON.stringify(js));
        const embed = await destiny.generate_item_embed(hash, interaction.client.emojis.cache);
        await interaction.editReply({ content: `Got it! I'll remind you the next time ${name} is for sale.`, embeds: [embed] });
    })
}