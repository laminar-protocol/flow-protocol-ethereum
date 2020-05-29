import fs from 'fs';
import path from 'path';
import Web3 from 'web3';
import {
  PriceOracleInterfaceInstance,
  ProxyContract,
  SyntheticFlowTokenContract,
  SyntheticFlowTokenInstance,
} from 'types/truffle-contracts';

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

const ALL_CURRENCIES_KOVAN = [
  'EUR',
  'JPY',
  'CAD',
  'CHF',
  'GBP',
  'AUD',
  'USOIL',
  'XAU',
  'BTC',
  'ETH',
];

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

const readDeploymentConfig = (network: Network) => {
  if (network !== 'kovan' && network !== 'development') {
    throw new Error(`Network ${network} not yet supported for deployments`);
  }
  const deploymentConfig = {
    oracles: {},
    margin: {
      config: {
        maxSpread: '',
        traderMarginCall: '',
        traderStopOut: '',
        enpMarginCall: '',
        enpStopOut: '',
        ellMarginCall: '',
        ellStopOut: '',
        traderMarginCallDeposit: '',
        traderStopOutDeposit: '',
        poolMarginCallDeposit: '',
        poolStopOutDeposit: '',
        treasuryAddress: '',
        tradingPairs: [],
      },
      pools: [],
    },
    synthetic: { config: [], pools: [] },
  };
  const configPath = path.join(__dirname, `config/${network}/`);
  const marginPath = path.join(`${configPath}/margin/`);
  const syntheticPath = path.join(`${configPath}/synthetic/`);
  const marginPoolPath = path.join(`${marginPath}/margin_pools/`);
  const syntheticPoolPath = path.join(`${syntheticPath}/synthetic_pools/`);

  const oracles = JSON.parse(
    fs.readFileSync(`${configPath}oracles.json`) as any,
  );
  const marginConfig = JSON.parse(
    fs.readFileSync(`${marginPath}margin_config.json`) as any,
  );
  const syntheticConfig = JSON.parse(
    fs.readFileSync(`${syntheticPath}synthetic_config.json`) as any,
  );

  const marginPoolFiles = fs.readdirSync(marginPoolPath);
  const marginPools = marginPoolFiles.map(pool =>
    JSON.parse(fs.readFileSync(marginPoolPath + pool) as any),
  );
  const syntheticPoolFiles = fs.readdirSync(syntheticPoolPath);
  const syntheticPools = syntheticPoolFiles.map(pool =>
    JSON.parse(fs.readFileSync(syntheticPoolPath + pool) as any),
  );

  deploymentConfig.oracles = oracles;
  deploymentConfig.margin.config = marginConfig;
  (deploymentConfig.margin.pools as any[]) = marginPools;
  (deploymentConfig.synthetic.pools as any[]) = syntheticPools;
  deploymentConfig.synthetic.config = syntheticConfig;

  return deploymentConfig;
};

const floatUsdToWei = (floatString: string) =>
  `${parseFloat(floatString.replace('$', '')) * 1e18}`;

const usdToWei = (usd: string, web3: Web3) => {
  const usdString = usd
    .replace('$', '')
    .replace('Fr', '')
    .replace('¥', '');
  return web3.utils.toWei(usdString);
};
const percentageToWei = (percentage: string) =>
  `${parseFloat(percentage.replace('%', '')) * 1e16}`;

