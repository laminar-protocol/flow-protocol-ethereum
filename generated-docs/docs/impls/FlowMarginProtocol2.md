## Functions:

- [`initialize(contract PriceOracleInterface _oracle, contract MoneyMarketInterface _moneyMarket, uint256 _initialSwapRate, uint256 _initialTraderRiskMarginCallThreshold, uint256 _initialTraderRiskLiquidateThreshold, uint256 _initialLiquidityPoolENPMarginThreshold, uint256 _initialLiquidityPoolELLMarginThreshold, uint256 _initialLiquidityPoolENPLiquidateThreshold, uint256 _initialLiquidityPoolELLLiquidateThreshold)`](#FlowMarginProtocol2-initialize-contract-PriceOracleInterface-contract-MoneyMarketInterface-uint256-uint256-uint256-uint256-uint256-uint256-uint256-)

- [`setSwapRate(uint256 _newSwapRate)`](#FlowMarginProtocol2-setSwapRate-uint256-)

- [`setTraderRiskMarginCallThreshold(uint256 _newTraderRiskMarginCallThreshold)`](#FlowMarginProtocol2-setTraderRiskMarginCallThreshold-uint256-)

- [`setTraderRiskLiquidateThreshold(uint256 _newTraderRiskLiquidateThreshold)`](#FlowMarginProtocol2-setTraderRiskLiquidateThreshold-uint256-)

- [`setLiquidityPoolENPMarginThreshold(uint256 _newLiquidityPoolENPMarginThreshold)`](#FlowMarginProtocol2-setLiquidityPoolENPMarginThreshold-uint256-)

- [`setLiquidityPoolELLMarginThreshold(uint256 _newLiquidityPoolELLMarginThreshold)`](#FlowMarginProtocol2-setLiquidityPoolELLMarginThreshold-uint256-)

- [`setLiquidityPoolENPLiquidateThreshold(uint256 _newLiquidityPoolENPLiquidateThreshold)`](#FlowMarginProtocol2-setLiquidityPoolENPLiquidateThreshold-uint256-)

- [`setLiquidityPoolELLLiquidateThreshold(uint256 _newLiquidityPoolELLLiquidateThreshold)`](#FlowMarginProtocol2-setLiquidityPoolELLLiquidateThreshold-uint256-)

- [`deposit(contract LiquidityPoolInterface _pool, uint256 _baseTokenAmount)`](#FlowMarginProtocol2-deposit-contract-LiquidityPoolInterface-uint256-)

- [`withdraw(contract LiquidityPoolInterface _pool, uint256 _baseTokenAmount)`](#FlowMarginProtocol2-withdraw-contract-LiquidityPoolInterface-uint256-)

- [`openPosition(contract LiquidityPoolInterface _pool, contract FlowToken _base, contract FlowToken _quote, int256 _leverage, int256 _leveragedHeld, uint256 _price)`](#FlowMarginProtocol2-openPosition-contract-LiquidityPoolInterface-contract-FlowToken-contract-FlowToken-int256-int256-uint256-)

- [`closePosition(uint256 _positionId, uint256 _price)`](#FlowMarginProtocol2-closePosition-uint256-uint256-)

- [`marginCallTrader(contract LiquidityPoolInterface _pool, address _trader)`](#FlowMarginProtocol2-marginCallTrader-contract-LiquidityPoolInterface-address-)

- [`makeTraderSafe(contract LiquidityPoolInterface _pool, address _trader)`](#FlowMarginProtocol2-makeTraderSafe-contract-LiquidityPoolInterface-address-)

- [`marginCallLiquidityPool(contract LiquidityPoolInterface _pool)`](#FlowMarginProtocol2-marginCallLiquidityPool-contract-LiquidityPoolInterface-)

- [`makeLiquidityPoolSafe(contract LiquidityPoolInterface _pool)`](#FlowMarginProtocol2-makeLiquidityPoolSafe-contract-LiquidityPoolInterface-)

- [`liquidateTrader(contract LiquidityPoolInterface _pool, address _trader)`](#FlowMarginProtocol2-liquidateTrader-contract-LiquidityPoolInterface-address-)

- [`liquidateLiquidityPool(contract LiquidityPoolInterface _pool)`](#FlowMarginProtocol2-liquidateLiquidityPool-contract-LiquidityPoolInterface-)

- [`getMarginHeld(contract LiquidityPoolInterface _pool, address _trader)`](#FlowMarginProtocol2-getMarginHeld-contract-LiquidityPoolInterface-address-)

- [`getFreeBalance(contract LiquidityPoolInterface _pool, address _trader)`](#FlowMarginProtocol2-getFreeBalance-contract-LiquidityPoolInterface-address-)

## Events:

- [`PositionOpened(address sender, address liquidityPool, address baseToken, address quoteToken, int256 leverage, int256 amount, uint256 price)`](#FlowMarginProtocol2-PositionOpened-address-address-address-address-int256-int256-uint256-)

- [`PositionClosed(address sender, uint256 positionId, uint256 price)`](#FlowMarginProtocol2-PositionClosed-address-uint256-uint256-)

- [`Deposited(address sender, uint256 amount)`](#FlowMarginProtocol2-Deposited-address-uint256-)

- [`Withdrew(address sender, uint256 amount)`](#FlowMarginProtocol2-Withdrew-address-uint256-)

- [`TraderMarginCalled(address liquidityPool, address sender)`](#FlowMarginProtocol2-TraderMarginCalled-address-address-)

- [`TraderBecameSafe(address liquidityPool, address sender)`](#FlowMarginProtocol2-TraderBecameSafe-address-address-)

- [`TraderLiquidated(address sender)`](#FlowMarginProtocol2-TraderLiquidated-address-)

- [`LiquidityPoolMarginCalled(address liquidityPool)`](#FlowMarginProtocol2-LiquidityPoolMarginCalled-address-)

- [`LiquidityPoolBecameSafe(address liquidityPool)`](#FlowMarginProtocol2-LiquidityPoolBecameSafe-address-)

- [`LiquidityPoolLiquidated(address liquidityPool)`](#FlowMarginProtocol2-LiquidityPoolLiquidated-address-)

### [Function `initialize(contract PriceOracleInterface _oracle, contract MoneyMarketInterface _moneyMarket, uint256 _initialSwapRate, uint256 _initialTraderRiskMarginCallThreshold, uint256 _initialTraderRiskLiquidateThreshold, uint256 _initialLiquidityPoolENPMarginThreshold, uint256 _initialLiquidityPoolELLMarginThreshold, uint256 _initialLiquidityPoolENPLiquidateThreshold, uint256 _initialLiquidityPoolELLLiquidateThreshold)`](#FlowMarginProtocol2-initialize-contract-PriceOracleInterface-contract-MoneyMarketInterface-uint256-uint256-uint256-uint256-uint256-uint256-uint256-)

Initialize the FlowMarginProtocol.

#### Parameters:

- `_oracle`: The price oracle

- `_moneyMarket`: The money market.

- `_initialSwapRate`: The initial swap rate.

- `_initialTraderRiskMarginCallThreshold`: The initial trader risk threshold as percentage.

### [Function `setSwapRate(uint256 _newSwapRate)`](#FlowMarginProtocol2-setSwapRate-uint256-)

Set new swap rate, only for the owner.

#### Parameters:

- `_newSwapRate`: The new swap rate.

### [Function `setTraderRiskMarginCallThreshold(uint256 _newTraderRiskMarginCallThreshold)`](#FlowMarginProtocol2-setTraderRiskMarginCallThreshold-uint256-)

Set new trader risk threshold for trader margin calls, only set by owner.

#### Parameters:

- `_newTraderRiskMarginCallThreshold`: The new trader risk threshold as percentage.

### [Function `setTraderRiskLiquidateThreshold(uint256 _newTraderRiskLiquidateThreshold)`](#FlowMarginProtocol2-setTraderRiskLiquidateThreshold-uint256-)

Set new trader risk threshold for trader liquidation, only set by owner.

#### Parameters:

- `_newTraderRiskLiquidateThreshold`: The new trader risk threshold as percentage.

### [Function `setLiquidityPoolENPMarginThreshold(uint256 _newLiquidityPoolENPMarginThreshold)`](#FlowMarginProtocol2-setLiquidityPoolENPMarginThreshold-uint256-)

Set new trader risk threshold, only for the owner.

#### Parameters:

- `_newLiquidityPoolENPMarginThreshold`: The new trader risk threshold.

### [Function `setLiquidityPoolELLMarginThreshold(uint256 _newLiquidityPoolELLMarginThreshold)`](#FlowMarginProtocol2-setLiquidityPoolELLMarginThreshold-uint256-)

Set new trader risk threshold, only for the owner.

#### Parameters:

- `_newLiquidityPoolELLMarginThreshold`: The new trader risk threshold.

### [Function `setLiquidityPoolENPLiquidateThreshold(uint256 _newLiquidityPoolENPLiquidateThreshold)`](#FlowMarginProtocol2-setLiquidityPoolENPLiquidateThreshold-uint256-)

Set new trader risk threshold, only for the owner.

#### Parameters:

- `_newLiquidityPoolENPLiquidateThreshold`: The new trader risk threshold.

### [Function `setLiquidityPoolELLLiquidateThreshold(uint256 _newLiquidityPoolELLLiquidateThreshold)`](#FlowMarginProtocol2-setLiquidityPoolELLLiquidateThreshold-uint256-)

Set new trader risk threshold, only for the owner.

#### Parameters:

- `_newLiquidityPoolELLLiquidateThreshold`: The new trader risk threshold.

### [Function `deposit(contract LiquidityPoolInterface _pool, uint256 _baseTokenAmount)`](#FlowMarginProtocol2-deposit-contract-LiquidityPoolInterface-uint256-)

Deposit amount to pool balance.

#### Parameters:

- `_pool`: The MarginLiquidityPool.

- `_baseTokenAmount`: The base token amount to deposit.

### [Function `withdraw(contract LiquidityPoolInterface _pool, uint256 _baseTokenAmount)`](#FlowMarginProtocol2-withdraw-contract-LiquidityPoolInterface-uint256-)

Withdraw amount from pool balance.

#### Parameters:

- `_pool`: The MarginLiquidityPool.

- `_baseTokenAmount`: The base token amount to withdraw.

### [Function `openPosition(contract LiquidityPoolInterface _pool, contract FlowToken _base, contract FlowToken _quote, int256 _leverage, int256 _leveragedHeld, uint256 _price)`](#FlowMarginProtocol2-openPosition-contract-LiquidityPoolInterface-contract-FlowToken-contract-FlowToken-int256-int256-uint256-)

Open a new position with a min/max price. Set price to 0 if you want to use the current market price.

#### Parameters:

- `_pool`: The MarginLiquidityPool.

- `_base`: The base FlowToken.

- `_quote`: The quote FlowToken.

- `_leverage`: The leverage number, e.g., 20x.

- `_leveragedHeld`: The leveraged held balance.

- `_price`: The max/min price when opening the position.

### [Function `closePosition(uint256 _positionId, uint256 _price)`](#FlowMarginProtocol2-closePosition-uint256-uint256-)

Close the given position with a min/max price. Set price to 0 if you want to use the current market price.

#### Parameters:

- `_positionId`: The id of the position to close.

- `_price`: The max/min price when closing the position..

### [Function `marginCallTrader(contract LiquidityPoolInterface _pool, address _trader)`](#FlowMarginProtocol2-marginCallTrader-contract-LiquidityPoolInterface-address-)

Margin call a trader, reducing his allowed trading functionality given a MarginLiquidityPool send `TRADER_MARGIN_CALL_FEE` to caller..

#### Parameters:

- `_pool`: The MarginLiquidityPool.

- `_trader`: The Trader.

### [Function `makeTraderSafe(contract LiquidityPoolInterface _pool, address _trader)`](#FlowMarginProtocol2-makeTraderSafe-contract-LiquidityPoolInterface-address-)

Enable full trading functionality for trader, undoing a previous `marginCallTrader` given a MarginLiquidityPool.

#### Parameters:

- `_pool`: The MarginLiquidityPool.

- `_trader`: The Trader.

### [Function `marginCallLiquidityPool(contract LiquidityPoolInterface _pool)`](#FlowMarginProtocol2-marginCallLiquidityPool-contract-LiquidityPoolInterface-)

Margin call a given MarginLiquidityPool, reducing its allowed trading functionality for all traders send `LIQUIDITY_POOL_MARGIN_CALL_FEE` to caller..

#### Parameters:

- `_pool`: The MarginLiquidityPool.

### [Function `makeLiquidityPoolSafe(contract LiquidityPoolInterface _pool)`](#FlowMarginProtocol2-makeLiquidityPoolSafe-contract-LiquidityPoolInterface-)

Enable full trading functionality for pool, undoing a previous `marginCallLiquidityPool`.

#### Parameters:

- `_pool`: The MarginLiquidityPool.

### [Function `liquidateTrader(contract LiquidityPoolInterface _pool, address _trader)`](#FlowMarginProtocol2-liquidateTrader-contract-LiquidityPoolInterface-address-)

Liquidate trader due to funds running too low, close all positions and send `TRADER_LIQUIDATION_FEE` to caller.

#### Parameters:

- `_pool`: The MarginLiquidityPool.

- `_trader`: The trader address.

### [Function `liquidateLiquidityPool(contract LiquidityPoolInterface _pool)`](#FlowMarginProtocol2-liquidateLiquidityPool-contract-LiquidityPoolInterface-)

Liquidate pool due to funds running too low, distribute funds to all users and send `LIQUIDITY_POOL_LIQUIDATION_FEE` to caller.

#### Parameters:

- `_pool`: The MarginLiquidityPool.

### [Function `getMarginHeld(contract LiquidityPoolInterface _pool, address _trader) → int256`](#FlowMarginProtocol2-getMarginHeld-contract-LiquidityPoolInterface-address-)

Sum of all open margin of a given trader.

#### Parameters:

- `_pool`: The MarginLiquidityPool.

- `_trader`: The trader address.

### [Function `getFreeBalance(contract LiquidityPoolInterface _pool, address _trader) → int256`](#FlowMarginProtocol2-getFreeBalance-contract-LiquidityPoolInterface-address-)

Free balance: the balance available for withdraw.

#### Parameters:

- `_pool`: The MarginLiquidityPool.

- `_trader`: The trader address.

### Event `PositionOpened(address sender, address liquidityPool, address baseToken, address quoteToken, int256 leverage, int256 amount, uint256 price)` {#FlowMarginProtocol2-PositionOpened-address-address-address-address-int256-int256-uint256-}

No description

### Event `PositionClosed(address sender, uint256 positionId, uint256 price)` {#FlowMarginProtocol2-PositionClosed-address-uint256-uint256-}

No description

### Event `Deposited(address sender, uint256 amount)` {#FlowMarginProtocol2-Deposited-address-uint256-}

No description

### Event `Withdrew(address sender, uint256 amount)` {#FlowMarginProtocol2-Withdrew-address-uint256-}

No description

### Event `TraderMarginCalled(address liquidityPool, address sender)` {#FlowMarginProtocol2-TraderMarginCalled-address-address-}

No description

### Event `TraderBecameSafe(address liquidityPool, address sender)` {#FlowMarginProtocol2-TraderBecameSafe-address-address-}

No description

### Event `TraderLiquidated(address sender)` {#FlowMarginProtocol2-TraderLiquidated-address-}

No description

### Event `LiquidityPoolMarginCalled(address liquidityPool)` {#FlowMarginProtocol2-LiquidityPoolMarginCalled-address-}

No description

### Event `LiquidityPoolBecameSafe(address liquidityPool)` {#FlowMarginProtocol2-LiquidityPoolBecameSafe-address-}

No description

### Event `LiquidityPoolLiquidated(address liquidityPool)` {#FlowMarginProtocol2-LiquidityPoolLiquidated-address-}

No description
