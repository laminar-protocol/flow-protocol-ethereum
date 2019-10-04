import { expectRevert, constants } from 'openzeppelin-test-helpers';
import { expect } from 'chai';
import { createTestToken, createMoneyMarket, fromPercent, messages, bn, fromPip } from './helpers';
import { 
  SimplePriceOracleInstance, FlowProtocolInstance, LiquidityPoolInstance, TestTokenInstance,
  FlowTokenInstance, MoneyMarketInstance, IERC20Instance
} from 'types/truffle-contracts';

const FlowProtocol = artifacts.require("FlowProtocol");
const LiquidityPool = artifacts.require("LiquidityPool");
const SimplePriceOracle = artifacts.require("SimplePriceOracle");
const FlowToken = artifacts.require("FlowToken");

contract.only('FlowProtocol', accounts => {
  const owner = accounts[0];
  const liquidityProvider = accounts[1];
  const alice = accounts[2];
  const bob = accounts[3];
  const badAddress = accounts[4];

  let oracle: SimplePriceOracleInstance;
  let protocol: FlowProtocolInstance;
  let liquidityPool: LiquidityPoolInstance;
  let usd: TestTokenInstance;
  let iUsd: IERC20Instance;
  let fToken: FlowTokenInstance;
  let moneyMarket: MoneyMarketInstance;

  before(async () => {
    oracle = await SimplePriceOracle.new([owner]);
    await oracle.setOracleDeltaLastLimit(fromPercent(100));
    await oracle.setOracleDeltaSnapshotLimit(fromPercent(100));
  });

  beforeEach(async () => {
    usd = await createTestToken([liquidityProvider, 20000], [alice, 10000], [bob, 10000]);
    ({ moneyMarket, iToken: iUsd } = await createMoneyMarket(usd.address, fromPercent(100)));
    protocol = await FlowProtocol.new(oracle.address, moneyMarket.address);
    fToken = await FlowToken.new('Euro', 'EUR', moneyMarket.address, protocol.address);
    await protocol.addFlowToken(fToken.address);

    await usd.approve(protocol.address, constants.MAX_UINT256, { from: alice });
    await usd.approve(protocol.address, constants.MAX_UINT256, { from: bob });
    await usd.approve(moneyMarket.address, constants.MAX_UINT256, { from: liquidityProvider });
    
    liquidityPool = await LiquidityPool.new(protocol.address, moneyMarket.address, fromPip(10), [fToken.address]);
    await moneyMarket.mintTo(liquidityPool.address, 10000, { from: liquidityProvider });

    await oracle.setPrice(fToken.address, fromPercent(100));
  });

  it('requires owner to create new token', async () => {
    await expectRevert(protocol.addFlowToken(fToken.address, { from: badAddress }), messages.onlyOwner);
  });

  const buy = (addr: string, amount: number) => () => protocol.mint(fToken.address, liquidityPool.address, amount, { from: addr });
  const sell = (addr: string, amount: number) => () => protocol.redeem(fToken.address, liquidityPool.address, amount, { from: addr });
  const balance = (token: IERC20Instance, addr: string, amount: number) => async () => expect(await token.balanceOf(addr)).bignumber.equal(bn(amount));
  const setPrice = (price: number) => () => oracle.setPrice(fToken.address, fromPercent(price));
  const liquidate = (addr: string, amount: number) => () => protocol.liquidate(fToken.address, liquidityPool.address, amount, { from: addr });
  const addCollateral = (from: string, token: string, pool: string, amount: number) => () => protocol.addCollateral(token, pool, amount, { from });
  const revert = (fn: () => Promise<any>, msg: string) => () => expectRevert(fn(), msg);

  it.only('able to buy and sell', async () => {
    const actions = [
      buy(alice, 1001),
      balance(fToken, alice, 1000),
      balance(usd, alice, 8999),
      balance(iUsd, fToken.address, 1100),
      balance(iUsd, liquidityPool.address, 9901),

      sell(alice, 1000),
      balance(fToken, alice, 0),
      balance(usd, alice, 9998),
      balance(iUsd, fToken.address, 0),
      balance(iUsd, liquidityPool.address, 10002),
    ];

    for (const act of actions) {
      await act();
    }
  });

  it('can take profit', async () => {
    const actions = [
      buy(alice, 1001),
      balance(fToken, alice, 1000),
      balance(usd, alice, 8999),
      balance(usd, fToken.address, 1100),
      balance(usd, liquidityPool.address, 9901),
      setPrice(105),

      sell(alice, 1000),
      balance(fToken, alice, 0),
      balance(usd, alice, 10048),
      balance(usd, fToken.address, 0),
      balance(usd, liquidityPool.address, 9952),
    ];

    for (const act of actions) {
      await act();
    }
  });

  it('can stop lost', async () => {
    const actions = [
      buy(alice, 1001),
      balance(fToken, alice, 1000),
      balance(usd, alice, 8999),
      balance(usd, fToken.address, 1100),
      balance(usd, liquidityPool.address, 9901),
      setPrice(95),

      sell(alice, 1000),
      balance(fToken, alice, 0),
      balance(usd, alice, 9948),
      balance(usd, fToken.address, 0),
      balance(usd, liquidityPool.address, 10052),
    ];

    for (const act of actions) {
      await act();
    }
  });

  it('support multiple users', async () => {
    const actions = [
      buy(alice, 1001),
      buy(bob, 1001),
      balance(fToken, alice, 1000),
      balance(fToken, bob, 1000),
      balance(usd, alice, 8999),
      balance(usd, bob, 8999),
      balance(usd, fToken.address, 2200),
      balance(usd, liquidityPool.address, 9802),

      setPrice(98),

      buy(alice, 980),
      sell(bob, 500),
      balance(fToken, alice, 1998),
      balance(fToken, bob, 500),
      balance(usd, alice, 8019),
      balance(usd, bob, 9488),
      balance(usd, fToken.address, 2692),
      balance(usd, liquidityPool.address, 9801),

      setPrice(100),

      sell(alice, 998),
      buy(bob, 1020),
      balance(fToken, alice, 1000),
      balance(fToken, bob, 1518),
      balance(usd, alice, 9016),
      balance(usd, bob, 8468),
      balance(usd, fToken.address, 2769),
      balance(usd, liquidityPool.address, 9747),

      setPrice(101),

      sell(alice, 1000),
      sell(bob, 1518),
      balance(fToken, alice, 0),
      balance(fToken, bob, 0),
      balance(usd, alice, 10025),
      balance(usd, bob, 9999),
      balance(usd, fToken.address, 0),
      balance(usd, liquidityPool.address, 9976),
    ];

    for (const act of actions) {
      await act();
    }
  });

  describe('liquidate', () => {
    it('allow people to liquidate position', async () => {
      const actions = [
        buy(alice, 1001),
        setPrice(107),
        liquidate(alice, 1000),

        balance(fToken, alice, 0),
        balance(usd, alice, 10083),
        balance(usd, fToken.address, 0),
        balance(usd, liquidityPool.address, 9917),
      ];
      for (const act of actions) {
        await act();
      }
    });

    it('allow liqudity provider to topup collaterals', async () => {
      const actions = [
        buy(alice, 1000),
        setPrice(107),
        addCollateral(liquidityProvider, fToken.address, liquidityPool.address, 100),
        revert(liquidate(alice, 999), messages.stillSafe),
      ];
      for (const act of actions) {
        await act();
      }
    });

    it('not allow people to liquidate with safe position', async () => {
      const actions = [
        buy(alice, 1000),
        revert(liquidate(alice, 999), messages.stillSafe),
      ];
      for (const act of actions) {
        await act();
      }
    });

    it('allow to liquidate partially', async () => {
      const actions = [
        buy(alice, 1001),
        setPrice(107),
        liquidate(alice, 500),

        balance(fToken, alice, 500),
        balance(usd, alice, 9541),
        balance(usd, fToken.address, 549),
        balance(usd, liquidityPool.address, 9910),

        liquidate(alice, 500),
        balance(fToken, alice, 0),
        balance(usd, alice, 10082),
        balance(usd, fToken.address, 0),
        balance(usd, liquidityPool.address, 9918),
      ];
      for (const act of actions) {
        await act();
      }
    });
  });
});
