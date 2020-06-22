import BN from 'bn.js';
import chai from 'chai';
import chaiBN from 'chai-bn';
import web3 from 'web3';

import {constants} from 'openzeppelin-test-helpers';

import {
  SimplePriceOracleInstance,
  MoneyMarketInstance,
  Ierc20Instance,
  TestMarginFlowProtocolContract,
  MarginFlowProtocolAccPositionsContract,
  MarginFlowProtocolLiquidatedContract,
  MarginFlowProtocolSafetyContract,
} from 'types/truffle-contracts';

chai.use(chaiBN(BN));

const TestToken = artifacts.require('TestToken');
const TestCToken = artifacts.require('TestCToken');
const MoneyMarket = artifacts.require('MoneyMarket');
const Proxy = artifacts.require('Proxy');
const IERC20 = artifacts.require('IERC20');

const MarginFlowProtocolConfig = artifacts.require('MarginFlowProtocolConfig');
const MarginLiquidityPool = artifacts.require('MarginLiquidityPool');
const MarginLiquidityPoolRegistry = artifacts.require(
  'MarginLiquidityPoolRegistry',
);

export const fromEth = (val: number | string | BN): any =>
  new BN(val.toString()).div(web3.utils.toWei(new BN(1)));
export const fromPip = (val: number | string): any =>
  web3.utils.toWei(new BN(val)).div(new BN(10000));
export const fromPercent = (val: number | string): any =>
  web3.utils.toWei(new BN(val)).div(new BN(100));
export const dollar = (val: number | string): any => {
  if (typeof val === 'string') {
    return web3.utils.toWei(val);
  }
  return web3.utils.toWei(new BN(val));
};
export const yen = (val: number | string): any => dollar(val);
export const euro = (val: number | string): any => dollar(val);
export const bn = (val: number | string | bigint): any =>
  new BN(val.toString());
export const convertFromBaseToken = (
  baseTokenAmount: number | string | BN,
): BN => new BN(baseTokenAmount.toString()).mul(new BN(10));
export const convertToBaseToken = (baseTokenAmount: number | string | BN): BN =>
  new BN(baseTokenAmount.toString()).div(new BN(10));

export const ZERO = new BN(0);

export async function createTestToken(
  ...args: [string, number][]
): Promise<any> {
  const token = await TestToken.new();
  for (const [acc, amount] of args) {
    await token.transfer(acc, amount);
  }
  return token;
}

export async function createMoneyMarket(
  testTokenAddress: string,
  liquidity = fromPercent(100),
): Promise<any> {
  const cToken = await TestCToken.new(testTokenAddress);
  const moneyMarketProxy = await Proxy.new();
  const moneyMarketImpl = await MoneyMarket.new();
  await moneyMarketProxy.upgradeTo(moneyMarketImpl.address);
  const moneyMarket = await MoneyMarket.at(moneyMarketProxy.address);
  await (moneyMarket as any).initialize(
    // workaround since init is overloaded function which isnt supported by typechain yet
    cToken.address,
    'Test iToken',
    'iTEST',
    liquidity,
  );

  return {
    moneyMarket,
    cToken,
    iToken: await IERC20.at(await moneyMarket.iToken()),
  };
}

