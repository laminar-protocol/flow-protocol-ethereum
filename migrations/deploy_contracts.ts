const deployTokens = async (artifacts: Truffle.Artifacts, deployer: Truffle.Deployer) => {
  const TestToken = artifacts.require('TestToken');
  const TestCToken = artifacts.require('TestCToken');
  const IERC20 = artifacts.require('IERC20');

  await deployer.deploy(TestToken);
  const baseToken = await TestToken.deployed();

  await deployer.deploy(TestCToken, baseToken.address);
  const cToken = await TestCToken.deployed();

  return {
    baseToken: await IERC20.at(baseToken.address),
    cToken: await IERC20.at(cToken.address),
  };
};

const getTokens = (baseToken: string, cToken: string) => async (artifacts: Truffle.Artifacts) => {
  const IERC20 = artifacts.require('IERC20');

  return {
    baseToken: await IERC20.at(baseToken),
    cToken: await IERC20.at(cToken),
  };
};

const getTokensByNetwork = {
  development: deployTokens,
  kovan: getTokens('0xbf7a7169562078c96f0ec1a8afd6ae50f12e5a99', '0x0a1e4d0b5c71b955c0a5993023fc48ba6e380496'),
  'kovan-fork': getTokens('0xbf7a7169562078c96f0ec1a8afd6ae50f12e5a99', '0x0a1e4d0b5c71b955c0a5993023fc48ba6e380496'),
  ropsten: getTokens('0xb5e5d0f8c0cba267cd3d7035d6adc8eba7df7cdd', '0x2b536482a01e620ee111747f8334b395a42a555e'),
  'ropsten-fork': getTokens('0xb5e5d0f8c0cba267cd3d7035d6adc8eba7df7cdd', '0x2b536482a01e620ee111747f8334b395a42a555e'),
};

type Network = keyof typeof getTokensByNetwork;

module.exports = (artifacts: Truffle.Artifacts, web3: Web3) => {
  const MoneyMarket = artifacts.require('MoneyMarket');
  const FlowProtocol = artifacts.require('FlowProtocol');
  const FlowToken = artifacts.require('FlowToken');
  const LiquidityPool = artifacts.require('LiquidityPool');
  const SimplePriceOracle = artifacts.require('SimplePriceOracle');
  const IERC20 = artifacts.require('IERC20');
  const FlowMarginProtocol = artifacts.require('FlowMarginProtocol');
  const MarginTradingPair = artifacts.require('MarginTradingPair');

  return async (deployer: Truffle.Deployer, network: Network, accounts: string[]) => {
    console.log(`---- Deploying on network: ${network}`);

    const { cToken, baseToken } = await getTokensByNetwork[network](artifacts, deployer);
    await deployer.deploy(MoneyMarket, cToken.address, web3.utils.toWei('0.3'), 'iUSD', 'iUSD');
    const moneyMarket = await MoneyMarket.deployed();
    const iToken = await IERC20.at(await moneyMarket.iToken());

    // TODO: make price feeder configurable
    await deployer.deploy(SimplePriceOracle);
    const oracle = await SimplePriceOracle.deployed();

    await deployer.deploy(FlowProtocol, oracle.address, moneyMarket.address);
    const protocol = await FlowProtocol.deployed();

    await deployer.deploy(FlowToken, 'Flow Euro', 'fEUR', moneyMarket.address, protocol.address);
    const fEUR = await FlowToken.deployed();

    const fJPY = await FlowToken.new('Flow Japanese Yen', 'fJPY', moneyMarket.address, protocol.address);

    await protocol.addFlowToken(fEUR.address);
    await protocol.addFlowToken(fJPY.address);

    // set feeder and price
    const kovanDeployerAddr = '0xD98C58B8a7cc6FFC44105E4A93253798D1D3f472';
    const priceFeeder = network === 'development' ? accounts[0] : kovanDeployerAddr;
    await oracle.addPriceFeeder(priceFeeder);
    await oracle.feedPrice(fEUR.address, web3.utils.toWei('1.2'), { from: priceFeeder });
    await oracle.feedPrice(fJPY.address, web3.utils.toWei('0.0092'), { from: priceFeeder });

    // --- margin protocol

    await deployer.deploy(FlowMarginProtocol, oracle.address, moneyMarket.address);
    const marginProtocol = await FlowMarginProtocol.deployed();

    await deployer.deploy(
      MarginTradingPair,
      marginProtocol.address,
      moneyMarket.address,
      fEUR.address,
      10,
      web3.utils.toWei('0.8'),
      web3.utils.toWei('5')
    );

    const l10USDEUR = await MarginTradingPair.deployed();

    const s10USDEUR = await MarginTradingPair.new(
      marginProtocol.address,
      moneyMarket.address,
      fJPY.address,
      -10,
      web3.utils.toWei('0.8'),
      web3.utils.toWei('5')
    );

    const l20USDJPY = await MarginTradingPair.new(
      marginProtocol.address,
      moneyMarket.address,
      fJPY.address,
      -20,
      web3.utils.toWei('0.8'),
      web3.utils.toWei('5')
    );

    const s20USDJPY = await MarginTradingPair.new(
      marginProtocol.address,
      moneyMarket.address,
      fJPY.address,
      -20,
      web3.utils.toWei('0.8'),
      web3.utils.toWei('5')
    );

    await marginProtocol.addTradingPair(l10USDEUR.address);
    await marginProtocol.addTradingPair(s10USDEUR.address);
    await marginProtocol.addTradingPair(l20USDJPY.address);
    await marginProtocol.addTradingPair(s20USDJPY.address);

    // approve default account

    await baseToken.approve(moneyMarket.address, web3.utils.toWei('1000000'));
    await baseToken.approve(protocol.address, web3.utils.toWei('1000000'));
    await baseToken.approve(marginProtocol.address, web3.utils.toWei('1000000'));

    // liquidity pool

    await deployer.deploy(LiquidityPool, moneyMarket.address, web3.utils.toWei('0.003'));
    const pool = await LiquidityPool.deployed();

    await pool.approve(protocol.address, web3.utils.toWei('1000000'));
    await pool.approve(marginProtocol.address, web3.utils.toWei('1000000'));
    await pool.enableToken(fEUR.address);
    await pool.enableToken(fJPY.address);

    const pool2 = await LiquidityPool.new(moneyMarket.address, web3.utils.toWei('0.0031'));

    await pool2.approve(protocol.address, web3.utils.toWei('1000000'));
    await pool2.approve(marginProtocol.address, web3.utils.toWei('1000000'));
    await pool2.enableToken(fEUR.address);
    await pool2.enableToken(fJPY.address);

    // topup liquidity pool

    await moneyMarket.mintTo(pool.address, web3.utils.toWei('100'));
    await moneyMarket.mintTo(pool2.address, web3.utils.toWei('100'));

    console.log('Deploy success', {
      moneyMarket: moneyMarket.address,
      iToken: iToken.address,
      oracle: oracle.address,
      protocol: protocol.address,
      fEUR: fEUR.address,
      fJPY: fJPY.address,
      marginProtocol: marginProtocol.address,
      l10USDEUR: l10USDEUR.address,
      s10USDEUR: s10USDEUR.address,
      l20USDJPY: l20USDJPY.address,
      s20USDJPY: s20USDJPY.address,
      pool: pool.address,
      pool2: pool2.address,
    });
  };
};
