require(`dotenv`).config();
const token = process.env.TOKEN;
const apiId = process.env.apiId;
const adminId = process.env.adminId;

const { WeatherApi } = require(`./weatherApi`);
const Telegraf = require(`telegraf`);
const render = require(`./pool`);
const { Client } = require(`pg`);
/*
const express = require(`express`);
const port = process.env.PORT || 3000;
const path = require("path");
const site = async () => {
  const app = express();

  app.get(`/`, (req, res) => {
    res.sendFile(path.join(__dirname + "/index.html"));
  });

  app.listen(port, () => {
    console.log(`BotStatistics listening at http://localhost:${port}`);
  });
};
site();*/

const client = new Client();
client.connect();

const bot = new Telegraf(token);
const weatherApi = new WeatherApi(apiId);

const buttonsList = [
  `default`,
  `default_active`,
  `week`,
  `week_active`,
  `graph`,
  `graph_active`,
];

const keyboard = {
  default: {
    num: 0,
    active: `🌤`,
    unactive: `Default`,
  },
  week: {
    num: 1,
    active: `🌡`,
    unactive: `Week`,
  },
  graph: {
    num: 2,
    active: `📈`,
    unactive: `Graph`,
  },
};

const newKeyboard = async (active) => {
  const inline_keyboard = [
    [
      { text: `Default`, callback_data: `default` },
      { text: `Week`, callback_data: `week` },
      { text: `Graph`, callback_data: `graph` },
    ],
  ];
  inline_keyboard[0][keyboard[active].num].text = keyboard[active].active;
  inline_keyboard[0][keyboard[active].num].callback_data += `_active`;
  return inline_keyboard;
};

const sendRes = async (context) => {
  const update = context.update.callback_query ?? context.update;
  const { rows } = await client.query(
    `SELECT exists(SELECT 1 FROM "users" WHERE user_id=${update.message.from.id})`
  );
  if (!rows[0].exists) {
    await client.query(
      `INSERT INTO
      "users"(name, user_id, time, now)
      VALUES($1, $2, $3, $4);`,
      [false, update.message.from.id, false, `start`]
    );
  }
  const {
    rows: [{ now }],
  } = await client.query(`SELECT now FROM "users" WHERE user_id=$1`, [
    update.message.from.id,
  ]);
  if (now == `location` && !context.update.callback_query) {
    const weatherCord = await weatherApi.weather(
      update.message.text,
      `metric`,
      update.message.from.language_code
    );
    if (weatherCord.startsWith(`404`)) {
      await context.reply(`There is no such place.`);
      return;
    }
    await client.query(
      `UPDATE "users"
      SET name = $1,
          now = $2
      WHERE user_id = $3;`,
      [JSON.parse(weatherCord).coord, `time`, update.message.from.id]
    );
    await context.reply(`Send me time.\n 23:50`);
    return;
  } else if (now == `time` && !context.update.callback_query) {
    const splitText = update.message.text.split(`:`);
    if (splitText.length != 2) {
      await context.reply(`Error`);
      return;
    }
    try {
      splitText.map((num) => parseInt(num));
    } catch (err) {
      await context.reply(`Error`);
      return;
    }
    const [hh, mm] = splitText;
    if (hh < 0 || hh > 23 || mm < 0 || mm > 59) {
      await context.reply(`Error`);
      return;
    }
    const {
      rows: [{ name: loc }],
    } = await client.query(`SELECT name FROM "users" WHERE user_id=$1`, [
      update.message.from.id,
    ]);
    const { timezone_offset } = JSON.parse(
      await weatherApi.onecall(
        JSON.parse(loc),
        `metric`,
        update.message.from.language_code
      )
    );
    console.log(timezone_offset / 3600);
    let locHh = parseInt(hh) - timezone_offset / 3600;
    if (locHh > 23) {
      locHh -= 24;
    } else if (locHh < 0) {
      locHh += 24;
    }
    console.log(locHh);
    await client.query(
      `UPDATE "users"
       SET time = $1,
           now = $2
       WHERE user_id = $3;`,
      [update.message.text, `start`, update.message.from.id]
    );
    await context.reply(`Done`);
    return;
  }
  let type = `default`;
  let cord = undefined;
  let cityName;
  const message = context.update.callback_query || context.update.message;
  if (context.update.callback_query) {
    if (message.data.endsWith(`_active`)) {
      context.answerCbQuery(`Active`);
      return;
    }
    await bot.telegram.editMessageCaption(
      message.message.chat.id,
      message.message.message_id,
      message.message.message_id,
      `Loading...`
    );
    type = message.data;
    cityName = message.message.reply_to_message.text;
  } else {
    bot.telegram.sendChatAction(context.message.chat.id, `upload_photo`);
    if (message.location) {
      cord = {
        lat: message.location.latitude,
        lon: message.location.longitude,
      };
    }
  }
  if (!cord) {
    if (!/^\w+$/.test(cityName || message.text)) {
      await context.reply("Enter in Latin.");
      return;
    }
    const weatherCord = await weatherApi.weather(
      cityName || message.text,
      `metric`,
      message.from.language_code
    );
    if (weatherCord.startsWith(`404`)) {
      await context.reply(`There is no such place.`);
      return;
    }
    cord = JSON.parse(weatherCord).coord;
  }
  const weather = await JSON.parse(
    await weatherApi.onecall(cord, `metric`, message.from.language_code)
  );
  const preview = await render({ weather, type });
  const inline_keyboard = await newKeyboard(type);
  if (context.update.callback_query) {
    await context.editMessageMedia(
      { type: `photo`, media: { source: preview } },
      { reply_markup: { inline_keyboard } }
    );
    return;
  }
  await context.replyWithPhoto(
    { source: preview },
    {
      reply_to_message_id: context.message.message_id,
      reply_markup: { inline_keyboard },
    }
  );
  try {
    const res = await client.query(
      `INSERT INTO sent(name, user_id, time) VALUES($1, $2, $3) RETURNING *`,
      [message.text, message.from.id, new Date()]
    );
    console.log(res.rows[0]);
  } catch (err) {
    console.log(err.stack);
  }
};

