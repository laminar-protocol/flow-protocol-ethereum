import { expect } from 'chai';
import { expectRevert } from 'openzeppelin-test-helpers';
import { bn } from './helpers';

import { QuickImplInstance } from 'types/truffle-contracts';

const ArraysImpl = artifacts.require('ArraysImpl');
const QuickImpl = artifacts.require('QuickImpl');

contract('QuickImpl', () => {
  let quick: QuickImplInstance;

  beforeEach(async () => {
    quick = await QuickImpl.new();
  });

  describe('Kth smallest quick select', () => {
    it('should fail if k out of bound', async () => {
      await expectRevert(quick.select([], 0), 'index out of bound');
      await expectRevert(quick.select([1], 1), 'index out of bound');
    });

    it('distinct items', async () => {
      expect(await quick.select([1], 0)).bignumber.equal(bn(1));
      expect(await quick.select([1, 2], 1)).bignumber.equal(bn(2));
      expect(await quick.select([2, 1, 3], 1)).bignumber.equal(bn(2));
      expect(await quick.select([3, 2, 1, 5, 6, 4], 4)).bignumber.equal(bn(5));
    });

    it('with some repeat items', async () => {
      expect(await quick.select([2, 2, 3], 1)).bignumber.equal(bn(2));
      expect(await quick.select([3, 2, 3, 1, 2, 4, 5, 5, 6], 5)).bignumber.equal(bn(4));
    })
  });
});
