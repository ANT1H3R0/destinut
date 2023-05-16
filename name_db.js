const fs = require('node:fs');

let seasons = {
    "/common/destiny2_content/icons/dd71a9a48c4303fd8546433d63e46cc7.png": "Red War",
    "/common/destiny2_content/icons/50d36366595897d49b5d33e101c8fd07.png": "Curse of Osiris",
    "/common/destiny2_content/icons/aaa61f6c70478d87de0df41e5709a773.png": "Warmind",
    "/common/destiny2_content/icons/02478e165d7d8d2a9f39c2796e7aac12.png": "Forsaken",
    "/common/destiny2_content/icons/c23c9ec8709fecad87c26b64f5b2b9f5.png": "Black Armory",
    "/common/destiny2_content/icons/e4a1a5aaeb9f65cc5276fd4d86499c70.png": "Drifter",
    "/common/destiny2_content/icons/69bb11f24279c7a270c6fac3317005b2.png": "Opulence",
    "/common/destiny2_content/icons/ee3f5bb387298acbdb03c01940701e63.png": "Shadowkeep",
    "/common/destiny2_content/icons/82a8d6f2b1e4ee14e853d4ffbe031406.png": "S8",
    "/common/destiny2_content/icons/9b7e4bbc576fd15fbf44dfa259f8b86a.png": "S9",
    "/common/destiny2_content/icons/3d335ddc3ec6668469aae60baad8548d.png": "S10",
    "/common/destiny2_content/icons/796813aa6cf8afe55aed4efc2f9c609b.png": "S11",
    "/common/destiny2_content/icons/0aff1f4463f6f44e9863370ab1ce6983.png": "Beyond Light",
    "/common/destiny2_content/icons/2347cc2407b51e1debbac020bfcd0224.png": "S12",
    "/common/destiny2_content/icons/6a52f7cd9099990157c739a8260babea.png": "S13",
    "/common/destiny2_content/icons/b07d89064a1fc9a8e061f59b7c747fa5.png": "S14",
    "/common/destiny2_content/icons/4368a3e344977c5551407845ede830c2.png": "S15",
    "/common/destiny2_content/icons/4fe83598190610f122497d22579a1fd9.png": "Witch Queen",
    "/common/destiny2_content/icons/b0406992c49c84bdc5febad94048dc01.png": "S16",
    "/common/destiny2_content/icons/81edbfbf0bacf8e2117c00d1d6115f1b.png": "S17",
    "/common/destiny2_content/icons/f359d68324ae21522c299983ff1ef9f2.png": "S18",
    "/common/destiny2_content/icons/1a68ada4fb21371c5f2b7e2eae1ebce8.png": "S19",
    "/common/destiny2_content/icons/849de2c6bd5e9b8ced8abe8cca56d724.png": "Lightfall",
    "/common/destiny2_content/icons/e6af18ae79b74e76dab327ec183f8228.png": "S20",
    "/common/destiny2_content/icons/d91c738e8179465a165e35f7a249701b.png": "Dawning",
    "/common/destiny2_content/icons/dd4dd93c5606998595d9e5a06d5bfc9c.png": "30th",
    "/common/destiny2_content/icons/97c65a76255ef764a9a98f24e50b859d.png": "Guardian Games",
    "/common/destiny2_content/icons/215100c99216b9c0bd83b9daa50ace45.png": "FotL"
}

module.exports = {
    async update() {
        let names = {};
        let mods = {};
        const f = await fs.readFileSync('./manifest/DestinyInventoryItemDefinition.json');
        const js = await JSON.parse(f);
        for (const [hash, item] of Object.entries(js)) {
            if (item.itemType == 3 && (item.displaySource != "" || item.summaryItemHash == '2673424576')) { //  || item.displayProperties.name == "Dead Man's Tale" || item.displayProperties.name == 'Hawkmoon'
                let name = item.displayProperties.name;
                if (Object.values(js).filter(i => i.displayProperties.name == name).length > 1) {
                    let icons = item.quality.displayVersionWatermarkIcons;
                    let season = '';
                    icons.forEach(e => season += seasons[e] + '/');
                    name += ` (${season.substring(0, season.length - 1)})`;
                }
                names[name] = hash;
            }
            const categories = item.itemCategoryHashes;
            // console.log(item);
            if (item.hasOwnProperty('itemCategoryHashes') && 
                (categories.includes(1052191496)
                && item.inventory.tierTypeHash == 4008398120
                && !item.displayProperties.description.includes('deprecated')
                || categories.includes(4104513227)
                && !categories.includes(4062965806)
                && !categories.includes(1875601085)
                && !categories.includes(1742617626)
                && item.displayProperties.name != 'Empty Mod Socket')) {

                mods[item.displayProperties.name] = hash;
            }
        }
        fs.writeFileSync('./names.json', JSON.stringify(names));
        fs.writeFileSync('./mods.json', JSON.stringify(mods));
    },

    async get(name) {
        const f = await fs.readFileSync('./names.json');
        const js = await JSON.parse(f);
        const items = {};
        for (const [item_name, hash] of Object.entries(js)) {
            if (Object.keys(items).length == 25)
                break;
            if (item_name.toLowerCase().includes(name.toLowerCase()))
                items[item_name] = hash;
        }
        return items;
    },

    async getMod(name) {
        const f = await fs.readFileSync('./mods.json');
        const js = await JSON.parse(f);
        const items = {};
        for (const [item_name, hash] of Object.entries(js)) {
            // if (item_name.toLowerCase().includes(name.toLowerCase()))
            //     return [item_name, hash];
            if (Object.keys(items).length == 25)
                break;
            if (item_name.toLowerCase().includes(name.toLowerCase()))
                items[item_name] = hash;
        }
        return items;
    }
}