export async function createMarginProtocol(
  TestMarginFlowProtocol: TestMarginFlowProtocolContract,
  MarginFlowProtocolAccPositions: MarginFlowProtocolAccPositionsContract,
  MarginFlowProtocolLiquidated: MarginFlowProtocolLiquidatedContract,
  MarginFlowProtocolSafety: MarginFlowProtocolSafetyContract,
  oracle: SimplePriceOracleInstance,
  moneyMarket: MoneyMarketInstance,
  laminarTreasury: string,
  usd: Ierc20Instance,
  liquidityProvider: string,
  alice: string,
  bob: string,
  eur: string,
  jpy: string,
  initialSpread: BN,
  initialSwapRateLong: BN,
  initialSwapRateShort: BN,
  initialTraderRiskMarginCallThreshold: BN = fromPercent(5),
  initialTraderRiskLiquidateThreshold: BN = fromPercent(2),
  initialLiquidityPoolENPMarginThreshold: BN = fromPercent(50),
  initialLiquidityPoolELLMarginThreshold: BN = fromPercent(10),
  initialLiquidityPoolENPLiquidateThreshold: BN = fromPercent(20),
  initialLiquidityPoolELLLiquidateThreshold: BN = fromPercent(2),
): Promise<any> {
  const flowMarginProtocolImpl = await TestMarginFlowProtocol.new();
  const flowMarginProtocolProxy = await Proxy.new();
  await flowMarginProtocolProxy.upgradeTo(flowMarginProtocolImpl.address);
  const protocol = await TestMarginFlowProtocol.at(
    flowMarginProtocolProxy.address,
  );

  const flowMarginProtocolSafetyImpl = await MarginFlowProtocolSafety.new();
  const flowMarginProtocolSafetyProxy = await Proxy.new();
  await flowMarginProtocolSafetyProxy.upgradeTo(
    flowMarginProtocolSafetyImpl.address,
  );
  const protocolSafety = await MarginFlowProtocolSafety.at(
    flowMarginProtocolSafetyProxy.address,
  );

  const flowMarginProtocolLiquidatedImpl = await MarginFlowProtocolLiquidated.new();
  const flowMarginProtocolLiquidatedProxy = await Proxy.new();
  await flowMarginProtocolLiquidatedProxy.upgradeTo(
    flowMarginProtocolLiquidatedImpl.address,
  );
  const protocolLiquidated = await MarginFlowProtocolLiquidated.at(
    flowMarginProtocolLiquidatedProxy.address,
  );

  const flowMarginProtocolAccPositionsImpl = await MarginFlowProtocolAccPositions.new();
  const flowMarginProtocolAccPositionsProxy = await Proxy.new();
  await flowMarginProtocolAccPositionsProxy.upgradeTo(
    flowMarginProtocolAccPositionsImpl.address,
  );
  const protocolAccPositions = await MarginFlowProtocolAccPositions.at(
    flowMarginProtocolAccPositionsProxy.address,
  );

  const flowMarginProtocolConfigImpl = await MarginFlowProtocolConfig.new();
  const flowMarginProtocolConfigProxy = await Proxy.new();
  await flowMarginProtocolConfigProxy.upgradeTo(
    flowMarginProtocolConfigImpl.address,
  );
  const protocolConfig = await MarginFlowProtocolConfig.at(
    flowMarginProtocolConfigProxy.address,
  );

  const liquidityPoolRegistryImpl = await MarginLiquidityPoolRegistry.new();
  const liquidityPoolRegistryProxy = await Proxy.new();
  await liquidityPoolRegistryProxy.upgradeTo(liquidityPoolRegistryImpl.address);
  const liquidityPoolRegistry = await MarginLiquidityPoolRegistry.at(
    liquidityPoolRegistryProxy.address,
  );

  await (protocol as any).initialize(
    // eslint-disable-line
    oracle.address,
    moneyMarket.address,
    protocolConfig.address,
    protocolSafety.address,
    protocolLiquidated.address,
    protocolAccPositions.address,
    liquidityPoolRegistry.address,
  );
  const market = await protocol.market();
  await (protocolSafety as any).initialize(market, laminarTreasury);
  await (protocolConfig as any).initialize(
    dollar('0.1'),
    25,
    initialTraderRiskMarginCallThreshold,
    initialTraderRiskLiquidateThreshold,
    initialLiquidityPoolENPMarginThreshold,
    initialLiquidityPoolELLMarginThreshold,
    initialLiquidityPoolENPLiquidateThreshold,
    initialLiquidityPoolELLLiquidateThreshold,
  );

  await (protocolAccPositions as any).methods[
    'initialize((address,address,address,address,address,address,address,address,address))'
  ](market);
  await (protocolLiquidated as any).methods[
    'initialize((address,address,address,address,address,address,address,address,address))'
  ](market);
  await (liquidityPoolRegistry as any).methods[
    'initialize((address,address,address,address,address,address,address,address,address))'
  ](market);

  await usd.approve(protocol.address, constants.MAX_UINT256, {
    from: alice,
  });
  await usd.approve(protocol.address, constants.MAX_UINT256, {
    from: bob,
  });
  await usd.approve(moneyMarket.address, constants.MAX_UINT256, {
    from: liquidityProvider,
  });

  const liquidityPoolImpl = await MarginLiquidityPool.new();
  const liquidityPoolProxy = await Proxy.new();
  await liquidityPoolProxy.upgradeTo(liquidityPoolImpl.address);
  const liquidityPool = await MarginLiquidityPool.at(
    liquidityPoolProxy.address,
  );
  await (liquidityPool as any).initialize(
    moneyMarket.address,
    protocol.address, // need 3 pools or only use first one for withdraw tests
    1,
    50,
    2,
  );

  await liquidityPool.approveToProtocol(constants.MAX_UINT256);
  await usd.approve(liquidityPool.address, constants.MAX_UINT256);
  await liquidityPool.enableToken(usd.address, eur, initialSpread, 0);
  await liquidityPool.enableToken(eur, usd.address, initialSpread, 0);
  await liquidityPool.enableToken(eur, jpy, initialSpread, 0);
  await liquidityPool.enableToken(jpy, eur, initialSpread, 0);

  await usd.approve(liquidityPool.address, dollar(20000), {
    from: liquidityProvider,
  });
  await liquidityPool.depositLiquidity(dollar(20000), {
    from: liquidityProvider,
  });

  await usd.approve(protocolSafety.address, constants.MAX_UINT256, {
    from: alice,
  });
  await usd.approve(protocolSafety.address, constants.MAX_UINT256, {
    from: bob,
  });
  await protocolSafety.payTraderDeposits(liquidityPool.address, {
    from: alice,
  });
  await protocolSafety.payTraderDeposits(liquidityPool.address, {
    from: bob,
  });

  const feeSum = (await protocolConfig.poolLiquidationDeposit()).add(
    await protocolConfig.poolMarginCallDeposit(),
  );
  await usd.approve(liquidityPoolRegistry.address, feeSum, {
    from: liquidityProvider,
  });
  await liquidityPoolRegistry.registerPool(liquidityPool.address, {
    from: liquidityProvider,
  });
  await liquidityPoolRegistry.verifyPool(liquidityPool.address);
  await protocolConfig.addTradingPair(
    jpy,
    eur,
    60 * 60 * 8, // 8 hours
    initialSwapRateLong,
    initialSwapRateShort,
  );
  await protocolConfig.addTradingPair(
    usd.address,
    eur,
    60 * 60 * 8, // 8 hours
    initialSwapRateLong,
    initialSwapRateShort,
  );

  return {
    protocol,
    protocolConfig,
    protocolSafety,
    protocolLiquidated,
    protocolAccPositions,
    liquidityPoolRegistry,
    liquidityPool,
  };
}

