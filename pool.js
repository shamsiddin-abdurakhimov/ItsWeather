const picMaker = require(`./pic-maker`);

const MAX_RENDERERS_AT_ONCE = 10;
let renderersNumber = 0;

const queue = [];

const render = async ({ weather, resolve, reject }) => {
  renderersNumber++;

  try {
    let preview = await picMaker.picMake(weather);

    resolve(preview);
  } catch (error) {
    reject(error);
  }

  renderersNumber--;

  if (queue.length > 0) {
    render(queue.shift());
  }
};

module.exports = (previewParameters) =>
  new Promise((resolve, reject) => {
    let renderParameters = {
      ...previewParameters,
      resolve,
      reject,
    };

    if (renderersNumber < MAX_RENDERERS_AT_ONCE) {
      render(renderParameters);
    } else {
      queue.push(renderParameters);
    }
  });
