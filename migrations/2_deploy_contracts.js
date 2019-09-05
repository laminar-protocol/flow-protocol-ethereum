const TestToken = artifacts.require("TestToken");
const FlowProtocol = artifacts.require("FlowProtocol");
const LiquidityPool = artifacts.require("LiquidityPool");
const SimplePriceOracle = artifacts.require("SimplePriceOracle");
const InterestBearingToken = artifacts.require("InterestBearingToken");
const InterestBearingTokenOracle = artifacts.require("InterestBearingTokenOracle");

module.exports = async deployer => {
  const accounts = await web3.eth.getAccounts()
  const mainAccount = accounts[0];

  await deployer.deploy(TestToken);
  const baseToken = await TestToken.deployed();

  await deployer.deploy(InterestBearingToken, baseToken.address);
  const iBaseToken = await InterestBearingToken.deployed();

  await deployer.deploy(SimplePriceOracle, [mainAccount]);
  const oracle = await SimplePriceOracle.deployed();

  await deployer.deploy(InterestBearingTokenOracle, oracle.address, iBaseToken.address);
  const wrappedOracle = await InterestBearingTokenOracle.deployed();

  await deployer.deploy(FlowProtocol, wrappedOracle.address, iBaseToken.address);
  const protocol = await FlowProtocol.deployed();

  await protocol.createFlowToken("EU Dollar", "EUR");
  const fEURAddress = await protocol.tokens("EUR");

  await deployer.deploy(LiquidityPool, protocol.address, iBaseToken.address, web3.utils.toWei('0.01'), [fEURAddress]);
  const pool = await LiquidityPool.deployed();

  await baseToken.approve(iBaseToken, web3.utils.toWei('1000000'));
  await iBaseToken.mint(web3.utils.toWei('1000'));
  await baseToken.transfer(iBaseToken.address, web3.utils.toWei('10'));
  await iBaseToken.transfer(pool.address, web3.utils.toWei('1000'));

  await oracle.setPrice(fEURAddress, web3.utils.toWei('1.2'));
};
