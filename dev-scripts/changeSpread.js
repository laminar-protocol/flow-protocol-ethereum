const fs = require('fs'); /* eslint-disable-line */
const path = require('path'); /* eslint-disable-line */

const readFile = filePath => {
  const finalPath = path.join(...filePath);

  const obj = fs.readFileSync(finalPath);
  return JSON.parse(obj);
};

module.exports = callback => {
  async function changeData() {
    const network = process.env.NETWORK;
    const spread = '28152000000000';
    const SyntheticLiquidityPool = artifacts.require('SyntheticLiquidityPool');

    const {
      syntheticPool,
      syntheticPool2,
      baseToken,
      fEUR,
      fJPY,
      fXAU,
      fAAPL,
    } = readFile(['artifacts', network, 'deployment.json']);

    const SyntheticLiquidityPoolContract1 = await SyntheticLiquidityPool.at(
      syntheticPool,
    );
    const SyntheticLiquidityPoolContract2 = await SyntheticLiquidityPool.at(
      syntheticPool2,
    );

    for (const token of [baseToken, fEUR, fJPY, fXAU, fAAPL]) {
      await SyntheticLiquidityPoolContract1.setSpreadForToken(token, spread);
      await SyntheticLiquidityPoolContract2.setSpreadForToken(token, spread);
    }
  }

  changeData()
    .then(() => {
      console.log('Successfully changed!');
      callback();
    })
    .catch(error => console.log({ error }));
};
