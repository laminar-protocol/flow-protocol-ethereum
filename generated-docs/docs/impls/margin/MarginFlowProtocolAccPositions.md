## Functions:

- [`initialize(struct MarginMarketLib.MarketData _market)`](#MarginFlowProtocolAccPositions-initialize-struct-MarginMarketLib-MarketData-)

- [`getPairPoolSafetyInfo(contract MarginLiquidityPoolInterface _pool, struct MarginFlowProtocol.TradingPair _pair)`](#MarginFlowProtocolAccPositions-getPairPoolSafetyInfo-contract-MarginLiquidityPoolInterface-struct-MarginFlowProtocol-TradingPair-)

- [`getPairTraderUnrealized(contract MarginLiquidityPoolInterface _pool, address _trader, struct MarginFlowProtocol.TradingPair _pair)`](#MarginFlowProtocolAccPositions-getPairTraderUnrealized-contract-MarginLiquidityPoolInterface-address-struct-MarginFlowProtocol-TradingPair-)

- [`getPairTraderNet(contract MarginLiquidityPoolInterface _pool, address _trader, struct MarginFlowProtocol.TradingPair _pair)`](#MarginFlowProtocolAccPositions-getPairTraderNet-contract-MarginLiquidityPoolInterface-address-struct-MarginFlowProtocol-TradingPair-)

- [`__updateAccumulatedPositions(struct MarginFlowProtocol.Position _position, bool _isAddition)`](#MarginFlowProtocolAccPositions-__updateAccumulatedPositions-struct-MarginFlowProtocol-Position-bool-)

### [Function `initialize(struct MarginMarketLib.MarketData _market)`](#MarginFlowProtocolAccPositions-initialize-struct-MarginMarketLib-MarketData-)

Initialize the MarginFlowProtocolLiquidated.

#### Parameters:

- `_market`: The market data.

### [Function `getPairPoolSafetyInfo(contract MarginLiquidityPoolInterface _pool, struct MarginFlowProtocol.TradingPair _pair) → uint256, uint256, int256`](#MarginFlowProtocolAccPositions-getPairPoolSafetyInfo-contract-MarginLiquidityPoolInterface-struct-MarginFlowProtocol-TradingPair-)

Receive current pair safety values for pool.

#### Parameters:

- `_pool`: The MarginLiquidityPool.

- `_pair`: The trading pair.

### [Function `getPairTraderUnrealized(contract MarginLiquidityPoolInterface _pool, address _trader, struct MarginFlowProtocol.TradingPair _pair) → int256`](#MarginFlowProtocolAccPositions-getPairTraderUnrealized-contract-MarginLiquidityPoolInterface-address-struct-MarginFlowProtocol-TradingPair-)

Receive current unrealized for trader for trading pair.

#### Parameters:

- `_pool`: The MarginLiquidityPool.

- `_trader`: The trader.

- `_pair`: The trading pair.

### [Function `getPairTraderNet(contract MarginLiquidityPoolInterface _pool, address _trader, struct MarginFlowProtocol.TradingPair _pair) → uint256`](#MarginFlowProtocolAccPositions-getPairTraderNet-contract-MarginLiquidityPoolInterface-address-struct-MarginFlowProtocol-TradingPair-)

Receive current net for trader for trading pair.

#### Parameters:

- `_pool`: The MarginLiquidityPool.

- `_trader`: The trader.

- `_pair`: The trading pair.

### [Function `__updateAccumulatedPositions(struct MarginFlowProtocol.Position _position, bool _isAddition)`](#MarginFlowProtocolAccPositions-__updateAccumulatedPositions-struct-MarginFlowProtocol-Position-bool-)

No description