const deployFToken = async ({
  deployer,
  Proxy,
  SyntheticFlowToken,
  fTokenImpl,
  name,
  symbol,
  moneyMarketAddress,
  protocolAddress,
  additionalCollateral,
  liquidationRatio,
  extremeRatio,
}: {
  deployer: Truffle.Deployer;
  Proxy: ProxyContract;
  SyntheticFlowToken: SyntheticFlowTokenContract;
  fTokenImpl: SyntheticFlowTokenInstance;
  name: string;
  symbol: string;
  moneyMarketAddress: string;
  protocolAddress: string;
  additionalCollateral: string;
  liquidationRatio: string;
  extremeRatio: string;
}) => {
  await deployer.deploy(Proxy);
  const fProxy = await Proxy.deployed();
  await fProxy.upgradeTo(fTokenImpl.address);
  const fToken = await SyntheticFlowToken.at(fProxy.address);
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
  await (fToken as any).initialize(
    name,
    symbol,
    moneyMarketAddress,
    protocolAddress,
    extremeRatio,
    additionalCollateral,
    liquidationRatio,
  );

  return fToken;
};

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

    const deploymentConfig = await readDeploymentConfig(network);
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
    const fTokenImpl = await SyntheticFlowToken.deployed();

    const fTokens = [];
    const fTokensMapping = {} as any;
    const deployFTokenParams = {
      deployer,
      Proxy,
      SyntheticFlowToken,
      fTokenImpl,
    };
    for (const fTokenConfigParams of deploymentConfig.synthetic.config) {
      const additionalCollateral = percentageToWei(
        (fTokenConfigParams as any).additionalCollateral,
      );
      const liquidationRatio = percentageToWei(
        (fTokenConfigParams as any).liquidationRatio,
      );
      const extremeRatio = percentageToWei(
        (fTokenConfigParams as any).extremeRatio,
      );

      for (const fTokenConfigNames of (fTokenConfigParams as any).tokens) {
        const fToken = await deployFToken({
          ...deployFTokenParams,
          name: fTokenConfigNames.name,
          symbol: fTokenConfigNames.symbol,
          moneyMarketAddress: moneyMarket.address,
          protocolAddress: protocol.address,
          additionalCollateral,
          liquidationRatio,
          extremeRatio,
        });
        await protocol.addFlowToken(fToken.address);
        fTokens.push(fToken);
        fTokensMapping[fTokenConfigNames.symbol] = fToken;
      }
    }

    if (network !== 'development') {
      const chainlinkOracles = ALL_CURRENCIES_KOVAN.map(
        key => (deploymentConfig.oracles as any)[key],
      );
      const chainlinkOracle = await ChainLinkOracle.at(oracle.address);

      await (chainlinkOracle as any).initialize(
        '0x0000000000000000000000000000000000000000', // use public default contract
        baseToken.address,
        chainlinkOracles,
        fTokens.map(fToken => fToken.address),
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
      // TODO local price oracle
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

    const marginConfig = deploymentConfig.margin.config;

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
      marginConfig.treasuryAddress,
    );
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    await (marginProtocolConfig as any).initialize(
      floatUsdToWei(marginConfig.maxSpread),
      1,
      50,
      2,
      network === 'development' ? 60 * 60 * 24 * 3650 : 60 * 60 * 8, // 8 hours
      percentageToWei(marginConfig.traderMarginCall),
      percentageToWei(marginConfig.traderStopOut),
      percentageToWei(marginConfig.enpMarginCall),
      percentageToWei(marginConfig.ellMarginCall),
      percentageToWei(marginConfig.enpStopOut),
      percentageToWei(marginConfig.ellStopOut),
    );

    await (marginLiquidityPoolRegistry as any).initialize(
      moneyMarket.address,
      marginProtocolSafety.address,
    );
    await baseToken.approve(
      marginLiquidityPoolRegistry.address,
      web3.utils.toWei('8000', 'ether'),
    );

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

    for (const pair of marginConfig.tradingPairs) {
      const { swapRateUnit, swapRateLong, swapRateShort } = pair;

      const parsedSwapLong = floatUsdToWei(swapRateLong);
      const parsedSwapShort = floatUsdToWei(swapRateShort);

      for (const name of (pair as any).names) {
        const [baseSymbol, quoteSymbol] = name.split('/');
        const base =
          baseSymbol === 'USD'
            ? baseToken.address
            : fTokensMapping[`f${baseSymbol}`].address;
        const quote =
          quoteSymbol === 'USD'
            ? baseToken.address
            : fTokensMapping[`f${quoteSymbol}`].address;

        await marginProtocolConfig.addTradingPair(
          // TODO swapRateUnit,
          base,
          quote,
          parsedSwapLong,
          parsedSwapShort,
        );
      }
    }

    // synthetic liquidity pool
    const syntheticPools = [];
    const syntheticPoolConfigs = deploymentConfig.synthetic.pools;

    for (const syntheticPoolConfig of syntheticPoolConfigs) {
      const initialDeposit = usdToWei(
        (syntheticPoolConfig as any).initialDeposit,
        web3,
      );

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
      await moneyMarket.mintTo(syntheticPool.address, initialDeposit);
      await syntheticPool.approveToProtocol(initialDeposit);

      for (const pair of (syntheticPoolConfig as any).tradingPairs) {
        const token = fTokensMapping[`f${pair.name}`].address;
        const spread = floatUsdToWei(pair.spread);

        await syntheticPool.enableToken(token, spread);
      }

      (syntheticPool as any).poolName = (syntheticPoolConfig as any).name;
      syntheticPools.push(syntheticPool);
    }

    // margin liquidity pool
    const marginPools = [];
    const marginPoolConfigs = deploymentConfig.margin.pools;

    for (const marginPoolConfig of marginPoolConfigs) {
      const initialDeposit = usdToWei(
        (marginPoolConfig as any).initialDeposit,
        web3,
      );

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
      await moneyMarket.mintTo(marginPool.address, initialDeposit);
      await marginPool.approveToProtocol(initialDeposit);

      await marginLiquidityPoolRegistry.registerPool(marginPool.address);
      await marginLiquidityPoolRegistry.verifyPool(marginPool.address);

      for (const pair of (marginPoolConfig as any).tradingPairs) {
        const [baseSymbol, quoteSymbol] = pair.name.split('/');
        const base =
          baseSymbol === 'USD'
            ? baseToken.address
            : fTokensMapping[`f${baseSymbol}`].address;
        const quote =
          quoteSymbol === 'USD'
            ? baseToken.address
            : fTokensMapping[`f${quoteSymbol}`].address;

        const spread = floatUsdToWei(pair.spread);
        const minLeveragedAmount = usdToWei(pair.minLeveragedAmount, web3);
        const minLeverage = pair.minLeverage.replace('x', '');
        const maxLeverage = pair.maxLeverage.replace('x', '');
        const additionalSwap = percentageToWei(pair.additionalSwap);

        // TODO minLeveragedAmount, minLeverage, maxLeverage, additionalSwap

        await marginPool.enableToken(base, quote, spread);
      }

      (marginPool as any).poolName = (marginPoolConfig as any).name;

      marginPools.push(marginPool);
    }

    const fTokensDeployment = ALL_CURRENCIES_KOVAN.reduce((acc, key) => {
      const current = {
        [key]: [fTokensMapping[`f${key}`], SyntheticFlowToken],
      };

      return { ...acc, ...current };
    }, {});
    const marginPoolsDeployment = marginPools.reduce((acc, pool) => {
      const current = {
        [`marginPool-${(pool as any).poolName}`]: [
          pool,
          MarginLiquidityPoolInterface,
        ],
      };

      return { ...acc, ...current };
    }, {});
    const syntheticPoolsDeployment = syntheticPools.reduce((acc, pool) => {
      const current = {
        [`syntheticPool-${(pool as any).poolName}`]: [
          pool,
          SyntheticLiquidityPoolInterface,
        ],
      };

      return { ...acc, ...current };
    }, {});

    const deployment = {
      moneyMarket: [moneyMarket, MoneyMarket],
      iToken: [iToken, ERC20Detailed],
      oracle: [oracle, PriceOracleInterface],
      syntheticProtocol: [protocol, SyntheticFlowProtocol],
      ...fTokensDeployment,
      marginProtocol: [marginProtocol, MarginFlowProtocol],
      marginProtocolSafety: [marginProtocolSafety, MarginFlowProtocolSafety],
      marginProtocolConfig: [marginProtocolConfig, MarginFlowProtocolConfig],
      marginPoolRegistry: [
        marginLiquidityPoolRegistry,
        MarginLiquidityPoolRegistry,
      ],
      ...marginPoolsDeployment,
      ...syntheticPoolsDeployment,
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
