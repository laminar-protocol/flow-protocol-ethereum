const fs = require('fs'); /* eslint-disable-line */
const path = require('path'); /* eslint-disable-line */

const readFile = filePath => {
  const finalPath = path.join(...filePath);

  const obj = fs.readFileSync(finalPath);
  return JSON.parse(obj);
};

const contractMapping = {
  MoneyMarket: ['moneyMarket'],
  SimplePriceOracle: ['oracle'],
  FlowProtocol: ['protocol'],
  FlowMarginProtocol: ['marginProtocol'],
  FlowToken: ['fEUR', 'fJPY', 'fXAU', 'fAAPL'],
  MarginTradingPair: [
    'l10USDEUR',
    's10USDEUR',
    'l20USDJPY',
    's20USDJPY',
    'l20USDXAU',
    's20USDXAU',
    'l5USDAAPL',
    's5USDAAPL',
  ],
  LiquidityPool: ['pool', 'pool2'],
};

module.exports = callback => {
  async function upgradeContract() {
    const contractName = process.env.CONTRACT_NAME;
    const network = process.env.NETWORK;

    const Contract = artifacts.require(contractName);
    const Proxy = artifacts.require('Proxy');
    const contractsToUpdate = contractMapping[contractName];

    fs.writeFileSync(
      `artifacts/${network}/abi/${contractName}.json`,
      JSON.stringify(Contract.abi, null, 2),
    );

    console.log('Deploying new contract implementation...');
    const contractImpl = await Contract.new();

    const deployedContracts = readFile([
      'artifacts',
      network,
      'deployment.json',
    ]);

    for (const contractKey of contractsToUpdate) {
      const contractAddress = deployedContracts[contractKey];
      const contractInstance = await Proxy.at(contractAddress);

      console.log(`Upgrading ${contractKey} contract...`);
      await contractInstance.upgradeTo(contractImpl.address);
    }
  }

  upgradeContract()
    .then(() => {
      console.log('Successfully finished!');
      callback();
    })
    .catch(error => console.log({ error }));
};
