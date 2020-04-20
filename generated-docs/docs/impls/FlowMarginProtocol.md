## Functions:

- [`initialize(contract PriceOracleInterface _oracle, contract MoneyMarketInterface _moneyMarket, contract FlowMarginProtocolSafety _safetyProtocol, contract LiquidityPoolRegistry _liquidityPoolRegistry, uint256 _initialSwapRate)`](#FlowMarginProtocol-initialize-contract-PriceOracleInterface-contract-MoneyMarketInterface-contract-FlowMarginProtocolSafety-contract-LiquidityPoolRegistry-uint256-)

- [`addTradingPair(contract FlowToken _base, contract FlowToken _quote)`](#FlowMarginProtocol-addTradingPair-contract-FlowToken-contract-FlowToken-)

- [`setCurrentSwapRate(uint256 _newSwapRate)`](#FlowMarginProtocol-setCurrentSwapRate-uint256-)

- [`deposit(contract LiquidityPoolInterface _pool, uint256 _baseTokenAmount)`](#FlowMarginProtocol-deposit-contract-LiquidityPoolInterface-uint256-)

- [`withdraw(contract LiquidityPoolInterface _pool, uint256 _baseTokenAmount)`](#FlowMarginProtocol-withdraw-contract-LiquidityPoolInterface-uint256-)

- [`openPosition(contract LiquidityPoolInterface _pool, contract FlowToken _base, contract FlowToken _quote, int256 _leverage, uint256 _leveragedHeld, uint256 _price)`](#FlowMarginProtocol-openPosition-contract-LiquidityPoolInterface-contract-FlowToken-contract-FlowToken-int256-uint256-uint256-)

- [`closePosition(uint256 _positionId, uint256 _price)`](#FlowMarginProtocol-closePosition-uint256-uint256-)

- [`getMarginHeld(contract LiquidityPoolInterface _pool, address _trader)`](#FlowMarginProtocol-getMarginHeld-contract-LiquidityPoolInterface-address-)

- [`getFreeMargin(contract LiquidityPoolInterface _pool, address _trader)`](#FlowMarginProtocol-getFreeMargin-contract-LiquidityPoolInterface-address-)

- [`getEquityOfTrader(contract LiquidityPoolInterface _pool, address _trader)`](#FlowMarginProtocol-getEquityOfTrader-contract-LiquidityPoolInterface-address-)

- [`getUnrealizedPlOfPosition(uint256 _positionId)`](#FlowMarginProtocol-getUnrealizedPlOfPosition-uint256-)

- [`getUsdValue(contract IERC20 _currencyToken, int256 _amount)`](#FlowMarginProtocol-getUsdValue-contract-IERC20-int256-)

- [`getPrice(contract IERC20 _baseCurrencyId, contract IERC20 _quoteCurrencyId)`](#FlowMarginProtocol-getPrice-contract-IERC20-contract-IERC20-)

- [`getAccumulatedSwapRateOfPosition(uint256 _positionId)`](#FlowMarginProtocol-getAccumulatedSwapRateOfPosition-uint256-)

- [`getPositionsByPoolLength(contract LiquidityPoolInterface _pool)`](#FlowMarginProtocol-getPositionsByPoolLength-contract-LiquidityPoolInterface-)

- [`getPositionIdByPoolAndIndex(contract LiquidityPoolInterface _pool, uint256 _index)`](#FlowMarginProtocol-getPositionIdByPoolAndIndex-contract-LiquidityPoolInterface-uint256-)

- [`getLeveragedDebitsByPoolAndIndex(contract LiquidityPoolInterface _pool, uint256 _index)`](#FlowMarginProtocol-getLeveragedDebitsByPoolAndIndex-contract-LiquidityPoolInterface-uint256-)

- [`getPositionsByPoolAndTraderLength(contract LiquidityPoolInterface _pool, address _trader)`](#FlowMarginProtocol-getPositionsByPoolAndTraderLength-contract-LiquidityPoolInterface-address-)

- [`getPositionIdByPoolAndTraderAndIndex(contract LiquidityPoolInterface _pool, address _trader, uint256 _index)`](#FlowMarginProtocol-getPositionIdByPoolAndTraderAndIndex-contract-LiquidityPoolInterface-address-uint256-)

- [`getLeveragedDebitsByPoolAndTraderAndIndex(contract LiquidityPoolInterface _pool, address _trader, uint256 _index)`](#FlowMarginProtocol-getLeveragedDebitsByPoolAndTraderAndIndex-contract-LiquidityPoolInterface-address-uint256-)

- [`setTraderIsMarginCalled(contract LiquidityPoolInterface _pool, address _trader, bool _isMarginCalled)`](#FlowMarginProtocol-setTraderIsMarginCalled-contract-LiquidityPoolInterface-address-bool-)

- [`setTraderHasPaidFees(contract LiquidityPoolInterface _pool, address _trader, bool _hasPaidFees)`](#FlowMarginProtocol-setTraderHasPaidFees-contract-LiquidityPoolInterface-address-bool-)

## Events:

- [`PositionOpened(address sender, address liquidityPool, address baseToken, address quoteToken, int256 leverage, uint256 amount, uint256 price)`](#FlowMarginProtocol-PositionOpened-address-address-address-address-int256-uint256-uint256-)

- [`PositionClosed(address sender, address liquidityPool, address baseToken, address quoteToken, uint256 positionId, uint256 price)`](#FlowMarginProtocol-PositionClosed-address-address-address-address-uint256-uint256-)

- [`Deposited(address sender, uint256 amount)`](#FlowMarginProtocol-Deposited-address-uint256-)

- [`Withdrew(address sender, uint256 amount)`](#FlowMarginProtocol-Withdrew-address-uint256-)

- [`NewTradingPair(address base, address quote)`](#FlowMarginProtocol-NewTradingPair-address-address-)

### [Function `initialize(contract PriceOracleInterface _oracle, contract MoneyMarketInterface _moneyMarket, contract FlowMarginProtocolSafety _safetyProtocol, contract LiquidityPoolRegistry _liquidityPoolRegistry, uint256 _initialSwapRate)`](#FlowMarginProtocol-initialize-contract-PriceOracleInterface-contract-MoneyMarketInterface-contract-FlowMarginProtocolSafety-contract-LiquidityPoolRegistry-uint256-)

Initialize the FlowMarginProtocol.

#### Parameters:

- `_oracle`: The price oracle

- `_moneyMarket`: The money market.

- `_liquidityPoolRegistry`: The liquidity pool registry.

- `_initialSwapRate`: The initial swap rate as percentage.

### [Function `addTradingPair(contract FlowToken _base, contract FlowToken _quote)`](#FlowMarginProtocol-addTradingPair-contract-FlowToken-contract-FlowToken-)

Add new trading pair, only for the owner.

#### Parameters:

- `_base`: The base FlowToken.

- `_quote`: The quote FlowToken.

### [Function `setCurrentSwapRate(uint256 _newSwapRate)`](#FlowMarginProtocol-setCurrentSwapRate-uint256-)

Set new swap rate, only for the owner.

#### Parameters:

- `_newSwapRate`: The new swap rate as percentage.

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

Open a new position with a min/max price. Trader must pay fees for first position.

Set price to 0 if you want to use the current market price.

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

### [Function `getEquityOfTrader(contract LiquidityPoolInterface _pool, address _trader) → int256`](#FlowMarginProtocol-getEquityOfTrader-contract-LiquidityPoolInterface-address-)

No description

### [Function `getUnrealizedPlOfPosition(uint256 _positionId) → int256`](#FlowMarginProtocol-getUnrealizedPlOfPosition-uint256-)

No description

### [Function `getUsdValue(contract IERC20 _currencyToken, int256 _amount) → int256`](#FlowMarginProtocol-getUsdValue-contract-IERC20-int256-)

No description

### [Function `getPrice(contract IERC20 _baseCurrencyId, contract IERC20 _quoteCurrencyId) → struct Percentage.Percent`](#FlowMarginProtocol-getPrice-contract-IERC20-contract-IERC20-)

No description

### [Function `getAccumulatedSwapRateOfPosition(uint256 _positionId) → uint256`](#FlowMarginProtocol-getAccumulatedSwapRateOfPosition-uint256-)

No description

### [Function `getPositionsByPoolLength(contract LiquidityPoolInterface _pool) → uint256`](#FlowMarginProtocol-getPositionsByPoolLength-contract-LiquidityPoolInterface-)

No description

### [Function `getPositionIdByPoolAndIndex(contract LiquidityPoolInterface _pool, uint256 _index) → uint256`](#FlowMarginProtocol-getPositionIdByPoolAndIndex-contract-LiquidityPoolInterface-uint256-)

No description

### [Function `getLeveragedDebitsByPoolAndIndex(contract LiquidityPoolInterface _pool, uint256 _index) → int256`](#FlowMarginProtocol-getLeveragedDebitsByPoolAndIndex-contract-LiquidityPoolInterface-uint256-)

No description

### [Function `getPositionsByPoolAndTraderLength(contract LiquidityPoolInterface _pool, address _trader) → uint256`](#FlowMarginProtocol-getPositionsByPoolAndTraderLength-contract-LiquidityPoolInterface-address-)

No description

### [Function `getPositionIdByPoolAndTraderAndIndex(contract LiquidityPoolInterface _pool, address _trader, uint256 _index) → uint256`](#FlowMarginProtocol-getPositionIdByPoolAndTraderAndIndex-contract-LiquidityPoolInterface-address-uint256-)

No description

### [Function `getLeveragedDebitsByPoolAndTraderAndIndex(contract LiquidityPoolInterface _pool, address _trader, uint256 _index) → int256`](#FlowMarginProtocol-getLeveragedDebitsByPoolAndTraderAndIndex-contract-LiquidityPoolInterface-address-uint256-)

No description

### [Function `setTraderIsMarginCalled(contract LiquidityPoolInterface _pool, address _trader, bool _isMarginCalled)`](#FlowMarginProtocol-setTraderIsMarginCalled-contract-LiquidityPoolInterface-address-bool-)

No description

### [Function `setTraderHasPaidFees(contract LiquidityPoolInterface _pool, address _trader, bool _hasPaidFees)`](#FlowMarginProtocol-setTraderHasPaidFees-contract-LiquidityPoolInterface-address-bool-)

No description

### Event `PositionOpened(address sender, address liquidityPool, address baseToken, address quoteToken, int256 leverage, uint256 amount, uint256 price)` {#FlowMarginProtocol-PositionOpened-address-address-address-address-int256-uint256-uint256-}

No description

### Event `PositionClosed(address sender, address liquidityPool, address baseToken, address quoteToken, uint256 positionId, uint256 price)` {#FlowMarginProtocol-PositionClosed-address-address-address-address-uint256-uint256-}

No description

### Event `Deposited(address sender, uint256 amount)` {#FlowMarginProtocol-Deposited-address-uint256-}

No description

### Event `Withdrew(address sender, uint256 amount)` {#FlowMarginProtocol-Withdrew-address-uint256-}

No description

### Event `NewTradingPair(address base, address quote)` {#FlowMarginProtocol-NewTradingPair-address-address-}

No description
