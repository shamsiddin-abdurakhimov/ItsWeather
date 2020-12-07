const token = '1490113950:AAHQ8WJ96qDHPZJZJ34M7Ke1ZOh8TxCWgjY';
const Telegraf = require(`telegraf`);
const AWA = 1443794846
const bot = new Telegraf(token);
class consoleBot {
	constructor(from) {
		this.from = from;
	}
	async log(logger) {
		try {
			bot.telegram.sendMessage(
				AWA,
				`Log from ${this.from}:\n\n\`\`\`\n${logger}\`\`\``,
				{ parse_mode: `Markdown` } // eslint-disable-line camelcase
				);
		} catch (error) {
			console.error(error);
		}
	}
	async err(error, loc) {
		try {
			if (error instanceof Error) {
				bot.telegram.sendMessage(
					AWA,
					`Error in the ${this.from}:\n\n\`\`\`\n${error.stack}\n\n\n${loc}\`\`\``,
					{ parse_mode: `Markdown` } // eslint-disable-line camelcase
					);
			} else {
				bot.telegram.sendMessage(
					AWA,
					`Error in the ${this.from}:\n\n\`\`\`\n${JSON.stringify(error)}\n\n\n${loc}\`\`\``,
					{ parse_mode: `Markdown` } // eslint-disable-line camelcase
					);
			}
		} catch (error) {
			console.error(error);
		}
	}
}
module.exports = {
  consoleBot
};