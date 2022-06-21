const { SlashCommandBuilder } = require('@discordjs/builders');
const destiny = require('../destiny');
const { get } = require('../name_db');

const stat_defs = {
    155624089: 'Stability',
    1240592695: 'Range',
    943549884: 'Handling',
    4188031367: 'Reload Speed',
    3614673599: 'Blast Radius',
    2523465841: 'Velocity',
    1591432999: 'Accuracy',
    1842278586: 'Shield Duration',
    2961396640: 'Charge Time',
    4043523819: 'Impact',
    447667954: 'Draw Time',
    4284893193: 'Rounds Per Minute',
    3871231066: 'Magazine',
    3614673599: 'Blast Radius',
    2523465841: 'Velocity',
    209426660: 'Guard Resistance',
    925767036: 'Ammo Capacity',
    2762071195: 'Guard Efficiency',
    2837207746: 'Swing Speed',
    3022301683: 'Charge Rate',
    3736848092: 'Guard Endurance',
    1345609583: 'Aim Assist',
    2714457168: 'Airborne Effectiveness',
    3555269338: 'Zoom',
    2715839340: 'Recoil Direction'
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('wishlist')
        .setDescription('Create your perfect roll for a weapon.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('set')
                .setDescription('Set your wishlist roll for a weapon.')
                .addStringOption(option =>
                    option
                        .setName('url')
                        .setDescription('D2Gunsmith URL')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('View wishlist rolls for a weapon.')
                .addStringOption(option =>
                    option
                        .setName('name')
                        .setDescription('Weapon name')
                        .setRequired(true)
                        .setAutocomplete(true)
                )
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription('User to check roll of.')
                        .setRequired(false)
                )
        ),
    execute: destiny.authed(async (interaction) => {
        await interaction.deferReply();
        const emojiCache = interaction.client.emojis.cache;
        let weapon;
        switch (interaction.options.getSubcommand()) {
            case 'set':
                const url = interaction.options.getString('url');
                const urlCheck = new RegExp(/https:\/\/d2gunsmith.com\/w\/\d+\?s=(\d+,){5}\d+/);
                if (!urlCheck.test(url)) {
                    interaction.editReply('Please provide a valid https://d2gunsmith.com/ URL.');
                    return;
                }
                let hashes = url.match(/[09]+|[0-9][^a-z]\d+/g); // extract all numbers from url
                const wephash = hashes[0];
                hashes.pop(); // remove mod
                if (hashes.includes('0')) {
                    await interaction.editReply('Please select a perk in each slot.');
                    return;
                }
                const item = await destiny.get_item_with_hash('DestinyInventoryItemDefinition', wephash);
                const masterwork_hash = hashes[5];
                let masterwork;
                await destiny.get_item_with_hash('DestinyInventoryItemDefinition', masterwork_hash).then(item2 => {
                    for (const stat of item2.investmentStats) {
                        if (!stat.isConditionallyActive) {
                            masterwork = `**Tier ${stat.value} ${stat_defs[stat.statTypeHash]} Masterwork**`;
                            break;
                        }
                    }
                });
                const perks = {
                    'plugs': {}
                }
                const selectedPerks = [];
                for (let i = 1; i <= 5; i++) {
                    perks.plugs[i] = {
                        0: {
                            'canInsert': true,
                            'enabled': true,
                            'plugItemHash': hashes[i]
                        }
                    }
                    selectedPerks[i - 1] = hashes[i];
                }
                weapon = {
                    'name': item.displayProperties.name,
                    'description': item.flavorText,
                    'hash': wephash,
                    'thumb': `https://bungie.net${item.displayProperties.icon}`,
                    'image': `https://bungie.net${item.screenshot}`,
                    'masterwork_hash': masterwork_hash,
                    'masterwork': masterwork,
                    'perks': perks,
                    'selectedPerks': selectedPerks
                }
                await destiny.set_wishlist(interaction.user.id, weapon);
                const embed = await destiny.generate_instanced_weapon_embed(item.displayProperties.name, weapon, emojiCache);
                // embed.setDescription(embed.description.substring(0, embed.description.indexOf('D2Gunsmith Link') + 16));
                await interaction.editReply({ content: 'Wishlist roll set.', embeds: [embed] });
                return;
            case 'view':
                const user = interaction.options.getUser('user') ? interaction.options.getUser('user') : interaction.user;
                let name = interaction.options.getString('name');
                const names = await get(name);
                if (Object.keys(names)[0] != name) {
                    await interaction.editReply('Invalid weapon name!');
                    return;
                }
                weapon = await destiny.get_item_with_hash('DestinyInventoryItemDefinition', names[name]);
                let wishlist = await destiny.get_user(user.id).then(user => user.wishlist);
                if (!wishlist) {
                    await interaction.editReply({ content: 'User has no pinned items!', components: [] });
                    return;
                }
                wishlist = wishlist[weapon.hash];
                if (!wishlist) { // is it lazy to copy and paste an if statement after changing a variable? yes, but do I care? no
                    await interaction.editReply({ content: 'User has no such pinned item!', components: [] });
                    return;
                }
                const pinned_embed = await destiny.generate_instanced_weapon_embed(wishlist.name, wishlist, emojiCache);
                // pinned_embed.setDescription(pinned_embed.description.substring(0, pinned_embed.description.indexOf('/)') + 2));
                const bungie_name = await destiny.GetCurrentBungieNetUser(user.id).then(user => user.displayName);
                await interaction.editReply({ content: `${bungie_name}'s perfect ${wishlist.name}:`, embeds: [pinned_embed], components: [] });
                return;
        }
    })
}