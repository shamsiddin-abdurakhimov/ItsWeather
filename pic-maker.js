const fs = require(`fs`);
const { DOMParser, XMLSerializer } = require(`xmldom`);
const sizeOf = require(`image-size`);
const sharp = require(`sharp`);
const { render } = require('resvg-node');
const path = require('path');
const { serializeToString: serialize } = new XMLSerializer();
const parser = new DOMParser();

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

const weekDays = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const hoursClass = [0,6,12,18,24,30,36,42,48]

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
  ...get(node, className, `image`),
  ...get(node, className, `tspan`),
  ...get(node, className, `stop`),
  ...get(node, className, `text`),
];

function tempReplace(temp) {
  temp = `${Math.round(temp)}`
  let minus = ''
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

const fill = (node, hex) => {
  if (node.tagName === `stop`) {
    node.setAttribute(`stop-color`, hex);
  } else {
    node.setAttribute(`fill`, hex);
  }

  if (node.childNodes) {
    for (let child of Array.from(node.childNodes)) {
      if (child.setAttribute) {
        fill(child, hex);
      }
    }
  }
};

const picMake = async (weather, userPic, userName) => {
  console.time("picMake")
  const nameWeather = weather.weatherCoord.name
  weather = weather.weatherReply
  const pic = parser.parseFromString(fs.readFileSync(`./svg.svg`, `utf8`));



  for (const element of getElements(pic, `top`)) {
    fill(element, COLORS[weather.current.weather[0].icon].top);
  }


  for (const element of getElements(pic, `bottom`)) {
    fill(element, COLORS[weather.current.weather[0].icon].bottom);
  }


  for (const element of getElements(pic, `deg`)) {
    element.setAttribute(`stroke`, COLORS[weather.current.weather[0].icon].bottom);
  }


  for (const element of getElements(pic, `back`)) {
    fill(element, COLORS[weather.current.weather[0].icon].back);
  }


  for (const element of getElements(pic, `user`)) {
    element.textContent = userName;
  }


  for (const element of getElements(pic, `time`)) {
    let today = new Date()
    today.setSeconds(today.getUTCSeconds() + weather.timezone_offset)
    const hh = tempReplace(today.getUTCHours())
    const mm = tempReplace(today.getUTCMinutes())
    const day = weekDays[today.getUTCDay()]
    const data = today.getUTCDate()
    const month = months[today.getUTCMonth()]
    const year = `${today.getUTCFullYear()}`.slice(0, -2)
    element.textContent = `${hh}:${mm} - ${day}, ${data} ${month} '${year}`;
  }


  for (const element of getElements(pic, `temp`)) {
    element.textContent = tempReplace(weather.current.temp);
  }


  for (const element of getElements(pic, `name`)) {
    element.textContent = nameWeather
  }


  for (const element of getElements(pic, `main`)) {
    element.textContent = weather.current.weather[0].main
  }


  for (const element of getElements(pic, `min`)) {
    element.textContent = tempReplace(weather.daily[0].temp.min)
  }


  for (const element of getElements(pic, `max`)) {
    element.textContent = tempReplace(weather.daily[0].temp.max)
  }
  weather.hourly.unshift({temp: weather.current.temp})

  const hourlyTempSort = []
  const hourlyTemp = []
  for (const hour in weather.hourly) {
    hourlyTemp.push(weather.hourly[hour].temp)
    hourlyTempSort.push(weather.hourly[hour].temp)
  }
  hourlyTempSort.sort((a, b) => a - b);
  const hourlyTempMax = hourlyTempSort[hourlyTempSort.length - 1]
  const hourlyTempMin = hourlyTempSort[0]
  const hourlyTempDifference = hourlyTempMax - hourlyTempMin
  const yOne = 70 / hourlyTempDifference
  const hourlyTempLength = hourlyTemp.length - 1
  let graphPoints = ''
  const xOne = 480 / hourlyTempLength
  let yMax = 0
  for (var i = 0; i < hourlyTemp.length; i++) {
    const y = 540 - (yOne * (hourlyTemp[i] - hourlyTempMin))
    const x = 1110 + (xOne * i)
    if (y > yMax) {yMax = y}
    if (graphPoints != '') {graphPoints += ' '}
    graphPoints += `${x},${y}`
    /*if () {}
    newTemp.setAttribute(`x`, hex);
    newTemp.setAttribute(`y`, hex);*/
  }
  const graphPointsFill = `1110,${yMax + 2} ${graphPoints} 1590,${yMax + 2}`
  for (const element of getElements(pic, `graph`)) {
    element.setAttribute(`points`, graphPoints)
  }
  for (const element of getElements(pic, `graph_fill`)) {
    element.setAttribute(`points`, graphPointsFill)
  }
  console.log(hourlyTemp.length)
  for (const hourClass of hoursClass) {
    const temp = `temp${hourClass}`
    const time = `time${hourClass}`
    for (const element of getElements(pic, temp)) {
      if (hoursClass == 0) {
        element.textContent = tempReplace(weather.current.temp)
      } else {
        element.textContent = tempReplace(weather.hourly[hourClass].temp)
      }
    }
    /*for (const element of getElements(pic, time)) {
      if (hoursClass == 0) {
        element.textContent = 'now'
      } else {
        element.textContent = weather.hourly[hoursClass[hourClass]].temp
      }
      var date = new Date(2011, 0, 1, 0, 0, 0, 0);
      date.setSeconds(weather.hourly[hoursClass[hourClass]].dt)
      element.textContent = date.toLocaleString("en-US", {hour: 'numeric'})
    }*/
  }

  const picBack = fs.readFileSync(`./pic/${weather.current.weather[0].icon}.png`, `binary`);
  const backImageBuffer = Buffer.from(picBack, `binary`);
  const backPic = getElements(pic, "back_pic");
  await addPic(backPic, backImageBuffer)
  const userPicElement = getElements(pic, "user_pic");
  await addPic(userPicElement, userPic)
  console.timeEnd("picMake")
  console.log(__dirname) 
  const options = {
    dpi: 100,
    textRendering: 2,
    shapeRendering: 2,
    imageRendering: 1,
    font: {
      fontFiles: [
        `${path.join(__dirname, '.fonts/JosefinSans-Bold.ttf')}`,
        `${path.join(__dirname, '.fonts/JosefinSans-BoldItalic.ttf')}`,
        `${path.join(__dirname, '.fonts/JosefinSans-ExtraLigth.ttf')}`,
        `${path.join(__dirname, '.fonts/JosefinSans-ExtraLigthItalic.ttf')}`,
        `${path.join(__dirname, '.fonts/JosefinSans-Italic.ttf')}`,
        `${path.join(__dirname, '.fonts/JosefinSans-Ligth.ttf')}`,
        `${path.join(__dirname, '.fonts/JosefinSans-LigthItalic.ttf')}`,
        `${path.join(__dirname, '.fonts/JosefinSans-Medium.ttf')}`,
        `${path.join(__dirname, '.fonts/JosefinSans-MediumItalic.ttf')}`,
        `${path.join(__dirname, '.fonts/JosefinSans-Regular.ttf')}`,
        `${path.join(__dirname, '.fonts/JosefinSans-SemiBold.ttf')}`,
        `${path.join(__dirname, '.fonts/JosefinSans-SemiBoldItalic.ttf')}`,
        `${path.join(__dirname, '.fonts/JosefinSans-Thin.ttf')}`,
        `${path.join(__dirname, '.fonts/JosefinSans-ThinItalic.ttf')}`
      ]
    }
  };
  return render(serialize(pic), options);
};

module.exports = {
  picMake,
};
