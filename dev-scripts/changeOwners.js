const fs = require('fs'); /* eslint-disable-line */
const path = require('path'); /* eslint-disable-line */

const readFile = filePath => {
  const finalPath = path.join(...filePath);

  const obj = fs.readFileSync(finalPath);
  return JSON.parse(obj);
};

module.exports = callback => {
  async function changeOwners() {
    const network = process.env.NETWORK;

    const MarginFlowProtocol = artifacts.require('MarginFlowProtocol');
    const FlowProtocol = artifacts.require('FlowProtocol');
    const LiquidityPool = artifacts.require('LiquidityPool');
    const MoneyMarket = artifacts.require('MoneyMarket');
    const Proxy = artifacts.require('Proxy');
    const SimplePriceOracle = artifacts.require('SimplePriceOracle');

    const currentOwner = (await web3.eth.getAccounts())[0];
    const newOwner = '0x16C27eC21eA6478ACA452f7683db9dB94E75f936'; // deployed MultiSig

    console.log(`Changing owner from ${currentOwner} to ${newOwner}...`);

    const deployedContracts = readFile([
      'artifacts',
      network,
      'deployment.json',
    ]);

    const changeOwnerContracts = [
      { address: deployedContracts.moneyMarket, contract: MoneyMarket },
      { address: deployedContracts.oracle, contract: SimplePriceOracle },
      { address: deployedContracts.protocol, contract: FlowProtocol },
      {
        address: deployedContracts.marginProtocol,
        contract: MarginFlowProtocol,
      },
      { address: deployedContracts.pool, contract: LiquidityPool },
      { address: deployedContracts.pool2, contract: LiquidityPool },
    ];

    for (const { address, contract } of changeOwnerContracts) {
      const Contract = await contract.at(address);
      await Contract.transferOwnership(newOwner);

      const ProxyContract = await Proxy.at(address);
      await ProxyContract.transferProxyOwnership(newOwner);
    }
  }

  changeOwners()
    .then(() => {
      console.log('Successfully finished!');
      callback();
    })
    .catch(error => console.log({ error }));
};
