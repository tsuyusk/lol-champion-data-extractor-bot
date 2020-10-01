require('dotenv/config');

const fs = require('fs');
const lolChampions = require('lol-champions');
const path = require('path');
const puppeteer = require('puppeteer');
const { Client } = require('discord.js');

const imagesDir = path.resolve(__dirname, 'images');
const token = process.env.BOT_TOKEN;

const client = new Client();

client.on('ready', () => {
  console.log(`Running on user ${client.user.tag}`);
});

client.on('message', async message => {
  const [command, ...args] = message.content.split(' ');

  if (!message.author.bot && command.startsWith('!!')) {
    if (command === '!!matchups') {
      await getChampionData({
        message,
        champion: args[0],
        elementClass: '.counters-container',
        elementIndex: 0,
        kindOfData: 'matchups',
        subPage: 'counter',
        customMessage: `${args[0]} matchups`,
      });
    }
    if (command === '!!runes') {
      await getChampionData({
        message,
        champion: args[0],
        kindOfData: 'runes',
        elementClass: '.grid-block-header + .grid-block-content',
        elementIndex: 1,
      });
    }

    if (command === '!!build') {
      await getChampionData({
        message,
        champion: args[0].toLowerCase(),
        kindOfData: 'build',
        elementClass: '._grid-3._grid-columns',
        elementIndex: 3,
      });
    }

    if (command === '!!reset') {
      if (message.author.tag !== process.env.ADMIN_TAG) return;
      const champion = args[0];

      if (!champion) {
        message.reply('Missing champion name');
        return;
      }

      const fileName = `rune-${champion}.png`;

      try {
        if (champion === 'all') {
          const runesAndBuilds = await fs.promises.readdir(`${imagesDir}`);

          runesAndBuilds.forEach(async runeOrBuild => {
            await fs.promises.unlink(`${imagesDir}/${runeOrBuild}`);
          });

          message.reply(
            `Storaged data for all champions was successfully removed`,
          );
          return;
        }

        await fs.promises.unlink(`${imagesDir}/${fileName}`);
        await fs.promises.unlink(`${imagesDir}/${`build-${champion}.jpeg`}`);

        message.reply(`Storaged data for ${champion} was successfully removed`);
      } catch {
        message.reply(`No storaged data for ${champion} was found`);
      }
    }
  }
});

async function getChampionData({
  message,
  champion,
  kindOfData,
  elementClass,
  elementIndex,
  subPage,
  customMessage,
}) {
  if (!champion) {
    await message.reply('Missing champion name');
    return;
  }

  const championNames = lolChampions.map(champion =>
    champion.name.toLocaleLowerCase(),
  );

  if (!championNames.includes(champion)) {
    await message.reply('Invalid champion name');
    return;
  }

  const fileName = `${kindOfData}-${champion}.jpeg`;

  await message.reply(`Searching ${kindOfData} for ${champion}...`);

  try {
    await fs.promises.stat(`${imagesDir}/${fileName}eqwewqewq`);
  } catch {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    page.setDefaultNavigationTimeout(0);

    page.setViewport({ width: 1366, height: 2000 });

    await page.goto(
      `https://u.gg/lol/champions/${champion}/${subPage || 'build'}`,
    );

    const chosenSection = await page.evaluate(
      (pageElementClass, pageElementIndex) => {
        const element = document.querySelectorAll(pageElementClass)[
          pageElementIndex
        ];

        const { x, y, width, height } = element.getBoundingClientRect();

        return { left: x, top: y, width, height };
      },
      elementClass,
      elementIndex,
    );

    await page.screenshot({
      path: `${imagesDir}/${fileName}`,
      clip: {
        x: chosenSection.left,
        y: chosenSection.top,
        width: chosenSection.width,
        height: chosenSection.height,
      },
    });

    await browser.close();
  } finally {
    try {
      await message.channel.send(
        `${customMessage || `Most used ${kindOfData} for ${champion}`}`,
        {
          files: [`${imagesDir}/${fileName}`],
        },
      );
    } catch {
      await message.channel.send('An error happened while sending the image');
    }
  }
}

client.login(token);
