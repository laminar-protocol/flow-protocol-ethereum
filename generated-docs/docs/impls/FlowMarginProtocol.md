## Functions:

- [`initialize(contract PriceOracleInterface _oracle, contract MoneyMarketInterface _moneyMarket, uint256 _initialSwapRate, uint256 _initialTraderRiskMarginCallThreshold, uint256 _initialTraderRiskLiquidateThreshold, uint256 _initialLiquidityPoolENPMarginThreshold, uint256 _initialLiquidityPoolELLMarginThreshold, uint256 _initialLiquidityPoolENPLiquidateThreshold, uint256 _initialLiquidityPoolELLLiquidateThreshold)`](#FlowMarginProtocol-initialize-contract-PriceOracleInterface-contract-MoneyMarketInterface-uint256-uint256-uint256-uint256-uint256-uint256-uint256-)

- [`addTradingPair(contract FlowToken _base, contract FlowToken _quote)`](#FlowMarginProtocol-addTradingPair-contract-FlowToken-contract-FlowToken-)

- [`setCurrentSwapRate(uint256 _newSwapRate)`](#FlowMarginProtocol-setCurrentSwapRate-uint256-)

- [`setTraderRiskMarginCallThreshold(uint256 _newTraderRiskMarginCallThreshold)`](#FlowMarginProtocol-setTraderRiskMarginCallThreshold-uint256-)

- [`setTraderRiskLiquidateThreshold(uint256 _newTraderRiskLiquidateThreshold)`](#FlowMarginProtocol-setTraderRiskLiquidateThreshold-uint256-)

- [`setLiquidityPoolENPMarginThreshold(uint256 _newLiquidityPoolENPMarginThreshold)`](#FlowMarginProtocol-setLiquidityPoolENPMarginThreshold-uint256-)

- [`setLiquidityPoolELLMarginThreshold(uint256 _newLiquidityPoolELLMarginThreshold)`](#FlowMarginProtocol-setLiquidityPoolELLMarginThreshold-uint256-)

- [`setLiquidityPoolENPLiquidateThreshold(uint256 _newLiquidityPoolENPLiquidateThreshold)`](#FlowMarginProtocol-setLiquidityPoolENPLiquidateThreshold-uint256-)

- [`setLiquidityPoolELLLiquidateThreshold(uint256 _newLiquidityPoolELLLiquidateThreshold)`](#FlowMarginProtocol-setLiquidityPoolELLLiquidateThreshold-uint256-)

- [`registerPool(contract LiquidityPoolInterface _pool)`](#FlowMarginProtocol-registerPool-contract-LiquidityPoolInterface-)

- [`verifyPool(contract LiquidityPoolInterface _pool)`](#FlowMarginProtocol-verifyPool-contract-LiquidityPoolInterface-)

- [`unverifyPool(contract LiquidityPoolInterface _pool)`](#FlowMarginProtocol-unverifyPool-contract-LiquidityPoolInterface-)

- [`deposit(contract LiquidityPoolInterface _pool, uint256 _baseTokenAmount)`](#FlowMarginProtocol-deposit-contract-LiquidityPoolInterface-uint256-)

- [`withdraw(contract LiquidityPoolInterface _pool, uint256 _baseTokenAmount)`](#FlowMarginProtocol-withdraw-contract-LiquidityPoolInterface-uint256-)

- [`openPosition(contract LiquidityPoolInterface _pool, contract FlowToken _base, contract FlowToken _quote, int256 _leverage, uint256 _leveragedHeld, uint256 _price)`](#FlowMarginProtocol-openPosition-contract-LiquidityPoolInterface-contract-FlowToken-contract-FlowToken-int256-uint256-uint256-)

- [`closePosition(uint256 _positionId, uint256 _price)`](#FlowMarginProtocol-closePosition-uint256-uint256-)

- [`marginCallTrader(contract LiquidityPoolInterface _pool, address _trader)`](#FlowMarginProtocol-marginCallTrader-contract-LiquidityPoolInterface-address-)

- [`makeTraderSafe(contract LiquidityPoolInterface _pool, address _trader)`](#FlowMarginProtocol-makeTraderSafe-contract-LiquidityPoolInterface-address-)

- [`marginCallLiquidityPool(contract LiquidityPoolInterface _pool)`](#FlowMarginProtocol-marginCallLiquidityPool-contract-LiquidityPoolInterface-)

- [`makeLiquidityPoolSafe(contract LiquidityPoolInterface _pool)`](#FlowMarginProtocol-makeLiquidityPoolSafe-contract-LiquidityPoolInterface-)

- [`liquidateTrader(contract LiquidityPoolInterface _pool, address _trader)`](#FlowMarginProtocol-liquidateTrader-contract-LiquidityPoolInterface-address-)

- [`liquidateLiquidityPool(contract LiquidityPoolInterface _pool)`](#FlowMarginProtocol-liquidateLiquidityPool-contract-LiquidityPoolInterface-)

- [`getMarginHeld(contract LiquidityPoolInterface _pool, address _trader)`](#FlowMarginProtocol-getMarginHeld-contract-LiquidityPoolInterface-address-)

- [`getFreeMargin(contract LiquidityPoolInterface _pool, address _trader)`](#FlowMarginProtocol-getFreeMargin-contract-LiquidityPoolInterface-address-)

## Events:

- [`PositionOpened(address sender, address liquidityPool, address baseToken, address quoteToken, int256 leverage, uint256 amount, uint256 price)`](#FlowMarginProtocol-PositionOpened-address-address-address-address-int256-uint256-uint256-)

- [`PositionClosed(address sender, address liquidityPool, address baseToken, address quoteToken, uint256 positionId, uint256 price)`](#FlowMarginProtocol-PositionClosed-address-address-address-address-uint256-uint256-)

- [`Deposited(address sender, uint256 amount)`](#FlowMarginProtocol-Deposited-address-uint256-)

- [`Withdrew(address sender, uint256 amount)`](#FlowMarginProtocol-Withdrew-address-uint256-)

- [`TraderMarginCalled(address liquidityPool, address sender)`](#FlowMarginProtocol-TraderMarginCalled-address-address-)

- [`TraderBecameSafe(address liquidityPool, address sender)`](#FlowMarginProtocol-TraderBecameSafe-address-address-)

- [`TraderLiquidated(address sender)`](#FlowMarginProtocol-TraderLiquidated-address-)

- [`LiquidityPoolMarginCalled(address liquidityPool)`](#FlowMarginProtocol-LiquidityPoolMarginCalled-address-)

- [`LiquidityPoolBecameSafe(address liquidityPool)`](#FlowMarginProtocol-LiquidityPoolBecameSafe-address-)

- [`LiquidityPoolLiquidated(address liquidityPool)`](#FlowMarginProtocol-LiquidityPoolLiquidated-address-)

- [`NewTradingPair(address base, address quote)`](#FlowMarginProtocol-NewTradingPair-address-address-)

### [Function `initialize(contract PriceOracleInterface _oracle, contract MoneyMarketInterface _moneyMarket, uint256 _initialSwapRate, uint256 _initialTraderRiskMarginCallThreshold, uint256 _initialTraderRiskLiquidateThreshold, uint256 _initialLiquidityPoolENPMarginThreshold, uint256 _initialLiquidityPoolELLMarginThreshold, uint256 _initialLiquidityPoolENPLiquidateThreshold, uint256 _initialLiquidityPoolELLLiquidateThreshold)`](#FlowMarginProtocol-initialize-contract-PriceOracleInterface-contract-MoneyMarketInterface-uint256-uint256-uint256-uint256-uint256-uint256-uint256-)

Initialize the FlowMarginProtocol.

#### Parameters:

- `_oracle`: The price oracle

- `_moneyMarket`: The money market.

- `_initialSwapRate`: The initial swap rate as percentage.

- `_initialTraderRiskMarginCallThreshold`: The initial trader risk margin call threshold as percentage.

- `_initialTraderRiskLiquidateThreshold`: The initial trader risk liquidate threshold as percentage.

- `_initialLiquidityPoolENPMarginThreshold`: The initial pool ENP margin threshold.

- `_initialLiquidityPoolELLMarginThreshold`: The initial pool ELL margin threshold.

- `_initialLiquidityPoolENPLiquidateThreshold`: The initial pool ENP liquidate threshold.

- `_initialLiquidityPoolELLLiquidateThreshold`: The initial pool ELL liquidate threshold.

### [Function `addTradingPair(contract FlowToken _base, contract FlowToken _quote)`](#FlowMarginProtocol-addTradingPair-contract-FlowToken-contract-FlowToken-)

Add new trading pair, only for the owner.

#### Parameters:

- `_base`: The base FlowToken.

- `_quote`: The quote FlowToken.

### [Function `setCurrentSwapRate(uint256 _newSwapRate)`](#FlowMarginProtocol-setCurrentSwapRate-uint256-)

Set new swap rate, only for the owner.

#### Parameters:

- `_newSwapRate`: The new swap rate as percentage.

### [Function `setTraderRiskMarginCallThreshold(uint256 _newTraderRiskMarginCallThreshold)`](#FlowMarginProtocol-setTraderRiskMarginCallThreshold-uint256-)

Set new trader risk threshold for trader margin calls, only set by owner.

#### Parameters:

- `_newTraderRiskMarginCallThreshold`: The new trader risk threshold as percentage.

### [Function `setTraderRiskLiquidateThreshold(uint256 _newTraderRiskLiquidateThreshold)`](#FlowMarginProtocol-setTraderRiskLiquidateThreshold-uint256-)

Set new trader risk threshold for trader liquidation, only set by owner.

#### Parameters:

- `_newTraderRiskLiquidateThreshold`: The new trader risk threshold as percentage.

### [Function `setLiquidityPoolENPMarginThreshold(uint256 _newLiquidityPoolENPMarginThreshold)`](#FlowMarginProtocol-setLiquidityPoolENPMarginThreshold-uint256-)

Set new trader risk threshold, only for the owner.

#### Parameters:

- `_newLiquidityPoolENPMarginThreshold`: The new trader risk threshold.

### [Function `setLiquidityPoolELLMarginThreshold(uint256 _newLiquidityPoolELLMarginThreshold)`](#FlowMarginProtocol-setLiquidityPoolELLMarginThreshold-uint256-)

Set new trader risk threshold, only for the owner.

#### Parameters:

- `_newLiquidityPoolELLMarginThreshold`: The new trader risk threshold.

### [Function `setLiquidityPoolENPLiquidateThreshold(uint256 _newLiquidityPoolENPLiquidateThreshold)`](#FlowMarginProtocol-setLiquidityPoolENPLiquidateThreshold-uint256-)

Set new trader risk threshold, only for the owner.

#### Parameters:

- `_newLiquidityPoolENPLiquidateThreshold`: The new trader risk threshold.

### [Function `setLiquidityPoolELLLiquidateThreshold(uint256 _newLiquidityPoolELLLiquidateThreshold)`](#FlowMarginProtocol-setLiquidityPoolELLLiquidateThreshold-uint256-)

Set new trader risk threshold, only for the owner.

#### Parameters:

- `_newLiquidityPoolELLLiquidateThreshold`: The new trader risk threshold.

### [Function `registerPool(contract LiquidityPoolInterface _pool)`](#FlowMarginProtocol-registerPool-contract-LiquidityPoolInterface-)

Register a new pool by sending the combined margin and liquidation fees.

#### Parameters:

- `_pool`: The MarginLiquidityPool.

### [Function `verifyPool(contract LiquidityPoolInterface _pool)`](#FlowMarginProtocol-verifyPool-contract-LiquidityPoolInterface-)

Verify a new pool, only for the owner.

#### Parameters:

- `_pool`: The MarginLiquidityPool.

### [Function `unverifyPool(contract LiquidityPoolInterface _pool)`](#FlowMarginProtocol-unverifyPool-contract-LiquidityPoolInterface-)

Unverify a pool, only for the owner.

#### Parameters:

- `_pool`: The MarginLiquidityPool.

### [Function `deposit(contract LiquidityPoolInterface _pool, uint256 _baseTokenAmount)`](#FlowMarginProtocol-deposit-contract-LiquidityPoolInterface-uint256-)

Deposit amount to pool balance.

#### Parameters:

- `_pool`: The MarginLiquidityPool.

- `_baseTokenAmount`: The base token amount to deposit.

### [Function `withdraw(contract LiquidityPoolInterface _pool, uint256 _baseTokenAmount)`](#FlowMarginProtocol-withdraw-contract-LiquidityPoolInterface-uint256-)

Withdraw amount from pool balance.

#### Parameters:

- `_pool`: The MarginLiquidityPool.

- `_baseTokenAmount`: The base token amount to withdraw.

### [Function `openPosition(contract LiquidityPoolInterface _pool, contract FlowToken _base, contract FlowToken _quote, int256 _leverage, uint256 _leveragedHeld, uint256 _price)`](#FlowMarginProtocol-openPosition-contract-LiquidityPoolInterface-contract-FlowToken-contract-FlowToken-int256-uint256-uint256-)

Open a new position with a min/max price. Set price to 0 if you want to use the current market price.

#### Parameters:

- `_pool`: The MarginLiquidityPool.

- `_base`: The base FlowToken.

- `_quote`: The quote FlowToken.

- `_leverage`: The leverage number, e.g., 20x.

- `_leveragedHeld`: The leveraged held balance.

- `_price`: The max/min price when opening the position.

### [Function `closePosition(uint256 _positionId, uint256 _price)`](#FlowMarginProtocol-closePosition-uint256-uint256-)

Close the given position with a min/max price. Set price to 0 if you want to use the current market price.

#### Parameters:

- `_positionId`: The id of the position to close.

- `_price`: The max/min price when closing the position..

### [Function `marginCallTrader(contract LiquidityPoolInterface _pool, address _trader)`](#FlowMarginProtocol-marginCallTrader-contract-LiquidityPoolInterface-address-)

Margin call a trader, reducing his allowed trading functionality given a MarginLiquidityPool send `TRADER_MARGIN_CALL_FEE` to caller..

#### Parameters:

- `_pool`: The MarginLiquidityPool.

- `_trader`: The Trader.

### [Function `makeTraderSafe(contract LiquidityPoolInterface _pool, address _trader)`](#FlowMarginProtocol-makeTraderSafe-contract-LiquidityPoolInterface-address-)

Enable full trading functionality for trader, undoing a previous `marginCallTrader` given a MarginLiquidityPool.

#### Parameters:

- `_pool`: The MarginLiquidityPool.

- `_trader`: The Trader.

### [Function `marginCallLiquidityPool(contract LiquidityPoolInterface _pool)`](#FlowMarginProtocol-marginCallLiquidityPool-contract-LiquidityPoolInterface-)

Margin call a given MarginLiquidityPool, reducing its allowed trading functionality for all traders send `LIQUIDITY_POOL_MARGIN_CALL_FEE` to caller..

#### Parameters:

- `_pool`: The MarginLiquidityPool.

### [Function `makeLiquidityPoolSafe(contract LiquidityPoolInterface _pool)`](#FlowMarginProtocol-makeLiquidityPoolSafe-contract-LiquidityPoolInterface-)

Enable full trading functionality for pool, undoing a previous `marginCallLiquidityPool`.

#### Parameters:

- `_pool`: The MarginLiquidityPool.

### [Function `liquidateTrader(contract LiquidityPoolInterface _pool, address _trader)`](#FlowMarginProtocol-liquidateTrader-contract-LiquidityPoolInterface-address-)

Liquidate trader due to funds running too low, close all positions and send `TRADER_LIQUIDATION_FEE` to caller.

#### Parameters:

- `_pool`: The MarginLiquidityPool.

- `_trader`: The trader address.

### [Function `liquidateLiquidityPool(contract LiquidityPoolInterface _pool)`](#FlowMarginProtocol-liquidateLiquidityPool-contract-LiquidityPoolInterface-)

Liquidate pool due to funds running too low, distribute funds to all users and send `LIQUIDITY_POOL_LIQUIDATION_FEE` to caller.

#### Parameters:

- `_pool`: The MarginLiquidityPool.

### [Function `getMarginHeld(contract LiquidityPoolInterface _pool, address _trader) → uint256`](#FlowMarginProtocol-getMarginHeld-contract-LiquidityPoolInterface-address-)

Sum of all margin held of a given trader.

#### Parameters:

- `_pool`: The MarginLiquidityPool.

- `_trader`: The trader address.

#### Return Values:

- The margin held sum.

### [Function `getFreeMargin(contract LiquidityPoolInterface _pool, address _trader) → uint256`](#FlowMarginProtocol-getFreeMargin-contract-LiquidityPoolInterface-address-)

Get the free margin: the free margin of the trader.

#### Parameters:

- `_pool`: The MarginLiquidityPool.

- `_trader`: The trader address.

#### Return Values:

- The free margin amount (int256).

### Event `PositionOpened(address sender, address liquidityPool, address baseToken, address quoteToken, int256 leverage, uint256 amount, uint256 price)` {#FlowMarginProtocol-PositionOpened-address-address-address-address-int256-uint256-uint256-}

No description

### Event `PositionClosed(address sender, address liquidityPool, address baseToken, address quoteToken, uint256 positionId, uint256 price)` {#FlowMarginProtocol-PositionClosed-address-address-address-address-uint256-uint256-}

No description

### Event `Deposited(address sender, uint256 amount)` {#FlowMarginProtocol-Deposited-address-uint256-}

No description

### Event `Withdrew(address sender, uint256 amount)` {#FlowMarginProtocol-Withdrew-address-uint256-}

No description

### Event `TraderMarginCalled(address liquidityPool, address sender)` {#FlowMarginProtocol-TraderMarginCalled-address-address-}

No description

### Event `TraderBecameSafe(address liquidityPool, address sender)` {#FlowMarginProtocol-TraderBecameSafe-address-address-}

No description

### Event `TraderLiquidated(address sender)` {#FlowMarginProtocol-TraderLiquidated-address-}

No description

### Event `LiquidityPoolMarginCalled(address liquidityPool)` {#FlowMarginProtocol-LiquidityPoolMarginCalled-address-}

No description

### Event `LiquidityPoolBecameSafe(address liquidityPool)` {#FlowMarginProtocol-LiquidityPoolBecameSafe-address-}

No description

### Event `LiquidityPoolLiquidated(address liquidityPool)` {#FlowMarginProtocol-LiquidityPoolLiquidated-address-}

No description

### Event `NewTradingPair(address base, address quote)` {#FlowMarginProtocol-NewTradingPair-address-address-}

No description
