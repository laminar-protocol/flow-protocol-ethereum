import { Given, setDefaultTimeout, TableDefinition, Then } from 'cucumber';
import Web3 from 'web3';
import { Account } from 'web3-core';
import { assert, expect } from 'chai';
import BN from 'bn.js';

import erc20Abi from '../../artifacts/development/abi/ERC20Detailed.json';
import flowMarginProtocolAbi from '../../artifacts/development/abi/MarginFlowProtocol.json';
import flowMarginProtocolConfigAbi from '../../artifacts/development/abi/MarginFlowProtocolConfig.json';
import flowMarginProtocolSafetyAbi from '../../artifacts/development/abi/MarginFlowProtocolSafety.json';
import poolAbi from '../../artifacts/development/abi/MarginLiquidityPoolInterface.json';
import priceOracleAbi from '../../artifacts/development/abi/SimplePriceOracle.json';
import deployment from '../../artifacts/development/deployment.json';

const web3 = new Web3('http://localhost:8545');

setDefaultTimeout(10000);

const ONE_DAY = 86400;
const PRICE_EXPIRE_TIME = ONE_DAY * 2;
const SWAP_UNIT = 60 * 60 * 24 * 3650;
let firstPositionId = '0';

const iTokenAddress = deployment.iToken;
const iTokenContract = new web3.eth.Contract(erc20Abi as any, iTokenAddress);

const baseTokenAddress = deployment.baseToken;
const baseTokenContract = new web3.eth.Contract(
  erc20Abi as any,
  baseTokenAddress,
);

const flowMarginProtocolAddress = deployment.marginProtocol;
const flowMarginProtocolContract = new web3.eth.Contract(
  flowMarginProtocolAbi as any,
  flowMarginProtocolAddress,
);
const flowMarginProtocolConfigAddress = deployment.marginProtocolConfig;
const flowMarginProtocolConfigContract = new web3.eth.Contract(
  flowMarginProtocolConfigAbi as any,
  flowMarginProtocolConfigAddress,
);
const flowMarginProtocolSafetyAddress = deployment.marginProtocolSafety;
const flowMarginProtocolSafetyContract = new web3.eth.Contract(
  flowMarginProtocolSafetyAbi as any,
  flowMarginProtocolSafetyAddress,
);

const poolAddress = deployment.marginPoolGeneral;
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

  return deployment[parsed as 'fEUR' | 'fJPY' | 'fXAU'];
};

const parseAmount = (amount: string): BN => {
  const isDollar = amount.includes('$');
  const parsed = amount
    .replace(' ', '')
    .replace('$', '')
    .replace('_', '');
  return new BN(isDollar ? web3.utils.toWei(parsed) : parsed);
};

