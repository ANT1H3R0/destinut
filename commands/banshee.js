const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageActionRow, MessageSelectMenu } = require('discord.js');
const destiny = require('../destiny');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('banshee')
		.setDescription("View Banshee's legendary weapon offerings."),
    execute: destiny.authed(async (interaction) => {
        await interaction.deferReply();
        const emojiCache = interaction.client.emojis.cache;

        let id = interaction.user.id;
        // let user = await destiny.get_user(id);
        // console.log(user);


        let {membershipType, membershipId, characterId} = await destiny.get_user_data(id);

        let vend = await destiny.GetVendor(id, membershipType, membershipId, characterId, '672118013', '304,305,309,400,402,310');
        let {embed, weapons} = await destiny.generate_vendor_embed(vend, [3, 19], ['Legendary', 'Basic'], 0x0051ff);

        let selectOptions = [];
        for (const weapon of Object.keys(weapons)) {
            selectOptions.push({
                label: weapon,
                value: weapon
            });
        }
        const row = new MessageActionRow()
            .addComponents(
                new MessageSelectMenu()
                    .setCustomId(`banshee-weapons`)
                    .setPlaceholder('Select a weapon to see roll')
                    .addOptions(selectOptions)
            )

        await interaction.editReply({ embeds: [embed], components: [row] });
		
		const collector = interaction.channel.createMessageComponentCollector({ componentType: 'SELECT_MENU', idle: 60000 });

        collector.on('collect', async i => {
			if (i.customId === `banshee-weapons` && i.message.interaction.id == interaction.id) {
                await i.deferUpdate();
                const name = i.values[0];
                const wep = weapons[i.values[0]];
                let weaponEmbed = await destiny.generate_instanced_weapon_embed(name, wep, emojiCache) //.then(emb => emb);
                await i.editReply({ embeds: [weaponEmbed] }); // , components: []
                // collector.stop();
			}
		});
    })
}