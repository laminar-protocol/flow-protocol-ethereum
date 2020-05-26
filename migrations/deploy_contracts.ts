import fs from 'fs';
import path from 'path';
import Web3 from 'web3';
import { PriceOracleInterfaceInstance } from 'types/truffle-contracts';

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

const getChainlinkOraclesByNetwork = {
  kovan: {
    JPY: '0xcd93a652e731Bb38eA9Efc5fEbCf977EDa2a01f7',
    EUR: '0xf23CCdA8333f658c43E7fC19aa00f6F5722eB225',
    XAU: '0xF1302340da93EdEF6DA03C66bc52F75A956e482C',
    BTC: '0x2445F2466898565374167859Ae5e3a231e48BB41',
  },
  mainnet: {
    JPY: '0xe1407BfAa6B5965BAd1C9f38316A3b655A09d8A6',
    EUR: '0x25Fa978ea1a7dc9bDc33a2959B9053EaE57169B5',
    XAU: '0xafcE0c7b7fE3425aDb3871eAe5c0EC6d93E01935',
    BTC: '0xF5fff180082d6017036B771bA883025c654BC935',
  },
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
  const ChainLinkOracle = artifacts.require('ChainLinkOracle');
  const MoneyMarket = artifacts.require('MoneyMarket');
  const Proxy = artifacts.require('Proxy');
  const SyntheticFlowProtocol = artifacts.require('SyntheticFlowProtocol');
  const SyntheticFlowToken = artifacts.require('SyntheticFlowToken');
  const MarginLiquidityPool = artifacts.require('MarginLiquidityPool');
  const SyntheticLiquidityPool = artifacts.require('SyntheticLiquidityPool');
  const MarginLiquidityPoolRegistry = artifacts.require(
    'MarginLiquidityPoolRegistry',
  );
  const SimplePriceOracle = artifacts.require('SimplePriceOracle');
  const IERC20 = artifacts.require('IERC20');
  const MarginFlowProtocol = artifacts.require('MarginFlowProtocol');
  const MarginMarketLib = (artifacts as any).require('MarginMarketLib');
  const MarginFlowProtocolConfig = artifacts.require(
    'MarginFlowProtocolConfig',
  );
  const MarginFlowProtocolSafety = artifacts.require(
    'MarginFlowProtocolSafety',
  );
  const PriceOracleInterface = artifacts.require('PriceOracleInterface');
  const ERC20Detailed = artifacts.require('ERC20Detailed');
  const MarginLiquidityPoolInterface = artifacts.require(
    'MarginLiquidityPoolInterface',
  );
  const SyntheticLiquidityPoolInterface = artifacts.require(
    'SyntheticLiquidityPoolInterface',
  );
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
      cToken.address,
      'iUSD',
      'iUSD',
      web3.utils.toWei('0.3'),
    );

    const iToken = await IERC20.at(await moneyMarket.iToken());

    // TODO: make price feeder configurable

    let oracle: PriceOracleInterfaceInstance;

    if (network !== 'development') {
      await deployer.deploy(ChainLinkOracle as any);
      const chainlinkImpl = await ChainLinkOracle.deployed();
      await deployer.deploy(Proxy);
      const chainlinkProxy = await Proxy.deployed();
      await chainlinkProxy.upgradeTo(chainlinkImpl.address);
      const chainlink = await ChainLinkOracle.at(chainlinkProxy.address);

      oracle = await PriceOracleInterface.at(chainlink.address);
    } else {
      await deployer.deploy(SimplePriceOracle);
      const simplePriceOracleImpl = await SimplePriceOracle.deployed();
      await deployer.deploy(Proxy);
      const simplePriceOracleProxy = await Proxy.deployed();
      await simplePriceOracleProxy.upgradeTo(simplePriceOracleImpl.address);
      const simplePriceOracle = await SimplePriceOracle.at(
        simplePriceOracleProxy.address,
      );
      await (simplePriceOracle as any).initialize();

      oracle = await PriceOracleInterface.at(simplePriceOracle.address);
    }

    await deployer.deploy(SyntheticFlowProtocol);
    const flowProtocolImpl = await SyntheticFlowProtocol.deployed();
    await deployer.deploy(Proxy);
    const flowProtocolProxy = await Proxy.deployed();

    await flowProtocolProxy.upgradeTo(flowProtocolImpl.address);
    const protocol = await SyntheticFlowProtocol.at(flowProtocolProxy.address);
    await (protocol as any).initialize(oracle.address, moneyMarket.address);

    await deployer.deploy(SyntheticFlowToken);
    const flowTokenImpl = await SyntheticFlowToken.deployed();

    await deployer.deploy(Proxy);
    const fEURProxy = await Proxy.deployed();
    await fEURProxy.upgradeTo(flowTokenImpl.address);
    const fEUR = await SyntheticFlowToken.at(fEURProxy.address);
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    await (fEUR as any).initialize(
      'Flow Euro',
      'fEUR',
      moneyMarket.address,
      protocol.address,
    );

    await deployer.deploy(Proxy);
    const fJPYProxy = await Proxy.deployed();
    await fJPYProxy.upgradeTo(flowTokenImpl.address);
    const fJPY = await SyntheticFlowToken.at(fJPYProxy.address);
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    await (fJPY as any).initialize(
      'Flow Japanese Yen',
      'fJPY',
      moneyMarket.address,
      protocol.address,
    );

    await deployer.deploy(Proxy);
    const fXAUProxy = await Proxy.deployed();
    await fXAUProxy.upgradeTo(flowTokenImpl.address);
    const fXAU = await SyntheticFlowToken.at(fXAUProxy.address);
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    await (fXAU as any).initialize(
      'Gold',
      'fXAU',
      moneyMarket.address,
      protocol.address,
    );

    await deployer.deploy(Proxy);
    const fAAPLProxy = await Proxy.deployed();
    await fAAPLProxy.upgradeTo(flowTokenImpl.address);
    const fAAPL = await SyntheticFlowToken.at(fAAPLProxy.address);
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    await (fAAPL as any).initialize(
      'Apple Inc.',
      'fAAPL',
      moneyMarket.address,
      protocol.address,
    );

    await protocol.addFlowToken(fEUR.address);
    await protocol.addFlowToken(fJPY.address);
    await protocol.addFlowToken(fXAU.address);
    await protocol.addFlowToken(fAAPL.address);

    // requires cDAI balance, use faucet at http://flow.laminar.one/ | TODO
    const kovanDeployerAddr = '0x15ae150d7dC03d3B635EE90b85219dBFe071ED35';

    if (network !== 'development') {
      const chainlinkOracles =
        getChainlinkOraclesByNetwork[network as 'kovan' | 'mainnet'];
      const chainlinkOracle = await ChainLinkOracle.at(oracle.address);

      await (chainlinkOracle as any).initialize(
        '0x0000000000000000000000000000000000000000', // use public default contract
        chainlinkOracles.EUR,
        chainlinkOracles.JPY,
        chainlinkOracles.XAU,
        chainlinkOracles.BTC, // TODO use BTC as AAPL for now
        fEUR.address,
        fJPY.address,
        fXAU.address,
        fAAPL.address,
      );
    } else {
      const priceFeeder = accounts[0];
      const simplePriceOracle = await SimplePriceOracle.at(oracle.address);
      await simplePriceOracle.addPriceFeeder(priceFeeder);
      await simplePriceOracle.addPriceFeeder(
        '0x481c00e62cC701925a676BC713E0E71C692aC46d',
      ); // kovan oracle server
      await simplePriceOracle.setExpireIn(172800); // 2 days for now
      await simplePriceOracle.feedPrice(
        baseToken.address,
        web3.utils.toWei('1'),
        {
          from: priceFeeder,
        },
      );
      await simplePriceOracle.feedPrice(fEUR.address, web3.utils.toWei('1.2'), {
        from: priceFeeder,
      });
      await simplePriceOracle.feedPrice(
        fJPY.address,
        web3.utils.toWei('0.0092'),
        {
          from: priceFeeder,
        },
      );
      await simplePriceOracle.feedPrice(
        fXAU.address,
        web3.utils.toWei('1490'),
        {
          from: priceFeeder,
        },
      );
      await simplePriceOracle.feedPrice(
        fAAPL.address,
        web3.utils.toWei('257'),
        {
          from: priceFeeder,
        },
      );
    }

    // --- pool registry

    await deployer.deploy(MarginLiquidityPoolRegistry);
    const marginLiquidityPoolRegistryImpl = await MarginLiquidityPoolRegistry.deployed();
    await deployer.deploy(Proxy);
    const marginLiquidityPoolRegistryProxy = await Proxy.deployed();

    await marginLiquidityPoolRegistryProxy.upgradeTo(
      marginLiquidityPoolRegistryImpl.address,
    );
    const marginLiquidityPoolRegistry = await MarginLiquidityPoolRegistry.at(
      marginLiquidityPoolRegistryProxy.address,
    );

    // --- margin protocol
    await deployer.deploy(MarginMarketLib);
    await deployer.link(MarginMarketLib, MarginFlowProtocol);
    await deployer.deploy(MarginFlowProtocol);
    const flowMarginProtocolImpl = await MarginFlowProtocol.deployed();
    await deployer.deploy(Proxy);
    const flowMarginProtocolProxy = await Proxy.deployed();
    await flowMarginProtocolProxy.upgradeTo(flowMarginProtocolImpl.address);
    const marginProtocol = await MarginFlowProtocol.at(
      flowMarginProtocolProxy.address,
    );

    await deployer.deploy(MarginFlowProtocolSafety);
    const flowMarginProtocolSafetyImpl = await MarginFlowProtocolSafety.deployed();
    await deployer.deploy(Proxy);
    const flowMarginProtocolSafetyProxy = await Proxy.deployed();
    await flowMarginProtocolSafetyProxy.upgradeTo(
      flowMarginProtocolSafetyImpl.address,
    );
    const marginProtocolSafety = await MarginFlowProtocolSafety.at(
      flowMarginProtocolSafetyProxy.address,
    );

    await deployer.deploy(MarginFlowProtocolConfig);
    const flowMarginProtocolConfigImpl = await MarginFlowProtocolConfig.deployed();
    await deployer.deploy(Proxy);
    const flowMarginProtocolConfigProxy = await Proxy.deployed();
    await flowMarginProtocolConfigProxy.upgradeTo(
      flowMarginProtocolConfigImpl.address,
    );
    const marginProtocolConfig = await MarginFlowProtocolConfig.at(
      flowMarginProtocolConfigProxy.address,
    );

    const initialSwapRate = web3.utils.toWei('1'); // TODO
    const initialTraderRiskMarginCallThreshold = web3.utils.toWei('0.03');
    const initialTraderRiskLiquidateThreshold = web3.utils.toWei('0.01');
    const initialLiquidityPoolENPMarginThreshold = web3.utils.toWei('0.3');
    const initialLiquidityPoolELLMarginThreshold = web3.utils.toWei('0.3');
    const initialLiquidityPoolENPLiquidateThreshold = web3.utils.toWei('0.1');
    const initialLiquidityPoolELLLiquidateThreshold = web3.utils.toWei('0.1');

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    await (marginProtocol as any).initialize(
      oracle.address,
      moneyMarket.address,
      marginProtocolConfig.address,
      marginProtocolSafety.address,
      marginLiquidityPoolRegistry.address,
    );
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    await (marginProtocolSafety as any).initialize(
      marginProtocol.address,
      kovanDeployerAddr, // TODO laminar treasury
    );
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    await (marginProtocolConfig as any).initialize(
      1,
      50,
      2,
      network === 'development' ? 60 * 60 * 24 * 3650 : 60 * 60 * 8, // 8 hours
      initialTraderRiskMarginCallThreshold,
      initialTraderRiskLiquidateThreshold,
      initialLiquidityPoolENPMarginThreshold,
      initialLiquidityPoolELLMarginThreshold,
      initialLiquidityPoolENPLiquidateThreshold,
      initialLiquidityPoolELLLiquidateThreshold,
    );

    await (marginLiquidityPoolRegistry as any).initialize(
      moneyMarket.address,
      marginProtocolSafety.address,
    );
    await baseToken.approve(
      marginLiquidityPoolRegistry.address,
      web3.utils.toWei('8000', 'ether'),
    );

    const usd = await moneyMarket.baseToken();

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

    // synthetic liquidity pool

    const syntheticPools = [];
    for (let i = 0; i < 2; i += 1) {
      await deployer.deploy(SyntheticLiquidityPool);
      const syntheticLiquidityPoolImpl = await SyntheticLiquidityPool.deployed();
      await deployer.deploy(Proxy);
      const syntheticliquidityPoolProxy = await Proxy.deployed();

      await syntheticliquidityPoolProxy.upgradeTo(
        syntheticLiquidityPoolImpl.address,
      );
      const syntheticPool = await SyntheticLiquidityPool.at(
        syntheticliquidityPoolProxy.address,
      );
      await (syntheticPool as any).initialize(
        moneyMarket.address,
        protocol.address,
      );
      await syntheticPool.approveToProtocol(web3.utils.toWei('100000000000'));

      for (const token of [
        usd,
        fEUR.address,
        fJPY.address,
        fXAU.address,
        fAAPL.address,
      ]) {
        await syntheticPool.enableToken(token, '28152000000000');
      }

      await moneyMarket.mintTo(
        syntheticPool.address,
        web3.utils.toWei('20000'),
      );

      syntheticPools.push(syntheticPool);
    }

    // margin liquidity pool
    const marginPools = [];
    for (let i = 0; i < 2; i += 1) {
      await deployer.deploy(MarginLiquidityPool);
      const marginLiquidityPoolImpl = await MarginLiquidityPool.deployed();
      await deployer.deploy(Proxy);
      const marginliquidityPoolProxy = await Proxy.deployed();

      await marginliquidityPoolProxy.upgradeTo(marginLiquidityPoolImpl.address);
      const marginPool = await MarginLiquidityPool.at(
        marginliquidityPoolProxy.address,
      );
      await (marginPool as any).initialize(
        moneyMarket.address,
        marginProtocol.address,
      );
      await marginPool.approveToProtocol(web3.utils.toWei('100000000000'));

      for (const [base, quote] of [
        [usd, fEUR.address],
        [fEUR.address, usd],
        [usd, fJPY.address],
        [fJPY.address, usd],
        [usd, fXAU.address],
        [fXAU.address, usd],
        [usd, fAAPL.address],
        [fAAPL.address, usd],
      ]) {
        await marginPool.enableToken(base, quote, '28152000000000');
        if (i === 0)
          await marginProtocolConfig.addTradingPair(
            base,
            quote,
            initialSwapRate,
            initialSwapRate,
          );
      }

      await marginLiquidityPoolRegistry.registerPool(marginPool.address);
      await marginLiquidityPoolRegistry.verifyPool(marginPool.address);

      await moneyMarket.mintTo(marginPool.address, web3.utils.toWei('20000'));

      marginPools.push(marginPool);
    }

    const deployment = {
      moneyMarket: [moneyMarket, MoneyMarket],
      iToken: [iToken, ERC20Detailed],
      oracle: [oracle, PriceOracleInterface],
      syntheticProtocol: [protocol, SyntheticFlowProtocol],
      fEUR: [fEUR, SyntheticFlowToken],
      fJPY: [fJPY, SyntheticFlowToken],
      fXAU: [fXAU, SyntheticFlowToken],
      fAAPL: [fAAPL, SyntheticFlowToken],
      marginProtocol: [marginProtocol, MarginFlowProtocol],
      marginProtocolSafety: [marginProtocolSafety, MarginFlowProtocolSafety],
      marginProtocolConfig: [marginProtocolConfig, MarginFlowProtocolConfig],
      marginPoolRegistry: [
        marginLiquidityPoolRegistry,
        MarginLiquidityPoolRegistry,
      ],
      marginPool: [marginPools[0], MarginLiquidityPoolInterface],
      marginPool2: [marginPools[1], MarginLiquidityPoolInterface],
      syntheticPool: [syntheticPools[0], SyntheticLiquidityPoolInterface],
      syntheticPool2: [syntheticPools[1], SyntheticLiquidityPoolInterface],
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
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
      save((contract as any).abi, [
        'artifacts',
        network,
        'abi',
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
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
