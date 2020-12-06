const fs = require(`fs`);
const { DOMParser, XMLSerializer } = require(`xmldom`);
const sharp = require(`sharp`);
const { serializeToString: serialize } = new XMLSerializer();

const RENDER_CONFIG = {
  density: 150,
};

const parser = new DOMParser();

const sun = Symbol();

const templates = {
  [sun]: fs.readFileSync(`./01d.svg`, `utf8`),
};
const get = (node, className, tag) =>
  Array.from(node.getElementsByTagName(tag)).filter(
    (element) =>
      element.getAttribute && element.getAttribute(`class`) === className
  );

const getElementsByClassName = (node, className) => [
  ...get(node, className, `rect`),
  ...get(node, className, `circle`),
  ...get(node, className, `path`),
  ...get(node, className, `g`),
  ...get(node, className, `polygon`),
  ...get(node, className, `image`),
  ...get(node, className, `tspan`),
  ...get(node, className, `stop`),
  ...get(node, className, `text`),
];
function tempReplace(temp) {
  temp = `${Math.round(temp)}`
  var minus = ''
  if (temp.split(``)[0] == '-') {
    minus = '-'
    temp = temp.replace(`-`, ``)
  }
  if (temp.length < 2) {temp = 0 + temp}
  temp = minus + temp
  return temp
}
const makePrev = async (weather, template) => {
  console.log('start makePrev')
  weather = JSON.parse(weather)
  const preview = parser.parseFromString(templates[template]);
  for (const element of getElementsByClassName(preview, `temp`)) {
    element.textContent = tempReplace(weather.main.temp);
  }
  for (const element of getElementsByClassName(preview, `name`)) {
    console.log(weather.name)
    element.textContent = weather.name;
  }
  for (const element of getElementsByClassName(preview, `time`)) {
    var today = new Date()
    const week = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    today.setSeconds(today.getUTCSeconds() + weather.timezone)
    const hh = tempReplace(today.getUTCHours())
    const mm = tempReplace(today.getUTCMinutes())
    const day = week[today.getUTCDay()]
    const data = today.getUTCDate()
    const month = months[today.getUTCMonth()]
    const year = `${today.getUTCFullYear()}`.slice(0, -2)
    element.textContent = `${hh}:${mm} - ${day}, ${data} ${month} '${year}`;
  }
  const templateBuffer = Buffer.from(serialize(preview), `binary`);
  console.log('finish makePrev')
  return sharp(templateBuffer, RENDER_CONFIG).png().toBuffer();
};

module.exports = {
  sun,
  makePrev,
};
