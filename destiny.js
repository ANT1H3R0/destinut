const fs = require('node:fs');
const fetch = require('node-fetch');
const { apiKey, bungieAuth } = require('./config.json');
const math = require('./weapon_formulas.json');
const { MessageEmbed, CommandInteraction } = require('discord.js');
const firebase = require('firebase-admin');

if (firebase.apps.length != 0) {
    const db = firebase.database();

    var ref = db.ref('/');
}

var manifest = {};

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
    3555269338: 'Zoom',
    2715839340: 'Recoil Direction'
}

module.exports = {
    async db_set(child, data) {
        await ref.child(child).set(data);
    },

    async get_user(id) {
        let data = fs.readFileSync('./localDb.json');
        js = JSON.parse(data);
        return js[id];
    },

    /**
     * Decorator that checks if user is authorized with bot before running command, and instead replies with an error if not.
     * @param {(CommandInteraction) => Promise<void>} fn 
     * @returns {(CommandInteraction) => Promise<void>}
     */
    authed: (fn) => {
        /**
         * @param {CommandInteraction} interaction
         */
        return async (interaction) => {
            if (interaction.guild == null) {
                interaction.reply('This command can only be used in a server.');
                return;
            }
            let data = fs.readFileSync('./localDb.json');
            if (!(interaction.user.id in JSON.parse(data))) {
                const embed = new MessageEmbed()
                    .setTitle('Authorization')
                    .setDescription(`You must [log in](https://destinut.herokuapp.com/?id=${interaction.user.id}) before using bot commands.`);
                interaction.user.send({embeds: [embed]});
                interaction.reply({ content: 'Check DMs for log-in instructions.', ephemeral: true });
                return;
            }
            return await fn(interaction);
        }
    },

    async get_access_token(id) {
        let data = fs.readFileSync('./localDb.json');
        // console.log(data.toString());
        js = JSON.parse(data);
        return js[id].access_token;
    },

    async get_refresh_token(id) {
        let data = fs.readFileSync('./localDb.json');
        js = JSON.parse(data);
        return js[id].refresh_token;
    },

    async refresh_access_token(id) {
        let refresh_token = await this.get_refresh_token(id);
        res = await fetch('https://www.bungie.net/Platform/App/OAuth/Token/', {
            method: 'post',
            body: `grant_type=refresh_token&refresh_token=${refresh_token}`,
            headers: {
                'Authorization': bungieAuth,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        }).then(res => res);
        console.log(res.status);
        js = await res.json();
        // let user = await this.get_user(id);
        await ref.child(id).update({
            'access_token': js['access_token'],
            'refresh_token': js['refresh_token']
        });
    },

    /**
     * Execute Bungie API operation
     * @param {string} id discord id of user
     * @param {string} endpoint bungie API endpoint
     * @param {string} op REST operation - either post or get
     * @param {any} data - data to be POSTed
     */
    async exec(id, endpoint, op = "get", data = undefined) {
        for (let i = 0; i < 2; i++) {
            let access_token = await this.get_access_token(id);
            let headers = {
                'X-API-Key': apiKey,
                'Authorization': `Bearer ${access_token}`
            }
            let bung;
            try {
                bungus = async () => await fetch(`https://bungie.net/Platform${endpoint}`, {
                    method: op,
                    body: data,
                    headers: headers
                }).catch(async (error) => { console.log(error); return await bungus(); }); // terrible terrible function that tries to fetch and calls itself if it fails
                bung = await bungus();
                if (bung.status == 200) {
                    js = await bung.json();
                    return js['Response'];
                }
            } catch (error) {
                console.log(error);
            }
            console.log(bung);
            console.log('endpoint unreachable or access token expired, refreshing...');
            await this.refresh_access_token(id);
        }
    },

    // API Functions

    async GetCurrentBungieNetUser(id) {
        let data = await this.exec(id, '/User/GetCurrentBungieNetUser');
        return data;
    },

    async GetProfile(id, membershipType, destinyMembershipId, components) {
        let data = await this.exec(id, `/Destiny2/${membershipType}/Profile/${destinyMembershipId}?components=${components}`);
        return data;
    },

    async GetMembershipsForCurrentUser(id) {
        let data = await this.exec(id, '/User/GetMembershipsForCurrentUser');
        return data;
    },

    async GetVendor(id, membershipType, destinyMembershipId, characterId, vendorHash, components) {
        let data = await this.exec(id, `/Destiny2/${membershipType}/Profile/${destinyMembershipId}/Character/${characterId}/Vendors/${vendorHash}?components=${components}`);
        return data;
    },

    async GetItem(id, membershipType, destinyMembershipId, itemInstanceId, components) {
        let data = await this.exec(id, `/Destiny2/${membershipType}/Profile/${destinyMembershipId}/Item/${itemInstanceId}?components=${components}`);
        return data;
    },

    // useful bot things

    async get_item_with_hash(itemType, hash) {
        if (!process.env.LOCALMACHINE) {
            if (itemType in manifest) {
                return manifest[itemType][hash];
            }
        }
        const data = fs.readFileSync(`./manifest/${itemType}.json`);
        const js = JSON.parse(data);
        if (!process.env.LOCALMACHINE) manifest[itemType] = js;
        return js[hash];
    },

    /**
     * Create a pretty embed for an instanced weapon.
     * @param {''} name weapon name
     * @param {{
     *  perks: {reusablePlugs},
     *  description: 'flavor text',
     *  thumb: 'url',
     *  image: 'url'
     * }} weapon object with weapon info
     */
    async generate_instanced_weapon_embed(name, weapon, emojiCache, uninstanced = false, id = '') {
        let description = `${weapon.description}`
        let d2gunsmith = `https://d2gunsmith.com/w/${weapon.hash}?s=`;
        let perkItemsList = []
        if (!weapon.perks) {
            let embed = new MessageEmbed()
                .setTitle('Error')
                .setDescription('Weapon does not have random rolls!');
            return embed;
        }
        for (const slot of Object.values(weapon.perks.plugs)) {
            let slotList = [];
            // console.log(slot);
            if (!slot) continue;
            for (const perk of Object.values(slot)) {
                const perkItem = await this.get_item_with_hash('DestinyInventoryItemDefinition', perk.plugItemHash) // .then(res => res);
                slotList.push([perk, perkItem]);
            }
            perkItemsList.push(slotList);
        }
        let perkList = {};
        // console.log('\n--------------------------')
        // console.log(perkItemsList);
        // let column = 'Left'
        // let switchColumns = false;
        let rangefinder = false;
        for (let i = 0; i < 4; i++) {
            const slot = perkItemsList[i];
            if (!slot) break;
            perkList[`Column ${i + 1}`] = [];
            let perkType = `Column ${i + 1}`;
            // console.log(slot);
            for (const perkItem of slot) {
                const plug = perkItem[0];
                const perk = perkItem[1];
                let perkStr;
                if (perk.itemTypeDisplayName == 'Enhanced Trait') {
                    if (uninstanced) continue;
                    perkStr = `Enhanced ${perk.displayProperties.name}\n`;
                } else {
                    const emoji = emojiCache.find(emoji => emoji.name.startsWith(plug.plugItemHash));
                    perkStr = `${emoji} ${perk.displayProperties.name}\n`;
                }
                if (weapon.hasOwnProperty('selectedPerks') && weapon.selectedPerks.includes(plug.plugItemHash)) {
                    perkStr = `**${perkStr}**`;
                    d2gunsmith += `${plug.plugItemHash},`
                }
                perkList[perkType].push(perkStr);
                if (perk.displayProperties.name == 'Rangefinder' || perk.displayProperties.name == 'Seraph Rounds')
                    rangefinder = true;
            }
        }

        let weaponEmbed = new MessageEmbed()
            .setTitle(name)
            .setThumbnail(weapon.thumb)
            .setImage(weapon.image)

        let brCount = 0;
        for (const slot of Object.keys(perkList)) {
            if (brCount == 2) {
                brCount = 0;
                weaponEmbed.addField('\u200B', '\u200B', false);
            }
            let lstStr = ""
            for (const perk of perkList[slot]) {
                lstStr += perk //`- ${perk}\n`;
            }
            weaponEmbed.addField(slot, lstStr, true);
            brCount++;
        }

        if (weapon.hasOwnProperty('masterwork'))
            description += `\n${weapon.masterwork}`;
        if (weapon.hasOwnProperty('masterwork_hash'))
            d2gunsmith += weapon.masterwork_hash;
        if (id != '') {
            const {membershipType, membershipId, _} = await this.get_user_data(id);
            const instance = await this.GetItem(id, membershipType, membershipId, weapon.itemInstanceId, '304,305,309,310');
            const objectives = instance.plugObjectives.data.objectivesPerPlug;
            for (const [hash, obj] of Object.entries(objectives)) {
                const obj_def = await this.get_item_with_hash('DestinyInventoryItemDefinition', hash);
                if (obj_def.displayProperties.name.endsWith('Tracker')) {
                    description += `\n**${obj_def.displayProperties.name}: ${obj[0].progress}**`;
                    break;
                }
            }
        }
            // description += `\n${weapon.tracker}`;
        if (weapon.hasOwnProperty('stats')) {
            let stats = weapon.stats
            let statStr = '';
            const statOrder = [
                'Swing Speed',
                'Impact',
                'Guard Efficiency',
                'Guard Resistance',
                'Charge Rate',
                'Guard Endurance',
                'Ammo Capacity',
                'Blast Radius',
                'Velocity',
                'Range',
                'Shield Duration',
                'Stability',
                'Handling',
                'Reload Speed',
                'Magazine',
                'Rounds Per Minute',
                'Charge Time',
                'Draw Time',
                'Aim Assist',
                'Zoom',
                'Recoil Direction'
            ]
            for (const stat of statOrder) {
                for (const [weaponStat, value] of Object.entries(stats)) {
                    if (stat == weaponStat) {
                        statStr += `${stat}: ${value}\n`;
                        break;
                    }
                }
            }
            // let statStr = `Impact: ${stats.Impact}\nRange: ${stats.Range}\nStability: ${stats.Stability}\nHandling: ${stats.Handling}\nReload Speed: ${stats['Reload Speed']}\nMagazine: ${stats.Magazine}\nRounds Per Minute: ${stats.RPM}`;
            weaponEmbed.addField('Stats', statStr, false);
            if (weapon.hasOwnProperty('weaponType') && weapon.weaponType != 'none') {
                const range = await this.calc_range(weapon.weaponType, stats['Range'], stats['Zoom'], rangefinder);
                description += `\n**Falloff Distance (Selected Perks): ${range}m**`;
            }
        }
        if (!d2gunsmith.includes('undefined'))
            description += `\n[D2Gunsmith Link](${d2gunsmith})`;
        weaponEmbed.setDescription(description);
        return weaponEmbed;
    },

    async get_user_data(id) {
        let user = await this.get_user(id);
        let membershipType, membershipId, characterId;

        if (!user.hasOwnProperty('membershipId') || !user.hasOwnProperty('characterId') || !user.hasOwnProperty('membershipType')) {
            const memberships = await this.GetMembershipsForCurrentUser(id);
            let profile = memberships['destinyMemberships'][0];
            membershipType = profile['membershipType'];
            membershipId = profile['membershipId'];

            profile = await this.GetProfile(id, membershipType, membershipId, '200');
            characterId = Object.keys(profile['characters']['data'])[0];
            await this.db_set(id, {
                ...user,
                membershipType: membershipType,
                membershipId: membershipId,
                characterId: characterId
            });
        } else {
            membershipType = user.membershipType;
            membershipId = user.membershipId;
            characterId = user.characterId;
        }

        return {membershipType, membershipId, characterId};
    },

    async set_user_character(id, characterId) {
        await ref.child(id).update({ characterId: characterId });
    },

    /**
     * Generate pretty embed for a vendor.
     * @param {DestinyVendorDefinition} vendor vendor to create embed for
     * @param {Int32Array} itemTypes item types desired to be displayed.
     * 
     * 3 = weapons
     * 
     * 2 = armor
     * @param {['']} rarities desired rarities ('Legendary', 'Exotic', etc)
     * @param {} color embed color
     * @return an object containing the embed and a list of weapons that can be used with generate_instanced_weapon_embed
     */
    async generate_vendor_embed(vendor, itemTypes, rarities, color) {
        inventory = vendor.sales.data // vendor['sales']['data'];
        let vend = await this.get_item_with_hash('DestinyVendorDefinition', vendor.vendor.data.vendorHash);
        const displayProperties = vend.displayProperties;

        let embed = new MessageEmbed()
            .setTitle(displayProperties.name)
            .setDescription(displayProperties.description)
            .setColor(color)
            .setImage(`https://bungie.net${displayProperties.largeIcon}`)
            .setThumbnail(`https://bungie.net${displayProperties.originalIcon}`)
        
        let gear = {}
        for (const type of itemTypes) {
            for (const rarity of rarities) {
                switch (type) {
                    case 3:
                        gear[`${rarity} Weapons:`] = [];
                        break;
                    case 2:
                        gear[`${rarity} Armor:`] = [];
                        break;
                    case 19:
                        gear['Mods:'] = [];
                        break;
                }
            }
        }
        // let gear = {
        //     'Exotic Weapons:': [],
        //     'Exotic Armor:': [],
        //     '\u200B': [],
        //     'Legendary Weapons:': [],
        //     'Legendary Armor:': []
        // }
        let weapons = {};
        for (let itemKey of Object.keys(inventory)) {
            let itemObj = inventory[itemKey];
            await this.get_item_with_hash('DestinyInventoryItemDefinition', itemObj['itemHash']).then(async item => {
                // console.log(`name: ${item.displayProperties.name}, tier: ${item.inventory.tierType}, itemType: ${item.itemType}`);
                const name = item.displayProperties.name;
                const tier = item.inventory.tierTypeName;
                const plugData = vendor.itemComponents.reusablePlugs.data;
                let type = item.itemType;
                if (!itemTypes.includes(type)) return;
                if (!rarities.includes(tier)) return;
                switch (type) {
                    case 3:
                        type = 'Weapons:';
                        if (plugData.hasOwnProperty(itemKey)) { //name == 'Hawkmoon' || name == "Dead Man's Tale" || tier != "Exotic"
                            const masterwork_hash = vendor.itemComponents.sockets.data[itemKey].sockets[7].plugHash;
                            // const stat_defs = {
                            //     155624089: 'Stability',
                            //     1240592695: 'Range',
                            //     943549884: 'Handling',
                            //     4188031367: 'Reload Speed',
                            //     3614673599: 'Blast Radius',
                            //     2523465841: 'Velocity',
                            //     1591432999: 'Accuracy',
                            //     1842278586: 'Shield Duration',
                            //     2961396640: 'Charge Time',
                            //     4043523819: 'Impact',
                            //     447667954: 'Draw Time',
                            //     4284893193: 'Rounds Per Minute',
                            //     3871231066: 'Magazine',
                            //     3614673599: 'Blast Radius',
                            //     2523465841: 'Velocity',
                            //     209426660: 'Guard Resistance',
                            //     925767036: 'Ammo Capacity',
                            //     2762071195: 'Guard Efficiency',
                            //     2837207746: 'Swing Speed',
                            //     3022301683: 'Charge Rate',
                            //     3736848092: 'Guard Endurance',
                            //     1345609583: 'Aim Assist',
                            //     3555269338: 'Zoom',
                            //     2715839340: 'Recoil Direction'
                            // }
                            let masterwork;
                            if (masterwork_hash)
                                await this.get_item_with_hash('DestinyInventoryItemDefinition', masterwork_hash).then(item2 => {
                                    for (const stat of item2.investmentStats) {
                                        if (!stat.isConditionallyActive) {
                                            masterwork = `**Tier ${stat.value} ${stat_defs[stat.statTypeHash]} Masterwork**`;
                                            break;
                                        }
                                    }
                                });
                            const stats = {};
                            for (const [hash, stat] of Object.entries(vendor.itemComponents.stats.data[itemKey].stats)) { // Object.entries(item.stats.stats)
                                stats[stat_defs[hash]] = stat.value;
                            }
                            // as per usual, zoom, AA, and recoil are not included in the instance stats object, so we must calculate them by getting the default values and adding the values of each related perk
                            for (const [hash, stat] of Object.entries(item.stats.stats)) {
                                // console.log(`hash: ${hash}, value: ${stat.value}`);
                                if (hash == 1345609583 || hash == 3555269338 || hash == 2715839340) { // ['1345609583', '3555269338', '2715839340'].includes(hash)
                                    stats[stat_defs[hash]] = stat.value;
                                }
                            }
                            let selectedPerks = [];
                            for (let i = 1; i <= 4; i++) {
                                selectedPerks.push(vendor.itemComponents.sockets.data[itemKey].sockets[i].plugHash);
                                await this.get_item_with_hash('DestinyInventoryItemDefinition', vendor.itemComponents.sockets.data[itemKey].sockets[i].plugHash).then(perk => {
                                    for (const perk_stat of perk.investmentStats) {
                                        const stat = perk_stat.statTypeHash;
                                        if ([1345609583, 3555269338, 2715839340].includes(stat)) {
                                            stats[stat_defs[stat]] += perk_stat.value;
                                            if (stats[stat_defs[stat]] > 100) stats[stat_defs[stat]] = 100;
                                        }
                                    }
                                })
                            }
                            let weaponType = item.itemTypeDisplayName;
                            if (weaponType == 'Hand Cannon' && stats['Rounds Per Minute'] == 120)
                                weaponType = '120';
                            if (item.equippingBlock.ammoType != 1 || weaponType == 'Combat Bow')
                                weaponType = 'none';

                            weapons[name] = {
                                // perks: vendor['itemComponents']['reusablePlugs']['data'][itemKey]['plugs'],
                                perks: plugData[itemKey],
                                weaponType: weaponType,
                                selectedPerks: selectedPerks,
                                hash: itemObj['itemHash'],
                                description: item.flavorText,
                                image: `https://bungie.net${item.screenshot}`,
                                thumb: `https://bungie.net${item.displayProperties.icon}`,
                                stats: stats
                            }
                            if (masterwork) {
                                weapons[name].masterwork = masterwork;
                                weapons[name].masterwork_hash = masterwork_hash;
                            }
                        }
                        break;
                    case 2:
                        type = 'Armor:';
                        break;
                    case 19:
                        type = 'Mods:'
                        break;
                    default:
                        return;
                }
                const lstName = type == 'Mods:' ? type : `${tier} ${type}`;
                gear[lstName].push(name);
            });
        }
        let brCount = 0;
        for (const lst of Object.keys(gear)) {
            if (gear[lst].length == 0) continue;
            if (brCount == 2) {
                embed.addField('\u200B', '\u200B', false);
                brCount = 0;
            }
            let lstStr = "";
            for (const item of gear[lst]) {
                lstStr += `- ${item}\n`;
            }
            embed.addField(lst, lstStr, true);
            brCount++;
        }
        return {embed, weapons};
    },

    async generate_item_embed(itemHash, emojiCache) {
        const item = await this.get_item_with_hash('DestinyInventoryItemDefinition', itemHash);
        const sockets = item.sockets ? item.sockets.socketEntries : [];
        let plugSets = [];
        for (const socket of sockets) {
            if (!socket.hasOwnProperty('randomizedPlugSetHash')) continue;
            const plugSet = await this.get_item_with_hash('DestinyPlugSetDefinition', socket.randomizedPlugSetHash);
            if (!plugSet.isFakePlugSet) {
                let slot = [];
                for (const plug of plugSet.reusablePlugItems) {
                    if (plug.currentlyCanRoll) slot.push(plug);
                }
                plugSets.push(slot);
            }
        }
        const weapon = {
            perks: { plugs: plugSets },
            // description: item.itemType == 19 ? item.tooltipNotifications[0].displayString : item.flavorText,
            image: `https://bungie.net${item.screenshot}`,
            // thumb: `https://bungie.net${item.displayProperties.icon}`
        }
        if (item.itemType == 19) {
            const perk = await this.get_item_with_hash('DestinySandboxPerkDefinition', item.perks[0].perkHash);
            weapon.description = perk.displayProperties.description;
            weapon.thumb = `https://bungie.net${perk.displayProperties.icon}`;
        } else {
            weapon.description = item.flavorText;
            weapon.thumb = `https://bungie.net${item.displayProperties.icon}`;
        }
        weapon_embed = await this.generate_instanced_weapon_embed(item.displayProperties.name, weapon, emojiCache, true);
        return weapon_embed;
    },

    async get_vault_weapons(id, itemHash) {
        const {membershipType, membershipId, characterId} = await this.get_user_data(id)
        const vault = await this.GetProfile(id, membershipType, membershipId, '102,201,205');
        const weapon = await this.get_item_with_hash('DestinyInventoryItemDefinition', itemHash);
        const matches = [];
        for (const item of Object.values(vault.profileInventory.data.items)) {
            if (item.itemHash == itemHash) {
                matches.push(item.itemInstanceId);
            }
        }
        for (const character of Object.values(vault.characterInventories.data)) {
            for (const item of Object.values(character.items)) {
                if (item.itemHash == itemHash) {
                    matches.push(item.itemInstanceId);
                }
            }
        }
        for (const character of Object.values(vault.characterEquipment.data)) {
            for (const item of Object.values(character.items)) {
                if (item.itemHash == itemHash) {
                    matches.push(item.itemInstanceId);
                }
            }
        }
        let weapons = [];
        // console.log(matches);
        for (const item of matches) {
            const instance = await this.GetItem(id, membershipType, membershipId, item, '304,305,309,310');
            const objectives = instance.plugObjectives.data.objectivesPerPlug;
            // console.log(objectives);
            let tracker = 'No Tracker';
            for (const [hash, obj] of Object.entries(objectives)) {
                const obj_def = await this.get_item_with_hash('DestinyInventoryItemDefinition', hash);
                if (obj_def.displayProperties.name.endsWith('Tracker')) {
                    tracker = `**${obj_def.displayProperties.name}: ${obj[0].progress}**`;
                    break;
                }
            }
            const masterwork_hash = instance.sockets.data.sockets[7].plugHash;
            // const stat_defs = {
            //     155624089: 'Stability',
            //     1240592695: 'Range',
            //     943549884: 'Handling',
            //     4188031367: 'Reload Speed',
            //     3614673599: 'Blast Radius',
            //     2523465841: 'Velocity',
            //     1591432999: 'Accuracy',
            //     1842278586: 'Shield Duration',
            //     2961396640: 'Charge Time',
            //     4043523819: 'Impact',
            //     447667954: 'Draw Time',
            //     4284893193: 'Rounds Per Minute',
            //     3871231066: 'Magazine',
            //     3614673599: 'Blast Radius',
            //     2523465841: 'Velocity',
            //     209426660: 'Guard Resistance',
            //     925767036: 'Ammo Capacity',
            //     2762071195: 'Guard Efficiency',
            //     2837207746: 'Swing Speed',
            //     3022301683: 'Charge Rate',
            //     3736848092: 'Guard Endurance',
            //     1345609583: 'Aim Assist',
            //     3555269338: 'Zoom',
            //     2715839340: 'Recoil Direction'
            // }
            let masterwork = 'No Masterwork';
            if (masterwork_hash && typeof masterwork_hash != 'undefined') {
                masterwork = 'No Masterwork';
                await this.get_item_with_hash('DestinyInventoryItemDefinition', masterwork_hash).then(item => {
                    for (const stat of item.investmentStats) {
                        if (!stat.isConditionallyActive) {
                            masterwork = `**Tier ${stat.value} ${stat_defs[stat.statTypeHash]} Masterwork**`;
                            break;
                        }
                    }
                });
            }
            const stats = {};
            for (const [hash, stat] of Object.entries(instance.stats.data.stats)) {
                stats[stat_defs[hash]] = stat.value;
            }
            
            // get aim assist, recoil, and zoom by getting the default values and adding the values from each perk because these aren't provided by the API for instanced items :O)
            await this.get_item_with_hash('DestinyInventoryItemDefinition', itemHash).then(item => {
                // console.log(item);
                for (const [hash, stat] of Object.entries(item.stats.stats)) {
                    // console.log(`hash: ${hash}, value: ${stat.value}`);
                    if (hash == 1345609583 || hash == 3555269338 || hash == 2715839340) { // ['1345609583', '3555269338', '2715839340'].includes(hash)
                        stats[stat_defs[hash]] = stat.value;
                    }
                }
            });
            let selectedPerks = [];
            for (let i = 1; i <= 4; i++) {
                selectedPerks.push(instance.sockets.data.sockets[i].plugHash);
                await this.get_item_with_hash('DestinyInventoryItemDefinition', instance.sockets.data.sockets[i].plugHash).then(perk => {
                    for (const perk_stat of perk.investmentStats) {
                        const stat = perk_stat.statTypeHash;
                        if ([1345609583, 3555269338, 2715839340].includes(stat)) {
                            stats[stat_defs[stat]] += perk_stat.value;
                            if (stats[stat_defs[stat]] > 100) stats[stat_defs[stat]] = 100;
                        }
                    }
                })
            }
            let weaponType = weapon.itemTypeDisplayName;
            if (weaponType == 'Hand Cannon' && stats['Rounds Per Minute'] == 120)
                weaponType = '120';
            if (weapon.equippingBlock.ammoType != 1  && !['Fusion Rifle', 'Shotgun'].includes(weaponType) || weaponType == 'Combat Bow')
                weaponType = 'none';
            let wep = {
                itemInstanceId: item,
                name: weapon.displayProperties.name,
                hash: itemHash,
                tracker: tracker,
                // masterwork: masterwork,
                perks: instance.reusablePlugs.data,
                selectedPerks: selectedPerks,
                stats: stats,
                description: weapon.flavorText,
                weaponType: weaponType,
                image: `https://bungie.net${weapon.screenshot}`,
                thumb: `https://bungie.net${weapon.displayProperties.icon}`
            }
            if (masterwork != 'No Masterwork') {
                wep.masterwork = masterwork;
                wep.masterwork_hash = masterwork_hash;
            }
            weapons.push(wep)
            // weapons[item] = { perks: instance.reusablePlugs.data };
        }
        return weapons;
    },

    async set_pin(id, weapon) {
        await ref.child(id).child('pinned').child(weapon.hash).set(weapon);
    },

    async calc_range(weaponType, range_stat, zoom, rangefinder = false) {
        let category, zrm_tier;
        if (weaponType == '120') {
            category = '120 RPM';
            weaponType = 'Hand Cannon';
        } else {
            category = 'default';
        }
        const weapon_info = math[weaponType].category[category].range;
        if (weaponType == 'Fusion Rifle' || weaponType == 'Shotgun')
            zrm_tier = zoom;
        else
            zrm_tier = weapon_info.zrm_tier;
        let range = ((weapon_info.base_min + range_stat * weapon_info.vpp) * (weapon_info.zrm + (zoom - zrm_tier) / 10)) * (rangefinder ? 1.1 : 1)
        range = Math.round(range * 100) / 100;
        return range;
    }
}