const parseSwapRate = (amount: string): BN => {
  const isNegative = amount.includes('-');
  const parsed = amount.replace(/%|-/g, '');
  const onePercentSpread = new BN(web3.utils.toWei('1')).div(new BN(100));

  return onePercentSpread
    .mul(new BN(parseFloat(parsed) * 100 * (isNegative ? -1 : 1)))
    .div(new BN(100));
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

const emptyPool = async (): Promise<any> => {
  const protocolPoolBalance = new BN(
    await flowMarginProtocolContract.methods
      .balances(poolAddress, poolAddress)
      .call(),
  );
  const poolBalance = new BN(
    await iTokenContract.methods.balanceOf(poolAddress).call(),
  );
  const balance = protocolPoolBalance.add(poolBalance);

  if (!balance.isNeg())
    await sendTx({
      contractMethod: poolContract.methods.withdrawLiquidityOwner(balance),
      to: poolAddress,
    });
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
  const base = tradingPair.slice(0, 3) as 'USD' | 'EUR' | 'JPY' | 'AUX';
  const quote = tradingPair.slice(3) as 'USD' | 'EUR' | 'JPY' | 'AUX';

  return {
    baseAddress: tokenStringToAddress[base],
    quoteAddress: tokenStringToAddress[quote],
  };
};

const forceCloseForPool = async (
  from: Account,
  offset: number,
): Promise<number> => {
  const positionsCount = parseInt(
    await flowMarginProtocolContract.methods
      .getPositionsByPoolAndTraderLength(poolAddress, from.address)
      .call(),
    10,
  );

  const totalOffset = parseInt(firstPositionId, 10) + offset;

  for (let i = 0; i < positionsCount; i += 1) {
    await sendTx({
      from,
      contractMethod: flowMarginProtocolContract.methods.closePositionForLiquidatedPool(
        i + totalOffset,
      ),
      to: flowMarginProtocolAddress,
    });
  }

  return positionsCount;
};

const getTraderDepositsSum = async () => {
  const traderMarginDeposits = new BN(
    await flowMarginProtocolConfigContract.methods
      .traderMarginCallDeposit()
      .call(),
  );
  const traderLiquidationDeposits = new BN(
    await flowMarginProtocolConfigContract.methods
      .traderLiquidationDeposit()
      .call(),
  );
  return traderMarginDeposits.add(traderLiquidationDeposits);
};

const increaseTimeBy = (time: number) =>
  new Promise((resolve, reject) => {
    (web3 as any).currentProvider.send(
      {
        jsonrpc: '2.0',
        method: 'evm_increaseTime',
        params: [time],
        id: new Date().getTime(),
      },
      (err: string, result: string) => (err ? reject(err) : resolve(result)),
    );
  });

Given(/accounts/, async (table: TableDefinition) => {
  firstPositionId = await flowMarginProtocolContract.methods
    .nextPositionId()
    .call();

  await Promise.all(
    table.rows().map(row => transfer(row[0], parseAmount('$0.1'))),
  );

  await emptyAccount('Alice');
  await emptyAccount('Bob');

  await Promise.all(
    table.rows().map(row => transferUsd(row[0], parseAmount(row[1]))),
  );

  await emptyPool();
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
    contractMethod: oracleContract.methods.setExpireIn(PRICE_EXPIRE_TIME),
    to: oracleAddress,
  });
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
  await increaseTimeBy(PRICE_EXPIRE_TIME);
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
        0, // markup
      ),
      to: poolAddress,
    });
  }
});

Given(
  /margin set min leveraged amount to \$(\d*)/,
  async (leveragedAmount: string) => {
    await sendTx({
      contractMethod: poolContract.methods.setMinLeverageAmount(
        leveragedAmount,
      ),
      to: poolAddress,
    });
  },
);

Given(
  /margin set default min leveraged amount to \$(\d*)/,
  async (defaultMinLeveragedAmount: string) => {
    await sendTx({
      contractMethod: poolContract.methods.setMinLeverageAmount(
        defaultMinLeveragedAmount,
      ),
      to: poolAddress,
    });
  },
);

