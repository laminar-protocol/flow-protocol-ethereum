/* eslint-disable no-param-reassign */

const main = async () => {
  const SimplePriceOracle = artifacts.require('SimplePriceOracle');
  const FlowToken = artifacts.require('FlowToken');

  const oracle = await SimplePriceOracle.deployed();
  const fEUR = await FlowToken.deployed();

  const cycles = [50, 30, 10];
  const step = 0.001;

  async function loop({ time, price, movements }) {
    const priceStr = price.toFixed(8);
    console.log(`${new Date().toISOString()}: Set Price - ${priceStr}`);
    await oracle.setPrice(fEUR.address, web3.utils.toWei(priceStr));

    let delta = Math.random() - 0.5;
    movements = movements.map(([val, count], idx) => {
      delta += val;
      count -= 1;
      if (count === 0) {
        count = Math.floor((Math.random() + 0.2) * cycles[idx] + 1);
        val = (Math.random() - 0.5) / Math.max(Math.floor(count / 5), 1);
      }
      return [val, count];
    });

    price *= (1 + delta * step);

    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(loop({ time, price, movements }));
      }, time);
    });
  }

  loop({
    time: 500,
    price: 1.2,
    movements: cycles.map(() => [Math.random(), 1]),
  });
};

module.exports = async (callback) => {
  try {
    await main();
  } catch (err) {
    console.error(err);
    callback(err);
  }
};
