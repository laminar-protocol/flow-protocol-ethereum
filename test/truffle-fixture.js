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
  const marginFlowProtocol = await MarginFlowProtocol.new();
  MarginFlowProtocol.setAsDeployed(marginFlowProtocol);
  const marginFlowProtocolSafety = await MarginFlowProtocolSafety.new();
  MarginFlowProtocolSafety.setAsDeployed(marginFlowProtocolSafety);
};
