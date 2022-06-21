const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageActionRow, MessageSelectMenu, MessageButton } = require('discord.js');
const destiny = require('../destiny');
const { get } = require('../name_db');

let generate_menu = async (interaction, weapon, subcommand, user, emojiCache) => {
    switch (subcommand) {
        case 'set':
            let vault = await destiny.get_vault_weapons(interaction.user.id, weapon.hash);
            if (vault.length == 0) {
                await interaction.editReply({ content: 'No rolls of that weapon in your vault or on any of your characters!', components: [] });
                return;
            }
            const weapon_embed = await destiny.generate_instanced_weapon_embed(weapon.name, vault[0], emojiCache, false, user.id);
            if (weapon_embed.title == 'Error') {
                await interaction.editReply({ embeds: [weapon_embed] });
                return;
            }
            const navRow = new MessageActionRow()
                .addComponents(
                    new MessageButton()
                        .setCustomId('left')
                        .setLabel('\u2190')
                        .setStyle('SECONDARY'),
                    new MessageButton()
                        .setCustomId('confirm')
                        .setLabel('Pin')
                        .setStyle('PRIMARY'),
                    new MessageButton()
                        .setCustomId('right')
                        .setLabel('\u2192')
                        .setStyle('SECONDARY')
                )
            await interaction.editReply({ content: 'Please select a roll, then click Pin:', embeds: [weapon_embed], components: [navRow] });
            break;
        case 'view':
            let pinned = await destiny.get_user(user.id).then(user => user.pinned);
            if (!pinned) {
                await interaction.editReply({ content: 'User has no pinned items!', components: [] });
                return;
            }
            pinned = pinned[weapon.hash];
            if (!pinned) { // is it lazy to copy and paste an if statement after changing a variable? yes, but do I care? no
                await interaction.editReply({ content: 'User has no such pinned item!', components: [] });
                return;
            }
            const pinned_embed = await destiny.generate_instanced_weapon_embed(pinned.name, pinned, emojiCache, false, user.id);
            const bungie_name = await destiny.GetCurrentBungieNetUser(user.id).then(user => user.displayName);
            await interaction.editReply({ content: `${bungie_name}'s ${weapon.name}:`, embeds: [pinned_embed], components: [] });
            return;
    }
}

