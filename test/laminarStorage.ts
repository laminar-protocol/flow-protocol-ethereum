import BN from 'bn.js';
import { expectRevert, constants } from 'openzeppelin-test-helpers';
import { expect } from 'chai';
import { LaminarStorageInstance } from 'types/truffle-contracts';
import { createLaminarStorage, bn, asciiToHex } from './helpers';

contract('LaminarStorage', accounts => {
  const alice = accounts[1];
  let laminarStorage: LaminarStorageInstance;
  let myHash: string;

  beforeEach(async () => {
    laminarStorage = await createLaminarStorage();
    myHash = asciiToHex('myHash');
  });

  it('should be able to store Uint', async () => {
    const myUint = 333;

    const uintBefore = await laminarStorage.getUint256(myHash);
    await laminarStorage.setUint256(myHash, myUint);
    const uintAfter = await laminarStorage.getUint256(myHash);

    expect(uintBefore).bignumber.equal(bn(0));
    expect(uintAfter).bignumber.equal(bn(myUint));
  });

  it('should be able to store Address', async () => {
    const addressBefore = await laminarStorage.getAddress(myHash);
    await laminarStorage.setAddress(myHash, alice);
    const addressAfter = await laminarStorage.getAddress(myHash);

    expect(addressBefore).equal(constants.ZERO_ADDRESS);
    expect(addressAfter).equal(alice);
  });

  it('should be able to store Bool', async () => {
    const boolBefore = await laminarStorage.getBool(myHash);
    await laminarStorage.setBool(myHash, true);
    const boolAfter = await laminarStorage.getBool(myHash);

    expect(boolBefore).equal(false);
    expect(boolAfter).equal(true);
  });
});
