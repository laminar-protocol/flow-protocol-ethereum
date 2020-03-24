## Functions:

- [`initialize(contract PriceOracleInterface _oracle, contract MoneyMarketInterface _moneyMarket, uint256 _initialSwapRate, uint256 _initialTraderRiskThreshold, uint256 _initialLiquidityPoolENPThreshold, uint256 _initialLiquidityPoolELLThreshold)`](#FlowMarginProtocol2-initialize-contract-PriceOracleInterface-contract-MoneyMarketInterface-uint256-uint256-uint256-uint256-)

- [`setSwapRate(uint256 _newSwapRate)`](#FlowMarginProtocol2-setSwapRate-uint256-)

- [`setTraderRiskThreshold(uint256 _newTraderRiskThreshold)`](#FlowMarginProtocol2-setTraderRiskThreshold-uint256-)

- [`setLiquidityPoolENPThreshold(uint256 _newLiquidityPoolENPThreshold)`](#FlowMarginProtocol2-setLiquidityPoolENPThreshold-uint256-)

- [`setLiquidityPoolELLThreshold(uint256 _newLiquidityPoolELLThreshold)`](#FlowMarginProtocol2-setLiquidityPoolELLThreshold-uint256-)

- [`deposit(contract LiquidityPoolInterface _pool, uint256 _baseTokenAmount)`](#FlowMarginProtocol2-deposit-contract-LiquidityPoolInterface-uint256-)

- [`withdraw(contract LiquidityPoolInterface _pool, uint256 _baseTokenAmount)`](#FlowMarginProtocol2-withdraw-contract-LiquidityPoolInterface-uint256-)

- [`openPosition(contract LiquidityPoolInterface _pool, contract FlowToken _base, contract FlowToken _quote, int256 _leverage, int256 _leveragedHeld, uint256 _price)`](#FlowMarginProtocol2-openPosition-contract-LiquidityPoolInterface-contract-FlowToken-contract-FlowToken-int256-int256-uint256-)

- [`closePosition(uint256 _positionId, uint256 _price)`](#FlowMarginProtocol2-closePosition-uint256-uint256-)

- [`marginCallTrader(contract LiquidityPoolInterface _pool, address _trader)`](#FlowMarginProtocol2-marginCallTrader-contract-LiquidityPoolInterface-address-)

- [`makeTraderSafe(contract LiquidityPoolInterface _pool, address _trader)`](#FlowMarginProtocol2-makeTraderSafe-contract-LiquidityPoolInterface-address-)

- [`marginCallLiquidityPool(contract LiquidityPoolInterface _pool)`](#FlowMarginProtocol2-marginCallLiquidityPool-contract-LiquidityPoolInterface-)

- [`makeLiquidityPoolSafe(contract LiquidityPoolInterface _pool)`](#FlowMarginProtocol2-makeLiquidityPoolSafe-contract-LiquidityPoolInterface-)

- [`liquidateTrader(address _trader)`](#FlowMarginProtocol2-liquidateTrader-address-)

- [`liquidateLiquidityPool(contract LiquidityPoolInterface _pool)`](#FlowMarginProtocol2-liquidateLiquidityPool-contract-LiquidityPoolInterface-)

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

### [Function `initialize(contract PriceOracleInterface _oracle, contract MoneyMarketInterface _moneyMarket, uint256 _initialSwapRate, uint256 _initialTraderRiskThreshold, uint256 _initialLiquidityPoolENPThreshold, uint256 _initialLiquidityPoolELLThreshold)`](#FlowMarginProtocol2-initialize-contract-PriceOracleInterface-contract-MoneyMarketInterface-uint256-uint256-uint256-uint256-)

Initialize the FlowMarginProtocol.

#### Parameters:

- `_oracle`: The price oracle

- `_moneyMarket`: The money market.

- `_initialSwapRate`: The initial swap rate.

- `_initialTraderRiskThreshold`: The initial trader risk threshold as percentage.

### [Function `setSwapRate(uint256 _newSwapRate)`](#FlowMarginProtocol2-setSwapRate-uint256-)

Set new swap rate, only for the owner.

#### Parameters:

- `_newSwapRate`: The new swap rate.

### [Function `setTraderRiskThreshold(uint256 _newTraderRiskThreshold)`](#FlowMarginProtocol2-setTraderRiskThreshold-uint256-)

Set new trader risk threshold, only for the owner.

#### Parameters:

- `_newTraderRiskThreshold`: The new trader risk threshold as percentage.

### [Function `setLiquidityPoolENPThreshold(uint256 _newLiquidityPoolENPThreshold)`](#FlowMarginProtocol2-setLiquidityPoolENPThreshold-uint256-)

Set new trader risk threshold, only for the owner.

#### Parameters:

- `_newLiquidityPoolENPThreshold`: The new trader risk threshold.

### [Function `setLiquidityPoolELLThreshold(uint256 _newLiquidityPoolELLThreshold)`](#FlowMarginProtocol2-setLiquidityPoolELLThreshold-uint256-)

Set new trader risk threshold, only for the owner.

#### Parameters:

- `_newLiquidityPoolELLThreshold`: The new trader risk threshold.

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

Margin call a trader, reducing his allowed trading functionality given a MarginLiquidityPool.

#### Parameters:

- `_pool`: The MarginLiquidityPool.

- `_trader`: The Trader.

### [Function `makeTraderSafe(contract LiquidityPoolInterface _pool, address _trader)`](#FlowMarginProtocol2-makeTraderSafe-contract-LiquidityPoolInterface-address-)

Enable full trading functionality for trader, undoing a previous `marginCallTrader` given a MarginLiquidityPool.

#### Parameters:

- `_pool`: The MarginLiquidityPool.

- `_trader`: The Trader.

### [Function `marginCallLiquidityPool(contract LiquidityPoolInterface _pool)`](#FlowMarginProtocol2-marginCallLiquidityPool-contract-LiquidityPoolInterface-)

Margin call a given MarginLiquidityPool, reducing its allowed trading functionality for all traders.

#### Parameters:

- `_pool`: The MarginLiquidityPool.

### [Function `makeLiquidityPoolSafe(contract LiquidityPoolInterface _pool)`](#FlowMarginProtocol2-makeLiquidityPoolSafe-contract-LiquidityPoolInterface-)

Enable full trading functionality for pool, undoing a previous `marginCallLiquidityPool`.

#### Parameters:

- `_pool`: The MarginLiquidityPool.

### [Function `liquidateTrader(address _trader)`](#FlowMarginProtocol2-liquidateTrader-address-)

Liquidate trader due to funds running too low, close all positions and send `MARGIN_CALL_FEE` to caller.

#### Parameters:

- `_trader`: The trader address.

### [Function `liquidateLiquidityPool(contract LiquidityPoolInterface _pool)`](#FlowMarginProtocol2-liquidateLiquidityPool-contract-LiquidityPoolInterface-)

Liquidate pool due to funds running too low, distribute funds to all users and send `MARGIN_CALL_FEE` to caller.

#### Parameters:

- `_pool`: The MarginLiquidityPool.

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
