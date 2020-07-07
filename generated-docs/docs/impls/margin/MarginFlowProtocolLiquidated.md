## Functions:

- [`initialize(struct MarginMarketLib.MarketData _market)`](#MarginFlowProtocolLiquidated-initialize-struct-MarginMarketLib-MarketData-)

- [`closePositionForLiquidatedPool(uint256 _positionId, uint256 _estimatedPoolIndex, uint256 _estimatedTraderIndex)`](#MarginFlowProtocolLiquidated-closePositionForLiquidatedPool-uint256-uint256-uint256-)

- [`closePositionForLiquidatedTrader(uint256 _positionId, uint256 _estimatedPoolIndex, uint256 _estimatedTraderIndex)`](#MarginFlowProtocolLiquidated-closePositionForLiquidatedTrader-uint256-uint256-uint256-)

- [`restoreTraderInPool(contract MarginLiquidityPoolInterface _pool, address _trader)`](#MarginFlowProtocolLiquidated-restoreTraderInPool-contract-MarginLiquidityPoolInterface-address-)

- [`restoreLiquidatedPool(contract MarginLiquidityPoolInterface _pool)`](#MarginFlowProtocolLiquidated-restoreLiquidatedPool-contract-MarginLiquidityPoolInterface-)

- [`__stopPool(contract MarginLiquidityPoolInterface _pool)`](#MarginFlowProtocolLiquidated-__stopPool-contract-MarginLiquidityPoolInterface-)

- [`__stopTraderInPool(contract MarginLiquidityPoolInterface _pool, address _trader)`](#MarginFlowProtocolLiquidated-__stopTraderInPool-contract-MarginLiquidityPoolInterface-address-)

- [`getEstimatedEquityOfTrader(contract MarginLiquidityPoolInterface _pool, address _trader, struct Percentage.Percent _usdPairPrice, struct Percentage.Percent _closePrice)`](#MarginFlowProtocolLiquidated-getEstimatedEquityOfTrader-contract-MarginLiquidityPoolInterface-address-struct-Percentage-Percent-struct-Percentage-Percent-)

### [Function `initialize(struct MarginMarketLib.MarketData _market)`](#MarginFlowProtocolLiquidated-initialize-struct-MarginMarketLib-MarketData-)

Initialize the MarginFlowProtocolLiquidated.

#### Parameters:

- `_market`: The market data.

### [Function `closePositionForLiquidatedPool(uint256 _positionId, uint256 _estimatedPoolIndex, uint256 _estimatedTraderIndex)`](#MarginFlowProtocolLiquidated-closePositionForLiquidatedPool-uint256-uint256-uint256-)

Force close position for trader for liquidated pool.

#### Parameters:

- `_positionId`: The id of the position to close.

- `_estimatedPoolIndex`: The index inside the pool positions array.

- `_estimatedTraderIndex`: The index inside the trader positions array.

### [Function `closePositionForLiquidatedTrader(uint256 _positionId, uint256 _estimatedPoolIndex, uint256 _estimatedTraderIndex) → int256`](#MarginFlowProtocolLiquidated-closePositionForLiquidatedTrader-uint256-uint256-uint256-)

Force close position for trader for liquidated trader.

#### Parameters:

- `_positionId`: The id of the position to close.

- `_estimatedPoolIndex`: The index inside the pool positions array.

- `_estimatedTraderIndex`: The index inside the trader positions array.

### [Function `restoreTraderInPool(contract MarginLiquidityPoolInterface _pool, address _trader)`](#MarginFlowProtocolLiquidated-restoreTraderInPool-contract-MarginLiquidityPoolInterface-address-)

Restore a trader in a pool after being liquidated.

#### Parameters:

- `_pool`: The margin liquidity pool.

- `_trader`: The trader.

### [Function `restoreLiquidatedPool(contract MarginLiquidityPoolInterface _pool)`](#MarginFlowProtocolLiquidated-restoreLiquidatedPool-contract-MarginLiquidityPoolInterface-)

Restore a pool after being liquidated.

#### Parameters:

- `_pool`: The margin liquidity pool.

### [Function `__stopPool(contract MarginLiquidityPoolInterface _pool)`](#MarginFlowProtocolLiquidated-__stopPool-contract-MarginLiquidityPoolInterface-)

No description

### [Function `__stopTraderInPool(contract MarginLiquidityPoolInterface _pool, address _trader)`](#MarginFlowProtocolLiquidated-__stopTraderInPool-contract-MarginLiquidityPoolInterface-address-)

No description

### [Function `getEstimatedEquityOfTrader(contract MarginLiquidityPoolInterface _pool, address _trader, struct Percentage.Percent _usdPairPrice, struct Percentage.Percent _closePrice) → int256`](#MarginFlowProtocolLiquidated-getEstimatedEquityOfTrader-contract-MarginLiquidityPoolInterface-address-struct-Percentage-Percent-struct-Percentage-Percent-)

No description
