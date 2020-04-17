## Functions:

- [`initialize(contract FlowMarginProtocol _marginProtocol, uint256 _initialTraderRiskMarginCallThreshold, uint256 _initialTraderRiskLiquidateThreshold, uint256 _initialLiquidityPoolENPMarginThreshold, uint256 _initialLiquidityPoolELLMarginThreshold, uint256 _initialLiquidityPoolENPLiquidateThreshold, uint256 _initialLiquidityPoolELLLiquidateThreshold)`](#FlowMarginProtocolSafety-initialize-contract-FlowMarginProtocol-uint256-uint256-uint256-uint256-uint256-uint256-)

- [`setTraderRiskMarginCallThreshold(uint256 _newTraderRiskMarginCallThreshold)`](#FlowMarginProtocolSafety-setTraderRiskMarginCallThreshold-uint256-)

- [`setTraderRiskLiquidateThreshold(uint256 _newTraderRiskLiquidateThreshold)`](#FlowMarginProtocolSafety-setTraderRiskLiquidateThreshold-uint256-)

- [`setLiquidityPoolENPMarginThreshold(uint256 _newLiquidityPoolENPMarginThreshold)`](#FlowMarginProtocolSafety-setLiquidityPoolENPMarginThreshold-uint256-)

- [`setLiquidityPoolELLMarginThreshold(uint256 _newLiquidityPoolELLMarginThreshold)`](#FlowMarginProtocolSafety-setLiquidityPoolELLMarginThreshold-uint256-)

- [`setLiquidityPoolENPLiquidateThreshold(uint256 _newLiquidityPoolENPLiquidateThreshold)`](#FlowMarginProtocolSafety-setLiquidityPoolENPLiquidateThreshold-uint256-)

- [`setLiquidityPoolELLLiquidateThreshold(uint256 _newLiquidityPoolELLLiquidateThreshold)`](#FlowMarginProtocolSafety-setLiquidityPoolELLLiquidateThreshold-uint256-)

- [`isPoolSafe(contract LiquidityPoolInterface _pool)`](#FlowMarginProtocolSafety-isPoolSafe-contract-LiquidityPoolInterface-)

- [`marginCallTrader(contract LiquidityPoolInterface _pool, address _trader)`](#FlowMarginProtocolSafety-marginCallTrader-contract-LiquidityPoolInterface-address-)

- [`makeTraderSafe(contract LiquidityPoolInterface _pool, address _trader)`](#FlowMarginProtocolSafety-makeTraderSafe-contract-LiquidityPoolInterface-address-)

- [`marginCallLiquidityPool(contract LiquidityPoolInterface _pool)`](#FlowMarginProtocolSafety-marginCallLiquidityPool-contract-LiquidityPoolInterface-)

- [`makeLiquidityPoolSafe(contract LiquidityPoolInterface _pool)`](#FlowMarginProtocolSafety-makeLiquidityPoolSafe-contract-LiquidityPoolInterface-)

- [`liquidateTrader(contract LiquidityPoolInterface _pool, address _trader)`](#FlowMarginProtocolSafety-liquidateTrader-contract-LiquidityPoolInterface-address-)

- [`liquidateLiquidityPool(contract LiquidityPoolInterface _pool)`](#FlowMarginProtocolSafety-liquidateLiquidityPool-contract-LiquidityPoolInterface-)

## Events:

- [`TraderMarginCalled(address liquidityPool, address sender)`](#FlowMarginProtocolSafety-TraderMarginCalled-address-address-)

- [`TraderBecameSafe(address liquidityPool, address sender)`](#FlowMarginProtocolSafety-TraderBecameSafe-address-address-)

- [`TraderLiquidated(address sender)`](#FlowMarginProtocolSafety-TraderLiquidated-address-)

- [`LiquidityPoolMarginCalled(address liquidityPool)`](#FlowMarginProtocolSafety-LiquidityPoolMarginCalled-address-)

- [`LiquidityPoolBecameSafe(address liquidityPool)`](#FlowMarginProtocolSafety-LiquidityPoolBecameSafe-address-)

- [`LiquidityPoolLiquidated(address liquidityPool)`](#FlowMarginProtocolSafety-LiquidityPoolLiquidated-address-)

### [Function `initialize(contract FlowMarginProtocol _marginProtocol, uint256 _initialTraderRiskMarginCallThreshold, uint256 _initialTraderRiskLiquidateThreshold, uint256 _initialLiquidityPoolENPMarginThreshold, uint256 _initialLiquidityPoolELLMarginThreshold, uint256 _initialLiquidityPoolENPLiquidateThreshold, uint256 _initialLiquidityPoolELLLiquidateThreshold)`](#FlowMarginProtocolSafety-initialize-contract-FlowMarginProtocol-uint256-uint256-uint256-uint256-uint256-uint256-)

Initialize the FlowMarginProtocolSafety.

#### Parameters:

- `_initialTraderRiskMarginCallThreshold`: The initial trader risk margin call threshold as percentage.

- `_initialTraderRiskLiquidateThreshold`: The initial trader risk liquidate threshold as percentage.

- `_initialLiquidityPoolENPMarginThreshold`: The initial pool ENP margin threshold.

- `_initialLiquidityPoolELLMarginThreshold`: The initial pool ELL margin threshold.

- `_initialLiquidityPoolENPLiquidateThreshold`: The initial pool ENP liquidate threshold.

- `_initialLiquidityPoolELLLiquidateThreshold`: The initial pool ELL liquidate threshold.

### [Function `setTraderRiskMarginCallThreshold(uint256 _newTraderRiskMarginCallThreshold)`](#FlowMarginProtocolSafety-setTraderRiskMarginCallThreshold-uint256-)

Set new trader risk threshold for trader margin calls, only set by owner.

#### Parameters:

- `_newTraderRiskMarginCallThreshold`: The new trader risk threshold as percentage.

### [Function `setTraderRiskLiquidateThreshold(uint256 _newTraderRiskLiquidateThreshold)`](#FlowMarginProtocolSafety-setTraderRiskLiquidateThreshold-uint256-)

Set new trader risk threshold for trader liquidation, only set by owner.

#### Parameters:

- `_newTraderRiskLiquidateThreshold`: The new trader risk threshold as percentage.

### [Function `setLiquidityPoolENPMarginThreshold(uint256 _newLiquidityPoolENPMarginThreshold)`](#FlowMarginProtocolSafety-setLiquidityPoolENPMarginThreshold-uint256-)

Set new trader risk threshold, only for the owner.

#### Parameters:

- `_newLiquidityPoolENPMarginThreshold`: The new trader risk threshold.

### [Function `setLiquidityPoolELLMarginThreshold(uint256 _newLiquidityPoolELLMarginThreshold)`](#FlowMarginProtocolSafety-setLiquidityPoolELLMarginThreshold-uint256-)

Set new trader risk threshold, only for the owner.

#### Parameters:

- `_newLiquidityPoolELLMarginThreshold`: The new trader risk threshold.

### [Function `setLiquidityPoolENPLiquidateThreshold(uint256 _newLiquidityPoolENPLiquidateThreshold)`](#FlowMarginProtocolSafety-setLiquidityPoolENPLiquidateThreshold-uint256-)

Set new trader risk threshold, only for the owner.

#### Parameters:

- `_newLiquidityPoolENPLiquidateThreshold`: The new trader risk threshold.

### [Function `setLiquidityPoolELLLiquidateThreshold(uint256 _newLiquidityPoolELLLiquidateThreshold)`](#FlowMarginProtocolSafety-setLiquidityPoolELLLiquidateThreshold-uint256-)

Set new trader risk threshold, only for the owner.

#### Parameters:

- `_newLiquidityPoolELLLiquidateThreshold`: The new trader risk threshold.

### [Function `isPoolSafe(contract LiquidityPoolInterface _pool) → bool`](#FlowMarginProtocolSafety-isPoolSafe-contract-LiquidityPoolInterface-)

Ensure a pool is safe, based on equity delta, opened positions or plus a new one to open.

#### Parameters:

- `_pool`: The MarginLiquidityPool.

#### Return Values:

- true if ensured safe or false if not.

### [Function `marginCallTrader(contract LiquidityPoolInterface _pool, address _trader)`](#FlowMarginProtocolSafety-marginCallTrader-contract-LiquidityPoolInterface-address-)

Margin call a trader, reducing his allowed trading functionality given a MarginLiquidityPool send `TRADER_MARGIN_CALL_FEE` to caller..

#### Parameters:

- `_pool`: The MarginLiquidityPool.

- `_trader`: The Trader.

### [Function `makeTraderSafe(contract LiquidityPoolInterface _pool, address _trader)`](#FlowMarginProtocolSafety-makeTraderSafe-contract-LiquidityPoolInterface-address-)

Enable full trading functionality for trader, undoing a previous `marginCallTrader` given a MarginLiquidityPool.

#### Parameters:

- `_pool`: The MarginLiquidityPool.

- `_trader`: The Trader.

### [Function `marginCallLiquidityPool(contract LiquidityPoolInterface _pool)`](#FlowMarginProtocolSafety-marginCallLiquidityPool-contract-LiquidityPoolInterface-)

Margin call a given MarginLiquidityPool, reducing its allowed trading functionality for all traders send `LIQUIDITY_POOL_MARGIN_CALL_FEE` to caller..

#### Parameters:

- `_pool`: The MarginLiquidityPool.

### [Function `makeLiquidityPoolSafe(contract LiquidityPoolInterface _pool)`](#FlowMarginProtocolSafety-makeLiquidityPoolSafe-contract-LiquidityPoolInterface-)

Enable full trading functionality for pool, undoing a previous `marginCallLiquidityPool`.

#### Parameters:

- `_pool`: The MarginLiquidityPool.

### [Function `liquidateTrader(contract LiquidityPoolInterface _pool, address _trader)`](#FlowMarginProtocolSafety-liquidateTrader-contract-LiquidityPoolInterface-address-)

Liquidate trader due to funds running too low, close all positions and send `TRADER_LIQUIDATION_FEE` to caller.

#### Parameters:

- `_pool`: The MarginLiquidityPool.

- `_trader`: The trader address.

### [Function `liquidateLiquidityPool(contract LiquidityPoolInterface _pool)`](#FlowMarginProtocolSafety-liquidateLiquidityPool-contract-LiquidityPoolInterface-)

Liquidate pool due to funds running too low, distribute funds to all users and send `LIQUIDITY_POOL_LIQUIDATION_FEE` to caller.

#### Parameters:

- `_pool`: The MarginLiquidityPool.

### Event `TraderMarginCalled(address liquidityPool, address sender)` {#FlowMarginProtocolSafety-TraderMarginCalled-address-address-}

No description

### Event `TraderBecameSafe(address liquidityPool, address sender)` {#FlowMarginProtocolSafety-TraderBecameSafe-address-address-}

No description

### Event `TraderLiquidated(address sender)` {#FlowMarginProtocolSafety-TraderLiquidated-address-}

No description

### Event `LiquidityPoolMarginCalled(address liquidityPool)` {#FlowMarginProtocolSafety-LiquidityPoolMarginCalled-address-}

No description

### Event `LiquidityPoolBecameSafe(address liquidityPool)` {#FlowMarginProtocolSafety-LiquidityPoolBecameSafe-address-}

No description

### Event `LiquidityPoolLiquidated(address liquidityPool)` {#FlowMarginProtocolSafety-LiquidityPoolLiquidated-address-}

No description
