const token = process.env.TOKEN;
const apiId = process.env.apiId;
const adminId = process.env.adminId;

const {WeatherApi} = require(`./weatherApi`); 
const Telegraf = require(`telegraf`);
const render = require(`./pool`);
const request = require(`request-promise`);

const bot = new Telegraf(token);
const weather = new WeatherApi(apiId);

bot.context.downloadFile = async function (userId) {
	const photos = await bot.telegram.getUserProfilePhotos(userId)
	console.log(photos)
	const fileId = await photos.photos[0][1].file_id
	const file = await bot.telegram.getFile(fileId);
	const fileContent = await request({
		encoding: null,
		uri: `http://api.telegram.org/file/bot${token}/${file.file_path}`,
	});
	return fileContent;
};
const getWeather = async (name) => {
	let weatherCoord = JSON.parse(await weather.weather(name, 'metric', 'en'))
	const weatherReply = JSON.parse(await weather.onecall(weatherCoord.coord, 'metric', 'en'))
	return {weatherReply, weatherCoord}
}
async function sendReply(context) {
	console.time("sendWeather")
	console.time("photos")
	const userPic = await bot.context.downloadFile(context.message.from.id)
	console.timeEnd("photos")
	console.time("weather")
	const weather = await getWeather(context.update.message.text)
	console.log(userPic, weather)
	console.timeEnd("weather")
	console.time("render")
	const preview = await render({weather, userPic, userName: context.message.from.first_name});
	console.timeEnd("render")
	console.time("send")
	await context.replyWithPhoto({source: preview});
	console.timeEnd("send")
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