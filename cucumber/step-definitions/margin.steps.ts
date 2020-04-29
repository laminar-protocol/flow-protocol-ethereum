import { Given, TableDefinition, Then } from 'cucumber';
import Web3 from 'web3';
import { Account } from 'web3-core';
import { assert, expect } from 'chai';
import BN from 'bn.js';

import baseTokenAbi from '../../artifacts/development/abi/ERC20Detailed.json';
import flowMarginProtocolAbi from '../../artifacts/development/abi/MarginFlowProtocol.json';
import poolAbi from '../../artifacts/development/abi/MarginLiquidityPoolInterface.json';
import priceOracleAbi from '../../artifacts/development/abi/SimplePriceOracle.json';
import deployment from '../../artifacts/development/deployment.json';

const web3 = new Web3('http://localhost:8545');

let lastCheckedPoolLiquidity = web3.utils.toWei(new BN(20000)); // 20000 ETH initial liquidity

const baseTokenAddress = deployment.baseToken;
const baseTokenContract = new web3.eth.Contract(
  baseTokenAbi as any,
  baseTokenAddress,
);

const flowMarginProtocolAddress = deployment.marginProtocol;
const flowMarginProtocolContract = new web3.eth.Contract(
  flowMarginProtocolAbi as any,
  flowMarginProtocolAddress,
);

const poolAddress = deployment.marginPool;
const poolContract = new web3.eth.Contract(poolAbi as any, poolAddress);

const oracleAddress = deployment.oracle;
const oracleContract = new web3.eth.Contract(
  priceOracleAbi as any,
  oracleAddress,
);

const alice = web3.eth.accounts.create();
const bob = web3.eth.accounts.create();
const poolOwner = web3.eth.accounts.create();

const tokenStringToAddress = {
  USD: deployment.baseToken,
  EUR: deployment.fEUR,
  JPY: deployment.fJPY,
  AUX: deployment.fXAU,
  AAPL: deployment.fAAPL,
};

const accountOf = (name: string): Account => {
  const accounts: any = {
    Alice: alice,
    Bob: bob,
    Pool: poolOwner,
  };
  return accounts[name];
};

const transfer = async (to: string, amount: BN) => {
  const accounts = await web3.eth.getAccounts();
  await web3.eth.sendTransaction({
    to: accountOf(to).address,
    from: accounts[0],
    value: amount,
    gas: 10000000,
  });
};

const transferUsd = async (to: string, amount: BN): Promise<any> => {
  const accounts = await web3.eth.getAccounts();

  return web3.eth.sendTransaction({
    to: baseTokenAddress,
    from: accounts[0],
    data: baseTokenContract.methods
      .transfer(accountOf(to).address, amount)
      .encodeABI(),
    gas: await baseTokenContract.methods
      .transfer(accountOf(to).address, amount)
      .estimateGas(),
  });
};

const parseCurrency = (amount: string): string => {
  const parsed = amount.replace('F', 'f');

  return deployment[parsed as 'fEUR' | 'fJPY' | 'fXAU' | 'fAAPL'];
};

const parseAmount = (amount: string): BN => {
  const parsed = amount
    .replace(' ', '')
    .replace('$', '')
    .replace('_', '');
  return new BN(web3.utils.toWei(parsed));
};

const parseSwapRate = (amount: string): BN => {
  const parsed = amount.replace('%', '');
  const onePercentSpread = new BN(web3.utils.toWei('1')).div(new BN(100));
  return onePercentSpread.mul(new BN(parsed));
};

const parseLeverage = (leverage: string): BN => {
  const isLong = leverage.startsWith('Long');
  const value = leverage.replace(/Long |Short /, '');

  return new BN(value).mul(isLong ? new BN(1) : new BN(-1));
};

const sendTx = async ({
  from,
  contractMethod,
  to,
}: {
  from?: Account;
  contractMethod: any;
  to: string;
}) => {
  const tx = {
    from: from ? from.address : (await web3.eth.getAccounts())[0],
    to,
    data: contractMethod.encodeABI(),
    gas: 100000000,
  };

  if (!from) return web3.eth.sendTransaction(tx);

  const { rawTransaction } = await from.signTransaction(tx);
  return web3.eth.sendSignedTransaction(rawTransaction as string);
};

const emptyAccount = async (name: string): Promise<any> => {
  const from = accountOf(name);
  const currentBalance = await baseTokenContract.methods
    .balanceOf(from.address)
    .call();

  if (currentBalance !== '0')
    await sendTx({
      from,
      contractMethod: baseTokenContract.methods.transfer(
        (await web3.eth.getAccounts())[0],
        currentBalance,
      ),
      to: baseTokenAddress,
    });
};

