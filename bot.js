const token = process.env.TOKEN;
const apiId = process.env.apiId;

const { WeatherApi } = require(`./weatherApi`); 
const Telegraf = require(`telegraf`);
const render = require(`./render-pool`);
const { sun } = require(`./pic-maker`);
const { consoleBot } = require(`./logger`);

const bot = new Telegraf(token);
const weather = new WeatherApi(apiId);
const logger = new consoleBot('@ItsWeatherBot');

async function sendReply(context) {
	logger.log(1)
	const weatherReply = await weather.weather(context.update.message.text, 'metric', 'en')
	logger.log(2)
	const preview = await render({weather: weatherReply, template: sun});
	logger.log(3)
	await context.replyWithPhoto(
		{ source: preview },
        {
          reply_to_message_id: context.message.message_id,
        }
       );
	logger.log(4)
	context.reply(weatherReply)
	logger.log(5)
}

bot.start((context) => {
	logger.log(context.update.message.text)
  //context.reply(weather.weather('Tashkent', 'metric', 'ru'));
});
bot.on(`message`, (context) => {sendReply(context)});
process.on('exit', (code) => {
  logger.log(`About to exit with code: ${code}`);
});
process.on('uncaughtException', (err, origin) => {
	logger.err(err, origin)
});
process.on('unhandledRejection', (reason, promise) => {
  logger.err(reason, promise);
});
bot.catch((err, ctx) => {
	logger.err(err, ctx.updateType)
});
logger.log(`Bot is running…`);
/*
logger.log(weather.weather('Tashkent', 'metric', 'ru'))
logger.log(weather.forecast('Tashkent', 'metric', 'ru', 1))
logger.log(weather.onecall({lon:69.22,lat:41.26}, 'metric', 'ru', 'minutely'))
*/

bot.startPolling();