Given('margin set swap rate', async (table: TableDefinition) => {
  for (const [pair, long, short] of table.rows()) {
    const { baseAddress, quoteAddress } = parseTradingPair(pair);
    const longSwapRate = parseSwapRate(long);
    const shortSwapRate = parseSwapRate(short);

    await sendTx({
      contractMethod: flowMarginProtocolConfigContract.methods.setCurrentSwapRateForPair(
        baseAddress,
        quoteAddress,
        longSwapRate,
        shortSwapRate,
      ),
      to: flowMarginProtocolConfigAddress,
    });
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

Given(/margin execute block (\d*)..(\d*)/, async (from: string, to: string) => {
  await sendTx({
    contractMethod: oracleContract.methods.setExpireIn(SWAP_UNIT * 100),
    to: oracleAddress,
  });

  const lastFromDigit = parseInt(from.charAt(from.length - 1), 10);
  const lastToDigit = parseInt(to.charAt(to.length - 1), 10);

  const diff =
    (parseInt(to.replace(/.$/, '0'), 10) -
      parseInt(from.replace(/.$/, '0'), 10)) /
    10;
  const swapTimes =
    diff - (lastFromDigit < 2 ? 0 : 1) + (lastToDigit > 1 ? 1 : 0);

  await increaseTimeBy(swapTimes * SWAP_UNIT + 1);
  await sendTx({
    contractMethod: poolContract.methods.setMinLeverageAmount(100),
    to: poolAddress,
  });
});

Then(
  /margin set additional swap (.*)% for (.*)/,
  async (additionalSwapRate: string, tradingPair: string) => {
    const { baseAddress, quoteAddress } = parseTradingPair(tradingPair);
    const swapRate = parseSwapRate(additionalSwapRate);

    await sendTx({
      contractMethod: poolContract.methods.setCurrentSwapRateMarkupForPair(
        baseAddress,
        quoteAddress,
        swapRate,
      ),
      to: poolAddress,
    });
  },
);

Given(/margin enable trading pair (\D*)/, async (tradingPair: string) => {
  const { baseAddress, quoteAddress } = parseTradingPair(tradingPair);

  const isWhitelisted = await flowMarginProtocolConfigContract.methods
    .tradingPairWhitelist(baseAddress, quoteAddress)
    .call();

  if (!isWhitelisted)
    await sendTx({
      contractMethod: flowMarginProtocolConfigContract.methods.addTradingPair(
        baseAddress,
        quoteAddress,
        SWAP_UNIT,
        1,
        1,
      ),
      to: flowMarginProtocolConfigAddress,
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

    const expectedEquity = new BN(parseAmount(expectedEquityString))
      .mul(new BN(10))
      .toString();
    const expectedFreeMargin = new BN(parseAmount(expectedFreeMarginString))
      .mul(new BN(10))
      .toString();
    const expectedMarginHeld = new BN(parseAmount(expectedMarginHeldString))
      .mul(new BN(10))
      .toString();

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

Given('margin liquidity pool margin call', async (table: TableDefinition) => {
  for (const [result] of table.rows()) {
    try {
      await sendTx({
        contractMethod: flowMarginProtocolSafetyContract.methods.marginCallLiquidityPool(
          poolAddress,
        ),
        to: flowMarginProtocolSafetyAddress,
      });
      if (result !== 'Ok')
        expect.fail(`Pool margin call should have reverted, but didnt!`);
    } catch (error) {
      if (result === 'Ok')
        expect.fail(`Pool margin call should not have reverted: ${error}`);
      else if (result === 'SafePool') expect(error.message).to.contain('PM2');
    }
  }
});

Then('margin liquidity pool liquidate', async (table: TableDefinition) => {
  for (const [result] of table.rows()) {
    try {
      const enpThreshold = await flowMarginProtocolConfigContract.methods
        .liquidityPoolENPLiquidateThreshold()
        .call();
      const ellThreshold = await flowMarginProtocolConfigContract.methods
        .liquidityPoolELLLiquidateThreshold()
        .call();
      const enpAndEll = await flowMarginProtocolSafetyContract.methods
        .getEnpAndEll(poolAddress)
        .call();
      console.log({
        enp: enpAndEll['0'].toString(),
        ell: enpAndEll['1'].toString(),
        enpThreshold: enpThreshold.toString(),
        ellThreshold: ellThreshold.toString(),
      });
      await sendTx({
        contractMethod: flowMarginProtocolSafetyContract.methods.liquidateLiquidityPool(
          poolAddress,
        ),
        to: flowMarginProtocolSafetyAddress,
      });
      if (result !== 'Ok')
        expect.fail(`Pool liquidation call should have reverted, but didnt!`);

      const alicePositionCount = await forceCloseForPool(alice, 0);

      await forceCloseForPool(bob, alicePositionCount);
    } catch (error) {
      if (result === 'Ok')
        expect.fail(`Pool liquidation call should not have reverted: ${error}`);
      else if (result === 'NotReachedRiskThreshold')
        expect(error.message).to.contain('PL1');
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
        expect(error.message).to.satisfy(
          (m: string) =>
            m.includes('SafeERC20: low-level call failed') ||
            m.includes('ERC20: transfer amount exceeds balance'),
        );
    }
  }
});

Then(/treasury balance is (.*)/, async (amount: string) => {
  const treasuryAccount = await flowMarginProtocolSafetyContract.methods
    .laminarTreasury()
    .call();
  const iTokenBalanceTreasury = new BN(
    await iTokenContract.methods.balanceOf(treasuryAccount).call(),
  )
    .div(new BN(10))
    .toString();

  assert.equal(iTokenBalanceTreasury, parseAmount(amount).toString());
});

Then(/margin liquidity is (.*)/, async (amount: string) => {
  const balanceInProtocol = new BN(
    await flowMarginProtocolContract.methods
      .balances(poolAddress, poolAddress)
      .call(),
  );
  const liquidity = new BN(await poolContract.methods.getLiquidity().call())
    .add(balanceInProtocol)
    .div(new BN(10))
    .toString();

  assert.equal(liquidity, parseAmount(amount).toString());
});