const approveUsd = ({
  from,
  to,
  amount,
}: {
  from: Account;
  to: string;
  amount: BN;
}) =>
  sendTx({
    from,
    contractMethod: baseTokenContract.methods.approve(to, amount),
    to: baseTokenAddress,
  });

const parseTradingPair = (
  tradingPair: string,
): { baseAddress: string; quoteAddress: string } => {
  const base = tradingPair.slice(3) as 'USD' | 'EUR' | 'JPY' | 'AUX';
  const quote = tradingPair.slice(0, 3) as 'USD' | 'EUR' | 'JPY' | 'AUX';

  return {
    baseAddress: tokenStringToAddress[base],
    quoteAddress: tokenStringToAddress[quote],
  };
};

const getTraderFeeSum = async () => {
  const TRADER_MARGIN_CALL_FEE = new BN(
    await flowMarginProtocolContract.methods.TRADER_MARGIN_CALL_FEE().call(),
  );
  const TRADER_LIQUIDATION_FEE = new BN(
    await flowMarginProtocolContract.methods.TRADER_LIQUIDATION_FEE().call(),
  );
  return TRADER_MARGIN_CALL_FEE.add(TRADER_LIQUIDATION_FEE);
};

Given(/accounts/, async (table: TableDefinition) => {
  await Promise.all(
    table.rows().map(row => transfer(row[0], parseAmount('0.1'))),
  );

  await Promise.all(
    table
      .rows()
      .map(row =>
        emptyAccount(row[0]).then(() =>
          transferUsd(row[0], parseAmount(row[1])),
        ),
      ),
  );
});

Given(/transfer ETH to/, async (table: TableDefinition) => {
  await Promise.all(
    table.rows().map(row => transfer(row[0], parseAmount('1'))),
  );
});

