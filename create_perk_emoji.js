const fs = require('node:fs');
const fetch = require('node-fetch');

const items = fs.readFileSync('./manifest/DestinyInventoryItemDefinition.json');
const js = JSON.parse(items);
const perks = {};
for (const [hash, item] of Object.entries(js)) {
    // if (item.hasOwnProperty('itemCategoryHashes')) console.log(item.itemCategoryHashes);
    if (item.hasOwnProperty('itemCategoryHashes') && item.itemCategoryHashes.includes(610365472) && !item.itemCategoryHashes.includes(1052191496) && !item.itemCategoryHashes.includes(2237038328) && !item.itemCategoryHashes.includes(3124752623) && !item.itemCategoryHashes.includes(945330047) && item.hasOwnProperty('displayProperties') && item.displayProperties.hasOwnProperty('icon')) {
        perks[hash] = `https://bungie.net${item.displayProperties.icon}`;
    }
}
let i = 0;
let folder = 0;
let newFolder = 50;
let count = 0;

// console.log(perks);

dl = async () => {
    for (const [hash, perk] of Object.entries(perks)) {
        if (i >= newFolder) {
            folder++;
            i = 1;
        }
        if (!fs.existsSync(`./perks/${folder}`)) {
            fs.mkdir(`./perks/${folder}`, () => {});
        }
        let bruh = async () => await fetch(perk).then(res => res.body.pipe(fs.createWriteStream(`./perks/${folder}/${hash}.png`))).catch(async error => { console.log(error); await bruh() });
        await bruh();
        i++;
        count++;
        console.log(count / Object.keys(perks).length * 100);
    }
}

dl();