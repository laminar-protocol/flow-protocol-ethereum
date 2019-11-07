import fs from 'fs';
import path from 'path';

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

const save = (obj: any, filePath: string[]) => {
  const finalPath = path.join(...filePath);
  fs.writeFileSync(finalPath, JSON.stringify(obj, null, 2));
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
  const PriceOracleInterface = artifacts.require('PriceOracleInterface');
  const ERC20Detailed = artifacts.require('ERC20Detailed');
  const LiquidityPoolInterface = artifacts.require('LiquidityPoolInterface');

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
    const fXAU = await FlowToken.new('Gold', 'fXAU', moneyMarket.address, protocol.address);
    const fAAPL = await FlowToken.new('Apple Inc.', 'fAAPL', moneyMarket.address, protocol.address);

    await protocol.addFlowToken(fEUR.address);
    await protocol.addFlowToken(fJPY.address);
    await protocol.addFlowToken(fXAU.address);
    await protocol.addFlowToken(fAAPL.address);

    // set feeder and price
    const kovanDeployerAddr = '0xD98C58B8a7cc6FFC44105E4A93253798D1D3f472';
    const priceFeeder = network === 'development' ? accounts[0] : kovanDeployerAddr;
    await oracle.addPriceFeeder(priceFeeder);
    await oracle.addPriceFeeder('0x481c00e62cC701925a676BC713E0E71C692aC46d'); // kovan oracle server
    await oracle.setExpireIn(172800); // 2 days for now
    await oracle.feedPrice(fEUR.address, web3.utils.toWei('1.2'), { from: priceFeeder });
    await oracle.feedPrice(fJPY.address, web3.utils.toWei('0.0092'), { from: priceFeeder });
    await oracle.feedPrice(fXAU.address, web3.utils.toWei('1490'), { from: priceFeeder });
    await oracle.feedPrice(fAAPL.address, web3.utils.toWei('257'), { from: priceFeeder });

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
      web3.utils.toWei('1')
    );

    const l10USDEUR = await MarginTradingPair.deployed();

    const s10USDEUR = await MarginTradingPair.new(
      marginProtocol.address,
      moneyMarket.address,
      fJPY.address,
      -10,
      web3.utils.toWei('0.8'),
      web3.utils.toWei('1')
    );

    const l20USDJPY = await MarginTradingPair.new(
      marginProtocol.address,
      moneyMarket.address,
      fJPY.address,
      20,
      web3.utils.toWei('0.8'),
      web3.utils.toWei('1')
    );

    const s20USDJPY = await MarginTradingPair.new(
      marginProtocol.address,
      moneyMarket.address,
      fJPY.address,
      -20,
      web3.utils.toWei('0.8'),
      web3.utils.toWei('1')
    );

    const l20USDXAU = await MarginTradingPair.new(
      marginProtocol.address,
      moneyMarket.address,
      fXAU.address,
      20,
      web3.utils.toWei('0.8'),
      web3.utils.toWei('1')
    );

    const s20USDXAU = await MarginTradingPair.new(
      marginProtocol.address,
      moneyMarket.address,
      fXAU.address,
      -20,
      web3.utils.toWei('0.8'),
      web3.utils.toWei('1')
    );

    const l5USDAPPL = await MarginTradingPair.new(
      marginProtocol.address,
      moneyMarket.address,
      fAAPL.address,
      5,
      web3.utils.toWei('0.8'),
      web3.utils.toWei('1')
    );

    const s5USDAPPL = await MarginTradingPair.new(
      marginProtocol.address,
      moneyMarket.address,
      fAAPL.address,
      -5,
      web3.utils.toWei('0.8'),
      web3.utils.toWei('1')
    );

    await marginProtocol.addTradingPair(l10USDEUR.address);
    await marginProtocol.addTradingPair(s10USDEUR.address);
    await marginProtocol.addTradingPair(l20USDJPY.address);
    await marginProtocol.addTradingPair(s20USDJPY.address);
    await marginProtocol.addTradingPair(l20USDXAU.address);
    await marginProtocol.addTradingPair(s20USDXAU.address);
    await marginProtocol.addTradingPair(l5USDAPPL.address);
    await marginProtocol.addTradingPair(s5USDAPPL.address);

    // approve default account

    await baseToken.approve(moneyMarket.address, web3.utils.toWei('100000000000'));
    await baseToken.approve(protocol.address, web3.utils.toWei('100000000000'));
    await baseToken.approve(marginProtocol.address, web3.utils.toWei('100000000000'));

    // liquidity pool

    await deployer.deploy(LiquidityPool, moneyMarket.address, web3.utils.toWei('0.003'));
    const pool = await LiquidityPool.deployed();

    await pool.approve(protocol.address, web3.utils.toWei('100000000000'));
    await pool.approve(marginProtocol.address, web3.utils.toWei('100000000000'));
    await pool.enableToken(fEUR.address);
    await pool.enableToken(fJPY.address);
    await pool.enableToken(fXAU.address);
    await pool.enableToken(fAAPL.address);

    const pool2 = await LiquidityPool.new(moneyMarket.address, web3.utils.toWei('0.0031'));

    await pool2.approve(protocol.address, web3.utils.toWei('100000000000'));
    await pool2.approve(marginProtocol.address, web3.utils.toWei('100000000000'));
    await pool2.enableToken(fEUR.address);
    await pool2.enableToken(fJPY.address);
    await pool2.enableToken(fXAU.address);
    await pool2.enableToken(fAAPL.address);

    // topup liquidity pool

    await moneyMarket.mintTo(pool.address, web3.utils.toWei('20000'));
    await moneyMarket.mintTo(pool2.address, web3.utils.toWei('20000'));

    const deployment = {
      moneyMarket: [moneyMarket, MoneyMarket],
      iToken: [iToken, ERC20Detailed],
      oracle: [oracle, PriceOracleInterface],
      protocol: [protocol, FlowProtocol],
      fEUR: [fEUR, FlowToken],
      fJPY: [fJPY, FlowToken],
      fXAU: [fXAU, FlowToken],
      fAAPL: [fAAPL, FlowToken],
      marginProtocol: [marginProtocol, FlowMarginProtocol],
      l10USDEUR: [l10USDEUR, MarginTradingPair],
      s10USDEUR: [s10USDEUR, MarginTradingPair],
      l20USDJPY: [l20USDJPY, MarginTradingPair],
      s20USDJPY: [s20USDJPY, MarginTradingPair],
      l20USDXAU: [l20USDXAU, MarginTradingPair],
      s20USDXAU: [s20USDXAU, MarginTradingPair],
      l5USDAPPL: [l5USDAPPL, MarginTradingPair],
      s5USDAPPL: [s5USDAPPL, MarginTradingPair],
      pool: [pool, LiquidityPoolInterface],
      pool2: [pool2, LiquidityPoolInterface],
    };

    console.log('Deploy success');
    for (const [key, [value]] of Object.entries(deployment)) {
      console.log(key, value.address);
    }

    if (network === 'kovan') {
      // save artifacts
      const addresses: any = {
        baseToken: baseToken.address,
        cToken: cToken.address,
      };
      save((SimplePriceOracle as any).abi, ['artifacts', 'abi', `${(SimplePriceOracle as any).contractName}.json`]);
      for (const [key, [value, contract]] of Object.entries(deployment)) {
        save((contract as any).abi, ['artifacts', 'abi', `${(contract as any).contractName}.json`]);
        addresses[key] = value.address;
      }
      let existing: any = {};
      try {
        existing = JSON.parse(fs.readFileSync(path.join('artifacts', 'deployment.json')).toString());
      } catch (e) {
        // ignore
      }
      existing[network] = addresses;
      save(existing, ['artifacts', 'deployment.json']);
    }
  };
};
