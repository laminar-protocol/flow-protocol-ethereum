import { expect } from 'chai';
import { MarginTradingPairInstance } from 'types/truffle-contracts';

import { bn, fromPercent, dollar } from './helpers';

const MarginTradingPair = artifacts.require('MarginTradingPair');
const MarginTradingPairNewVersion = artifacts.require(
  'MarginTradingPairNewVersion',
);
const Proxy = artifacts.require('Proxy');

contract('MarginTradingPair', accounts => {
  const moneyMarket = accounts[1];
  const protocol = accounts[2];
  const eur = accounts[3];

  let pair: MarginTradingPairInstance;

  beforeEach(async () => {
    const marginPairImpl = await MarginTradingPair.new();
    const marginPairProxy = await Proxy.new();
    await marginPairProxy.upgradeTo(marginPairImpl.address);
    pair = await MarginTradingPair.at(marginPairProxy.address);
    pair.initialize(protocol, moneyMarket, eur, -5, fromPercent(70), dollar(5));
  });

  describe('when upgrading the contract', () => {
    it('upgrades the contract', async () => {
      const marginTradingPairProxy = await Proxy.at(pair.address);
      const marginTradingPairImpl = await MarginTradingPairNewVersion.new();
      await marginTradingPairProxy.upgradeTo(marginTradingPairImpl.address);
      const marginTradingPair = await MarginTradingPairNewVersion.at(
        pair.address,
      );
      const value = bn(345);
      const firstBytes32 =
        '0x18e5f16b91bbe0defc5ee6bc25b514b030126541a8ed2fc0b69402452465cc00';
      const secondBytes32 =
        '0x18e5f16b91bbe0defc5ee6bc25b514b030126541a8ed2fc0b69402452465cc99';

      const newValueBefore = await marginTradingPair.newStorageUint();
      await marginTradingPair.addNewStorageBytes32(firstBytes32);
      await marginTradingPair.setNewStorageUint(value);
      await marginTradingPair.addNewStorageBytes32(secondBytes32);
      const newValueAfter = await marginTradingPair.newStorageUint();
      const newStorageByte1 = await marginTradingPair.newStorageBytes32(0);
      const newStorageByte2 = await marginTradingPair.newStorageBytes32(1);

      expect(newValueBefore).to.be.bignumber.equal(bn(0));
      expect(newValueAfter).to.be.bignumber.equal(value);
      expect(newStorageByte1).to.be.equal(firstBytes32);
      expect(newStorageByte2).to.be.equal(secondBytes32);
    });
  });
});