module.exports = {
	data: new SlashCommandBuilder()
		.setName('pins')
		.setDescription('Pin your favorite roll of a weapon for viewing by others.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('set')
                .setDescription('Set a pinned roll for a weapon.')
                .addStringOption(option =>
                    option
                        .setName('name')
                        .setDescription('Weapon name')
                        .setRequired(true)
                        .setAutocomplete(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription("View a user's pinned weapon roll(s).")
                .addStringOption(option =>
                    option
                        .setName('name')
                        .setDescription('Weapon name')
                        .setRequired(false)
                        .setAutocomplete(true)
                )
                .addUserOption(option => 
                    option
                        .setName('user')
                        .setDescription('User to inspect (default: self)')
                        .setRequired(false)
                )
        ),
    execute: destiny.authed(async (interaction) => {
        await interaction.deferReply();
        const emojiCache = interaction.client.emojis.cache;
        const user = interaction.options.getUser('user') ? interaction.options.getUser('user') : interaction.user;
        var vault;
        var position = 0;
        var weapon = {};
        let name = interaction.options.getString('name');
        if (!name) { // '/pin view' called with no name option
            const pinned = await destiny.get_user(user.id).then(user => user.pinned);
            let weapons = [[]];
            let count = 0;
            let list = 0;
            if (!pinned) { await interaction.editReply('User has no pinned items!'); return; }
            for (const [hash, weapon] of Object.entries(pinned)) {
                if ((count + 1) % 24 == 0 && count != Object.keys(pinned).length - 1) {
                    weapons[list].push({
                        label: 'More',
                        value: 'more'
                    });
                    weapons.push([]);
                    list++;
                    weapons[list].push({
                        label: 'Back',
                        value: 'back'
                    })
                    count++;
                }
                weapons[list].push({
                    label: weapon.name,
                    value: hash
                });
                count++;
            }
            list = 0;
            let row = new MessageActionRow()
                .addComponents(
                    new MessageSelectMenu()
                        .setCustomId('pin-list-select')
                        .setPlaceholder('Select a weapon')
                        .setOptions(weapons[0])
                );
            let menu = await interaction.editReply({ content: 'Select a weapon to view pinned roll:', components: [row] });
            const filter = i => { return i.user.id === interaction.user.id };
            let get_item = menu => menu.awaitMessageComponent({ filter, componentType: 'SELECT_MENU', time: 15000 })
                .then(async inter => {
                    await inter.deferUpdate();
                    const hash = inter.values[0];
                    if (hash == 'more' || hash == 'back') {
                        list = hash == 'more' ? list + 1 : list - 1
                        let new_row = new MessageActionRow()
                            .addComponents(
                                new MessageSelectMenu()
                                    .setCustomId('pin-list-select')
                                    .setPlaceholder('Select a weapon')
                                    .setOptions(weapons[list])
                            );
                        let new_menu = await inter.editReply({ content: 'Select a weapon to view pinned roll:', components: [new_row] });
                        return get_item(new_menu);
                    }
                    weapon = { name: pinned[hash].name, hash: hash };
                    vault = await destiny.get_vault_weapons(user.id, hash);
                    await generate_menu(interaction, weapon, interaction.options.getSubcommand(), user, emojiCache);
                    return;
                })
                .catch(error => {
                    console.log(error);
                    console.log('Error or no response to menu');
                });
            return get_item(menu);
        }
        const names = await get(name);
        if (Object.keys(names).length == 0) {
            await interaction.editReply('Weapon not found!');
            return;
        }
        if (Object.keys(names).length == 1 && Object.keys(names)[0] == name) {
            weapon = { name: name, hash: names[name] };
            vault = await destiny.get_vault_weapons(interaction.user.id, weapon.hash);
            await generate_menu(interaction, weapon, interaction.options.getSubcommand(), user, emojiCache);
        } else {
            const selectOptions = [];
            for (const [name, hash] of Object.entries(names)) {
                selectOptions.push({
                    label: name,
                    value: JSON.stringify({
                        name: name,
                        hash: hash
                    })
                });
            }
            const row = new MessageActionRow()
                .addComponents(
                    new MessageSelectMenu()
                        .setCustomId(`pin-hash-search`)
                        .setPlaceholder('Select a weapon to see rolls')
                        .addOptions(selectOptions)
                );
            
            await interaction.editReply({ content: 'Please select a weapon:', components: [row] });
        }

        const filter = i => i.message.interaction.id == interaction.id && i.user == interaction.user;

        const collector = interaction.channel.createMessageComponentCollector({ filter, componentType: 'SELECT_MENU', idle: 25000 });

        collector.on('collect', async i => {
            await i.deferUpdate();
			if (i.customId === `pin-hash-search`) {
                weapon = JSON.parse(i.values[0]);
                vault = await destiny.get_vault_weapons(interaction.user.id, weapon.hash);
                await generate_menu(i, weapon, interaction.options.getSubcommand(), user, emojiCache);
			}
		});

        const btnCollector = interaction.channel.createMessageComponentCollector({ filter, componentType: 'BUTTON', idle: 25000 });

        btnCollector.on('collect', async i => {
            await i.deferUpdate();
            switch (i.customId) {
                case 'left':
                    position = (vault.length + position - 1) % vault.length;
                    break;
                case 'right':
                    position = (position + 1) % vault.length;
                    break;
                case 'confirm':
                    await destiny.set_pin(i.user.id, vault[position]);
                    await i.editReply({ content: 'Pinned roll set.', components: [] });
                    collector.stop();
                    return;
            }
            const weapon_embed = await destiny.generate_instanced_weapon_embed(weapon.name, vault[position], emojiCache, false, user.id);
            const navRow = new MessageActionRow()
                .addComponents(
                    new MessageButton()
                        .setCustomId('left')
                        .setLabel('\u2190')
                        .setStyle('SECONDARY'),
                    new MessageButton()
                        .setCustomId('confirm')
                        .setLabel('Pin')
                        .setStyle('PRIMARY'),
                    new MessageButton()
                        .setCustomId('right')
                        .setLabel('\u2192')
                        .setStyle('SECONDARY')
                )
            await i.editReply({ content: 'Please select a roll, then click Pin:', embeds: [weapon_embed], components: [navRow] });
        })
    })
}