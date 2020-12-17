const token = process.env.TOKEN;
const apiId = process.env.apiId;
const adminId = process.env.adminId;

const {WeatherApi} = require(`./weatherApi`); 
const Telegraf = require(`telegraf`);
const render = require(`./pool`);
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
	console.time("sendWeather")
	const photos = await bot.telegram.getUserProfilePhotos(context.message.from.id)
	const photo = await bot.context.downloadFile(photos.photos[0][1].file_id)
	const weatherCoord = await weather.weather(context.update.message.text, 'metric', 'en')
	const weatherReply = await weather.onecall(JSON.parse(weatherCoord).coord, 'metric', 'en')
	const preview = await render({weather: {weatherReply, weatherCoord}, userPic: photo, userName: context.message.from.first_name});
	await context.replyWithPhoto({source: preview});
	console.timeEnd("sendWeather")
}

bot.start((context) => {
	console.log(context.update.message.text)
});
bot.on(`message`, (context) => {sendReply(context)});
const start = async function () {
	bot.telegram.sendMessage(adminId, `@${(await bot.telegram.getMe()).username} is running…`);
};
start()
/*
console.log(weather.weather('Tashkent', 'metric', 'ru'))
console.log(weather.forecast('Tashkent', 'metric', 'ru', 1))
console.log(weather.onecall({lon:69.22,lat:41.26}, 'metric', 'ru', 'minutely'))
*/

bot.startPolling();