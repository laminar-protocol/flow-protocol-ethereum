import { expectRevert } from 'openzeppelin-test-helpers';
import { expect } from 'chai';
import BN from 'bn.js';

import {
  MarginLiquidityPoolRegistryInstance,
  TestTokenInstance,
  MoneyMarketInstance,
} from 'types/truffle-contracts';
import {
  bn,
  createTestToken,
  createMoneyMarket,
  dollar,
  messages,
} from '../helpers';

const MarginLiquidityPoolRegistry = artifacts.require(
  'MarginLiquidityPoolRegistry',
);
const MarginLiquidityPoolRegistryNewVersion = artifacts.require(
  'MarginLiquidityPoolRegistryNewVersion',
);
const Proxy = artifacts.require('Proxy');

contract('MarginLiquidityPoolRegistry', accounts => {
  const liquidityProvider = accounts[1];
  const protocol = accounts[2];
  const alice = accounts[3];
  const newPool = accounts[4];

  let liquidityPoolRegistry: MarginLiquidityPoolRegistryInstance;
  let usd: TestTokenInstance;
  let moneyMarket: MoneyMarketInstance;

  beforeEach(async () => {
    usd = await createTestToken(
      [liquidityProvider, dollar(10000)],
      [protocol, dollar(10000)],
      [alice, dollar(10000)],
    );
    ({ moneyMarket } = await createMoneyMarket(usd.address));

    const liquidityPoolRegistryImpl = await MarginLiquidityPoolRegistry.new();
    const liquidityPoolRegistryProxy = await Proxy.new();
    await liquidityPoolRegistryProxy.upgradeTo(
      liquidityPoolRegistryImpl.address,
    );
    liquidityPoolRegistry = await MarginLiquidityPoolRegistry.at(
      liquidityPoolRegistryProxy.address,
    );
    await liquidityPoolRegistry.initialize(moneyMarket.address, protocol);
  });

  describe('when used by the procotol', () => {
    describe('when margin calling pool', () => {
      it('sets pool as margin called', async () => {
        expect(await liquidityPoolRegistry.isMarginCalled(newPool)).to.be.false;
        await liquidityPoolRegistry.marginCallPool(newPool, { from: protocol });
        expect(await liquidityPoolRegistry.isMarginCalled(newPool)).to.be.true;
      });

      it('reverts for non-protocol caller', async () => {
        await expectRevert(
          liquidityPoolRegistry.marginCallPool(newPool, { from: alice }),
          messages.onlyProtocol,
        );
      });

      it('reverts for already margin called pools', async () => {
        await liquidityPoolRegistry.marginCallPool(newPool, { from: protocol });
        await expectRevert(
          liquidityPoolRegistry.marginCallPool(newPool, { from: protocol }),
          messages.poolAlreadyMarginCalled,
        );
      });
    });

    describe('when making pool safe', () => {
      it('sets pool as safe', async () => {
        await liquidityPoolRegistry.marginCallPool(newPool, { from: protocol });
        expect(await liquidityPoolRegistry.isMarginCalled(newPool)).to.be.true;
        await liquidityPoolRegistry.makePoolSafe(newPool, { from: protocol });
        expect(await liquidityPoolRegistry.isMarginCalled(newPool)).to.be.false;
      });

      it('reverts for non-protocol caller', async () => {
        await liquidityPoolRegistry.marginCallPool(newPool, { from: protocol });
        await expectRevert(
          liquidityPoolRegistry.makePoolSafe(newPool, { from: alice }),
          messages.onlyProtocol,
        );
      });

      it('reverts for already safe pools', async () => {
        await expectRevert(
          liquidityPoolRegistry.makePoolSafe(newPool, { from: protocol }),
          messages.poolNotMarginCalled,
        );
      });
    });
  });

  describe('when managing pools', () => {
    describe('when registering new pools', () => {
      let poolOwnerBalanceBefore: BN;

      beforeEach(async () => {
        poolOwnerBalanceBefore = await usd.balanceOf(alice);

        const feeSum = (
          await liquidityPoolRegistry.LIQUIDITY_POOL_MARGIN_CALL_FEE()
        ).add(await liquidityPoolRegistry.LIQUIDITY_POOL_LIQUIDATION_FEE());
        await usd.approve(liquidityPoolRegistry.address, feeSum, {
          from: alice,
        });
        await liquidityPoolRegistry.registerPool(newPool, { from: alice });
      });

      it('sets pool as registered', async () => {
        expect(await liquidityPoolRegistry.poolHasPaidFees(newPool)).to.be.true;
      });

      it('transfers the feeSum', async () => {
        const LIQUIDITY_POOL_MARGIN_CALL_FEE = await liquidityPoolRegistry.LIQUIDITY_POOL_MARGIN_CALL_FEE();
        const LIQUIDITY_POOL_LIQUIDATION_FEE = await liquidityPoolRegistry.LIQUIDITY_POOL_LIQUIDATION_FEE();

        const poolOwnerBalanceAfter = await usd.balanceOf(alice);
        expect(poolOwnerBalanceAfter).to.be.bignumber.equals(
          poolOwnerBalanceBefore
            .sub(LIQUIDITY_POOL_MARGIN_CALL_FEE)
            .sub(LIQUIDITY_POOL_LIQUIDATION_FEE),
        );
      });

      it('allows only owner to verify pools', async () => {
        await expectRevert(
          liquidityPoolRegistry.registerPool(newPool, { from: alice }),
          messages.poolAlreadyPaidFees,
        );
      });
    });

    describe('when verifying pools', () => {
      beforeEach(async () => {
        const feeSum = (
          await liquidityPoolRegistry.LIQUIDITY_POOL_MARGIN_CALL_FEE()
        ).add(await liquidityPoolRegistry.LIQUIDITY_POOL_LIQUIDATION_FEE());
        await usd.approve(liquidityPoolRegistry.address, feeSum, {
          from: alice,
        });
      });

      it('sets pool as verified', async () => {
        await liquidityPoolRegistry.registerPool(newPool, { from: alice });
        await liquidityPoolRegistry.verifyPool(newPool);
        expect(await liquidityPoolRegistry.isVerifiedPool(newPool)).to.be.true;
      });

      it('requires that pool has paid fees', async () => {
        await expectRevert(
          liquidityPoolRegistry.verifyPool(newPool),
          messages.poolHasNotPaidFees,
        );
      });

      it('allows only owner to verify pools', async () => {
        await expectRevert(
          liquidityPoolRegistry.verifyPool(newPool, { from: alice }),
          messages.onlyOwner,
        );
      });

      it('allows only owner to verify pools', async () => {
        await liquidityPoolRegistry.registerPool(newPool, { from: alice });
        await liquidityPoolRegistry.verifyPool(newPool);

        await expectRevert(
          liquidityPoolRegistry.verifyPool(newPool),
          messages.poolAlreadyVerified,
        );
      });
    });
  });

  describe('when upgrading the contract', () => {
    it('upgrades the contract', async () => {
      const liquidityPoolRegistryProxy = await Proxy.at(
        liquidityPoolRegistry.address,
      );
      const newLiquidityPoolRegistryImpl = await MarginLiquidityPoolRegistryNewVersion.new();
      await liquidityPoolRegistryProxy.upgradeTo(
        newLiquidityPoolRegistryImpl.address,
      );
      const newLiquidityPoolRegistry = await MarginLiquidityPoolRegistryNewVersion.at(
        liquidityPoolRegistry.address,
      );
      const value = bn(345);
      const firstBytes32 =
        '0x18e5f16b91bbe0defc5ee6bc25b514b030126541a8ed2fc0b69402452465cc00';
      const secondBytes32 =
        '0x18e5f16b91bbe0defc5ee6bc25b514b030126541a8ed2fc0b69402452465cc99';

      const newValueBefore = await newLiquidityPoolRegistry.newStorageUint();
      await newLiquidityPoolRegistry.addNewStorageBytes32(firstBytes32);
      await newLiquidityPoolRegistry.setNewStorageUint(value);
      await newLiquidityPoolRegistry.addNewStorageBytes32(secondBytes32);
      const newValueAfter = await newLiquidityPoolRegistry.newStorageUint();
      const newStorageByte1 = await newLiquidityPoolRegistry.newStorageBytes32(
        0,
      );
      const newStorageByte2 = await newLiquidityPoolRegistry.newStorageBytes32(
        1,
      );

      expect(newValueBefore).to.be.bignumber.equal(bn(0));
      expect(newValueAfter).to.be.bignumber.equal(value);
      expect(newStorageByte1).to.be.equal(firstBytes32);
      expect(newStorageByte2).to.be.equal(secondBytes32);
    });
  });
});
