const fs = require(`fs`);
const { DOMParser, XMLSerializer } = require(`xmldom`);
const { serializeToString: serialize } = new XMLSerializer();
const parser = new DOMParser();
const puppeteer = require(`puppeteer`);
const { icons } = require(`./icons`);

const apiId = process.env.apiId;
const { WeatherApi } = require(`./weatherApi`);
const weatherApi = new WeatherApi(apiId);

const browser = puppeteer.launch();
const blank = fs.readFileSync(`./weather.svg`, `utf8`);

const backgrounds = {};
for (const icon in icons) {
  backgrounds[icon] = fs.readFileSync(`./images/${icon}.png`, `base64`);
}

const weekDays = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const get = (node, className, tag) =>
  Array.from(node.getElementsByTagName(tag)).filter(
    (element) =>
      element.getAttribute && element.getAttribute(`class`) === className
  );
const getElements = (node, className) => [
  ...get(node, className, `rect`),
  ...get(node, className, `circle`),
  ...get(node, className, `path`),
  ...get(node, className, `g`),
  ...get(node, className, `polygon`),
  ...get(node, className, `polyline`),
  ...get(node, className, `tspan`),
  ...get(node, className, `stop`),
  ...get(node, className, `text`),
  ...get(node, className, `image`),
];

const toTemp = (temp) => Math.round(temp);

const picMake = async (weather) => {
  const pic = parser.parseFromString(blank);
  for (const element of getElements(pic, `temp`)) {
    element.textContent = `${toTemp(weather.current.temp)}°`;
  }

  for (const element of getElements(pic, `name`)) {
    element.textContent = `${
      weather.current.weather[0].main
    }, feels like ${toTemp(weather.current.feels_like)}°`;
  }

  for (const element of getElements(pic, `place`)) {
    element.textContent = JSON.parse(
      await weatherApi.weather(
        {
          lat: weather.lat,
          lon: weather.lon,
        },
        `metric`,
        `en`
      )
    ).name;
  }

  for (const element of getElements(pic, `icon`)) {
    element.appendChild(
      parser.parseFromString(icons[weather.current.weather[0].icon])
    );
  }

  const hoursClass = [`0`, `7`, `15`, `23`, `31`, `39`, `47`];
  const graphHeight = 95;
  const graphWidth = 324;
  const graphBottom = 254;
  const graphLeft = 895;

  const hourlyTempSort = [];
  const hourlyTemp = [];
  for (const hour of weather.hourly) {
    hourlyTemp.push(hour.temp);
    hourlyTempSort.push(hour.temp);
  }
  hourlyTempSort.sort((a, b) => a - b);
  const hourlyTempMin = hourlyTempSort[0];
  const yOne =
    graphHeight / (hourlyTempSort[hourlyTempSort.length - 1] - hourlyTempMin);
  let graphPoints = "";
  const xOne = graphWidth / (hourlyTemp.length - 1);
  for (const i in hourlyTemp) {
    const y = graphBottom - yOne * (hourlyTemp[i] - hourlyTempMin);
    const x = graphLeft + xOne * i;
    if (graphPoints != "") {
      graphPoints += " ";
    }
    graphPoints += `${x},${y}`;
    if (hoursClass.includes(i)) {
      const temp = `graph_temp${i}`;
      const time = `graph_time${i}`;
      for (const element of getElements(pic, temp)) {
        element.textContent = `${toTemp(weather.hourly[i].temp)}°`;
        element.setAttribute(`y`, y - 15);
      }
      for (const element of getElements(pic, time)) {
        if (i == 0) {
          element.textContent = "now";
        } else {
          let date = new Date(
            weather.hourly[i].dt * 1000 + weather.timezone_offset * 1000
          );
          element.textContent = date
            .toLocaleString("en-US", { hour: "numeric" })
            .replace(" ", "")
            .toLowerCase();
        }
      }
    }
  }
  for (const element of getElements(pic, `graph`)) {
    element.setAttribute(`points`, graphPoints);
  }
  for (const element of getElements(pic, `graph_fill`)) {
    element.setAttribute(
      `points`,
      `${graphLeft},${graphBottom + 2} ${graphPoints} ${
        graphLeft + graphWidth
      },${graphBottom + 2}`
    );
  }

  for (let num = 1; num < 8; num++) {
    for (const element of getElements(pic, `wd${num}`)) {
      const time = new Date(weather.daily[num].dt * 1000);
      element.textContent = weekDays[time.getUTCDay()];
    }
    for (const element of getElements(pic, `wt-day${num}`)) {
      element.textContent = `${toTemp(weather.daily[num].temp.day)}°/`;
      element.appendChild(
        parser.parseFromString(
          `<tspan class="wt-night${num}" fill-opacity=".7"></tspan>`
        )
      );
    }
    for (const element of getElements(pic, `wt-night${num}`)) {
      element.textContent = `${toTemp(weather.daily[num].temp.night)}°`;
    }
    for (const element of getElements(pic, `h${num}`)) {
      element.textContent = `${weather.daily[num].humidity}%`;
    }
    for (const element of getElements(pic, `wi${num}`)) {
      element.appendChild(
        parser.parseFromString(icons[weather.daily[num].weather[0].icon])
      );
    }
    for (const element of getElements(pic, `hum${num}`)) {
      const y = parseFloat(element.getAttribute(`y`));
      const height = 0.066 * weather.daily[num].humidity;
      element.setAttribute(`y`, y + 6.6 - height);
      element.setAttribute(`height`, height);
    }
  }

  const elements = getElements(pic, `back`);
  elements.map(async (element) => {
    element.setAttribute(
      `xlink:href`,
      `data:image/png;base64,${backgrounds[weather.current.weather[0].icon]}`
    );
  });

  const svg = pic.getElementsByTagName(`svg`)[0];
  const widthSvg = parseInt(svg.getAttribute(`width`));
  const heightSvg = parseInt(svg.getAttribute(`height`));

  const page = await browser.then((browser) => browser.newPage());
  await page.setViewport({
    width: widthSvg,
    height: heightSvg,
    deviceScaleFactor: 0,
  });
  await page.goto(`data:text/html,`);
  await page.setContent(`
    <style>
        * {
            margin: 0;
        }
    </style>
    ${serialize(pic)}
  `);
  const screen = await page.screenshot();
  await page.close();
  return screen;
};

module.exports = {
  picMake,
};
