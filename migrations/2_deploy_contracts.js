const TestToken = artifacts.require("TestToken");
const FlowProtocol = artifacts.require("FlowProtocol");
const LiquidityPool = artifacts.require("LiquidityPool");
const SimplePriceOracle = artifacts.require("SimplePriceOracle");

module.exports = async deployer => {
  const accounts = await web3.eth.getAccounts()
  const mainAccount = accounts[0];

  await deployer.deploy(TestToken);
  const baseToken = await TestToken.deployed();

  await deployer.deploy(SimplePriceOracle, [mainAccount]);
  const oracle = await SimplePriceOracle.deployed();

  await deployer.deploy(FlowProtocol, oracle.address, baseToken.address);
  const protocol = await FlowProtocol.deployed();

  await protocol.createFlowToken("EU Dollar", "EUR");
  const fEURAddress = await protocol.tokens("EUR");

  await deployer.deploy(LiquidityPool, protocol.address, baseToken.address, web3.utils.toWei('0.01'), [fEURAddress]);
  const pool = await LiquidityPool.deployed();

  await baseToken.transfer(pool.address, web3.utils.toWei('1000'));

  await oracle.setPrice(fEURAddress, web3.utils.toWei('1.2'));
};
