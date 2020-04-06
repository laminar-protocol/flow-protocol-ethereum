const MoneyMarket = artifacts.require('MoneyMarket');
const Proxy = artifacts.require('Proxy');
const FlowProtocol = artifacts.require('FlowProtocol');
const FlowToken = artifacts.require('FlowToken');
const LiquidityPool = artifacts.require('LiquidityPool');
const SimplePriceOracle = artifacts.require('SimplePriceOracle');
const FlowMarginProtocol = artifacts.require('FlowMarginProtocol');
const MarginTradingPair = artifacts.require('MarginTradingPair');

module.exports = async () => {
  const moneyMarket = await MoneyMarket.new();
  MoneyMarket.setAsDeployed(moneyMarket);
  const proxy = await Proxy.new();
  Proxy.setAsDeployed(proxy);
  const flowProtocol = await FlowProtocol.new();
  FlowProtocol.setAsDeployed(flowProtocol);
  const flowToken = await FlowToken.new();
  FlowToken.setAsDeployed(flowToken);
  const liquidityPool = await LiquidityPool.new();
  LiquidityPool.setAsDeployed(liquidityPool);
  const simplePriceOracle = await SimplePriceOracle.new();
  SimplePriceOracle.setAsDeployed(simplePriceOracle);
  const flowMarginProtocol = await FlowMarginProtocol.new();
  FlowMarginProtocol.setAsDeployed(flowMarginProtocol);
  const marginTradingPair = await MarginTradingPair.new();
  MarginTradingPair.setAsDeployed(marginTradingPair);
};
