const fs = require('node:fs');

module.exports = {
    async update() {
        let names = {};
        let mods = {};
        const f = await fs.readFileSync('./manifest/DestinyInventoryItemDefinition.json');
        const js = await JSON.parse(f);
        for (const [hash, item] of Object.entries(js)) {
            if (item.itemType == 3 && (item.displaySource != "" || item.summaryItemHash == '2673424576')) { //  || item.displayProperties.name == "Dead Man's Tale" || item.displayProperties.name == 'Hawkmoon'
                names[item.displayProperties.name] = hash;
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