const fs = require(`fs`);
const { DOMParser, XMLSerializer } = require(`xmldom`);
const { colors } = require("./colors.js");
const { serializeToString: serialize } = new XMLSerializer();
const parser = new DOMParser();
const puppeteer = require(`puppeteer`);

const browser = puppeteer.launch({ args: [`--no-sandbox`] });
const blank = fs.readFileSync(`./blank.svg`, `utf8`);

const weekDays = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const numbers = ["one", "two", "three"];

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
];

const toTemp = (temp) => Math.round(temp);

const fill = (node, hex) => {
  if (node.tagName === `stop`) {
    node.setAttribute(`stop-color`, hex);
  } else {
    node.setAttribute(`fill`, hex);
  }
};

const picMake = async (weather, type) => {
  const pic = parser.parseFromString(blank);
  for (const element of getElements(pic, `temp`)) {
    element.textContent = `${toTemp(weather.current.temp)}°`;
  }

  for (const element of getElements(pic, `weather`)) {
    element.textContent = weather.current.weather[0].main;
  }

  let now = `day`;
  const toTime = (time) =>
    new Date(time * 1000 + weather.timezone_offset * 1000).getUTCHours();
  const sunriseTime = toTime(weather.current.sunrise);
  const sunsetTime = toTime(weather.current.sunset);
  const nowTime = toTime(weather.current.dt);
  if (nowTime > sunsetTime - 1 || nowTime < sunriseTime - 1) {
    now = `sunset`;
  } else if (nowTime < sunriseTime + 1 && nowTime > sunriseTime - 1) {
    now = `sunrise`;
  }

  for (const elementClass in colors[now]) {
    for (const element of getElements(pic, `${elementClass}`)) {
      fill(element, colors[now][elementClass]);
    }
  }
  if (type == `graph`) {
    const hoursClass = [
      `0`,
      `4`,
      `9`,
      `14`,
      `19`,
      `24`,
      `29`,
      `34`,
      `39`,
      `44`,
    ];
    const graphHeight = 200;
    const graphWidth = 920;
    const graphBottom = 1400;
    const graphLeft = 40;

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
          element.setAttribute(`x`, x + 10);
          element.setAttribute(`y`, y - 35);
        }
        for (const element of getElements(pic, time)) {
          element.setAttribute(`x`, x + 10);
          element.setAttribute(`y`, graphBottom + 30);
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
  } else if (type == `week`) {
  } else {
    let day = 1;
    for (const number of numbers) {
      for (const element of getElements(pic, `week_days_${number}`)) {
        const time = new Date(weather.daily[day].dt * 1000);
        element.textContent = weekDays[time.getUTCDay()];
      }
      for (const element of getElements(pic, `week_temp_${number}`)) {
        element.textContent = `${toTemp(weather.daily[day].temp.day)}°`;
      }
      for (const element of getElements(pic, `week_weather_${number}`)) {
        element.textContent = weather.daily[day].weather[0].main;
      }
      day += 1;
    }
    for (const element of getElements(pic, `hint`)) {
      element.setAttribute(`stroke`, `#FFFFFF`);
    }
  }

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
