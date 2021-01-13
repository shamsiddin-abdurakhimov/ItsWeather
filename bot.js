const token = process.env.TOKEN;
const apiId = process.env.apiId;
const adminId = process.env.adminId;

const { WeatherApi } = require(`./weatherApi`);
const Telegraf = require(`telegraf`);
const render = require(`./pool`);

const bot = new Telegraf(token);
const weatherApi = new WeatherApi(apiId);

async function sendReply(context) {
  console.time("sendWeather");
  if (!/^\w+$/.test(context.update.message.text)) {
    await context.reply("Enter in Latin.");
    return;
  }
  const cord = await weatherApi.weather(
    context.update.message.text,
    "metric",
    "en"
  );
  if (cord.startsWith("404")) {
    await context.reply("There is no such place.");
    return;
  }
  bot.telegram.sendChatAction(context.message.chat.id, `upload_photo`);
  const weather = await JSON.parse(
    await weatherApi.onecall(JSON.parse(cord).coord, "metric", "en")
  );
  context.reply(weather);
  const preview = await render({ weather });
  await context.replyWithPhoto({ source: preview });
  console.timeEnd("sendWeather");
}

bot.start((context) => {
  context.reply("Send me the name of the place.");
});

bot.on(`message`, (context) => {
  sendReply(context);
});

const start = async function () {
  bot.telegram.sendMessage(
    adminId,
    `@${(await bot.telegram.getMe()).username} is running…`
  );
};
start();

bot.startPolling();
