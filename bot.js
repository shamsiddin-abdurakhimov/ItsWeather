const token = process.env.TOKEN;
const apiId = process.env.apiId;

const {WeatherApi} = require(`./weatherApi`); 
const Telegraf = require(`telegraf`);
const render = require(`./render-pool`);
const request = require(`request-promise`);

const bot = new Telegraf(token);
const weather = new WeatherApi(apiId);

bot.context.downloadFile = async function (fileId) {
  const file = await bot.telegram.getFile(fileId);
  const fileContent = await request({
    encoding: null,
    uri: `http://api.telegram.org/file/bot${token}/${file.file_path}`,
  });

  return fileContent;
};
async function sendReply(context) {
	const photos = await bot.telegram.getUserProfilePhotos(context.message.from.id)
	const photo = await bot.context.downloadFile(photos.photos[0][1].file_id)
	const weatherReply = await weather.weather(context.update.message.text, 'metric', 'en')
	const preview = await render({weather: weatherReply, userPic: photo, userName: context.message.from.first_name});
	await context.replyWithPhoto(source: preview);
}

bot.start((context) => {
	console.log(context.update.message.text)
});
bot.on(`message`, (context) => {sendReply(context)});
bot.telegram.sendMessage(1443794846, `@ItsWeatherBot is running…`);
/*
console.log(weather.weather('Tashkent', 'metric', 'ru'))
console.log(weather.forecast('Tashkent', 'metric', 'ru', 1))
console.log(weather.onecall({lon:69.22,lat:41.26}, 'metric', 'ru', 'minutely'))
*/

bot.startPolling();