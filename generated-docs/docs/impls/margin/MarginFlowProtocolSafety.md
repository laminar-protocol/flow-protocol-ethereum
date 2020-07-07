## Functions:

- [`initialize(struct MarginMarketLib.MarketData _market, address _laminarTreasury)`](#MarginFlowProtocolSafety-initialize-struct-MarginMarketLib-MarketData-address-)

- [`isPoolSafe(contract MarginLiquidityPoolInterface _pool)`](#MarginFlowProtocolSafety-isPoolSafe-contract-MarginLiquidityPoolInterface-)

- [`payTraderDeposits(contract MarginLiquidityPoolInterface _pool)`](#MarginFlowProtocolSafety-payTraderDeposits-contract-MarginLiquidityPoolInterface-)

- [`withdrawTraderDeposits(contract MarginLiquidityPoolInterface _pool)`](#MarginFlowProtocolSafety-withdrawTraderDeposits-contract-MarginLiquidityPoolInterface-)

- [`marginCallTrader(contract MarginLiquidityPoolInterface _pool, address _trader)`](#MarginFlowProtocolSafety-marginCallTrader-contract-MarginLiquidityPoolInterface-address-)

- [`makeTraderSafe(contract MarginLiquidityPoolInterface _pool, address _trader)`](#MarginFlowProtocolSafety-makeTraderSafe-contract-MarginLiquidityPoolInterface-address-)

- [`marginCallLiquidityPool(contract MarginLiquidityPoolInterface _pool)`](#MarginFlowProtocolSafety-marginCallLiquidityPool-contract-MarginLiquidityPoolInterface-)

- [`makeLiquidityPoolSafe(contract MarginLiquidityPoolInterface _pool)`](#MarginFlowProtocolSafety-makeLiquidityPoolSafe-contract-MarginLiquidityPoolInterface-)

- [`liquidateTrader(contract MarginLiquidityPoolInterface _pool, address _trader)`](#MarginFlowProtocolSafety-liquidateTrader-contract-MarginLiquidityPoolInterface-address-)

- [`liquidateLiquidityPool(contract MarginLiquidityPoolInterface _pool)`](#MarginFlowProtocolSafety-liquidateLiquidityPool-contract-MarginLiquidityPoolInterface-)

- [`isTraderSafe(contract MarginLiquidityPoolInterface _pool, address _trader)`](#MarginFlowProtocolSafety-isTraderSafe-contract-MarginLiquidityPoolInterface-address-)

- [`getMarginLevel(contract MarginLiquidityPoolInterface _pool, address _trader)`](#MarginFlowProtocolSafety-getMarginLevel-contract-MarginLiquidityPoolInterface-address-)

- [`getEnpAndEll(contract MarginLiquidityPoolInterface _pool)`](#MarginFlowProtocolSafety-getEnpAndEll-contract-MarginLiquidityPoolInterface-)

- [`getEquityOfPool(contract MarginLiquidityPoolInterface _pool)`](#MarginFlowProtocolSafety-getEquityOfPool-contract-MarginLiquidityPoolInterface-)

- [`getEstimatedRequiredDepositForPool(contract MarginLiquidityPoolInterface _pool)`](#MarginFlowProtocolSafety-getEstimatedRequiredDepositForPool-contract-MarginLiquidityPoolInterface-)

- [`__markTraderDepositsAsPaid(contract MarginLiquidityPoolInterface _pool, address _trader, uint256 _paidMarginITokens, uint256 _paidLiquidationITokens)`](#MarginFlowProtocolSafety-__markTraderDepositsAsPaid-contract-MarginLiquidityPoolInterface-address-uint256-uint256-)

- [`__withdrawTraderDeposits(contract MarginLiquidityPoolInterface _pool, address _trader)`](#MarginFlowProtocolSafety-__withdrawTraderDeposits-contract-MarginLiquidityPoolInterface-address-)

## Events:

- [`TraderMarginCalled(address liquidityPool, address sender)`](#MarginFlowProtocolSafety-TraderMarginCalled-address-address-)

- [`TraderBecameSafe(address liquidityPool, address sender)`](#MarginFlowProtocolSafety-TraderBecameSafe-address-address-)

- [`TraderLiquidated(address sender)`](#MarginFlowProtocolSafety-TraderLiquidated-address-)

- [`LiquidityPoolMarginCalled(address liquidityPool)`](#MarginFlowProtocolSafety-LiquidityPoolMarginCalled-address-)

- [`LiquidityPoolBecameSafe(address liquidityPool)`](#MarginFlowProtocolSafety-LiquidityPoolBecameSafe-address-)

- [`LiquidityPoolLiquidated(address liquidityPool)`](#MarginFlowProtocolSafety-LiquidityPoolLiquidated-address-)

### [Function `initialize(struct MarginMarketLib.MarketData _market, address _laminarTreasury)`](#MarginFlowProtocolSafety-initialize-struct-MarginMarketLib-MarketData-address-)

Initialize the MarginFlowProtocolSafety.

#### Parameters:

- `_market`: The market data.

- `_laminarTreasury`: The laminarTreasury.

### [Function `isPoolSafe(contract MarginLiquidityPoolInterface _pool) → bool`](#MarginFlowProtocolSafety-isPoolSafe-contract-MarginLiquidityPoolInterface-)

Ensure a pool is safe, based on equity delta, opened positions or plus a new one to open.

#### Parameters:

- `_pool`: The MarginLiquidityPool.

#### Return Values:

- true if ensured safe or false if not.

### [Function `payTraderDeposits(contract MarginLiquidityPoolInterface _pool)`](#MarginFlowProtocolSafety-payTraderDeposits-contract-MarginLiquidityPoolInterface-)

Pay the trader deposits

#### Parameters:

- `_pool`: The MarginLiquidityPool.

### [Function `withdrawTraderDeposits(contract MarginLiquidityPoolInterface _pool)`](#MarginFlowProtocolSafety-withdrawTraderDeposits-contract-MarginLiquidityPoolInterface-)

Withdraw the trader deposits, only possible when no positions are open.

#### Parameters:

- `_pool`: The MarginLiquidityPool.

### [Function `marginCallTrader(contract MarginLiquidityPoolInterface _pool, address _trader)`](#MarginFlowProtocolSafety-marginCallTrader-contract-MarginLiquidityPoolInterface-address-)

Margin call a trader, reducing his allowed trading functionality given a MarginLiquidityPool send `TRADER_MARGIN_CALL_FEE` to caller..

#### Parameters:

- `_pool`: The MarginLiquidityPool.

- `_trader`: The Trader.

### [Function `makeTraderSafe(contract MarginLiquidityPoolInterface _pool, address _trader)`](#MarginFlowProtocolSafety-makeTraderSafe-contract-MarginLiquidityPoolInterface-address-)

Enable full trading functionality for trader, undoing a previous `marginCallTrader` given a MarginLiquidityPool.

#### Parameters:

- `_pool`: The MarginLiquidityPool.

- `_trader`: The Trader.

### [Function `marginCallLiquidityPool(contract MarginLiquidityPoolInterface _pool)`](#MarginFlowProtocolSafety-marginCallLiquidityPool-contract-MarginLiquidityPoolInterface-)

Margin call a given MarginLiquidityPool, reducing its allowed trading functionality for all traders

send `LIQUIDITY_POOL_MARGIN_CALL_FEE` to caller..

#### Parameters:

- `_pool`: The MarginLiquidityPool.

### [Function `makeLiquidityPoolSafe(contract MarginLiquidityPoolInterface _pool)`](#MarginFlowProtocolSafety-makeLiquidityPoolSafe-contract-MarginLiquidityPoolInterface-)

Enable full trading functionality for pool, undoing a previous `marginCallLiquidityPool`.

#### Parameters:

- `_pool`: The MarginLiquidityPool.

### [Function `liquidateTrader(contract MarginLiquidityPoolInterface _pool, address _trader)`](#MarginFlowProtocolSafety-liquidateTrader-contract-MarginLiquidityPoolInterface-address-)

Liquidate trader due to funds running too low, close all positions and send `TRADER_LIQUIDATION_FEE` to caller.

#### Parameters:

- `_pool`: The MarginLiquidityPool.

- `_trader`: The trader address.

### [Function `liquidateLiquidityPool(contract MarginLiquidityPoolInterface _pool)`](#MarginFlowProtocolSafety-liquidateLiquidityPool-contract-MarginLiquidityPoolInterface-)

Liquidate pool due to funds running too low, distribute funds to all users and send `LIQUIDITY_POOL_LIQUIDATION_FEE` to caller.

#### Parameters:

- `_pool`: The MarginLiquidityPool.

### [Function `isTraderSafe(contract MarginLiquidityPoolInterface _pool, address _trader) → bool`](#MarginFlowProtocolSafety-isTraderSafe-contract-MarginLiquidityPoolInterface-address-)

Ensure a trader is safe, based on equity delta, opened positions or plus a new one to open.

#### Parameters:

- `_pool`: The MarginLiquidityPool.

- `_trader`: The trader.

#### Return Values:

- True if ensured safe or false if not.

### [Function `getMarginLevel(contract MarginLiquidityPoolInterface _pool, address _trader) → struct Percentage.SignedPercent`](#MarginFlowProtocolSafety-getMarginLevel-contract-MarginLiquidityPoolInterface-address-)

Get the margin level of a trader based on equity and net positions.

#### Parameters:

- `_pool`: The MarginLiquidityPool.

- `_trader`: The trader.

#### Return Values:

- The current margin level.

### [Function `getEnpAndEll(contract MarginLiquidityPoolInterface _pool) → struct Percentage.Percent, struct Percentage.Percent`](#MarginFlowProtocolSafety-getEnpAndEll-contract-MarginLiquidityPoolInterface-)

ENP and ELL. If `new_position` is `None`, return the ENP & ELL based on current positions,

else based on current positions plus this new one. If `equity_delta` is `None`, return

the ENP & ELL based on current equity of pool, else based on current equity of pool plus

the `equity_delta`.

#### Parameters:

- `_pool`: The MarginLiquidityPool.

#### Return Values:

- The current ENP and ELL as percentages.

### [Function `getEquityOfPool(contract MarginLiquidityPoolInterface _pool) → int256`](#MarginFlowProtocolSafety-getEquityOfPool-contract-MarginLiquidityPoolInterface-)

Get the estimated equity of a pool.

#### Parameters:

- `_pool`: The MarginLiquidityPool.

#### Return Values:

- The pool's equity.

### [Function `getEstimatedRequiredDepositForPool(contract MarginLiquidityPoolInterface _pool) → uint256`](#MarginFlowProtocolSafety-getEstimatedRequiredDepositForPool-contract-MarginLiquidityPoolInterface-)

Get the required deposit amount to make pool safe for pool owners (not incl swap rates).

#### Parameters:

- `_pool`: The MarginLiquidityPool.

#### Return Values:

- The required deposit.

### [Function `__markTraderDepositsAsPaid(contract MarginLiquidityPoolInterface _pool, address _trader, uint256 _paidMarginITokens, uint256 _paidLiquidationITokens)`](#MarginFlowProtocolSafety-__markTraderDepositsAsPaid-contract-MarginLiquidityPoolInterface-address-uint256-uint256-)

No description

### [Function `__withdrawTraderDeposits(contract MarginLiquidityPoolInterface _pool, address _trader)`](#MarginFlowProtocolSafety-__withdrawTraderDeposits-contract-MarginLiquidityPoolInterface-address-)

No description

### Event `TraderMarginCalled(address liquidityPool, address sender)` {#MarginFlowProtocolSafety-TraderMarginCalled-address-address-}

No description

### Event `TraderBecameSafe(address liquidityPool, address sender)` {#MarginFlowProtocolSafety-TraderBecameSafe-address-address-}

No description

### Event `TraderLiquidated(address sender)` {#MarginFlowProtocolSafety-TraderLiquidated-address-}

No description

### Event `LiquidityPoolMarginCalled(address liquidityPool)` {#MarginFlowProtocolSafety-LiquidityPoolMarginCalled-address-}

No description

### Event `LiquidityPoolBecameSafe(address liquidityPool)` {#MarginFlowProtocolSafety-LiquidityPoolBecameSafe-address-}

No description

### Event `LiquidityPoolLiquidated(address liquidityPool)` {#MarginFlowProtocolSafety-LiquidityPoolLiquidated-address-}

No description
