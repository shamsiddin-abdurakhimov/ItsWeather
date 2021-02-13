require(`dotenv`).config();
const token = process.env.TOKEN;
const apiId = process.env.apiId;
const adminId = process.env.adminId;

const { WeatherApi } = require(`./weatherApi`);
const Telegraf = require(`telegraf`);
const render = require(`./pool`);
const { Client } = require(`pg`);

const client = new Client();
client.connect();

const bot = new Telegraf(token);
const weatherApi = new WeatherApi(apiId);

const messageButtonsList = [
  `default`,
  `default_active`,
  `week`,
  `week_active`,
  `graph`,
  `graph_active`,
];

const notificationButtonsList = [
  `notification_default`,
  `notification_default_active`,
  `notification_week`,
  `notification_week_active`,
  `notification_graph`,
  `notification_graph_active`,
];

const locationButtonsList = [
  `location_default`,
  `location_default_active`,
  `location_week`,
  `location_week_active`,
  `location_graph`,
  `location_graph_active`,
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

const notificationUsers = {};
const notification = async () => {
  const { rows } = await client.query(`SELECT * FROM users`);
  for (const { user_id, location, date, notifications } of rows) {
    if (notifications != `false`) {
      const timeStr = date.split(`:`);
      let [hh, mm] = timeStr.map((num) => parseInt(num));
      const nowTime = new Date();
      if (
        nowTime.getUTCHours() > hh ||
        (nowTime.getUTCHours() == hh && nowTime.getUTCMinutes() > mm)
      ) {
        hh += 24;
      }
      const timeoutTime =
        new Date(
          nowTime.getUTCFullYear(),
          nowTime.getUTCMonth(),
          nowTime.getUTCDate(),
          hh,
          mm
        ).getTime() -
        nowTime.getTime() -
        nowTime.getTimezoneOffset() * 60000;
      const timeout = setTimeout(() => {
        sendNotifications(user_id, location);
      }, timeoutTime);
      notificationUsers[user_id] = timeout;
    }
  }
};
notification();

const sendNotifications = async (user_id, cord) => {
  const weather = await JSON.parse(
    await weatherApi.onecall(cord, `metric`, `en`)
  );
  const preview = await render({ weather, type: `default` });
  try {
    await bot.telegram.sendPhoto(user_id, { source: preview });
  } catch (err) {
    console.log(err);
  }
  const nowTime = new Date();
  const date =
    new Date(
      nowTime.getUTCFullYear(),
      nowTime.getUTCMonth(),
      nowTime.getUTCDate() + 1,
      nowTime.getUTCHours(),
      nowTime.getUTCMinutes()
    ).getTime() -
    nowTime.getTime() -
    nowTime.getTimezoneOffset() * 60000;
  const timeout = setTimeout(() => {
    sendNotifications(user_id, cord);
  }, date);
  notificationUsers[user_id] = timeout;
};

const updateNotifyUser = async (user_id) => {
  if (notificationUsers[user_id] != undefined) {
    clearTimeout(notificationUsers[user_id]);
    notificationUsers[user_id] = undefined;
  }
  const {
    rows: [{ location, date, notifications }],
  } = await client.query(`SELECT *  FROM "users" WHERE user_id=$1`, [user_id]);
  if (notifications != `false` && date != `none` && location.lat != undefined) {
    const timeStr = date.split(`:`);
    let [hh, mm] = timeStr.map((num) => parseInt(num));
    const nowTime = new Date();
    if (
      nowTime.getUTCHours() > hh ||
      (nowTime.getUTCHours() == hh && nowTime.getUTCMinutes() > mm)
    ) {
      hh += 24;
    }
    const timeoutTime =
      new Date(
        nowTime.getUTCFullYear(),
        nowTime.getUTCMonth(),
        nowTime.getUTCDate(),
        hh,
        mm
      ).getTime() -
      nowTime.getTime() -
      nowTime.getTimezoneOffset() * 60000;
    const timeout = setTimeout(() => {
      sendNotifications(user_id, location);
    }, timeoutTime);
    notificationUsers[user_id] = timeout;
  }
};

const newKeyboard = async (active, pre) => {
  pre ??= ``;
  const inline_keyboard = [
    [
      { text: `Default`, callback_data: `default` },
      { text: `Week`, callback_data: `week` },
      { text: `Graph`, callback_data: `graph` },
    ],
  ];
  inline_keyboard[0][keyboard[active].num].text = keyboard[active].active;
  inline_keyboard[0][keyboard[active].num].callback_data += `_active`;
  for (const button in inline_keyboard[0]) {
    inline_keyboard[0][button].callback_data =
      pre + inline_keyboard[0][button].callback_data;
  }
  return inline_keyboard;
};

const getCoord = async (text) => {
  if (!/^\w+$/.test(text)) {
    return [false, "Enter in Latin."];
  }
  const coord = await weatherApi.weather(text, `metric`, `en`);
  if (coord.startsWith(`404`)) {
    return [false, `There is no such place.`];
  }
  return [true, JSON.parse(coord)];
};

const getPic = async (coords, type, pre) => {
  const weather = await JSON.parse(
    await weatherApi.onecall(coords, `metric`, `en`)
  );
  const pic = await render({ weather, type });
  const inline_keyboard = await newKeyboard(type, pre);
  return { pic, reply_markup: { inline_keyboard } };
};

const notifications = async (context) => {
  const {
    from: { id },
  } = context.update.message;
  const {
    rows: [{ location, date, notifications }],
  } = await client.query(
    `SELECT location, date, notifications  FROM "users" WHERE user_id=$1`,
    [id]
  );
  const inline_keyboard = [
    [
      {
        text: `Turn notifications ${notifications ? `off` : `on`}`,
        callback_data: `edit_notification`,
      },
    ],
  ];
  let name = `none`;
  let getWeather;
  if (location.lat != undefined) {
    inline_keyboard.push([
      { text: `Edit`, callback_data: `edit_location_date` },
    ]);
    getWeather = await JSON.parse(
      await weatherApi.weather(location, `metric`, `en`)
    );
    name = getWeather.name;
  }
  let time;
  if (date != `none`) {
    const timeStr = date.split(`:`);
    let [hh, mm] = timeStr.map((num) => parseInt(num));
    let hhTime = hh + getWeather.timezone / 3600;
    if (hhTime > 23) {
      hhTime -= 24;
    }
    time = `${hhTime}:${mm}`;
  }
  await context.reply(
    `Notifications: ${
      notifications ? `enabled` : `disabled`
    }\nDate: ${time}\nLocation: ${name}`,
    { reply_markup: { inline_keyboard } }
  );
};

const editingLocation = async (context, stage, from) => {
  const id = context.update.message.from.id;
  let coords;
  if (from == `location`) {
    const { latitude: lat, longitude: lon } = context.update.message.location;
    coords = { let, lon };
  } else {
    const [coordBool, coord] = await getCoord(context.update.message.text);
    if (!coordBool) {
      await context.reply(coord);
      return;
    }
    coords = coord.coord;
  }
  await client.query(`UPDATE "users" SET location = $1 WHERE user_id = $2;`, [
    coords,
    id,
  ]);
  if (stage == `location_on`) {
    await client.query(
      `UPDATE "users" SET notifications = TRUE WHERE user_id = $1;`,
      [id]
    );
  } else if (stage == `location_first`) {
    await client.query(
      `UPDATE "users" SET stage = 'date_on' WHERE user_id = $1;`,
      [id]
    );
    await context.reply(`Send me the date`);
  }
  updateNotifyUser(id);
};

const editingDate = async (context, stage) => {
  const id = context.update.message.from.id;
  const splitText = context.update.message.text.split(`:`);
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
    rows: [{ location }],
  } = await client.query(`SELECT location FROM "users" WHERE user_id=$1`, [id]);
  const { timezone_offset } = JSON.parse(
    await weatherApi.onecall(location, `metric`, `en`)
  );
  let locHh = parseInt(hh) - timezone_offset / 3600;
  if (locHh > 23) {
    locHh -= 24;
  } else if (locHh < 0) {
    locHh += 24;
  }
  await client.query(
    `UPDATE "users"
       SET date = $1,
           stage = $2
       WHERE user_id = $3;`,
    [`${locHh}:${mm}`, `start`, id]
  );
  if (stage == `date_on`) {
    await client.query(
      `UPDATE "users" SET notifications = TRUE WHERE user_id = $1;`,
      [id]
    );
  }
  updateNotifyUser(id);
  await context.reply(`Done`);
};

