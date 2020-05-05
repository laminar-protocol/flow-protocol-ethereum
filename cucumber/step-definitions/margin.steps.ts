import { Given, TableDefinition, Then } from 'cucumber';
import Web3 from 'web3';
import { Account } from 'web3-core';
import { assert, expect } from 'chai';
import BN from 'bn.js';

import baseTokenAbi from '../../artifacts/development/abi/ERC20Detailed.json';
import flowMarginProtocolAbi from '../../artifacts/development/abi/MarginFlowProtocol.json';
import flowMarginProtocolSafetyAbi from '../../artifacts/development/abi/MarginFlowProtocolSafety.json';
import poolAbi from '../../artifacts/development/abi/MarginLiquidityPoolInterface.json';
import priceOracleAbi from '../../artifacts/development/abi/SimplePriceOracle.json';
import deployment from '../../artifacts/development/deployment.json';

const web3 = new Web3('http://localhost:8545');

let lastCheckedPoolLiquidity = web3.utils.toWei(new BN(20000)); // 20000 ETH initial liquidity
let firstPositionId = 0;

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
const flowMarginProtocolSafetyAddress = deployment.marginProtocolSafety;
const flowMarginProtocolSafetyContract = new web3.eth.Contract(
  flowMarginProtocolSafetyAbi as any,
  flowMarginProtocolSafetyAddress,
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
  const parsed = amount.replace(/%|-/g, '');
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

const closeAllPositions = async (name: string): Promise<any> => {
  const from = accountOf(name);

  const openPositions = parseInt(
    await flowMarginProtocolContract.methods
      .getPositionsByPoolAndTraderLength(poolAddress, from.address)
      .call(),
    10,
  );

  for (let i = 0; i < openPositions; i += 1) {
    const positionId = await flowMarginProtocolContract.methods
      .getPositionIdByPoolAndTraderAndIndex(poolAddress, from.address, i)
      .call();
    await sendTx({
      contractMethod: flowMarginProtocolContract.methods.closePosition(
        positionId,
        0,
      ),
      from,
      to: flowMarginProtocolAddress,
    });
  }
};

const emptyAccount = async (name: string): Promise<any> => {
  await closeAllPositions(name);

  const from = accountOf(name);
  const balance = await flowMarginProtocolContract.methods
    .balances(poolAddress, from.address)
    .call();

  if (balance !== '0')
    await sendTx({
      from,
      contractMethod: flowMarginProtocolContract.methods.withdraw(
        poolAddress,
        balance,
      ),
      to: flowMarginProtocolAddress,
    });

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

const getTraderDepositsSum = async () => {
  const TRADER_MARGIN_CALL_FEE = new BN(
    await flowMarginProtocolSafetyContract.methods
      .TRADER_MARGIN_CALL_FEE()
      .call(),
  );
  const TRADER_LIQUIDATION_FEE = new BN(
    await flowMarginProtocolSafetyContract.methods
      .TRADER_LIQUIDATION_FEE()
      .call(),
  );
  return TRADER_MARGIN_CALL_FEE.add(TRADER_LIQUIDATION_FEE);
};

Given(/accounts/, async (table: TableDefinition) => {
  firstPositionId = await flowMarginProtocolContract.methods
    .nextPositionId()
    .call();

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
  await sendTx({
    contractMethod: oracleContract.methods.setOracleDeltaSnapshotLimit(
      web3.utils.toWei('10000'),
    ),
    to: oracleAddress,
  });
  await sendTx({
    contractMethod: oracleContract.methods.setOracleDeltaLastLimit(
      web3.utils.toWei('10000'),
    ),
    to: oracleAddress,
  });

  await new Promise((resolve, reject) => {
    (web3 as any).currentProvider.send(
      {
        jsonrpc: '2.0',
        method: 'evm_increaseTime',
        params: [172800],
        id: new Date().getTime(),
      },
      (err: string, result: string) => (err ? reject(err) : resolve(result)),
    );
  });
  await sendTx({
    contractMethod: oracleContract.methods.feedPrice(
      baseTokenAddress,
      web3.utils.toWei('1'),
    ),
    to: oracleAddress,
  });

  for (const [currency, price] of table.rows()) {
    const oraclePrice = parseAmount(price);
    const key = parseCurrency(currency);

    await sendTx({
      contractMethod: oracleContract.methods.feedPrice(key, oraclePrice),
      to: oracleAddress,
    });
  }
});

Given('margin spread', async (table: TableDefinition) => {
  for (const [pair, value] of table.rows()) {
    const spreadValue = parseAmount(value);
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
    const { baseAddress, quoteAddress } = parseTradingPair(pair);
    const longSwapRate = parseSwapRate(long);
    const shortSpread = parseSwapRate(short);

    await sendTx({
      contractMethod: flowMarginProtocolContract.methods.setCurrentSwapRateForPair(
        baseAddress,
        quoteAddress,
        longSwapRate,
        shortSpread,
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
        1,
        1,
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

    const traderHasPaidDeposits = await flowMarginProtocolSafetyContract.methods
      .traderHasPaidDeposits(poolAddress, from.address)
      .call();

    if (!traderHasPaidDeposits) {
      const depositsSum = await getTraderDepositsSum();
      await approveUsd({
        from,
        to: flowMarginProtocolSafetyAddress,
        amount: depositsSum,
      });
      await sendTx({
        contractMethod: flowMarginProtocolSafetyContract.methods.payTraderDeposits(
          poolAddress,
        ),
        from,
        to: flowMarginProtocolSafetyAddress,
      });
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
    const depositsSum = new BN(await getTraderDepositsSum());
    const expectedTokenBalanceWithFees = parseAmount(expectedTokenBalanceString)
      .sub(depositsSum)
      .toString();
    const expectedTokenBalance = parseAmount(
      expectedTokenBalanceString,
    ).toString();
    const expectedBalance = parseAmount(expectedBalanceString)
      .mul(new BN(10)) // to iToken
      .toString();

    const tokenBalance = await baseTokenContract.methods
      .balanceOf(from.address)
      .call();
    const balance = await flowMarginProtocolContract.methods
      .balances(poolAddress, from.address)
      .call();

    console.log({
      expectedTokenBalanceWithFees: expectedTokenBalanceWithFees.toString(),
      expectedTokenBalance: expectedTokenBalance.toString(),
      tokenBalance: tokenBalance.toString(),
      balance: balance.toString(),
      expectedBalance: expectedBalance.toString(),
    });

    expect([expectedTokenBalanceWithFees, expectedTokenBalance]).to.include(
      tokenBalance,
    );
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
    const positionId = new BN(firstPositionId.toString()).add(new BN(id));

    await sendTx({
      contractMethod: flowMarginProtocolContract.methods.closePosition(
        positionId,
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
    const withdrawAmount = parseAmount(amount).mul(new BN(10));

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

Given('margin trader margin call', async (table: TableDefinition) => {
  for (const [name, result] of table.rows()) {
    const trader = accountOf(name);

    try {
      await sendTx({
        contractMethod: flowMarginProtocolSafetyContract.methods.marginCallTrader(
          poolAddress,
          trader.address,
        ),
        to: flowMarginProtocolSafetyAddress,
      });
      if (result !== 'Ok')
        expect.fail(`Trader margin call should have reverted, but didnt!`);
    } catch (error) {
      if (result === 'Ok')
        expect.fail(`Trader margin call should not have reverted: ${error}`);
      else if (result === 'SafeTrader') expect(error.message).to.contain('TM2');
    }
  }
});

Given('margin trader liquidate', async (table: TableDefinition) => {
  for (const [name, result] of table.rows()) {
    const trader = accountOf(name);

    try {
      await sendTx({
        contractMethod: flowMarginProtocolSafetyContract.methods.liquidateTrader(
          poolAddress,
          trader.address,
        ),
        to: flowMarginProtocolSafetyAddress,
      });
      if (result !== 'Ok')
        expect.fail(`Trader liquidation should have reverted, but didnt!`);
    } catch (error) {
      if (result === 'Ok')
        expect.fail(`Trader liquidation should not have reverted: ${error}`);
      else if (result === 'NotReachedRiskThreshold')
        expect(error.message).to.contain('TL1');
    }
  }
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
Given('margin set accumulate', (table: TableDefinition) => {
  /* for (const [pair, frequency, offset] of table.rows()) {
    const { baseAddress, quoteAddress } = parseTradingPair(pair);
    const swapUnit = parseAmount(frequency);
    const swapOffset = parseAmount(offset);
  } */
  // not applicable in ETH
});

Given('margin create liquidity pool', () => {
  // use existing pool
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
      if (result !== 'Ok')
        expect.fail(`Deposit should have reverted, but didnt!`);
    } catch (error) {
      if (result === 'Ok')
        expect.fail(`Deposit should not have reverted: ${error}`);
      else if (result === 'BalanceTooLow')
        expect(error.message).to.contain('SafeERC20: low-level call failed');
    }
  }
});

Then(/margin liquidity is \$(\d*)/, async (amount: string) => {
  const balanceInPool = new BN(
    await flowMarginProtocolContract.methods
      .balances(poolAddress, poolAddress)
      .call(),
  );
  const liquidity = new BN(await poolContract.methods.getLiquidity().call())
    .add(balanceInPool)
    .div(new BN(10))
    .toString();

  lastCheckedPoolLiquidity = lastCheckedPoolLiquidity.add(parseAmount(amount));
  assert.equal(liquidity, lastCheckedPoolLiquidity.toString());
});
