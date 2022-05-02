const { SlashCommandBuilder } = require('@discordjs/builders');
const destiny = require('../destiny');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('me')
		.setDescription('Print your Bungie name in chat.'),
	execute: destiny.authed(async (interaction) => {
		await interaction.deferReply();
		let bung_name = await destiny.GetCurrentBungieNetUser(interaction.user.id);
		await interaction.editReply(`Your Bungie Name is ${bung_name['uniqueName']}`);
	}),
};