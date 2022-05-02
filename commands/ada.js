const { SlashCommandBuilder } = require('@discordjs/builders');
const destiny = require('../destiny');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('ada')
		.setDescription("View Ada-1's mod and armor offerings."),
    execute: destiny.authed(async (interaction) => {
        await interaction.deferReply();

        let id = interaction.user.id;
        // let user = await destiny.get_user(id);
        // console.log(user);


        let {membershipType, membershipId, characterId} = await destiny.get_user_data(id);

        let vend = await destiny.GetVendor(id, membershipType, membershipId, characterId, '350061650', '304,305,309,400,402,310');
        let {embed, weapons} = await destiny.generate_vendor_embed(vend, [2, 19], ['Legendary', 'Basic', 'Common'], 0x0051ff);

        await interaction.editReply({ embeds: [embed] });
    })
}