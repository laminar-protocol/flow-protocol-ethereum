import {expectRevert, time} from 'openzeppelin-test-helpers';
import {expect} from 'chai';
import {SimplePriceOracleInstance} from 'types/truffle-contracts';
import BN from 'bn.js';
import web3 from 'web3';

import * as helper from './helpers';

const Proxy = artifacts.require('Proxy');
const SimplePriceOracle = artifacts.require('SimplePriceOracle');
const SimplePriceOracleNewVersion = artifacts.require(
  'SimplePriceOracleNewVersion',
);

contract('SimplePriceOracle', (accounts) => {
  const owner = accounts[0];
  const priceFeeder = accounts[1];
  const priceFeederTwo = accounts[2];
  const fToken = accounts[3];
  const fTokenTwo = accounts[4];
  const badAddress = accounts[5];

  let oracle: SimplePriceOracleInstance;

  beforeEach(async () => {
    const oracleImpl = await SimplePriceOracle.new();
    const oracleProxy = await Proxy.new();
    await oracleProxy.upgradeTo(oracleImpl.address);

    oracle = await SimplePriceOracle.at(oracleProxy.address);
    await (oracle as any).initialize();
    await oracle.addPriceFeeder(priceFeeder);
  });

  // Send a `SimplePriceOracle.getPrice` tx and get the call return value.
  const getPrice = async (
    priceOracle: SimplePriceOracleInstance,
    key: string,
  ): Promise<BN> => {
    await priceOracle.getPrice(key);
    const price = await priceOracle.getPrice.call(key);
    return web3.utils.toBN(price.toString());
  };

  describe('feed and get price', () => {
    it('should get 0 for unavailable token', async () => {
      expect(await getPrice(oracle, badAddress)).bignumber.equal(helper.ZERO);
    });

    it('should be able to feed and get new price', async () => {
      await oracle.feedPrice(fToken, 100, {from: priceFeeder});
      expect(await getPrice(oracle, fToken)).bignumber.equal(helper.bn(100));
      expect(await getPrice(oracle, fTokenTwo)).bignumber.equal(helper.ZERO);

      await oracle.feedPrice(fTokenTwo, 110, {from: priceFeeder});
      expect(await getPrice(oracle, fToken)).bignumber.equal(helper.bn(100));
      expect(await getPrice(oracle, fTokenTwo)).bignumber.equal(helper.bn(110));
    });

    it('requires price feeder role to feed price', async () => {
      await expectRevert(
        oracle.feedPrice(fToken, 100, {from: owner}),
        helper.messages.onlyPriceFeeder,
      );
      await expectRevert(
        oracle.feedPrice(fToken, 100, {from: badAddress}),
        helper.messages.onlyPriceFeeder,
      );
    });
  });

  describe('get median non-expired price', () => {
    it('multiple feeds', async () => {
      await oracle.addPriceFeeder(owner);
      await oracle.addPriceFeeder(priceFeederTwo);
      await oracle.feedPrice(fToken, 99);
      await oracle.feedPrice(fToken, 101, {from: priceFeederTwo});
      await oracle.feedPrice(fToken, 103, {from: priceFeeder});

      expect(await getPrice(oracle, fToken)).bignumber.equal(helper.bn(101));
    });

    it('should return price 0 if all prices expired', async () => {
      await oracle.setExpireIn(2);
      await oracle.feedPrice(fToken, 100, {from: priceFeeder});
      await oracle.addPriceFeeder(priceFeederTwo);
      await oracle.feedPrice(fToken, 100, {from: priceFeederTwo});

      await time.increase(2);
      expect(await getPrice(oracle, fToken)).bignumber.equal(helper.bn(0));
    });

    it('should filter out expired price', async () => {
      await oracle.setExpireIn(2);
      await oracle.addPriceFeeder(owner);
      await oracle.addPriceFeeder(priceFeederTwo);

      await oracle.feedPrice(fToken, 99);
      await time.increase(2);

      await oracle.feedPrice(fToken, 103, {from: priceFeederTwo});
      await oracle.feedPrice(fToken, 101, {from: priceFeeder});

      expect(await getPrice(oracle, fToken)).bignumber.equal(helper.bn(103));
    });
  });

  describe('oracle config', () => {
    it('should be able to set config', async () => {
      await oracle.setOracleDeltaLastLimit(123);
      expect(await oracle.oracleDeltaLastLimit()).bignumber.equal(
        helper.bn(123),
      );

      await oracle.setOracleDeltaSnapshotLimit(456);
      expect(await oracle.oracleDeltaSnapshotLimit()).bignumber.equal(
        helper.bn(456),
      );

      await oracle.setOracleDeltaSnapshotTime(789);
      expect(await oracle.oracleDeltaSnapshotTime()).bignumber.equal(
        helper.bn(789),
      );
    });

    it('requires owner to set config', async () => {
      await expectRevert(
        oracle.setOracleDeltaLastLimit(123, {from: badAddress}),
        helper.messages.onlyOwner,
      );
      await expectRevert(
        oracle.setOracleDeltaLastLimit(123, {from: priceFeeder}),
        helper.messages.onlyOwner,
      );

      await expectRevert(
        oracle.setOracleDeltaSnapshotLimit(456, {from: badAddress}),
        helper.messages.onlyOwner,
      );
      await expectRevert(
        oracle.setOracleDeltaSnapshotLimit(456, {from: priceFeeder}),
        helper.messages.onlyOwner,
      );

      await expectRevert(
        oracle.setOracleDeltaSnapshotTime(789, {from: badAddress}),
        helper.messages.onlyOwner,
      );
      await expectRevert(
        oracle.setOracleDeltaSnapshotTime(789, {from: priceFeeder}),
        helper.messages.onlyOwner,
      );
    });
  });

  // Feed a price by owner as feeder, send a `SimplePriceOracle.getPrice` and return updated price.
  const setPriceByOwner = async (
    priceOracle: SimplePriceOracleInstance,
    key: string,
    price: number,
  ): Promise<BN> => {
    await priceOracle.feedPrice(key, price);
    return getPrice(priceOracle, key);
  };

  describe('price cap', () => {
    describe('last price', () => {
      beforeEach(async () => {
        await oracle.setOracleDeltaLastLimit(helper.fromPercent(10));
        await oracle.setOracleDeltaSnapshotLimit(helper.fromPercent(1000));
        await oracle.addPriceFeeder(owner);
        await setPriceByOwner(oracle, fToken, 1000);
      });

      it('should allow increase less than cap', async () => {
        expect(await setPriceByOwner(oracle, fToken, 1099)).bignumber.equal(
          helper.bn(1099),
        );
        expect(await setPriceByOwner(oracle, fToken, 1207)).bignumber.equal(
          helper.bn(1207),
        );
      });

      it('should allow decrease less than cap', async () => {
        expect(await setPriceByOwner(oracle, fToken, 901)).bignumber.equal(
          helper.bn(901),
        );
        expect(await setPriceByOwner(oracle, fToken, 811)).bignumber.equal(
          helper.bn(811),
        );
      });

      it('should cap increase', async () => {
        expect(await setPriceByOwner(oracle, fToken, 1101)).bignumber.equal(
          helper.bn(1100),
        );
        expect(await setPriceByOwner(oracle, fToken, 1211)).bignumber.equal(
          helper.bn(1210),
        );
      });

      it('should cap decrease', async () => {
        expect(await setPriceByOwner(oracle, fToken, 899)).bignumber.equal(
          helper.bn(900),
        );
        expect(await setPriceByOwner(oracle, fToken, 798)).bignumber.equal(
          helper.bn(810),
        );
      });
    });

    describe('snapshot price price', () => {
      beforeEach(async () => {
        await oracle.setOracleDeltaLastLimit(helper.fromPercent(1000));
        await oracle.setOracleDeltaSnapshotLimit(helper.fromPercent(10));
        await oracle.setOracleDeltaSnapshotTime(30);
        await oracle.addPriceFeeder(owner);
        await setPriceByOwner(oracle, fToken, 1000);
      });

      it('should allow increase less than cap', async () => {
        await setPriceByOwner(oracle, fToken, 950);
        expect(await setPriceByOwner(oracle, fToken, 1099)).bignumber.equal(
          helper.bn(1099),
        );
      });

      it('should allow decrease less than cap', async () => {
        await setPriceByOwner(oracle, fToken, 1050);
        expect(await setPriceByOwner(oracle, fToken, 901)).bignumber.equal(
          helper.bn(901),
        );
      });

      it('should cap increase', async () => {
        await setPriceByOwner(oracle, fToken, 1050);
        expect(await setPriceByOwner(oracle, fToken, 1101)).bignumber.equal(
          helper.bn(1100),
        );
        expect(await setPriceByOwner(oracle, fToken, 1102)).bignumber.equal(
          helper.bn(1100),
        );
      });

      it('should cap decrease', async () => {
        await setPriceByOwner(oracle, fToken, 950);
        expect(await setPriceByOwner(oracle, fToken, 899)).bignumber.equal(
          helper.bn(900),
        );
        expect(await setPriceByOwner(oracle, fToken, 898)).bignumber.equal(
          helper.bn(900),
        );
      });

      it('should take new snapshot', async () => {
        await time.increase(29);
        await setPriceByOwner(oracle, fToken, 1100); // this is not new snapshot

        await time.increase(2);
        await setPriceByOwner(oracle, fToken, 900); // this is the new snapshot

        expect(await setPriceByOwner(oracle, fToken, 1000)).bignumber.equal(
          helper.bn(990),
        );

        await time.increase(31);
        expect(await setPriceByOwner(oracle, fToken, 1001)).bignumber.equal(
          helper.bn(990),
        ); // new snapshot

        expect(await setPriceByOwner(oracle, fToken, 1100)).bignumber.equal(
          helper.bn(1089),
        );
      });
    });
  });

  describe('price feeder', () => {
    it('should be able to query price feeder', async () => {
      expect(await oracle.isPriceFeeder(owner)).to.be.false;
      expect(await oracle.isPriceFeeder(priceFeeder)).to.be.true;
      expect(await oracle.isPriceFeeder(badAddress)).to.be.false;
    });

    it('should allow owner to add price feeder', async () => {
      await oracle.addPriceFeeder(priceFeederTwo);
      expect(await oracle.isPriceFeeder(priceFeederTwo)).to.be.true;
    });

    it('should allow owner to remove price feeder', async () => {
      await oracle.removePriceFeeder(priceFeeder);
      expect(await oracle.isPriceFeeder(priceFeeder)).to.be.false;
    });

    it('should allow price feeder to renounce role', async () => {
      await oracle.renouncePriceFeeder({from: priceFeeder});
      expect(await oracle.isPriceFeeder(priceFeeder)).to.be.false;
    });

    it('should only allow owner to change price feeder', async () => {
      await expectRevert(
        oracle.addPriceFeeder(badAddress, {from: priceFeeder}),
        helper.messages.onlyOwner,
      );
      await expectRevert(
        oracle.addPriceFeeder(badAddress, {from: badAddress}),
        helper.messages.onlyOwner,
      );
      await expectRevert(
        oracle.removePriceFeeder(priceFeeder, {from: priceFeeder}),
        helper.messages.onlyOwner,
      );
      await expectRevert(
        oracle.removePriceFeeder(priceFeeder, {from: badAddress}),
        helper.messages.onlyOwner,
      );
    });
  });

  describe('when upgrading the contract', () => {
    it('upgrades the contract', async () => {
      const oracleProxy = await Proxy.at(oracle.address);
      const oracleImpl = await SimplePriceOracleNewVersion.new();
      await oracleProxy.upgradeTo(oracleImpl.address);
      const newOracle = await SimplePriceOracleNewVersion.at(
        oracleProxy.address,
      );
      const value = helper.bn(345);
      const firstBytes32 =
        '0x18e5f16b91bbe0defc5ee6bc25b514b030126541a8ed2fc0b69402452465cc00';
      const secondBytes32 =
        '0x18e5f16b91bbe0defc5ee6bc25b514b030126541a8ed2fc0b69402452465cc99';

      const newValueBefore = await newOracle.newStorageUint();
      await newOracle.addNewStorageBytes32(firstBytes32);
      await newOracle.setNewStorageUint(value);
      await newOracle.addNewStorageBytes32(secondBytes32);
      const newValueAfter = await newOracle.newStorageUint();
      const newStorageByte1 = await newOracle.newStorageBytes32(0);
      const newStorageByte2 = await newOracle.newStorageBytes32(1);

      expect(newValueBefore).to.be.bignumber.equal(helper.bn(0));
      expect(newValueAfter).to.be.bignumber.equal(value);
      expect(newStorageByte1).to.be.equal(firstBytes32);
      expect(newStorageByte2).to.be.equal(secondBytes32);
    });
  });
});
