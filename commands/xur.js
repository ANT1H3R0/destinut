const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageActionRow, MessageSelectMenu, MessageEmbed } = require('discord.js');
const destiny = require('../destiny');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('xur')
		.setDescription("View Xur's exotic and legendary offerings.")
        .addSubcommand(subcommand =>
            subcommand
                .setName('sales')
                .setDescription('View the items Xûr is currently selling.')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('pool')
                .setDescription('View all of the legendary weapons Xûr is capable of selling.')    
        ),
    execute: destiny.authed(async (interaction) => {
        if (interaction.options.getSubcommand() == 'pool') {
            await interaction.deferReply();

            let embed = new MessageEmbed()
                .setTitle('Xûr')
                .setURL('https://www.light.gg/db/vendors/2190858386/')
                .setDescription('Xûr can sell the following legendary weapons:')
                .setColor(0x00FFFF)
                .setImage('attachment://grid-2190858386.png')
                .setThumbnail('https://www.bungie.net/common/destiny2_content/icons/5659e5fc95912c079962376dfe4504ab.png');
            await interaction.editReply({ embeds: [ embed ], files: ['./grid-2190858386.png'] });
            return;
        }
        const d = new Date();
        let day = d.getDay();
        let hour = d.getHours();
        if ((day == 2 && hour >= 13) || (day == 5 && hour < 13) || (day > 2 && day < 4)) {
            await interaction.reply('Xur is away right now. Check back this weekend!');
            return;
        }
        await interaction.deferReply();
        const emojiCache = interaction.client.emojis.cache;

        let id = interaction.user.id;
        // let user = await destiny.get_user(id);
        // console.log(user);


        let {membershipType, membershipId, characterId} = await destiny.get_user_data(id);

        let vend = await destiny.GetVendor(id, membershipType, membershipId, characterId, '2190858386', '304,305,309,400,402,310');
        let {embed, weapons} = await destiny.generate_vendor_embed(vend, [3,2], ['Exotic', 'Legendary'], 0x00FFFF);

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
                    .setCustomId(`xur-weapons`)
                    .setPlaceholder('Select a weapon to see roll')
                    .addOptions(selectOptions)
            )

        await interaction.editReply({ embeds: [embed], components: [row] });
		
		const collector = interaction.channel.createMessageComponentCollector({ componentType: 'SELECT_MENU', idle: 60000 });

        collector.on('collect', async i => {
			if (i.customId === `xur-weapons` && i.message.interaction.id == interaction.id) {
                await i.deferUpdate();
                const name = i.values[0];
                const wep = weapons[i.values[0]];
                let weaponEmbed = await destiny.generate_instanced_weapon_embed(name, wep, emojiCache, false, interaction.user.id) //.then(emb => emb);
                await i.editReply({ embeds: [weaponEmbed] }); //, components: []});
                // collector.stop();
			}
		});
    })
}