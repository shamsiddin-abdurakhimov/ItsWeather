require(`dotenv`).config();
const token = process.env.TOKEN;
const apiId = process.env.apiId;
const adminId = process.env.adminId;

const { WeatherApi } = require(`./weatherApi`);
const Telegraf = require(`telegraf`);
const render = require(`./pool`);

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
  let name, type;
  if (context.update.callback_query) {
    if (context.update.callback_query.data.endsWith(`_active`)) {
      return;
    }
    await bot.telegram.editMessageCaption(
      context.update.callback_query.message.chat.id,
      context.update.callback_query.message.message_id,
      context.update.callback_query.message.message_id,
      `Loading...`
    );
    name = context.update.callback_query.message.reply_to_message.text;
    type = context.update.callback_query.data;
  } else {
    bot.telegram.sendChatAction(context.message.chat.id, `upload_photo`);
    name = context.update.message.text;
    type = `default`;
  }
  if (!/^\w+$/.test(name)) {
    await context.reply(`Enter in Latin.`);
    return;
  }
  const cord = await weatherApi.weather(name, `metric`, `en`);
  if (cord.startsWith(`404`)) {
    await context.reply(`There is no such place.`);
    return;
  }
  const weather = await JSON.parse(
    await weatherApi.onecall(JSON.parse(cord).coord, `metric`, `en`)
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
};

bot.start((context) => {
  context.reply(`Send me the name of the place.`);
});

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
