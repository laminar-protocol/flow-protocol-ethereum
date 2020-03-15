import fs from 'fs';
import path from 'path';
import Web3 from 'web3';

const deployTokens = async (
  artifacts: Truffle.Artifacts,
  deployer: Truffle.Deployer,
) => {
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

const getTokens = (baseToken: string, cToken: string) => async (
  artifacts: Truffle.Artifacts,
) => {
  const IERC20 = artifacts.require('IERC20');

  return {
    baseToken: await IERC20.at(baseToken),
    cToken: await IERC20.at(cToken),
  };
};

const getTokensByNetwork = {
  development: deployTokens,
  kovan: getTokens(
    '0xbf7a7169562078c96f0ec1a8afd6ae50f12e5a99',
    '0x0a1e4d0b5c71b955c0a5993023fc48ba6e380496',
  ),
  'kovan-fork': getTokens(
    '0xbf7a7169562078c96f0ec1a8afd6ae50f12e5a99',
    '0x0a1e4d0b5c71b955c0a5993023fc48ba6e380496',
  ),
  ropsten: getTokens(
    '0xb5e5d0f8c0cba267cd3d7035d6adc8eba7df7cdd',
    '0x2b536482a01e620ee111747f8334b395a42a555e',
  ),
  'ropsten-fork': getTokens(
    '0xb5e5d0f8c0cba267cd3d7035d6adc8eba7df7cdd',
    '0x2b536482a01e620ee111747f8334b395a42a555e',
  ),
};

const save = (obj: any, filePath: string[]) => {
  const finalPath = path.join(...filePath);
  const dirname = path.dirname(finalPath);
  if (!fs.existsSync(dirname)) {
    fs.mkdirSync(dirname, { recursive: true });
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const dirPath = fs.writeFileSync(finalPath, JSON.stringify(obj, null, 2));
};

type Network = keyof typeof getTokensByNetwork;

module.exports = (artifacts: Truffle.Artifacts, web3: Web3) => {
  const MoneyMarket = artifacts.require('MoneyMarket');
  const Proxy = artifacts.require('Proxy');
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
  const FaucetInterface = artifacts.require('FaucetInterface');

  return async (
    deployer: Truffle.Deployer,
    network: Network,
    accounts: string[],
  ) => {
    console.log(`---- Deploying on network: ${network}`);

    const { cToken, baseToken } = await getTokensByNetwork[network](
      artifacts,
      deployer,
    );

    await deployer.deploy(MoneyMarket);
    const moneyMarketImpl = await MoneyMarket.deployed();

    await deployer.deploy(Proxy);
    const moneyMarketProxy = await Proxy.deployed();

    await moneyMarketProxy.upgradeTo(moneyMarketImpl.address);
    const moneyMarket = await MoneyMarket.at(moneyMarketProxy.address);

    await (moneyMarket as any).initialize(
      // workaround since init is overloaded function which isnt supported by typechain yet
      cToken.address,
      'iUSD',
      'iUSD',
      web3.utils.toWei('0.3'),
    );

    const iToken = await IERC20.at(await moneyMarket.iToken());

    // TODO: make price feeder configurable

    await deployer.deploy(SimplePriceOracle);
    const simplePriceOracleImpl = await SimplePriceOracle.deployed();
    await deployer.deploy(Proxy);
    const simplePriceOracleProxy = await Proxy.deployed();
    await simplePriceOracleProxy.upgradeTo(simplePriceOracleImpl.address);
    const oracle = await SimplePriceOracle.at(simplePriceOracleProxy.address);

    await oracle.initialize();

    await deployer.deploy(FlowProtocol);
    const flowProtocolImpl = await FlowProtocol.deployed();
    await deployer.deploy(Proxy);
    const flowProtocolProxy = await Proxy.deployed();

    await flowProtocolProxy.upgradeTo(flowProtocolImpl.address);
    const protocol = await FlowProtocol.at(flowProtocolProxy.address);
    await protocol.initialize(oracle.address, moneyMarket.address);

    await deployer.deploy(
      FlowToken,
      'Flow Euro',
      'fEUR',
      moneyMarket.address,
      protocol.address,
    );
    const fEUR = await FlowToken.deployed();
    const fJPY = await FlowToken.new(
      'Flow Japanese Yen',
      'fJPY',
      moneyMarket.address,
      protocol.address,
    );
    const fXAU = await FlowToken.new(
      'Gold',
      'fXAU',
      moneyMarket.address,
      protocol.address,
    );
    const fAAPL = await FlowToken.new(
      'Apple Inc.',
      'fAAPL',
      moneyMarket.address,
      protocol.address,
    );

    await protocol.addFlowToken(fEUR.address);
    await protocol.addFlowToken(fJPY.address);
    await protocol.addFlowToken(fXAU.address);
    await protocol.addFlowToken(fAAPL.address);

    // set feeder and price
    const kovanDeployerAddr = '0xD98C58B8a7cc6FFC44105E4A93253798D1D3f472';
    const priceFeeder =
      network === 'development' ? accounts[0] : kovanDeployerAddr;
    await oracle.addPriceFeeder(priceFeeder);
    await oracle.addPriceFeeder('0x481c00e62cC701925a676BC713E0E71C692aC46d'); // kovan oracle server
    await oracle.setExpireIn(172800); // 2 days for now
    await oracle.feedPrice(fEUR.address, web3.utils.toWei('1.2'), {
      from: priceFeeder,
    });
    await oracle.feedPrice(fJPY.address, web3.utils.toWei('0.0092'), {
      from: priceFeeder,
    });
    await oracle.feedPrice(fXAU.address, web3.utils.toWei('1490'), {
      from: priceFeeder,
    });
    await oracle.feedPrice(fAAPL.address, web3.utils.toWei('257'), {
      from: priceFeeder,
    });

    // --- margin protocol

    await deployer.deploy(FlowMarginProtocol);
    const flowMarginProtocolImpl = await FlowMarginProtocol.deployed();
    await deployer.deploy(Proxy);
    const flowMarginProtocolProxy = await Proxy.deployed();

    await flowMarginProtocolProxy.upgradeTo(flowMarginProtocolImpl.address);
    const marginProtocol = await FlowMarginProtocol.at(
      flowMarginProtocolProxy.address,
    );
    await marginProtocol.initialize(oracle.address, moneyMarket.address);

    await deployer.deploy(MarginTradingPair);
    const marginTradingPairImpl = await MarginTradingPair.deployed();

    await deployer.deploy(Proxy);
    const l10USDEURProxy = await Proxy.deployed();
    await l10USDEURProxy.upgradeTo(marginTradingPairImpl.address);
    const l10USDEUR = await MarginTradingPair.at(l10USDEURProxy.address);
    l10USDEUR.initialize(
      marginProtocol.address,
      moneyMarket.address,
      fEUR.address,
      10,
      web3.utils.toWei('0.8'),
      web3.utils.toWei('1'),
    );

    await deployer.deploy(Proxy);
    const s10USDEURProxy = await Proxy.deployed();
    await s10USDEURProxy.upgradeTo(marginTradingPairImpl.address);
    const s10USDEUR = await MarginTradingPair.at(s10USDEURProxy.address);
    s10USDEUR.initialize(
      marginProtocol.address,
      moneyMarket.address,
      fEUR.address,
      -10,
      web3.utils.toWei('0.8'),
      web3.utils.toWei('1'),
    );

    await deployer.deploy(Proxy);
    const l20USDJPYProxy = await Proxy.deployed();
    await l20USDJPYProxy.upgradeTo(marginTradingPairImpl.address);
    const l20USDJPY = await MarginTradingPair.at(l20USDJPYProxy.address);
    l20USDJPY.initialize(
      marginProtocol.address,
      moneyMarket.address,
      fJPY.address,
      20,
      web3.utils.toWei('0.8'),
      web3.utils.toWei('1'),
    );

    await deployer.deploy(Proxy);
    const s20USDJPYProxy = await Proxy.deployed();
    await s20USDJPYProxy.upgradeTo(marginTradingPairImpl.address);
    const s20USDJPY = await MarginTradingPair.at(s20USDJPYProxy.address);
    s20USDJPY.initialize(
      marginProtocol.address,
      moneyMarket.address,
      fJPY.address,
      -20,
      web3.utils.toWei('0.8'),
      web3.utils.toWei('1'),
    );

    await deployer.deploy(Proxy);
    const l20USDXAUProxy = await Proxy.deployed();
    await l20USDXAUProxy.upgradeTo(marginTradingPairImpl.address);
    const l20USDXAU = await MarginTradingPair.at(l20USDXAUProxy.address);
    l20USDXAU.initialize(
      marginProtocol.address,
      moneyMarket.address,
      fXAU.address,
      20,
      web3.utils.toWei('0.8'),
      web3.utils.toWei('1'),
    );

    await deployer.deploy(Proxy);
    const s20USDXAUProxy = await Proxy.deployed();
    await s20USDXAUProxy.upgradeTo(marginTradingPairImpl.address);
    const s20USDXAU = await MarginTradingPair.at(s20USDXAUProxy.address);
    s20USDXAU.initialize(
      marginProtocol.address,
      moneyMarket.address,
      fXAU.address,
      -20,
      web3.utils.toWei('0.8'),
      web3.utils.toWei('1'),
    );

    await deployer.deploy(Proxy);
    const l5USDAAPLProxy = await Proxy.deployed();
    await l5USDAAPLProxy.upgradeTo(marginTradingPairImpl.address);
    const l5USDAAPL = await MarginTradingPair.at(l5USDAAPLProxy.address);
    l5USDAAPL.initialize(
      marginProtocol.address,
      moneyMarket.address,
      fAAPL.address,
      5,
      web3.utils.toWei('0.8'),
      web3.utils.toWei('1'),
    );

    await deployer.deploy(Proxy);
    const s5USDAAPLProxy = await Proxy.deployed();
    await s5USDAAPLProxy.upgradeTo(marginTradingPairImpl.address);
    const s5USDAAPL = await MarginTradingPair.at(s5USDAAPLProxy.address);
    s5USDAAPL.initialize(
      marginProtocol.address,
      moneyMarket.address,
      fAAPL.address,
      -5,
      web3.utils.toWei('0.8'),
      web3.utils.toWei('1'),
    );

    await marginProtocol.addTradingPair(l10USDEUR.address);
    await marginProtocol.addTradingPair(s10USDEUR.address);
    await marginProtocol.addTradingPair(l20USDJPY.address);
    await marginProtocol.addTradingPair(s20USDJPY.address);
    await marginProtocol.addTradingPair(l20USDXAU.address);
    await marginProtocol.addTradingPair(s20USDXAU.address);
    await marginProtocol.addTradingPair(l5USDAAPL.address);
    await marginProtocol.addTradingPair(s5USDAAPL.address);

    // approve default account

    await baseToken.approve(
      moneyMarket.address,
      web3.utils.toWei('100000000000'),
    );
    await baseToken.approve(protocol.address, web3.utils.toWei('100000000000'));
    await baseToken.approve(
      marginProtocol.address,
      web3.utils.toWei('100000000000'),
    );

    // liquidity pool

    await deployer.deploy(LiquidityPool);
    const liquidityPoolImpl = await LiquidityPool.deployed();
    await deployer.deploy(Proxy);
    const liquidityPoolProxy = await Proxy.deployed();

    await liquidityPoolProxy.upgradeTo(liquidityPoolImpl.address);
    const pool = await LiquidityPool.at(liquidityPoolProxy.address);
    await (pool as any).initialize(
      // workaround since init is overloaded function which isnt supported by typechain yet
      moneyMarket.address,
      web3.utils.toWei('0.003'),
    );

    await pool.approve(protocol.address, web3.utils.toWei('100000000000'));
    await pool.approve(
      marginProtocol.address,
      web3.utils.toWei('100000000000'),
    );
    await pool.enableToken(fEUR.address);
    await pool.enableToken(fJPY.address);
    await pool.enableToken(fXAU.address);
    await pool.enableToken(fAAPL.address);

    await deployer.deploy(Proxy);
    const liquidityPoolProxy2 = await Proxy.deployed();

    await liquidityPoolProxy2.upgradeTo(liquidityPoolImpl.address);
    const pool2 = await LiquidityPool.at(liquidityPoolProxy2.address);
    await (pool2 as any).initialize(
      // workaround since init is overloaded function which isnt supported by typechain yet
      moneyMarket.address,
      web3.utils.toWei('0.0031'),
    );

    await pool2.approve(protocol.address, web3.utils.toWei('100000000000'));
    await pool2.approve(
      marginProtocol.address,
      web3.utils.toWei('100000000000'),
    );
    await pool2.enableToken(fEUR.address);
    await pool2.enableToken(fJPY.address);
    await pool2.enableToken(fXAU.address);
    await pool2.enableToken(fAAPL.address);

    // topup liquidity pool

    await moneyMarket.mintTo(pool.address, web3.utils.toWei('20000'));
    await moneyMarket.mintTo(pool2.address, web3.utils.toWei('20000'));

    const deployment = {
      // TODO moneyMarketStorage? proxy?
      moneyMarketImpl: [moneyMarketImpl, MoneyMarket],
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
      l5USDAAPL: [l5USDAAPL, MarginTradingPair],
      s5USDAAPL: [s5USDAAPL, MarginTradingPair],
      pool: [pool, LiquidityPoolInterface],
      pool2: [pool2, LiquidityPoolInterface],
    };

    console.log('Deploy success');
    for (const [key, [value]] of Object.entries(deployment)) {
      console.log(key, value.address);
    }

    // save artifacts
    const addresses: any = {
      baseToken: baseToken.address,
      cToken: cToken.address,
    };
    save((SimplePriceOracle as any).abi, [
      'artifacts',
      network,
      'abi',
      `${(SimplePriceOracle as any).contractName}.json`,
    ]);
    for (const [key, [value, contract]] of Object.entries(deployment)) {
      save((contract as any).abi, [
        'artifacts',
        network,
        'abi',
        `${(contract as any).contractName}.json`,
      ]);
      addresses[key] = value.address;
    }
    save((FaucetInterface as any).abi, [
      'artifacts',
      network,
      'abi',
      `${(FaucetInterface as any).contractName}.json`,
    ]);
    save(addresses, ['artifacts', network, 'deployment.json']);
  };
};
