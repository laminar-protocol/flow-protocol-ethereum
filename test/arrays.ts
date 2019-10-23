import { expect } from 'chai';
import { expectRevert } from 'openzeppelin-test-helpers';
import { QuickImplInstance, ArraysImplInstance } from 'types/truffle-contracts';

import { bn } from './helpers';

const QuickImpl = artifacts.require('QuickImpl');

contract('QuickImpl', () => {
  let quick: QuickImplInstance;

  beforeEach(async () => {
    quick = await QuickImpl.new();
  });

  describe('Kth smallest quick select', () => {
    it('should fail if k out of bound', async () => {
      await expectRevert(quick.select([], 0), 'k out of bound');
      await expectRevert(quick.select([1], 1), 'k out of bound');
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
    });
  });
});

const ArraysImpl = artifacts.require('ArraysImpl');

contract('ArrayImpl', () => {
  let arrays: ArraysImplInstance;

  beforeEach(async () => {
    arrays = await ArraysImpl.new();
  });

  describe('Find median', () => {
    it('empty array fails', async () => {
      await expectRevert(arrays.findMedian([]), 'empty array has no median');
    });

    it('odd length', async () => {
      expect(await arrays.findMedian([1])).bignumber.equal(bn(1));
      expect(await arrays.findMedian([2, 1, 3])).bignumber.equal(bn(2));
      expect(await arrays.findMedian([4, 5, 2, 1, 6, 3, 7])).bignumber.equal(bn(4));
      expect(await arrays.findMedian([7, 5, 2, 6, 1, 3, 4])).bignumber.equal(bn(4));
      expect(await arrays.findMedian([7, 5, 4, 6, 1, 3, 2])).bignumber.equal(bn(4));
    });

    it('even length', async () => {
      expect(await arrays.findMedian([2, 1])).bignumber.equal(bn(2));
      expect(await arrays.findMedian([4, 1, 2, 3])).bignumber.equal(bn(3));
      expect(await arrays.findMedian([3, 2, 4, 1])).bignumber.equal(bn(3));
      expect(await arrays.findMedian([2, 4, 3, 1])).bignumber.equal(bn(3));
    });
  });
});
