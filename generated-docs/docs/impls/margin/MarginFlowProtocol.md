## Functions:

- [`initialize(contract PriceOracleInterface _oracle, contract MoneyMarketInterface _moneyMarket, contract MarginFlowProtocolSafety _safetyProtocol, contract MarginLiquidityPoolRegistry _liquidityPoolRegistry, uint256 _initialSwapRate, uint256 _initialMinLeverage, uint256 _initialMaxLeverage, uint256 _initialMaxLeverageAmount, uint256 _rateUnit)`](#MarginFlowProtocol-initialize-contract-PriceOracleInterface-contract-MoneyMarketInterface-contract-MarginFlowProtocolSafety-contract-MarginLiquidityPoolRegistry-uint256-uint256-uint256-uint256-uint256-)

- [`addTradingPair(address _base, address _quote)`](#MarginFlowProtocol-addTradingPair-address-address-)

- [`setCurrentSwapRate(uint256 _newSwapRate)`](#MarginFlowProtocol-setCurrentSwapRate-uint256-)

- [`setMinLeverage(uint256 _newMinLeverage)`](#MarginFlowProtocol-setMinLeverage-uint256-)

- [`setMaxLeverage(uint256 _newMaxLeverage)`](#MarginFlowProtocol-setMaxLeverage-uint256-)

- [`setMaxLeverageAmount(uint256 _newMaxLeverageAmount)`](#MarginFlowProtocol-setMaxLeverageAmount-uint256-)

- [`deposit(contract MarginLiquidityPoolInterface _pool, uint256 _baseTokenAmount)`](#MarginFlowProtocol-deposit-contract-MarginLiquidityPoolInterface-uint256-)

- [`withdraw(contract MarginLiquidityPoolInterface _pool, uint256 _baseTokenAmount)`](#MarginFlowProtocol-withdraw-contract-MarginLiquidityPoolInterface-uint256-)

- [`openPosition(contract MarginLiquidityPoolInterface _pool, address _base, address _quote, int256 _leverage, uint256 _leveragedHeld, uint256 _price)`](#MarginFlowProtocol-openPosition-contract-MarginLiquidityPoolInterface-address-address-int256-uint256-uint256-)

- [`closePosition(uint256 _positionId, uint256 _price)`](#MarginFlowProtocol-closePosition-uint256-uint256-)

- [`getMarginHeld(contract MarginLiquidityPoolInterface _pool, address _trader)`](#MarginFlowProtocol-getMarginHeld-contract-MarginLiquidityPoolInterface-address-)

- [`getFreeMargin(contract MarginLiquidityPoolInterface _pool, address _trader)`](#MarginFlowProtocol-getFreeMargin-contract-MarginLiquidityPoolInterface-address-)

- [`getEquityOfTrader(contract MarginLiquidityPoolInterface _pool, address _trader)`](#MarginFlowProtocol-getEquityOfTrader-contract-MarginLiquidityPoolInterface-address-)

- [`getUnrealizedPlOfPosition(uint256 _positionId)`](#MarginFlowProtocol-getUnrealizedPlOfPosition-uint256-)

- [`getUsdValue(address _currencyToken, int256 _amount)`](#MarginFlowProtocol-getUsdValue-address-int256-)

- [`getPrice(address _baseCurrencyId, address _quoteCurrencyId)`](#MarginFlowProtocol-getPrice-address-address-)

- [`getAccumulatedSwapRateOfPosition(uint256 _positionId)`](#MarginFlowProtocol-getAccumulatedSwapRateOfPosition-uint256-)

- [`getPositionsByPoolLength(contract MarginLiquidityPoolInterface _pool)`](#MarginFlowProtocol-getPositionsByPoolLength-contract-MarginLiquidityPoolInterface-)

- [`getPositionIdByPoolAndIndex(contract MarginLiquidityPoolInterface _pool, uint256 _index)`](#MarginFlowProtocol-getPositionIdByPoolAndIndex-contract-MarginLiquidityPoolInterface-uint256-)

- [`getLeveragedDebitsByPoolAndIndex(contract MarginLiquidityPoolInterface _pool, uint256 _index)`](#MarginFlowProtocol-getLeveragedDebitsByPoolAndIndex-contract-MarginLiquidityPoolInterface-uint256-)

- [`getPositionsByPoolAndTraderLength(contract MarginLiquidityPoolInterface _pool, address _trader)`](#MarginFlowProtocol-getPositionsByPoolAndTraderLength-contract-MarginLiquidityPoolInterface-address-)

- [`getPositionIdByPoolAndTraderAndIndex(contract MarginLiquidityPoolInterface _pool, address _trader, uint256 _index)`](#MarginFlowProtocol-getPositionIdByPoolAndTraderAndIndex-contract-MarginLiquidityPoolInterface-address-uint256-)

- [`getLeveragedDebitsByPoolAndTraderAndIndex(contract MarginLiquidityPoolInterface _pool, address _trader, uint256 _index)`](#MarginFlowProtocol-getLeveragedDebitsByPoolAndTraderAndIndex-contract-MarginLiquidityPoolInterface-address-uint256-)

- [`setTraderIsMarginCalled(contract MarginLiquidityPoolInterface _pool, address _trader, bool _isMarginCalled)`](#MarginFlowProtocol-setTraderIsMarginCalled-contract-MarginLiquidityPoolInterface-address-bool-)

- [`setTraderHasPaidFees(contract MarginLiquidityPoolInterface _pool, address _trader, bool _hasPaidFees)`](#MarginFlowProtocol-setTraderHasPaidFees-contract-MarginLiquidityPoolInterface-address-bool-)

- [`getAskSpread(contract MarginLiquidityPoolInterface _pool, address _baseToken, address _quoteToken)`](#MarginFlowProtocol-getAskSpread-contract-MarginLiquidityPoolInterface-address-address-)

- [`getBidSpread(contract MarginLiquidityPoolInterface _pool, address _baseToken, address _quoteToken)`](#MarginFlowProtocol-getBidSpread-contract-MarginLiquidityPoolInterface-address-address-)

## Events:

- [`PositionOpened(uint256 positionId, address sender, address liquidityPool, address baseToken, address quoteToken, int256 leverage, int256 leveragedDebitsInUsd, uint256 price)`](#MarginFlowProtocol-PositionOpened-uint256-address-address-address-address-int256-int256-uint256-)

- [`PositionClosed(uint256 positionId, address sender, address liquidityPool, address baseToken, address quoteToken, int256 realizedPl, uint256 price)`](#MarginFlowProtocol-PositionClosed-uint256-address-address-address-address-int256-uint256-)

- [`Deposited(address sender, uint256 amount)`](#MarginFlowProtocol-Deposited-address-uint256-)

- [`Withdrew(address sender, uint256 amount)`](#MarginFlowProtocol-Withdrew-address-uint256-)

- [`NewTradingPair(address base, address quote)`](#MarginFlowProtocol-NewTradingPair-address-address-)

### [Function `initialize(contract PriceOracleInterface _oracle, contract MoneyMarketInterface _moneyMarket, contract MarginFlowProtocolSafety _safetyProtocol, contract MarginLiquidityPoolRegistry _liquidityPoolRegistry, uint256 _initialSwapRate, uint256 _initialMinLeverage, uint256 _initialMaxLeverage, uint256 _initialMaxLeverageAmount, uint256 _rateUnit)`](#MarginFlowProtocol-initialize-contract-PriceOracleInterface-contract-MoneyMarketInterface-contract-MarginFlowProtocolSafety-contract-MarginLiquidityPoolRegistry-uint256-uint256-uint256-uint256-uint256-)

Initialize the MarginFlowProtocol.

#### Parameters:

- `_oracle`: The price oracle

- `_moneyMarket`: The money market.

- `_liquidityPoolRegistry`: The liquidity pool registry.

- `_initialSwapRate`: The initial swap rate as percentage.

### [Function `addTradingPair(address _base, address _quote)`](#MarginFlowProtocol-addTradingPair-address-address-)

Add new trading pair, only for the owner.

#### Parameters:

- `_base`: The base token.

- `_quote`: The quote token.

### [Function `setCurrentSwapRate(uint256 _newSwapRate)`](#MarginFlowProtocol-setCurrentSwapRate-uint256-)

Set new swap rate, only for the owner.

#### Parameters:

- `_newSwapRate`: The new swap rate as percentage.

### [Function `setMinLeverage(uint256 _newMinLeverage)`](#MarginFlowProtocol-setMinLeverage-uint256-)

Set new minimum leverage, only for the owner.

#### Parameters:

- `_newMinLeverage`: The new minimum leverage.

### [Function `setMaxLeverage(uint256 _newMaxLeverage)`](#MarginFlowProtocol-setMaxLeverage-uint256-)

Set new maximum leverage, only for the owner.

#### Parameters:

- `_newMaxLeverage`: The new maximum leverage.

### [Function `setMaxLeverageAmount(uint256 _newMaxLeverageAmount)`](#MarginFlowProtocol-setMaxLeverageAmount-uint256-)

Set new maximum leverage amount, only for the owner.

#### Parameters:

- `_newMaxLeverageAmount`: The new maximum leverage amount.

### [Function `deposit(contract MarginLiquidityPoolInterface _pool, uint256 _baseTokenAmount)`](#MarginFlowProtocol-deposit-contract-MarginLiquidityPoolInterface-uint256-)

Deposit amount to pool balance.

#### Parameters:

- `_pool`: The MarginLiquidityPool.

- `_baseTokenAmount`: The base token amount to deposit.

### [Function `withdraw(contract MarginLiquidityPoolInterface _pool, uint256 _baseTokenAmount)`](#MarginFlowProtocol-withdraw-contract-MarginLiquidityPoolInterface-uint256-)

Withdraw amount from pool balance.

#### Parameters:

- `_pool`: The MarginLiquidityPool.

- `_baseTokenAmount`: The base token amount to withdraw.

### [Function `openPosition(contract MarginLiquidityPoolInterface _pool, address _base, address _quote, int256 _leverage, uint256 _leveragedHeld, uint256 _price)`](#MarginFlowProtocol-openPosition-contract-MarginLiquidityPoolInterface-address-address-int256-uint256-uint256-)

Open a new position with a min/max price. Trader must pay fees for first position.

Set price to 0 if you want to use the current market price.

#### Parameters:

- `_pool`: The MarginLiquidityPool.

- `_base`: The base token.

- `_quote`: The quote token.

- `_leverage`: The leverage number, e.g., 20x.

- `_leveragedHeld`: The leveraged held balance.

- `_price`: The max/min price when opening the position.

### [Function `closePosition(uint256 _positionId, uint256 _price)`](#MarginFlowProtocol-closePosition-uint256-uint256-)

Close the given position with a min/max price. Set price to 0 if you want to use the current market price.

#### Parameters:

- `_positionId`: The id of the position to close.

- `_price`: The max/min price when closing the position..

### [Function `getMarginHeld(contract MarginLiquidityPoolInterface _pool, address _trader) → uint256`](#MarginFlowProtocol-getMarginHeld-contract-MarginLiquidityPoolInterface-address-)

Sum of all margin held of a given trader.

#### Parameters:

- `_pool`: The MarginLiquidityPool.

- `_trader`: The trader address.

#### Return Values:

- The margin held sum.

### [Function `getFreeMargin(contract MarginLiquidityPoolInterface _pool, address _trader) → uint256`](#MarginFlowProtocol-getFreeMargin-contract-MarginLiquidityPoolInterface-address-)

Get the free margin: the free margin of the trader.

#### Parameters:

- `_pool`: The MarginLiquidityPool.

- `_trader`: The trader address.

#### Return Values:

- The free margin amount (int256).

### [Function `getEquityOfTrader(contract MarginLiquidityPoolInterface _pool, address _trader) → int256`](#MarginFlowProtocol-getEquityOfTrader-contract-MarginLiquidityPoolInterface-address-)

No description

### [Function `getUnrealizedPlOfPosition(uint256 _positionId) → int256`](#MarginFlowProtocol-getUnrealizedPlOfPosition-uint256-)

No description

### [Function `getUsdValue(address _currencyToken, int256 _amount) → int256`](#MarginFlowProtocol-getUsdValue-address-int256-)

No description

### [Function `getPrice(address _baseCurrencyId, address _quoteCurrencyId) → struct Percentage.Percent`](#MarginFlowProtocol-getPrice-address-address-)

No description

### [Function `getAccumulatedSwapRateOfPosition(uint256 _positionId) → uint256`](#MarginFlowProtocol-getAccumulatedSwapRateOfPosition-uint256-)

No description

### [Function `getPositionsByPoolLength(contract MarginLiquidityPoolInterface _pool) → uint256`](#MarginFlowProtocol-getPositionsByPoolLength-contract-MarginLiquidityPoolInterface-)

No description

### [Function `getPositionIdByPoolAndIndex(contract MarginLiquidityPoolInterface _pool, uint256 _index) → uint256`](#MarginFlowProtocol-getPositionIdByPoolAndIndex-contract-MarginLiquidityPoolInterface-uint256-)

No description

### [Function `getLeveragedDebitsByPoolAndIndex(contract MarginLiquidityPoolInterface _pool, uint256 _index) → int256`](#MarginFlowProtocol-getLeveragedDebitsByPoolAndIndex-contract-MarginLiquidityPoolInterface-uint256-)

No description

### [Function `getPositionsByPoolAndTraderLength(contract MarginLiquidityPoolInterface _pool, address _trader) → uint256`](#MarginFlowProtocol-getPositionsByPoolAndTraderLength-contract-MarginLiquidityPoolInterface-address-)

No description

### [Function `getPositionIdByPoolAndTraderAndIndex(contract MarginLiquidityPoolInterface _pool, address _trader, uint256 _index) → uint256`](#MarginFlowProtocol-getPositionIdByPoolAndTraderAndIndex-contract-MarginLiquidityPoolInterface-address-uint256-)

No description

### [Function `getLeveragedDebitsByPoolAndTraderAndIndex(contract MarginLiquidityPoolInterface _pool, address _trader, uint256 _index) → int256`](#MarginFlowProtocol-getLeveragedDebitsByPoolAndTraderAndIndex-contract-MarginLiquidityPoolInterface-address-uint256-)

No description

### [Function `setTraderIsMarginCalled(contract MarginLiquidityPoolInterface _pool, address _trader, bool _isMarginCalled)`](#MarginFlowProtocol-setTraderIsMarginCalled-contract-MarginLiquidityPoolInterface-address-bool-)

No description

### [Function `setTraderHasPaidFees(contract MarginLiquidityPoolInterface _pool, address _trader, bool _hasPaidFees)`](#MarginFlowProtocol-setTraderHasPaidFees-contract-MarginLiquidityPoolInterface-address-bool-)

No description

### [Function `getAskSpread(contract MarginLiquidityPoolInterface _pool, address _baseToken, address _quoteToken) → uint256`](#MarginFlowProtocol-getAskSpread-contract-MarginLiquidityPoolInterface-address-address-)

No description

### [Function `getBidSpread(contract MarginLiquidityPoolInterface _pool, address _baseToken, address _quoteToken) → uint256`](#MarginFlowProtocol-getBidSpread-contract-MarginLiquidityPoolInterface-address-address-)

No description

### Event `PositionOpened(uint256 positionId, address sender, address liquidityPool, address baseToken, address quoteToken, int256 leverage, int256 leveragedDebitsInUsd, uint256 price)` {#MarginFlowProtocol-PositionOpened-uint256-address-address-address-address-int256-int256-uint256-}

Event for deposits.

#### Parameters:

- `sender`: The sender

- `liquidityPool`: The MarginLiquidityPool

- `liquidityPool`: The MarginLiquidityPool

- `baseToken`: The base token

- `quoteToken`: The quote token

- `leverage`: The leverage, e.g., 20x

- `leveragedDebitsInUsd`: The base token amount to open position

- `price`: The max/min price for opening, 0 means accept all.

### Event `PositionClosed(uint256 positionId, address sender, address liquidityPool, address baseToken, address quoteToken, int256 realizedPl, uint256 price)` {#MarginFlowProtocol-PositionClosed-uint256-address-address-address-address-int256-uint256-}

Event for deposits.

#### Parameters:

- `sender`: The sender

- `liquidityPool`: The MarginLiquidityPool

- `baseToken`: The base token

- `quoteToken`: The quote token

- `realizedPl`: The realized profit or loss after closing

- `positionId`: The position id

- `price`: The max/min price for closing, 0 means accept all.

### Event `Deposited(address sender, uint256 amount)` {#MarginFlowProtocol-Deposited-address-uint256-}

Event for deposits.

#### Parameters:

- `sender`: The sender

- `amount`: The amount

### Event `Withdrew(address sender, uint256 amount)` {#MarginFlowProtocol-Withdrew-address-uint256-}

Event for withdrawals..

#### Parameters:

- `sender`: The sender

- `amount`: The amount

### Event `NewTradingPair(address base, address quote)` {#MarginFlowProtocol-NewTradingPair-address-address-}

Event for new trading pair being added.

#### Parameters:

- `base`: The base token

- `quote`: The quote token