const editingNotification = async (context, stage, from) => {
  if ([`location`, `location_on`, `location_first`].includes(stage)) {
    return editingLocation(context, stage, from);
  }
  return editingDate(context, stage);
};

const updateWeatherNotification = async (context) => {
  const data = context.update.callback_query.data.slice(`notification_`.length);
  const {
    from: { id },
    message_id,
  } = context.update.callback_query.message;
  if (data.endsWith(`_active`)) {
    context.answerCbQuery(`Active`);
    return;
  }
  const {
    rows: [{ location: coords }],
  } = await client.query(`SELECT location FROM "users" WHERE user_id=$1`, [id]);
  await context.editMessageCaption(`Loading...`);
  const { pic, reply_markup } = await getPic(coords, data);
  await context.editMessageMedia(
    { type: `photo`, media: { source: pic } },
    { reply_markup }
  );
};

const editLocationAndDate = async (context) => {
  await context.reply(`Send me the name of the place or location`);
  await client.query(
    `UPDATE "users" SET stage = 'location_first' WHERE user_id = $1;`,
    [context.update.callback_query.message.chat.id]
  );
};

const turnNotification = async (context) => {
  const {
    text,
    chat: { id },
    reply_markup,
  } = context.update.callback_query.message;
  const {
    rows: [{ location, date, notifications }],
  } = await client.query(
    `SELECT location, date, notifications FROM "users" WHERE user_id=$1`,
    [id]
  );
  if (notifications) {
    await client.query(
      `UPDATE "users" SET notifications = FALSE WHERE user_id = $1;`,
      [id]
    );
    let textRes = text.split(`\n`);
    textRes[0] = `Notifications: disabled`;
    textRes = textRes.join(`\n`);
    await context.editMessageText(textRes, {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: `Turn notifications on`,
              callback_data: `edit_notification`,
            },
          ],
          [{ text: `Edit`, callback_data: `edit_location_date` }],
        ],
      },
    });
    updateNotifyUser(id);
    return;
  }
  if (location.lat != undefined && date != `none`) {
    await client.query(
      `UPDATE "users" SET notifications = TRUE WHERE user_id = $1;`,
      [id]
    );
    let textRes = text.split(`\n`);
    textRes[0] = `Notifications: enabled`;
    textRes = textRes.join(`\n`);
    await context.editMessageText(textRes, {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: `Turn notifications off`,
              callback_data: `edit_notification`,
            },
          ],
          [{ text: `Edit`, callback_data: `edit_location_date` }],
        ],
      },
    });
    updateNotifyUser(id);
    return;
  }
  if (location.lat == undefined && date == `none`) {
    await context.reply(`Send me the name of the place or location`);
    await client.query(
      `UPDATE "users" SET stage = 'location_first' WHERE user_id = $1;`,
      [id]
    );
    return;
  }
  if (location.lat == undefined) {
    await context.reply(`Send me the name of the place or location`);
    await client.query(
      `UPDATE "users" SET stage = 'location_on' WHERE user_id = $1;`,
      [id]
    );
    return;
  } else {
    await context.reply(`Send me the date`);
    await client.query(
      `UPDATE "users" SET stage = 'date_on' WHERE user_id = $1;`,
      [id]
    );
  }
};

