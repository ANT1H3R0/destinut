const { SlashCommandBuilder } = require('@discordjs/builders');
const destiny = require('../destiny');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('adept')
		.setDescription('View the current adept weapon.'),
    execute: destiny.authed(async (interaction) => {
        await interaction.deferReply();
        const emojiCache = interaction.client.emojis.cache;
        adept_weapons = {
            98400473: 1173780905,
            751170008: 2475355656,
            2559492205: 4023807721,
            3637570176: 3637570176,
            2432138634: 3245493570,
            3927598940: 3514144928,
            2682842775: 2405619467,
            1220172655: 2002522739
        }

        let id = interaction.user.id;
        
        const memberships = await destiny.GetMembershipsForCurrentUser(id);
        let profile = memberships['destinyMemberships'][0];
        const membershipType = profile['membershipType'];
        const membershipId = profile['membershipId'];

        profile = await destiny.GetProfile(id, membershipType, membershipId, '200');
        const characterId = Object.keys(profile['characters']['data'])[0];

        saint = await destiny.GetVendor(id, membershipType, membershipId, characterId, '765357505', '402');
        inventory = saint['sales']['data'];
        for (let weapon of Object.values(inventory)) {
            if (weapon['itemHash'] in adept_weapons) {
                const weapon_embed = await destiny.generate_item_embed(adept_weapons[weapon['itemHash']], emojiCache);
                await interaction.editReply({ embeds: [weapon_embed] });
                // await interaction.editReply(`Current Adept Weapon: ${adept_weapons[weapon['itemHash']]}`);
                return;
            }
        }
        await interaction.editReply('No Trials!');
    })
}