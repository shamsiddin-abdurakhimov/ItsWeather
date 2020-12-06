const token = process.env.TOKEN;
const apiId = process.env.apiId;

const {WeatherApi} = require(`./weatherApi`); 
const Telegraf = require(`telegraf`);
const render = require(`./render-pool`);
const {sun} = require(`./pic-maker`);

const bot = new Telegraf(token);
const weather = new WeatherApi(apiId);

async function sendReply(context) {
	console.log(1)
	const weatherReply = await weather.weather(context.update.message.text, 'metric', 'en')
	console.log(2)
	const preview = await render({weather: weatherReply, template: sun});
	console.log(3)
	await context.replyWithPhoto(
		{ source: preview },
        {
          reply_to_message_id: context.message.message_id,
        }
       );
	console.log(4)
	context.reply(weatherReply)
	console.log(5)
}

bot.start((context) => {
	console.log(context.update.message.text)
  //context.reply(weather.weather('Tashkent', 'metric', 'ru'));
});
bot.on(`message`, (context) => {sendReply(context)});
/*
console.log(weather.weather('Tashkent', 'metric', 'ru'))
console.log(weather.forecast('Tashkent', 'metric', 'ru', 1))
console.log(weather.onecall({lon:69.22,lat:41.26}, 'metric', 'ru', 'minutely'))
*/

bot.startPolling();