const sendWeatherMessage = async (context) => {
  const {
    from: { id },
    text,
    message_id,
  } = context.update.message;
  const {
    rows: [{ stage }],
  } = await client.query(`SELECT "stage" FROM "users" WHERE user_id=$1`, [id]);
  if (stage != `start`) {
    editingNotification(context, stage, `message`);
    return;
  }
  const [coordBool, coords] = await getCoord(text);
  if (!coordBool) {
    await context.reply(coords);
    return;
  }
  bot.telegram.sendChatAction(id, `upload_photo`);
  const { pic, reply_markup } = await getPic(coords.coord, `default`);
  await context.replyWithPhoto(
    { source: pic },
    { reply_to_message_id: message_id, reply_markup }
  );
  await client.query(
    `INSERT INTO sent(name, user_id, date) VALUES($1, $2, $3)`,
    [text, id, new Date()]
  );
};

const sendWeatherLocation = async (context) => {
  const {
    from: { id },
    message_id,
  } = context.update.message;
  const {
    rows: [{ stage }],
  } = await client.query(`SELECT stage FROM "users" WHERE user_id=$1`, [id]);
  const { latitude: lat, longitude: lon } = context.update.message.location;
  if (stage != `start`) {
    editingNotification(context, stage, `location`);
    return;
  }
  bot.telegram.sendChatAction(id, `upload_photo`);
  const { pic, reply_markup } = await getPic(
    { lat, lon },
    `default`,
    `location_`
  );
  await context.replyWithPhoto(
    { source: pic },
    { reply_to_message_id: message_id, reply_markup }
  );
};

