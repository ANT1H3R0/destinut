const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageActionRow, MessageSelectMenu } = require('discord.js');
const destiny = require('../destiny');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('character')
		.setDescription('Select your active character for other commands.'),
	execute: destiny.authed(async (interaction) => {
        await interaction.deferReply({ ephemeral: true });
        const {membershipType, membershipId, characterId} = await destiny.get_user_data(interaction.user.id);
		const characterObjs = await destiny.GetProfile(interaction.user.id, membershipType, membershipId, '200').then(profile => profile.characters.data);
        const characters = [];
        for (const [id, char] of Object.entries(characterObjs)) {
            let gender, race, char_class;
            switch (char.genderType) {
                case 0:
                    gender = 'Male';
                    break;
                case 1:
                    gender = 'Female';
            }
            switch (char.raceType) {
                case 0:
                    race = 'Human';
                    break;
                case 1:
                    race = 'Awoken';
                    break;
                case 2:
                    race = 'Exo';
            }
            switch (char.classType) {
                case 0:
                    char_class = 'Titan';
                    break;
                case 1:
                    char_class = 'Hunter';
                    break;
                case 2:
                    char_class = 'Warlock'
            }
            characters.push({
                label: `${char.light} ${race} ${gender} ${char_class}`,
                value: id
            });
        }
        const row = new MessageActionRow()
                .addComponents(
                    new MessageSelectMenu()
                        .setCustomId('char-select')
                        .setPlaceholder('Select your active character')
                        .addOptions(characters)
                );
        await interaction.editReply({ content: 'Select a character:', components: [row], ephemeral: true });

        const collector = interaction.channel.createMessageComponentCollector({ componentType: 'SELECT_MENU', idle: 15000 });

        collector.on('collect', async i => {
			if (i.customId === `char-select` && i.message.interaction.id == interaction.id && i.user == interaction.user) {
                await i.deferUpdate();
                await destiny.set_user_character(i.user.id, i.values[0]);
                await i.editReply({ content: 'Primary character updated.', components: [] });
                collector.stop();
			}
		});
	}),
};