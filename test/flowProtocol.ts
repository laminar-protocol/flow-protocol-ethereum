import { expectRevert, constants } from 'openzeppelin-test-helpers';
import { expect } from 'chai';
import {
  SimplePriceOracleInstance, FlowProtocolInstance, LiquidityPoolInstance, TestTokenInstance,
  FlowTokenInstance, MoneyMarketInstance, IERC20Instance,
} from 'types/truffle-contracts';
import { createTestToken, createMoneyMarket, fromPercent, messages, bn, fromPip, dollar } from './helpers';

const FlowProtocol = artifacts.require('FlowProtocol');
const LiquidityPool = artifacts.require('LiquidityPool');
const SimplePriceOracle = artifacts.require('SimplePriceOracle');
const FlowToken = artifacts.require('FlowToken');

contract('FlowProtocol', (accounts) => {
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
    usd = await createTestToken([liquidityProvider, dollar(20000)], [alice, dollar(10000)], [bob, dollar(10000)]);
    ({ moneyMarket, iToken: iUsd } = await createMoneyMarket(usd.address, fromPercent(100)));
    protocol = await FlowProtocol.new(oracle.address, moneyMarket.address);
    fToken = await FlowToken.new('Euro', 'EUR', moneyMarket.address, protocol.address);
    await protocol.addFlowToken(fToken.address);

    await usd.approve(protocol.address, constants.MAX_UINT256, { from: alice });
    await usd.approve(protocol.address, constants.MAX_UINT256, { from: bob });
    await usd.approve(moneyMarket.address, constants.MAX_UINT256, { from: liquidityProvider });
    await iUsd.approve(protocol.address, constants.MAX_UINT256, { from: liquidityProvider });

    liquidityPool = await LiquidityPool.new(moneyMarket.address, fromPip(10));

    await liquidityPool.approve(protocol.address, constants.MAX_UINT256);
    await liquidityPool.enableToken(fToken.address);

    await moneyMarket.mintTo(liquidityPool.address, dollar(10000), { from: liquidityProvider });
    await moneyMarket.mint(dollar(10000), { from: liquidityProvider });

    await oracle.setPrice(fToken.address, fromPercent(100));
  });

  it('requires owner to create new token', async () => {
    await expectRevert(protocol.addFlowToken(fToken.address, { from: badAddress }), messages.onlyOwner);
  });

  const run = async (...actions: Array<() => any>) => {
    for (const act of actions) {
      await act();
    }
  };

  const buy = (addr: string, amount: number) => () => protocol.mint(fToken.address, liquidityPool.address, amount, { from: addr });
  const sell = (addr: string, amount: any) => () => protocol.redeem(fToken.address, liquidityPool.address, amount, { from: addr });
  const balance = (token: IERC20Instance, addr: string, amount: any) => async () =>
    expect(await token.balanceOf(addr)).bignumber.equal(bn(amount));
  const setPrice = (price: number) => () => oracle.setPrice(fToken.address, fromPercent(price));
  const liquidate = (addr: string, amount: number) => () => protocol.liquidate(fToken.address, liquidityPool.address, amount, { from: addr });
  const addCollateral = (from: string, token: string, pool: string, amount: number) => () => protocol.addCollateral(token, pool, amount, { from });
  const revert = (fn: () => Promise<any>, msg: string) => () => expectRevert(fn(), msg);

  it('able to buy and sell', async () => {
    await run(
      buy(alice, dollar(1001)),
      balance(fToken, alice, dollar(1000)),
      balance(usd, alice, dollar(8999)),
      balance(iUsd, fToken.address, dollar(1100)),
      balance(iUsd, liquidityPool.address, dollar(9901)),

      sell(alice, dollar(1000)),
      balance(fToken, alice, 0),
      balance(usd, alice, dollar(9998)),
      balance(iUsd, fToken.address, 0),
      balance(iUsd, liquidityPool.address, dollar(10002)),
    );
  });

  it('can take profit', async () => {
    await run(
      buy(alice, dollar(1001)),
      balance(fToken, alice, dollar(1000)),
      balance(usd, alice, dollar(8999)),
      balance(iUsd, fToken.address, dollar(1100)),
      balance(iUsd, liquidityPool.address, dollar(9901)),
      setPrice(105),

      sell(alice, dollar(1000)),
      balance(fToken, alice, 0),
      balance(usd, alice, '10047950000000000000000'),
      balance(iUsd, fToken.address, 0),
      balance(iUsd, liquidityPool.address, '9952050000000000000000'),
    );
  });

  it('can stop lost', async () => {
    await run(
      buy(alice, dollar(1001)),
      balance(fToken, alice, dollar(1000)),
      balance(usd, alice, dollar(8999)),
      balance(iUsd, fToken.address, dollar(1100)),
      balance(iUsd, liquidityPool.address, dollar(9901)),
      setPrice(95),

      sell(alice, dollar(1000)),
      balance(fToken, alice, 0),
      balance(usd, alice, '9948050000000000000000'),
      balance(iUsd, fToken.address, 0),
      balance(iUsd, liquidityPool.address, '10051950000000000000000'),
    );
  });

  it('support multiple users', async () => {
    await run(
      buy(alice, dollar(1001)),
      buy(bob, dollar(1001)),
      balance(fToken, alice, dollar(1000)),
      balance(fToken, bob, dollar(1000)),
      balance(usd, alice, dollar(8999)),
      balance(usd, bob, dollar(8999)),
      balance(iUsd, fToken.address, dollar(2200)),
      balance(iUsd, liquidityPool.address, dollar(9802)),

      setPrice(98),

      buy(alice, dollar(980)),
      sell(bob, dollar(500)),
      balance(fToken, alice, '1999000999000999000999'),
      balance(fToken, bob, dollar(500)),
      balance(usd, alice, dollar(8019)),
      balance(usd, bob, '9488510000000000000000'),
      balance(iUsd, fToken.address, '2693923076923076923076'),
      balance(iUsd, liquidityPool.address, '9798566923076923076924'),

      setPrice(100),

      sell(alice, dollar(998)),
      buy(bob, dollar(1020)),
      balance(fToken, alice, '1001000999000999000999'),
      balance(fToken, bob, '1518981018981018981018'),
      balance(usd, alice, '9016002000000000000000'),
      balance(usd, bob, '8468510000000000000000'),
      balance(iUsd, fToken.address, '2771980219780219780217'),
      balance(iUsd, liquidityPool.address, '9743507780219780219783'),

      setPrice(101),

      sell(alice, '1001000999000999000999'),
      sell(bob, '1518981018981018981018'),
      balance(fToken, alice, 0),
      balance(fToken, bob, 0),
      balance(usd, alice, '10026001997982017982017'),
      balance(usd, bob, '10001146658341658341657'),
      balance(iUsd, fToken.address, 0),
      balance(iUsd, liquidityPool.address, '9972851343676323676326'),
    );
  });

  describe('liquidate', () => {
    it('allow people to liquidate position', async () => {
      await run(
        buy(alice, dollar(1001)),
        setPrice(107),
        liquidate(alice, dollar(1000)),

        balance(fToken, alice, 0),
        balance(usd, alice, '10084989462616822430262'),
        balance(iUsd, fToken.address, 0),
        balance(iUsd, liquidityPool.address, '9915010537383177569738'),
      );
    });

    it('allow liqudity provider to topup collaterals', async () => {
      await run(
        buy(alice, dollar(1000)),
        setPrice(107),
        addCollateral(liquidityProvider, fToken.address, liquidityPool.address, dollar(100)),
        revert(liquidate(alice, dollar(999)), messages.stillSafe),
      );
    });

    it('not allow people to liquidate with safe position', async () => {
      await run(
        buy(alice, dollar(1000)),
        revert(liquidate(alice, dollar(999)), messages.stillSafe),
      );
    });

    it('allow to liquidate partially', async () => {
      await run(
        buy(alice, dollar(1001)),
        setPrice(107),
        liquidate(alice, dollar(500)),

        balance(fToken, alice, dollar(500)),
        balance(usd, alice, '9541994731308411215265'),
        balance(iUsd, fToken.address, '549999999999999999755'),
        balance(iUsd, liquidityPool.address, '9908005268691588784980'),

        liquidate(alice, dollar(500)),
        balance(fToken, alice, 0),
        balance(usd, alice, '10084989462616822430261'),
        balance(iUsd, fToken.address, 0),
        balance(iUsd, liquidityPool.address, '9915010537383177569739'),
      );
    });

    // TODO: check liquidation incentive amount calculation is correct
  });
});