const updateWeatherMessage = async (context) => {
  const data = context.update.callback_query.data;
  const {
    from: { id },
    message_id,
    reply_to_message: { text },
  } = context.update.callback_query.message;
  if (data.endsWith(`_active`)) {
    context.answerCbQuery(`Active`);
    return;
  }
  const [coordBool, coords] = await getCoord(text);
  if (!coordBool) {
    await context.reply(coords);
    return;
  }
  await context.editMessageCaption(`Loading...`);
  const { pic, reply_markup } = await getPic(coords.coord, data);
  await context.editMessageMedia(
    { type: `photo`, media: { source: pic } },
    { reply_markup }
  );
};

const updateWeatherLocation = async (context) => {
  const data = context.update.callback_query.data.slice(`location_`.length);
  const {
    from: { id },
    message_id,
    reply_to_message: { text },
  } = context.update.callback_query.message;
  if (data.endsWith(`_active`)) {
    context.answerCbQuery(`Active`);
    return;
  }
  const {
    latitude: lat,
    longitude: lon,
  } = context.update.callback_query.message.reply_to_message.location;
  await context.editMessageCaption(`Loading...`);
  const { pic, reply_markup } = await getPic({ lat, lon }, data, `location_`);
  await context.editMessageMedia(
    { type: `photo`, media: { source: pic } },
    { reply_markup }
  );
};

bot.start(async (context) => {
  const id = context.update.message.from.id;
  context.reply(`Send me the name of the place or location.`);
  const { rows } = await client.query(
    `SELECT exists(SELECT 1 FROM "users" WHERE user_id=${id})`
  );
  if (!rows[0].exists) {
    await client.query(
      `INSERT INTO
      "users"(user_id, location, date, notifications, stage)
      VALUES($1, '{}', 'none', FALSE, 'start');`,
      [id]
    );
  }
});

bot.command(`notifications`, (context) => notifications(context));

bot.on(`location`, (context) => {
  sendWeatherLocation(context);
});

bot.on(`message`, (context) => {
  sendWeatherMessage(context);
});

bot.action(messageButtonsList, (context) => {
  updateWeatherMessage(context);
});

bot.action(notificationButtonsList, (context) => {
  updateWeatherNotification(context);
});

bot.action(locationButtonsList, (context) => {
  updateWeatherLocation(context);
});

bot.action(`edit_notification`, (context) => {
  turnNotification(context);
});

bot.action(`edit_location_date`, (context) => {
  editLocationAndDate(context);
});

(async () => {
  bot.telegram.sendMessage(
    adminId,
    `@${(await bot.telegram.getMe()).username} is running…`
  );
})();

bot.startPolling();
