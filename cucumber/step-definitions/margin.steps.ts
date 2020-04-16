import { Given, TableDefinition, Then } from 'cucumber';
import Web3 from 'web3';
import { Account } from 'web3-core';
import { assert } from 'chai';
import BN from 'bn.js';

const web3 = new Web3('http://localhost:8545');

const alice = web3.eth.accounts.create();
const bob = web3.eth.accounts.create();

const accountOf = (name: string): Account => {
  const accounts: any = {
    Alice: alice,
    Bob: bob,
  };
  return accounts[name];
};

const transfer = async (to: string, amount: BN) => {
  const accounts = await web3.eth.getAccounts();
  await web3.eth.sendTransaction({
    to: accountOf(to).address,
    from: accounts[0],
    value: amount,
  });
};

const parseAmount = (amount: string): BN => {
  const parsed = amount
    .replace(' ', '')
    .replace('$', '')
    .replace('_', '');
  return new BN(web3.utils.toWei(parsed));
};

Given(/accounts/, async (table: TableDefinition) => {
  await Promise.all(
    table.rows().map(row => transfer(row[0], parseAmount(row[1]))),
  );
});

Given(/transfer to/, async (table: TableDefinition) => {
  await Promise.all(
    table.rows().map(row => transfer(row[0], parseAmount(row[1]))),
  );
});

Then(/Alice balance is \$(\d*)/, async (amount: string) => {
  const balance = await web3.eth.getBalance(alice.address);
  assert.equal(balance, parseAmount(amount).toString());
});

Then(/Bob balance is \$(\d*)/, async (amount: string) => {
  const balance = await web3.eth.getBalance(alice.address);
  assert.equal(balance, parseAmount(amount).toString());
});
