const fs = require('node:fs');
const mergeImages = require('merge-images');
const { Canvas, Image, createCanvas } = require('canvas');

// get list of file paths for grid images and determine grid dimensions
module.exports = {
    async create_grid(vendor) {
        let images = [];
        const numFolders = fs.readdirSync('./guns').length;
        // console.log(numFolders);
        for (let i = 0; i < numFolders; i++) {
            const folder = fs.readdirSync(`./guns/${i}/`);
            folder.forEach((value, index, arr) => {
                folder[index] = `./guns/${i}/${value}`;
            })
            images = images.concat(folder);
        }
        const imageList = [];
        let dim = Math.sqrt(images.length);
        if (dim % 1 == 0)
            dim *= 96;
        else
            dim = (Math.floor(dim) + 1)*96;

        // create blank background same size as grid
        const canvas = createCanvas(dim, dim);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = "rgba(255, 255, 255, 0)";
        ctx.fillRect(0, 0, dim, dim);
        const buffer = canvas.toBuffer("image/png");
        fs.writeFileSync('./back.png', buffer);
        imageList.push({ src: './back.png', x: 0, y:0 });

        // create list of images for grid
        let x = 0;
        let y = 0;
        for (const image of images) {
            if (x == dim) {
                y += 96;
                x = 0;
            }
            imageList.push({ src: image, x: x, y: y});
            x += 96;
        }

        // create grid and save to grid.png
        await mergeImages(imageList, {
            Canvas: Canvas,
            Image: Image
        })
            .then(b64 => {fs.writeFileSync(`./grid-${vendor}.png`, b64.split(';base64,').pop(), {encoding: 'base64'})});
    }
}
