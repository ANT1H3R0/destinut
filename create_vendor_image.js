const fs = require('node:fs');
const fetch = require('node-fetch');
const { create_grid } = require('./create_vendor_grid');

// console.log(perks);

module.exports = {
    async dl(vendor, displayCategoryIndex) {
        if (fs.existsSync('./guns'))
            fs.rmSync('./guns', {recursive: true, force: true});
        fs.mkdirSync('./guns');

        const vendors = fs.readFileSync('./manifest/DestinyVendorDefinition.json');
        const items = fs.readFileSync('./manifest/DestinyInventoryItemLiteDefinition.json')
        const js = JSON.parse(vendors);
        const itemjs = JSON.parse(items);
        const xur = js[`${vendor}`];
        const itemList = {};
        for (const item of xur.itemList) {
            // if (item.hasOwnProperty('itemCategoryHashes')) console.log(item.itemCategoryHashes);
            // if (item.hasOwnProperty('itemCategoryHashes') && item.itemCategoryHashes.includes(610365472) && !item.itemCategoryHashes.includes(1052191496) && !item.itemCategoryHashes.includes(2237038328) && !item.itemCategoryHashes.includes(3124752623) && !item.itemCategoryHashes.includes(945330047) && item.hasOwnProperty('displayProperties') && item.displayProperties.hasOwnProperty('icon')) {
            //     perks[hash] = `https://bungie.net${item.displayProperties.icon}`;
            // }
            if (item.hasOwnProperty('displayCategoryIndex') && item.displayCategoryIndex == displayCategoryIndex && !item.hasOwnProperty('unpurchasable')) {
                const itemdef = itemjs[`${item.itemHash}`];
                // console.log(item);
                itemList[item.itemHash] = `https://bungie.net${itemdef.displayProperties.icon}`;
            }
        }

        let i = 0;
        let folder = 0;
        let newFolder = 50;
        let count = 0;

        let download = async () => {
            for (const [hash, item] of Object.entries(itemList)) {
                if (i >= newFolder) {
                    folder++;
                    i = 0;
                }
                if (!fs.existsSync(`./guns/${folder}`)) {
                    fs.mkdir(`./guns/${folder}`, () => {});
                }
                let bruh = async () => fetch(item).then(res => res.body.pipe(fs.createWriteStream(`./guns/${folder}/${hash}.png`))).catch(async error => { console.log(error); await bruh() });
                await bruh();
                i++;
                count++;
                console.log(count / Object.keys(itemList).length * 100);
            }
        }
        await download();
        await new Promise(r => setTimeout(r, 2000));
        await create_grid(`${vendor}`);
        // let make_grid = async () => await create_grid(`${vendor}`).catch(async err => {await make_grid()});
        // await make_grid();
    }
}
// dl();