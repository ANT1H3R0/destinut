const { SlashCommandBuilder } = require('@discordjs/builders');
const destiny = require('../destiny');
const fs = require('node:fs');

/**
 * Call an async function with a maximum time limit (in milliseconds) for the timeout
 * @param {Promise<any>} asyncPromise An asynchronous promise to resolve
 * @param {number} timeLimit Time limit to attempt function in milliseconds
 * @returns {Promise<any> | undefined} Resolved promise for async function call, or an error if time limit reached
 */
 const asyncCallWithTimeout = async (asyncPromise, timeLimit) => {
    let timeoutHandle;

    const timeoutPromise = new Promise((_resolve, reject) => {
        timeoutHandle = setTimeout(
            () => reject(new Error('Async call timeout limit reached')),
            timeLimit
        );
    });

    return Promise.race([asyncPromise, timeoutPromise]).then(result => {
        clearTimeout(timeoutHandle);
        return result;
    })
}

module.exports = {
	data: new SlashCommandBuilder()
		.setName('create-emoji')
		.setDescription('Upload trait emojis to this server.')
        .addIntegerOption(option => 
            option.setName('batch')
            .setDescription('Which batch to upload')
            .setMinValue(0)
            .setMaxValue(8)
			.setRequired(true)
        ),
	execute: destiny.authed(async (interaction) => {
		await interaction.deferReply();
		const folder = interaction.options.getInteger('batch');
        const images = await fs.readdirSync(`./perks/${folder}`);
		for (const image of images) {
			const exists = await interaction.guild.emojis.cache.some(emoji => emoji.name == image.substring(0, image.indexOf('.')));
			if (exists) continue;
			console.log(image);
			console.log(image.substring(0, image.indexOf('.')));
			const create = interaction.guild.emojis.create(`./perks/${folder}/${image}`, `${image.substring(0, image.indexOf('.'))}`) //.then(emoji => {console.log(`create emoji ${emoji.name}`)});
			const timeout = async () => await asyncCallWithTimeout(create, 10000).then(emoji => console.log(`created emoji ${emoji.name}`)).catch(async (error) => { console.log(error); return await timeout(); });
			await timeout();
		}
		await interaction.editReply(`Done`);
	}),
};