const fs = require(`fs`);
const { DOMParser, XMLSerializer } = require(`xmldom`);
const sizeOf = require(`image-size`);
const sharp = require(`sharp`);
const { serializeToString: serialize } = new XMLSerializer();

const RENDER_CONFIG = {
  density: 150,
};

const COLORS = {
  '01d':{'back':'#C4CFD5', 'top':'#0E1213', 'bottom':'#0E1213'},
  '01n':{'back':'#181622', 'top':'#FFFFFF', 'bottom':'#FFFFFF'},
  '02d':{'back':'#CDC3DB', 'top':'#575F7A', 'bottom':'#575F7A'},
  '02n':{'back':'#CDC3DB', 'top':'#575F7A', 'bottom':'#575F7A'},
  '03d':{'back':'#CDC3DB', 'top':'#575F7A', 'bottom':'#575F7A'},
  '03n':{'back':'#CDC3DB', 'top':'#575F7A', 'bottom':'#575F7A'},
  '04d':{'back':'#A3B1BC', 'top':'#0E1213', 'bottom':'#0E1213'},
  '04n':{'back':'#A3B1BC', 'top':'#0E1213', 'bottom':'#0E1213'},
  '09d':{'back':'#566766', 'top':'#FFFFFF', 'bottom':'#FFFFFF'},
  '09n':{'back':'#566766', 'top':'#FFFFFF', 'bottom':'#FFFFFF'},
  '10d':{'back':'#566766', 'top':'#FFFFFF', 'bottom':'#FFFFFF'},
  '10n':{'back':'#566766', 'top':'#FFFFFF', 'bottom':'#FFFFFF'},
  '11d':{'back':'#1A2E3D', 'top':'#FFFFFF', 'bottom':'#FFFFFF'},
  '11n':{'back':'#1A2E3D', 'top':'#FFFFFF', 'bottom':'#FFFFFF'},
  '13d':{'back':'#2F2F26', 'top':'#FFFFFF', 'bottom':'#FFFFFF'},
  '13n':{'back':'#2F2F26', 'top':'#FFFFFF', 'bottom':'#FFFFFF'},
  '50d':{'back':'#263133', 'top':'#263133', 'bottom':'#FFFFFF'},
  '50n':{'back':'#263133', 'top':'#263133', 'bottom':'#FFFFFF'}
}

const parser = new DOMParser();

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
const addPic = async (elements, imageBuffer) => {
  await Promise.all(
    elements.map(async (element) => {
      let chatWidth = Number(element.getAttribute("width"));
      let chatHeight = Number(element.getAttribute("height"));
      let ratio = chatHeight / chatWidth;

      const { width, height } = sizeOf(imageBuffer);
      const imageRatio = height / width;

      let finalHeight;
      let finalWidth;

      if (ratio > imageRatio) {
        finalHeight = chatHeight;
        finalWidth = Math.round(chatHeight / imageRatio);
      } else {
        finalWidth = chatWidth;
        finalHeight = Math.round(chatWidth * imageRatio);
      }

      const resizedImage = await sharp(imageBuffer)
        .resize(finalWidth, finalHeight)
        .png()
        .toBuffer();

      const croppedImage = await sharp(resizedImage)
        .resize(chatWidth, chatHeight)
        .png()
        .toBuffer();

      element.setAttribute(
        `xlink:href`,
        `data:image/png;base64,${croppedImage.toString(`base64`)}`
      );
    })
  );
}
const fill = (node, color) => {
  if (node.tagName === `stop`) {
    node.setAttribute(`stop-color`, color);
  } else {
    node.setAttribute(`fill`, color);
  }

  if (node.childNodes) {
    for (let child of Array.from(node.childNodes)) {
      if (child.setAttribute) {
        fill(child, color);
      }
    }
  }
};
const makePrev = async (weather, userPic, userName) => {
  console.log('start makePrev')
  weather = JSON.parse(weather)
  const preview = parser.parseFromString(fs.readFileSync(`./svg.svg`, `utf8`));



  for (const element of getElementsByClassName(preview, `top`)) {
    fill(element, COLORS[weather.weather[0].icon].top);
  }


  for (const element of getElementsByClassName(preview, `bottom`)) {
    fill(element, COLORS[weather.weather[0].icon].bottom);
  }


  for (const element of getElementsByClassName(preview, `deg`)) {
    element.setAttribute(`stroke`, COLORS[weather.weather[0].icon].bottom);
  }


  for (const element of getElementsByClassName(preview, `back`)) {
    fill(element, COLORS[weather.weather[0].icon].back);
  }


  for (const element of getElementsByClassName(preview, `user`)) {
    element.textContent = userName;
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


  for (const element of getElementsByClassName(preview, `temp`)) {
    element.textContent = tempReplace(weather.main.temp);
  }


  for (const element of getElementsByClassName(preview, `name`)) {
    element.textContent = weather.name
  }


  for (const element of getElementsByClassName(preview, `main`)) {
    element.textContent = weather.weather[0].main
  }

  const picBack = fs.readFileSync(`./pic/${weather.weather[0].icon}.png`, `binary`);
  const backImageBuffer = Buffer.from(picBack, `binary`);
  const backPic = getElementsByClassName(preview, "back_pic");
  await addPic(backPic, backImageBuffer)
  const userPicElement = getElementsByClassName(preview, "user_pic");
  await addPic(userPicElement, userPic)

  const templateBuffer = Buffer.from(serialize(preview), `binary`);
  console.log('finish makePrev')
  return sharp(templateBuffer, RENDER_CONFIG).png().toBuffer();
};

module.exports = {
  makePrev,
};
