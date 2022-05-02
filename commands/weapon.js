const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageActionRow, MessageSelectMenu } = require('discord.js');
const destiny = require('../destiny');
const { get } = require('../name_db');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('weapon')
		.setDescription('View available perks on a weapon.')
        .addStringOption(option =>
            option.setName('name')
                .setDescription('Weapon name')
                .setRequired(true)
                .setAutocomplete(true)
        ),
    async execute(interaction) {
        await interaction.deferReply();
        const emojiCache = interaction.client.emojis.cache;
        const name = interaction.options.getString('name');
        const names = await get(name);
        if (Object.keys(names).length == 0) {
            await interaction.editReply('Weapon not found!');
            return;
        }
        if (Object.keys(names).length == 1) {
            let weaponEmbed = await destiny.generate_item_embed(names[name], emojiCache);
            await interaction.editReply({ content:"\u200B", embeds: [weaponEmbed], components: []});
            return;
        }
        const selectOptions = [];
        for (const [name, hash] of Object.entries(names)) {
            selectOptions.push({
                label: name,
                value: hash
            });
        }
        const row = new MessageActionRow()
            .addComponents(
                new MessageSelectMenu()
                    .setCustomId(`weapon-search`)
                    .setPlaceholder('Select a weapon to see rolls')
                    .addOptions(selectOptions)
            );
        
        await interaction.editReply({ content: 'Please select a weapon:', components: [row] });

        const collector = interaction.channel.createMessageComponentCollector({ componentType: 'SELECT_MENU', time: 15000 });

        collector.on('collect', async i => {
			if (i.customId === `weapon-search`) {
                await i.deferUpdate();
                const hash = i.values[0];
                let weaponEmbed = await destiny.generate_item_embed(hash, emojiCache) //.then(emb => emb);
                await i.editReply({ content:"\u200B", embeds: [weaponEmbed], components: []});
                collector.stop();
			}
		});
    }
}