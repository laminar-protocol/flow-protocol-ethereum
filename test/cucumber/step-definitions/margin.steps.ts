import { Given, TableDefinition, Before } from 'cucumber';
import ganache from 'ganache-core';
import Web3 from 'web3';
import { Account } from 'web3-core';
import BN from 'bn.js';

import abi from '../../../artifacts/development/abi/LiquidityPoolInterface.json';
import deployment from '../../../artifacts/development/deployment.json';

const web3 = new Web3(ganache.provider() as any);

const poolAddress = deployment['pool'];
const poolContract = new web3.eth.Contract(abi as any, poolAddress);

let alice: Account;
let bob: Account;

Before(async () => {
  alice = web3.eth.accounts.create();
  bob = web3.eth.accounts.create();
});

const accountOf = (name: string): Account => {
  let accounts: any = {
    Alice: alice,
    Bob: bob,
  };
  return accounts[name];
}

const transfer = async (name: string, amount: BN) => {
  const accounts = await web3.eth.getAccounts();
  await web3.eth.sendTransaction({ to: accountOf(name).address, from: accounts[0], value: amount});
};

const parseAmount = (amount: string): BN => {
  const parsed = amount.replace(' ', '').replace('$', '').replace('_', '');
  return web3.utils.toBN(parsed).mul(new BN(10 ** 12));
};

Given(/accounts/, async (table: TableDefinition) => {
  await Promise.all(table.rows().map((row) => transfer(row[0], parseAmount(row[1]))));
});

Given(/create liquidity pool/, async () => {});

Given(/deposit liquidity/, async (table: TableDefinition) => {
  for (const [name, amount] of table.rows()) {
    const calldata = poolContract.methods.depositLiquidity(parseAmount(amount)).encodeABI();
    const from = accountOf(name);
    const tx = {
      from: from.address,
      to: poolAddress,
      data: calldata,
      gas: 400000,
    };
    const { rawTransaction } = await from.signTransaction(tx);
    await web3.eth.sendSignedTransaction(rawTransaction!);
  }
});

Given(/margin liquidity is \$(\d*)/, async (amount: string) => {
  const liquidity = await poolContract.methods.getLiquidity().call();
  assert.equal(liquidity, parseAmount(amount));
});