const notifications = async (context) => {
  await context.reply(`Send me the name of the place.`);
  const { rows } = await client.query(
    `SELECT exists(SELECT 1 FROM "users" WHERE user_id=${context.update.message.from.id})`
  );
  if (!rows[0].exists) {
    await client.query(
      `INSERT INTO
      "users"(name, user_id, time, now)
      VALUES($1, $2, $3, $4);`,
      [false, context.update.message.from.id, false, `start`]
    );
  }
  await client.query(
    `UPDATE "users"
    SET now = $1
    WHERE user_id = $2;`,
    [`location`, context.update.message.from.id]
  );
};

bot.start(async (context) => {
  context.reply(`Send me the name of the place.`);
  const { rows } = await client.query(
    `SELECT exists(SELECT 1 FROM "users" WHERE user_id=${context.update.message.from.id})`
  );
  if (!rows[0].exists) {
    await client.query(
      `INSERT INTO
      "users"(name, user_id, time, now)
      VALUES($1, $2, $3, $4);`,
      [false, context.update.message.from.id, new Date(), `start`]
    );
  }
});

const sendNotifications = async () => {
  const { rows } = await client.query(`SELECT * FROM users`);
  for (const { time, user_id } of rows) {
    const [hh, mm] = time.split(`:`);
    console.log(Date.now());
    const date = new Date(2015, 0, 21, 17, 0).getTime() - Date.now();
    console.log(date);
  }
};
sendNotifications();
bot.command(`notifications`, (context) => notifications(context));
bot.on(`message`, (context) => {
  sendRes(context);
});

bot.action(buttonsList, (context) => {
  sendRes(context);
});
const start = async function () {
  bot.telegram.sendMessage(
    adminId,
    `@${(await bot.telegram.getMe()).username} is running…`
  );
};
start();

bot.startPolling();
