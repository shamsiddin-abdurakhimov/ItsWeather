const { XMLHttpRequest } = require("xmlhttprequest");
function getResult(url) {
  let xhr = new XMLHttpRequest();
  xhr.open("POST", url, false);
  xhr.send();
  if (xhr.status != 200) {
    return xhr.status + ": " + xhr.statusText;
  } else {
    return xhr.responseText;
  }
}
class WeatherApi {
  constructor(appid) {
    this.appid = appid;
  }
  weather(q, units, lang) {
    /*
			q		required	City name, state code and country code divided by comma, use ISO 3166 country codes.You can specify the parameter not only in English. In this case, the API response should be returned in the same language as the language of requested location name if the location is in our predefined list of more than 200,000 locations.
			appid	required	Your unique API key (you can always find it on your account page under the "API key" tab)
			units	optional	Units of measurement. standard, metric and imperial units are available. If you do not use the units parameter, standard units will be applied by default.
			lang	optional	You can use this parameter to get the output in your language.
		*/
    if (typeof q == `object`) {
      return getResult(
        `http://api.openweathermap.org/data/2.5/weather?lat=${q.lat}&lon=${q.lon}&appid=${this.appid}&lang=${lang}&units=${units}`
      );
    }
    return getResult(
      `http://api.openweathermap.org/data/2.5/weather?q=${q}&appid=${this.appid}&lang=${lang}&units=${units}`
    );
  }
  forecast(q, units, lang, cnt) {
    /*
			q		required	city name, state code and country code divided by comma, use ISO 3166 country codes. You can specify the parameter not only in English. In this case, the API response should be returned in the same language as the language of requested location name if the location is in our predefined list of more than 200,000 locations.
			appid	required	Your unique API key (you can always find it on your account page under the "API key" tab)
			cnt		optional	A number of timestamps in response.
			lang	optional	Language code.
		*/
    let url = `http://api.openweathermap.org/data/2.5/forecast?q=${q}&appid=${this.appid}&lang=${lang}&units=${units}`;
    if (cnt != undefined) {
      url += `&cnt=${cnt}`;
    }
    return getResult(url);
  }
  onecall(q, units, lang, exclude) {
    /*
			lat, lon	required	Geographical coordinates (latitude, longitude)
			appid		required	Your unique API key (you can always find it on your account page under the "API key" tab)
			exclude		optional	By using this parameter you can exclude some parts of the weather data from the API response. It should be a comma-delimited list (without spaces).
				Available values:
					current
					minutely
					hourly
					daily
					alerts
			units		optional	Units of measurement. standard, metric and imperial units are available. If you do not use the units parameter, standard units will be applied by default.
			lang		optional	You can use the lang parameter to get the output in your language.
		*/
    return getResult(
      `https://api.openweathermap.org/data/2.5/onecall?lat=${q.lat}&lon=${q.lon}&appid=${this.appid}&lang=${lang}&units=${units}&exclude=${exclude}`
    );
  }
}
module.exports = {
  WeatherApi,
};
