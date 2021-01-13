const fs = require(`fs`);
const { DOMParser, XMLSerializer } = require(`xmldom`);
const { serializeToString: serialize } = new XMLSerializer();
const parser = new DOMParser();
const puppeteer = require(`puppeteer`);

const browser = puppeteer.launch({ args: [`--no-sandbox`] });
const pic = parser.parseFromString(fs.readFileSync(`./blank.svg`, `utf8`));

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

function tempReplace(temp) {
  temp = `${Math.round(temp)}`;
  let minus = ``;
  if (temp.split(``)[0] == `-`) {
    minus = `-`;
    temp = temp.replace(`-`, ``);
  }
  if (temp.length < 2) {
    temp = 0 + temp;
  }
  temp = minus + temp;
  return temp;
}

const fill = (node, hex) => {
  if (node.tagName === `stop`) {
    node.setAttribute(`stop-color`, hex);
  } else {
    node.setAttribute(`fill`, hex);
  }
};

const picMake = async (weather) => {
  console.time(`picMake`);

  for (const element of getElements(pic, `temp`)) {
    element.textContent = `${tempReplace(weather.current.temp)}__deg`;
  }

  for (const element of getElements(pic, `weather`)) {
    element.textContent = weather.current.weather[0].main;
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
  const numbers = ["one", "two", "three"];
  for (let num in numbers) {
    const number = numbers[num];
    for (const element of getElements(pic, `week_days_${number}`)) {
      let today = new Date();
      console.log(parseInt(num) + 2, weather.daily[parseInt(num) + 2]);
      today.setSeconds(
        today.getUTCSeconds() + weather.daily[parseInt(num) + 2].dt
      );
      const day = weekDays[today.getUTCDay()];
      element.textContent = `${day}`;
    }
  }
  /*

  for (const element of getElements(pic, `deg`)) {
    element.setAttribute(
      `stroke`,
      COLORS[weather.current.weather[0].icon].bottom
    );
  }
  */

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
    ${serialize(pic).replace(/__deg/g, `°`)}
  `);
  const screen = await page.screenshot();
  await page.close();
  return screen;
};

module.exports = {
  picMake,
};
