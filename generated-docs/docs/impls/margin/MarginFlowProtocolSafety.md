## Functions:

- [`initialize(contract MarginFlowProtocol _marginProtocol, uint256 _initialTraderRiskMarginCallThreshold, uint256 _initialTraderRiskLiquidateThreshold, uint256 _initialLiquidityPoolENPMarginThreshold, uint256 _initialLiquidityPoolELLMarginThreshold, uint256 _initialLiquidityPoolENPLiquidateThreshold, uint256 _initialLiquidityPoolELLLiquidateThreshold)`](#MarginFlowProtocolSafety-initialize-contract-MarginFlowProtocol-uint256-uint256-uint256-uint256-uint256-uint256-)

- [`setTraderRiskMarginCallThreshold(uint256 _newTraderRiskMarginCallThreshold)`](#MarginFlowProtocolSafety-setTraderRiskMarginCallThreshold-uint256-)

- [`setTraderRiskLiquidateThreshold(uint256 _newTraderRiskLiquidateThreshold)`](#MarginFlowProtocolSafety-setTraderRiskLiquidateThreshold-uint256-)

- [`setLiquidityPoolENPMarginThreshold(uint256 _newLiquidityPoolENPMarginThreshold)`](#MarginFlowProtocolSafety-setLiquidityPoolENPMarginThreshold-uint256-)

- [`setLiquidityPoolELLMarginThreshold(uint256 _newLiquidityPoolELLMarginThreshold)`](#MarginFlowProtocolSafety-setLiquidityPoolELLMarginThreshold-uint256-)

- [`setLiquidityPoolENPLiquidateThreshold(uint256 _newLiquidityPoolENPLiquidateThreshold)`](#MarginFlowProtocolSafety-setLiquidityPoolENPLiquidateThreshold-uint256-)

- [`setLiquidityPoolELLLiquidateThreshold(uint256 _newLiquidityPoolELLLiquidateThreshold)`](#MarginFlowProtocolSafety-setLiquidityPoolELLLiquidateThreshold-uint256-)

- [`isPoolSafe(contract MarginLiquidityPoolInterface _pool)`](#MarginFlowProtocolSafety-isPoolSafe-contract-MarginLiquidityPoolInterface-)

- [`marginCallTrader(contract MarginLiquidityPoolInterface _pool, address _trader)`](#MarginFlowProtocolSafety-marginCallTrader-contract-MarginLiquidityPoolInterface-address-)

- [`makeTraderSafe(contract MarginLiquidityPoolInterface _pool, address _trader)`](#MarginFlowProtocolSafety-makeTraderSafe-contract-MarginLiquidityPoolInterface-address-)

- [`marginCallLiquidityPool(contract MarginLiquidityPoolInterface _pool)`](#MarginFlowProtocolSafety-marginCallLiquidityPool-contract-MarginLiquidityPoolInterface-)

- [`makeLiquidityPoolSafe(contract MarginLiquidityPoolInterface _pool)`](#MarginFlowProtocolSafety-makeLiquidityPoolSafe-contract-MarginLiquidityPoolInterface-)

- [`liquidateTrader(contract MarginLiquidityPoolInterface _pool, address _trader)`](#MarginFlowProtocolSafety-liquidateTrader-contract-MarginLiquidityPoolInterface-address-)

- [`liquidateLiquidityPool(contract MarginLiquidityPoolInterface _pool)`](#MarginFlowProtocolSafety-liquidateLiquidityPool-contract-MarginLiquidityPoolInterface-)

- [`isTraderSafe(contract MarginLiquidityPoolInterface _pool, address _trader)`](#MarginFlowProtocolSafety-isTraderSafe-contract-MarginLiquidityPoolInterface-address-)

- [`getMarginLevel(contract MarginLiquidityPoolInterface _pool, address _trader)`](#MarginFlowProtocolSafety-getMarginLevel-contract-MarginLiquidityPoolInterface-address-)

- [`getEnpAndEll(contract MarginLiquidityPoolInterface _pool)`](#MarginFlowProtocolSafety-getEnpAndEll-contract-MarginLiquidityPoolInterface-)

- [`getLeveragedDebitsOfTrader(contract MarginLiquidityPoolInterface _pool, address _trader)`](#MarginFlowProtocolSafety-getLeveragedDebitsOfTrader-contract-MarginLiquidityPoolInterface-address-)

- [`getEquityOfPool(contract MarginLiquidityPoolInterface _pool)`](#MarginFlowProtocolSafety-getEquityOfPool-contract-MarginLiquidityPoolInterface-)

## Events:

- [`TraderMarginCalled(address liquidityPool, address sender)`](#MarginFlowProtocolSafety-TraderMarginCalled-address-address-)

- [`TraderBecameSafe(address liquidityPool, address sender)`](#MarginFlowProtocolSafety-TraderBecameSafe-address-address-)

- [`TraderLiquidated(address sender)`](#MarginFlowProtocolSafety-TraderLiquidated-address-)

- [`LiquidityPoolMarginCalled(address liquidityPool)`](#MarginFlowProtocolSafety-LiquidityPoolMarginCalled-address-)

- [`LiquidityPoolBecameSafe(address liquidityPool)`](#MarginFlowProtocolSafety-LiquidityPoolBecameSafe-address-)

- [`LiquidityPoolLiquidated(address liquidityPool)`](#MarginFlowProtocolSafety-LiquidityPoolLiquidated-address-)

### [Function `initialize(contract MarginFlowProtocol _marginProtocol, uint256 _initialTraderRiskMarginCallThreshold, uint256 _initialTraderRiskLiquidateThreshold, uint256 _initialLiquidityPoolENPMarginThreshold, uint256 _initialLiquidityPoolELLMarginThreshold, uint256 _initialLiquidityPoolENPLiquidateThreshold, uint256 _initialLiquidityPoolELLLiquidateThreshold)`](#MarginFlowProtocolSafety-initialize-contract-MarginFlowProtocol-uint256-uint256-uint256-uint256-uint256-uint256-)

Initialize the MarginFlowProtocolSafety.

#### Parameters:

- `_initialTraderRiskMarginCallThreshold`: The initial trader risk margin call threshold as percentage.

- `_initialTraderRiskLiquidateThreshold`: The initial trader risk liquidate threshold as percentage.

- `_initialLiquidityPoolENPMarginThreshold`: The initial pool ENP margin threshold.

- `_initialLiquidityPoolELLMarginThreshold`: The initial pool ELL margin threshold.

- `_initialLiquidityPoolENPLiquidateThreshold`: The initial pool ENP liquidate threshold.

- `_initialLiquidityPoolELLLiquidateThreshold`: The initial pool ELL liquidate threshold.

### [Function `setTraderRiskMarginCallThreshold(uint256 _newTraderRiskMarginCallThreshold)`](#MarginFlowProtocolSafety-setTraderRiskMarginCallThreshold-uint256-)

Set new trader risk threshold for trader margin calls, only set by owner.

#### Parameters:

- `_newTraderRiskMarginCallThreshold`: The new trader risk threshold as percentage.

### [Function `setTraderRiskLiquidateThreshold(uint256 _newTraderRiskLiquidateThreshold)`](#MarginFlowProtocolSafety-setTraderRiskLiquidateThreshold-uint256-)

Set new trader risk threshold for trader liquidation, only set by owner.

#### Parameters:

- `_newTraderRiskLiquidateThreshold`: The new trader risk threshold as percentage.

### [Function `setLiquidityPoolENPMarginThreshold(uint256 _newLiquidityPoolENPMarginThreshold)`](#MarginFlowProtocolSafety-setLiquidityPoolENPMarginThreshold-uint256-)

Set new trader risk threshold, only for the owner.

#### Parameters:

- `_newLiquidityPoolENPMarginThreshold`: The new trader risk threshold.

### [Function `setLiquidityPoolELLMarginThreshold(uint256 _newLiquidityPoolELLMarginThreshold)`](#MarginFlowProtocolSafety-setLiquidityPoolELLMarginThreshold-uint256-)

Set new trader risk threshold, only for the owner.

#### Parameters:

- `_newLiquidityPoolELLMarginThreshold`: The new trader risk threshold.

### [Function `setLiquidityPoolENPLiquidateThreshold(uint256 _newLiquidityPoolENPLiquidateThreshold)`](#MarginFlowProtocolSafety-setLiquidityPoolENPLiquidateThreshold-uint256-)

Set new trader risk threshold, only for the owner.

#### Parameters:

- `_newLiquidityPoolENPLiquidateThreshold`: The new trader risk threshold.

### [Function `setLiquidityPoolELLLiquidateThreshold(uint256 _newLiquidityPoolELLLiquidateThreshold)`](#MarginFlowProtocolSafety-setLiquidityPoolELLLiquidateThreshold-uint256-)

Set new trader risk threshold, only for the owner.

#### Parameters:

- `_newLiquidityPoolELLLiquidateThreshold`: The new trader risk threshold.

### [Function `isPoolSafe(contract MarginLiquidityPoolInterface _pool) → bool`](#MarginFlowProtocolSafety-isPoolSafe-contract-MarginLiquidityPoolInterface-)

Ensure a pool is safe, based on equity delta, opened positions or plus a new one to open.

#### Parameters:

- `_pool`: The MarginLiquidityPool.

#### Return Values:

- true if ensured safe or false if not.

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

Margin call a given MarginLiquidityPool, reducing its allowed trading functionality for all traders send `LIQUIDITY_POOL_MARGIN_CALL_FEE` to caller..

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

No description

### [Function `getMarginLevel(contract MarginLiquidityPoolInterface _pool, address _trader) → struct Percentage.SignedPercent`](#MarginFlowProtocolSafety-getMarginLevel-contract-MarginLiquidityPoolInterface-address-)

No description

### [Function `getEnpAndEll(contract MarginLiquidityPoolInterface _pool) → struct Percentage.Percent, struct Percentage.Percent`](#MarginFlowProtocolSafety-getEnpAndEll-contract-MarginLiquidityPoolInterface-)

No description

### [Function `getLeveragedDebitsOfTrader(contract MarginLiquidityPoolInterface _pool, address _trader) → uint256`](#MarginFlowProtocolSafety-getLeveragedDebitsOfTrader-contract-MarginLiquidityPoolInterface-address-)

No description

### [Function `getEquityOfPool(contract MarginLiquidityPoolInterface _pool) → int256`](#MarginFlowProtocolSafety-getEquityOfPool-contract-MarginLiquidityPoolInterface-)

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
