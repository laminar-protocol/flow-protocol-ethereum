## Functions:

- [`initialize(contract PriceOracleInterface _oracle, contract MoneyMarketInterface _moneyMarket, contract MarginFlowProtocolConfig _protocolConfig, contract MarginFlowProtocolSafety _protocolSafety, contract MarginFlowProtocolLiquidated _protocolLiquidated, contract MarginFlowProtocolAccPositions _protocolAcc, contract MarginLiquidityPoolRegistry _liquidityPoolRegistry)`](#MarginFlowProtocol-initialize-contract-PriceOracleInterface-contract-MoneyMarketInterface-contract-MarginFlowProtocolConfig-contract-MarginFlowProtocolSafety-contract-MarginFlowProtocolLiquidated-contract-MarginFlowProtocolAccPositions-contract-MarginLiquidityPoolRegistry-)

- [`deposit(contract MarginLiquidityPoolInterface _pool, uint256 _baseTokenAmount)`](#MarginFlowProtocol-deposit-contract-MarginLiquidityPoolInterface-uint256-)

- [`withdraw(contract MarginLiquidityPoolInterface _pool, uint256 _iTokenAmount)`](#MarginFlowProtocol-withdraw-contract-MarginLiquidityPoolInterface-uint256-)

- [`withdrawForPool(uint256 _iTokenAmount)`](#MarginFlowProtocol-withdrawForPool-uint256-)

- [`openPosition(contract MarginLiquidityPoolInterface _pool, address _base, address _quote, int256 _leverage, uint256 _leveragedHeld, uint256 _price)`](#MarginFlowProtocol-openPosition-contract-MarginLiquidityPoolInterface-address-address-int256-uint256-uint256-)

- [`closePosition(uint256 _positionId, uint256 _price, uint256 _estimatedPoolIndex, uint256 _estimatedTraderIndex)`](#MarginFlowProtocol-closePosition-uint256-uint256-uint256-uint256-)

- [`getExactFreeMargin(contract MarginLiquidityPoolInterface _pool, address _trader)`](#MarginFlowProtocol-getExactFreeMargin-contract-MarginLiquidityPoolInterface-address-)

- [`getExactEquityOfTrader(contract MarginLiquidityPoolInterface _pool, address _trader)`](#MarginFlowProtocol-getExactEquityOfTrader-contract-MarginLiquidityPoolInterface-address-)

- [`getUnrealizedPlOfPosition(uint256 _positionId)`](#MarginFlowProtocol-getUnrealizedPlOfPosition-uint256-)

- [`getAccumulatedSwapRateOfPosition(uint256 _positionId)`](#MarginFlowProtocol-getAccumulatedSwapRateOfPosition-uint256-)

- [`getMarginHeld(contract MarginLiquidityPoolInterface _pool, address _trader)`](#MarginFlowProtocol-getMarginHeld-contract-MarginLiquidityPoolInterface-address-)

- [`getPositionsByPoolLength(contract MarginLiquidityPoolInterface _pool)`](#MarginFlowProtocol-getPositionsByPoolLength-contract-MarginLiquidityPoolInterface-)

- [`getPositionById(uint256 _positionId)`](#MarginFlowProtocol-getPositionById-uint256-)

- [`getPositionsByPool(contract MarginLiquidityPoolInterface _pool)`](#MarginFlowProtocol-getPositionsByPool-contract-MarginLiquidityPoolInterface-)

- [`getPositionsByPoolAndTrader(contract MarginLiquidityPoolInterface _pool, address _trader)`](#MarginFlowProtocol-getPositionsByPoolAndTrader-contract-MarginLiquidityPoolInterface-address-)

- [`getPositionsByPoolAndTraderLength(contract MarginLiquidityPoolInterface _pool, address _trader)`](#MarginFlowProtocol-getPositionsByPoolAndTraderLength-contract-MarginLiquidityPoolInterface-address-)

- [`getPositionIdByPoolAndTraderAndIndex(contract MarginLiquidityPoolInterface _pool, address _trader, uint256 _index)`](#MarginFlowProtocol-getPositionIdByPoolAndTraderAndIndex-contract-MarginLiquidityPoolInterface-address-uint256-)

- [`getTotalPoolLiquidity(contract MarginLiquidityPoolInterface _pool)`](#MarginFlowProtocol-getTotalPoolLiquidity-contract-MarginLiquidityPoolInterface-)

- [`__setTraderIsMarginCalled(contract MarginLiquidityPoolInterface _pool, address _trader, bool _isMarginCalled)`](#MarginFlowProtocol-__setTraderIsMarginCalled-contract-MarginLiquidityPoolInterface-address-bool-)

- [`__removePosition(struct MarginFlowProtocol.Position _position, int256 _unrealizedPosition, struct Percentage.Percent _marketStopPrice, uint256 _estimatedPoolIndex, uint256 _estimatedTraderIndex)`](#MarginFlowProtocol-__removePosition-struct-MarginFlowProtocol-Position-int256-struct-Percentage-Percent-uint256-uint256-)

- [`__transferUnrealized(contract MarginLiquidityPoolInterface _pool, address _owner, int256 _unrealized, int256 _storedTraderEquity)`](#MarginFlowProtocol-__transferUnrealized-contract-MarginLiquidityPoolInterface-address-int256-int256-)

## Events:

- [`PositionOpened(uint256 positionId, address sender, address liquidityPool, address baseToken, address quoteToken, int256 leverage, int256 leveragedDebitsInUsd, uint256 price)`](#MarginFlowProtocol-PositionOpened-uint256-address-address-address-address-int256-int256-uint256-)

- [`PositionClosed(uint256 positionId, address sender, address liquidityPool, address baseToken, address quoteToken, int256 realizedPl, uint256 price)`](#MarginFlowProtocol-PositionClosed-uint256-address-address-address-address-int256-uint256-)

- [`Deposited(contract MarginLiquidityPoolInterface pool, address sender, uint256 amount)`](#MarginFlowProtocol-Deposited-contract-MarginLiquidityPoolInterface-address-uint256-)

- [`Withdrew(contract MarginLiquidityPoolInterface pool, address sender, uint256 amount)`](#MarginFlowProtocol-Withdrew-contract-MarginLiquidityPoolInterface-address-uint256-)

- [`WithdrewStoppedPool(contract MarginLiquidityPoolInterface pool, address sender, uint256 amount)`](#MarginFlowProtocol-WithdrewStoppedPool-contract-MarginLiquidityPoolInterface-address-uint256-)

### [Function `initialize(contract PriceOracleInterface _oracle, contract MoneyMarketInterface _moneyMarket, contract MarginFlowProtocolConfig _protocolConfig, contract MarginFlowProtocolSafety _protocolSafety, contract MarginFlowProtocolLiquidated _protocolLiquidated, contract MarginFlowProtocolAccPositions _protocolAcc, contract MarginLiquidityPoolRegistry _liquidityPoolRegistry)`](#MarginFlowProtocol-initialize-contract-PriceOracleInterface-contract-MoneyMarketInterface-contract-MarginFlowProtocolConfig-contract-MarginFlowProtocolSafety-contract-MarginFlowProtocolLiquidated-contract-MarginFlowProtocolAccPositions-contract-MarginLiquidityPoolRegistry-)

Initialize the MarginFlowProtocol.

#### Parameters:

- `_oracle`: The price oracle

- `_moneyMarket`: The money market.

- `_protocolSafety`: The _protocolSafety.

- `_liquidityPoolRegistry`: The liquidity pool registry.

### [Function `deposit(contract MarginLiquidityPoolInterface _pool, uint256 _baseTokenAmount)`](#MarginFlowProtocol-deposit-contract-MarginLiquidityPoolInterface-uint256-)

Deposit amount to pool balance.

#### Parameters:

- `_pool`: The MarginLiquidityPool.

- `_baseTokenAmount`: The base token amount to deposit.

### [Function `withdraw(contract MarginLiquidityPoolInterface _pool, uint256 _iTokenAmount)`](#MarginFlowProtocol-withdraw-contract-MarginLiquidityPoolInterface-uint256-)

Withdraw amount from pool balance. Automatically withdraws trader deposits when withdrawing all funds.

#### Parameters:

- `_pool`: The MarginLiquidityPool.

- `_iTokenAmount`: The iToken amount to withdraw.

### [Function `withdrawForPool(uint256 _iTokenAmount)`](#MarginFlowProtocol-withdrawForPool-uint256-)

Withdraw amount from pool balance for pool.

#### Parameters:

- `_iTokenAmount`: The iToken amount to withdraw.

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

### [Function `closePosition(uint256 _positionId, uint256 _price, uint256 _estimatedPoolIndex, uint256 _estimatedTraderIndex)`](#MarginFlowProtocol-closePosition-uint256-uint256-uint256-uint256-)

Close the given position with a min/max price. Set price to 0 if you want to use the current market price.

#### Parameters:

- `_positionId`: The id of the position to close.

- `_price`: The max/min price when closing the position..

### [Function `getExactFreeMargin(contract MarginLiquidityPoolInterface _pool, address _trader) → uint256`](#MarginFlowProtocol-getExactFreeMargin-contract-MarginLiquidityPoolInterface-address-)

Get the exact free margin (only use as view function due to gas costs).

#### Parameters:

- `_pool`: The MarginLiquidityPool.

- `_trader`: The trader address.

#### Return Values:

- The free margin amount.

### [Function `getExactEquityOfTrader(contract MarginLiquidityPoolInterface _pool, address _trader) → int256`](#MarginFlowProtocol-getExactEquityOfTrader-contract-MarginLiquidityPoolInterface-address-)

Get the exact equity of trader (only use as view function due to gas costs).

#### Parameters:

- `_pool`: The MarginLiquidityPool.

- `_trader`: The trader address.

#### Return Values:

- The equity of trader.

### [Function `getUnrealizedPlOfPosition(uint256 _positionId) → int256`](#MarginFlowProtocol-getUnrealizedPlOfPosition-uint256-)

Get the unrealized profit and loss of a position based on current market price.

#### Parameters:

- `_positionId`: The position id.

#### Return Values:

- The equity of trader.

### [Function `getAccumulatedSwapRateOfPosition(uint256 _positionId) → int256`](#MarginFlowProtocol-getAccumulatedSwapRateOfPosition-uint256-)

Get the current accumulated swap rate of a position.

#### Parameters:

- `_positionId`: The position id.

#### Return Values:

- The accumulated swap rate.

### [Function `getMarginHeld(contract MarginLiquidityPoolInterface _pool, address _trader) → uint256`](#MarginFlowProtocol-getMarginHeld-contract-MarginLiquidityPoolInterface-address-)

Sum of all margin held of a given trader.

#### Parameters:

- `_pool`: The MarginLiquidityPool.

- `_trader`: The trader address.

#### Return Values:

- The margin held sum.

### [Function `getPositionsByPoolLength(contract MarginLiquidityPoolInterface _pool) → uint256`](#MarginFlowProtocol-getPositionsByPoolLength-contract-MarginLiquidityPoolInterface-)

Get the position count of a pool.

#### Parameters:

- `_pool`: The MarginLiquidityPool.

#### Return Values:

- The position count.

### [Function `getPositionById(uint256 _positionId) → struct MarginFlowProtocol.Position`](#MarginFlowProtocol-getPositionById-uint256-)

Get the position by id.

#### Parameters:

- `_positionId`: The position id..

#### Return Values:

- The position.

### [Function `getPositionsByPool(contract MarginLiquidityPoolInterface _pool) → struct MarginFlowProtocol.Position[]`](#MarginFlowProtocol-getPositionsByPool-contract-MarginLiquidityPoolInterface-)

Get all positions of a pool.

#### Parameters:

- `_pool`: The MarginLiquidityPool.

#### Return Values:

- The positions.

### [Function `getPositionsByPoolAndTrader(contract MarginLiquidityPoolInterface _pool, address _trader) → struct MarginFlowProtocol.Position[]`](#MarginFlowProtocol-getPositionsByPoolAndTrader-contract-MarginLiquidityPoolInterface-address-)

Get the positions of a trader in a given pool.

#### Parameters:

- `_pool`: The MarginLiquidityPool.

- `_trader`: The trader.

#### Return Values:

- The positions.

### [Function `getPositionsByPoolAndTraderLength(contract MarginLiquidityPoolInterface _pool, address _trader) → uint256`](#MarginFlowProtocol-getPositionsByPoolAndTraderLength-contract-MarginLiquidityPoolInterface-address-)

Get the positions count of a trader in a given pool.

#### Parameters:

- `_pool`: The MarginLiquidityPool.

- `_trader`: The trader.

#### Return Values:

- The positions count.

### [Function `getPositionIdByPoolAndTraderAndIndex(contract MarginLiquidityPoolInterface _pool, address _trader, uint256 _index) → uint256`](#MarginFlowProtocol-getPositionIdByPoolAndTraderAndIndex-contract-MarginLiquidityPoolInterface-address-uint256-)

Get the position id of the n'th position of a trader in a given pool.

#### Parameters:

- `_pool`: The MarginLiquidityPool.

- `_trader`: The trader.

#### Return Values:

- The position id.

### [Function `getTotalPoolLiquidity(contract MarginLiquidityPoolInterface _pool) → int256`](#MarginFlowProtocol-getTotalPoolLiquidity-contract-MarginLiquidityPoolInterface-)

Get the liquidity of a pool.

#### Parameters:

- `_pool`: The MarginLiquidityPool.

#### Return Values:

- The liquidity

### [Function `__setTraderIsMarginCalled(contract MarginLiquidityPoolInterface _pool, address _trader, bool _isMarginCalled)`](#MarginFlowProtocol-__setTraderIsMarginCalled-contract-MarginLiquidityPoolInterface-address-bool-)

No description

### [Function `__removePosition(struct MarginFlowProtocol.Position _position, int256 _unrealizedPosition, struct Percentage.Percent _marketStopPrice, uint256 _estimatedPoolIndex, uint256 _estimatedTraderIndex)`](#MarginFlowProtocol-__removePosition-struct-MarginFlowProtocol-Position-int256-struct-Percentage-Percent-uint256-uint256-)

No description

### [Function `__transferUnrealized(contract MarginLiquidityPoolInterface _pool, address _owner, int256 _unrealized, int256 _storedTraderEquity)`](#MarginFlowProtocol-__transferUnrealized-contract-MarginLiquidityPoolInterface-address-int256-int256-)

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

### Event `Deposited(contract MarginLiquidityPoolInterface pool, address sender, uint256 amount)` {#MarginFlowProtocol-Deposited-contract-MarginLiquidityPoolInterface-address-uint256-}

Event for deposits.

#### Parameters:

- `sender`: The sender

- `amount`: The amount

### Event `Withdrew(contract MarginLiquidityPoolInterface pool, address sender, uint256 amount)` {#MarginFlowProtocol-Withdrew-contract-MarginLiquidityPoolInterface-address-uint256-}

Event for withdrawals.

#### Parameters:

- `sender`: The sender

- `amount`: The amount

### Event `WithdrewStoppedPool(contract MarginLiquidityPoolInterface pool, address sender, uint256 amount)` {#MarginFlowProtocol-WithdrewStoppedPool-contract-MarginLiquidityPoolInterface-address-uint256-}

Event for withdrawals of stopped pools.

#### Parameters:

- `sender`: The sender

- `amount`: The amount
