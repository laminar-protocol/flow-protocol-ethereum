const MoneyMarket = artifacts.require('MoneyMarket');
const Proxy = artifacts.require('Proxy');
const SyntheticFlowProtocol = artifacts.require('SyntheticFlowProtocol');
const SyntheticFlowToken = artifacts.require('SyntheticFlowToken');
const SyntheticLiquidityPool = artifacts.require('SyntheticLiquidityPool');
const MarginLiquidityPool = artifacts.require('MarginLiquidityPool');
const MarginLiquidityPoolRegistry = artifacts.require(
  'MarginLiquidityPoolRegistry',
);
const SimplePriceOracle = artifacts.require('SimplePriceOracle');
const MarginFlowProtocol = artifacts.require('MarginFlowProtocol');
const MarginFlowProtocolSafety = artifacts.require('MarginFlowProtocolSafety');
const MarginFlowProtocolConfig = artifacts.require('MarginFlowProtocolConfig');
const MarginMarketLib = artifacts.require('MarginMarketLib');

module.exports = async () => {
  const moneyMarket = await MoneyMarket.new();
  MoneyMarket.setAsDeployed(moneyMarket);
  const proxy = await Proxy.new();
  Proxy.setAsDeployed(proxy);
  const flowProtocol = await SyntheticFlowProtocol.new();
  SyntheticFlowProtocol.setAsDeployed(flowProtocol);
  const flowToken = await SyntheticFlowToken.new();
  SyntheticFlowToken.setAsDeployed(flowToken);
  const syntheticLiquidityPool = await SyntheticLiquidityPool.new();
  SyntheticLiquidityPool.setAsDeployed(syntheticLiquidityPool);
  const marginLiquidityPool = await MarginLiquidityPool.new();
  MarginLiquidityPool.setAsDeployed(marginLiquidityPool);
  const marginLiquidityPoolRegistry = await MarginLiquidityPoolRegistry.new();
  MarginLiquidityPoolRegistry.setAsDeployed(marginLiquidityPoolRegistry);
  const simplePriceOracle = await SimplePriceOracle.new();
  SimplePriceOracle.setAsDeployed(simplePriceOracle);

  const marginMarketLib = await MarginMarketLib.new();
  MarginMarketLib.setAsDeployed(marginMarketLib);

  try {
    MarginFlowProtocol.link(marginMarketLib);
  } catch (e) {
    // ignore
  }

  const marginFlowProtocol = await MarginFlowProtocol.new();
  MarginFlowProtocol.setAsDeployed(marginFlowProtocol);
  const marginFlowProtocolSafety = await MarginFlowProtocolSafety.new();
  MarginFlowProtocolSafety.setAsDeployed(marginFlowProtocolSafety);
  const marginFlowProtocolConfig = await MarginFlowProtocolConfig.new();
  MarginFlowProtocolConfig.setAsDeployed(marginFlowProtocolConfig);
};