export const messages = {
  onlyOwner: 'Ownable: caller is not the owner',
  onlyPriceFeeder: 'Caller doesnt have the PriceFeeder role',
  stillSafe: 'Still in a safe position',
  notEnoughLiquidationFee: 'Not enough to pay for liquidation fee',
  onlyOwnerCanClosePosition: 'Only position owner can close a safe position',
  onlyOwnerOrLiquidityPoolCanClosePosition:
    'Only position owner or liquidity pool can close a open position',
  askPriceTooHigh: 'Ask price too high',
  bidPriceTooLow: 'Bid price too low',
  poolNotSafeAfterWithdrawal: 'Pool not safe after withdrawal',
  onlyProtocol: 'Only protocol can call this function',
  onlyProtocolSafety: 'Only safety protocol can call this function',
  traderAlreadyMarginCalled: 'TM1',
  traderCannotBeMarginCalled: 'TM2',
  traderNotMarginCalled: 'TS1',
  traderCannotBeMadeSafe: 'TS2',
  poolAlreadyMarginCalled: 'PM1',
  poolCannotBeMarginCalled: 'PM2',
  poolNotMarginCalled: 'PS1',
  poolCannotBeMadeSafe: 'PS2',
  poolNotRegistered: 'LR1',
  poolLiquidated: 'LR2',
  poolNotPaidFees: 'PF1',
  poolNotVerified: 'PV1',
  notEnoughFreeMarginWithdraw: 'W1',
  mustCloseAllPositionsForLiquidatedPoolOrTrader: 'W2',
  traderCannotBeLiquidated: 'TL1',
  traderAlreadyLiquidated: 'TL2',
  cannotLiquidateTraderInStoppedPool: 'TL3',
  traderNotLiquidated: 'TL4',
  poolCannotBeLiquidated: 'PL1',
  marginAskPriceTooHigh: 'AP1',
  marginBidPriceTooLow: 'BP1',
  notEnoughFreeMarginOpenPosition: 'OP1',
  traderIsMarginCalled: 'OP2',
  poolIsMarginCalled: 'OP3',
  leverageTooSmall: 'OP4',
  leverageTooBig: 'OP5',
  leverageAmountTooSmall: 'OP6',
  traderLiquidated: 'OP7',
  notEnoughBalanceToPayDeposits: 'OP8',
  incorrectOwnerClosePosition: 'CP1',
  poolHasNotPaidFees: 'PF1',
  poolAlreadyVerified: 'PF2',
  poolAlreadyPaidFees: 'PR1',
  settingZeroValueNotAllowed: '0',
  tradingPairNotWhitelisted: 'TP1',
  tradingPairAlreadyWhitelisted: 'TP2',
  tradingPairTokensMustBeDifferent: 'TP3',
  canOnlyBeUsedBySafetyProtocol: 'SP1',
  canOnlyBeUsedByProtocol: 'P1',
  withdrawDepositRequireZeroPositions: 'WD1',
  onlyForLiquidatedPoolsOrTraders: 'CPL1',
  onlyOwnerCanCloseProfitPosition: 'CPL2',
  mustUseLiquidatedTraderCloseFunction: 'CPL3',
  estimatedIndexPositionIncorrect: 'R1',
};
