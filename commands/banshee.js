const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageActionRow, MessageSelectMenu, MessageEmbed } = require('discord.js');
const destiny = require('../destiny');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('banshee')
		.setDescription("View Banshee-44's legendary weapon offerings.")
        .addSubcommand(subcommand =>
            subcommand
                .setName('sales')
                .setDescription('View the items Banshee-44 is currently selling.')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('pool')
                .setDescription('View all of the legendary weapons Banshee-44 is capable of selling.')    
        ),
    execute: destiny.authed(async (interaction) => {
        if (interaction.options.getSubcommand() == 'pool') {
            await interaction.deferReply();

            let embed = new MessageEmbed()
                .setTitle('Banshee-44')
                .setURL('https://www.light.gg/db/vendors/672118013/')
                .setDescription('Banshee-44 can sell the following legendary weapons:')
                .setColor(0x00FFFF)
                .setImage('attachment://grid-672118013.png')
                .setThumbnail('https://www.bungie.net/common/destiny2_content/icons/5fb7fa47a8f1dd04538017d289f4f910.png');
            await interaction.editReply({ embeds: [ embed ], files: ['./grid-672118013.png'] });
            return;
        }
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
                let weaponEmbed = await destiny.generate_instanced_weapon_embed(name, wep, emojiCache, false, interaction.user.id) //.then(emb => emb);
                await i.editReply({ embeds: [weaponEmbed] }); // , components: []
                // collector.stop();
			}
		});
    })
}