Given(/transfer USD to/, async (table: TableDefinition) => {
  await Promise.all(
    table.rows().map(row => transferUsd(row[0], parseAmount(row[1]))),
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

Given('margin deposit', async (table: TableDefinition) => {
  for (const [name, amount] of table.rows()) {
    const from = accountOf(name);
    const depositAmount = parseAmount(amount);

    await approveUsd({
      from,
      to: flowMarginProtocolAddress,
      amount: depositAmount,
    });
    await sendTx({
      from,
      contractMethod: flowMarginProtocolContract.methods.deposit(
        poolAddress,
        depositAmount,
      ),
      to: flowMarginProtocolAddress,
    });
  }
});

Given('oracle price', async (table: TableDefinition) => {
  for (const [currency, price] of table.rows()) {
    const oraclePrice = parseAmount(price); // .div(new BN(100));
    const key = parseCurrency(currency);

    await sendTx({
      contractMethod: oracleContract.methods.feedPrice(key, oraclePrice),
      to: oracleAddress,
    });
  }
});

Given('margin spread', async (table: TableDefinition) => {
  for (const [pair, value] of table.rows()) {
    const spreadValue = parseAmount(value); // TODO? .div(new BN(10000));
    const { baseAddress, quoteAddress } = parseTradingPair(pair);

    await sendTx({
      contractMethod: poolContract.methods.enableToken(
        baseAddress,
        quoteAddress,
        spreadValue,
      ),
      to: poolAddress,
    });
  }
});

Given(
  /margin set min leveraged amount to \$(\d*)/,
  async (leveragedAmount: string) => {
    await sendTx({
      contractMethod: flowMarginProtocolContract.methods.setMinLeverageAmount(
        leveragedAmount,
      ),
      to: flowMarginProtocolAddress,
    });
  },
);

Given(
  /margin set default min leveraged amount to \$(\d*)/,
  async (defaultMinLeveragedAmount: string) => {
    await sendTx({
      contractMethod: flowMarginProtocolContract.methods.setMinLeverageAmount(
        defaultMinLeveragedAmount,
      ),
      to: flowMarginProtocolAddress,
    });
  },
);

Given('margin set swap rate', async (table: TableDefinition) => {
  for (const [pair, long, short] of table.rows()) {
    const { baseAddress, quoteAddress } = parseTradingPair(pair); // TODO
    const longSwapRate = parseSwapRate(long);
    const shortSpread = parseSwapRate(short); // TODO

    await sendTx({
      contractMethod: flowMarginProtocolContract.methods.setCurrentSwapRate(
        longSwapRate,
      ),
      to: flowMarginProtocolAddress,
    });
  }
});

Given(/margin enable trading pair (\D*)/, async (tradingPair: string) => {
  const { baseAddress, quoteAddress } = parseTradingPair(tradingPair);

  const isWhitelisted = await flowMarginProtocolContract.methods
    .tradingPairWhitelist(baseAddress, quoteAddress)
    .call();

  if (!isWhitelisted)
    await sendTx({
      contractMethod: flowMarginProtocolContract.methods.addTradingPair(
        baseAddress,
        quoteAddress,
      ),
      to: flowMarginProtocolAddress,
    });
});

Given('open positions', async (table: TableDefinition) => {
  for (const [name, pair, leverage, amount, price] of table.rows()) {
    const { baseAddress, quoteAddress } = parseTradingPair(pair);
    const from = accountOf(name);
    const openAmount = parseAmount(amount);
    const openPrice = parseAmount(price);
    const openLeverage = parseLeverage(leverage);

    const traderHasPaidFees = await flowMarginProtocolContract.methods
      .traderHasPaidFees(poolAddress, from.address)
      .call();

    if (!traderHasPaidFees) {
      const feeSum = await getTraderFeeSum();
      await approveUsd({ from, to: flowMarginProtocolAddress, amount: feeSum });
    }

    await sendTx({
      contractMethod: flowMarginProtocolContract.methods.openPosition(
        poolAddress,
        baseAddress,
        quoteAddress,
        openLeverage,
        openAmount,
        openPrice,
      ),
      from,
      to: flowMarginProtocolAddress,
    });
  }
});

Then('margin balances are', async (table: TableDefinition) => {
  for (const [
    name,
    expectedTokenBalanceString,
    expectedBalanceString,
  ] of table.rows()) {
    const from = accountOf(name);
    const feeSum = new BN(await getTraderFeeSum());
    const expectedTokenBalance = parseAmount(expectedTokenBalanceString)
      .sub(feeSum)
      .toString();
    const expectedBalance = parseAmount(expectedBalanceString)
      .mul(new BN(10)) // to iToken
      .toString();

    const tokenBalance = await baseTokenContract.methods
      .balanceOf(from.address)
      .call();
    const balance = await flowMarginProtocolContract.methods
      .balances(poolAddress, from.address)
      .call();

    assert.equal(tokenBalance, expectedTokenBalance);
    assert.equal(balance, expectedBalance);
  }
});

Then('trader margin positions are', async (table: TableDefinition) => {
  for (const [
    name,
    expectedEquityString,
    expectedFreeMarginString,
    expectedMarginHeldString,
  ] of table.rows()) {
    const from = accountOf(name);

    const expectedEquity = parseAmount(expectedEquityString).toString();
    const expectedFreeMargin = parseAmount(expectedFreeMarginString).toString();
    const expectedMarginHeld = parseAmount(expectedMarginHeldString).toString();

    const equity = await flowMarginProtocolContract.methods
      .getEquityOfTrader(poolAddress, from.address)
      .call();
    const freeMargin = await flowMarginProtocolContract.methods
      .getFreeMargin(poolAddress, from.address)
      .call();
    const marginHeld = await flowMarginProtocolContract.methods
      .getMarginHeld(poolAddress, from.address)
      .call();

    assert.equal(equity, expectedEquity);
    assert.equal(freeMargin, expectedFreeMargin);
    assert.equal(marginHeld, expectedMarginHeld);
  }
});

Given('close positions', async (table: TableDefinition) => {
  for (const [name, id, price] of table.rows()) {
    const from = accountOf(name);
    const closePrice = parseAmount(price);

    await sendTx({
      contractMethod: flowMarginProtocolContract.methods.closePosition(
        id,
        closePrice,
      ),
      from,
      to: flowMarginProtocolAddress,
    });
  }
});

Given('margin withdraw', async (table: TableDefinition) => {
  for (const [name, amount] of table.rows()) {
    const from = accountOf(name);
    const withdrawAmount = parseAmount(amount);

    await sendTx({
      from,
      contractMethod: flowMarginProtocolContract.methods.withdraw(
        poolAddress,
        withdrawAmount,
      ),
      to: flowMarginProtocolAddress,
    });
  }
});

Given('margin create liquidity pool', () => {
  // empty
});

Given('margin deposit liquidity', async (table: TableDefinition) => {
  for (const [name, amount, result] of table.rows()) {
    const from = accountOf(name);
    const depositAmount = parseAmount(amount);

    await approveUsd({
      from,
      to: poolAddress,
      amount: depositAmount,
    });

    try {
      await sendTx({
        from,
        contractMethod: poolContract.methods.depositLiquidity(depositAmount),
        to: poolAddress,
      });
    } catch (error) {
      if (result === 'OK')
        expect.fail(`Deposit should not have reverted: ${error}`);
      else if (result === 'BalanceTooLow')
        expect(error.message).to.contain('SafeERC20: low-level call failed');
    }
  }
});

Then(/margin liquidity is \$(\d*)/, async (amount: string) => {
  const liquidity = new BN(await poolContract.methods.getLiquidity().call())
    .div(new BN(10))
    .toString();

  lastCheckedPoolLiquidity = lastCheckedPoolLiquidity.add(parseAmount(amount));
  assert.equal(liquidity, lastCheckedPoolLiquidity.toString());
});
