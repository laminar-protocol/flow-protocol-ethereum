## Functions:

- [`getPositionById(uint256 _id)`](#TestFlowMarginProtocol-getPositionById-uint256-)

- [`getLastPositionByPoolPart1(contract LiquidityPoolInterface _pool)`](#TestFlowMarginProtocol-getLastPositionByPoolPart1-contract-LiquidityPoolInterface-)

- [`getLastPositionByPoolPart2(contract LiquidityPoolInterface _pool)`](#TestFlowMarginProtocol-getLastPositionByPoolPart2-contract-LiquidityPoolInterface-)

- [`getLastPositionByPoolAndTraderPart1(contract LiquidityPoolInterface _pool, address _trader)`](#TestFlowMarginProtocol-getLastPositionByPoolAndTraderPart1-contract-LiquidityPoolInterface-address-)

- [`getLastPositionByPoolAndTraderPart2(contract LiquidityPoolInterface _pool, address _trader)`](#TestFlowMarginProtocol-getLastPositionByPoolAndTraderPart2-contract-LiquidityPoolInterface-address-)

- [`getUnrealizedPlAndMarketPriceOfPosition(contract LiquidityPoolInterface _pool, contract FlowToken _base, contract FlowToken _quote, int256 _leverage, int256 _leveragedHeld, int256 _leveragedDebits, uint256 maxPrice)`](#TestFlowMarginProtocol-getUnrealizedPlAndMarketPriceOfPosition-contract-LiquidityPoolInterface-contract-FlowToken-contract-FlowToken-int256-int256-int256-uint256-)

- [`getUsdValue(contract IERC20 _currencyToken, int256 _amount)`](#TestFlowMarginProtocol-getUsdValue-contract-IERC20-int256-)

- [`getMarginLevel(contract LiquidityPoolInterface _pool, address _trader)`](#TestFlowMarginProtocol-getMarginLevel-contract-LiquidityPoolInterface-address-)

- [`getAskPrice(contract LiquidityPoolInterface _pool, contract FlowToken _base, contract FlowToken _quote, uint256 _max)`](#TestFlowMarginProtocol-getAskPrice-contract-LiquidityPoolInterface-contract-FlowToken-contract-FlowToken-uint256-)

- [`getBidPrice(contract LiquidityPoolInterface _pool, contract FlowToken _base, contract FlowToken _quote, uint256 _min)`](#TestFlowMarginProtocol-getBidPrice-contract-LiquidityPoolInterface-contract-FlowToken-contract-FlowToken-uint256-)

- [`getIsPoolSafe(contract LiquidityPoolInterface _pool)`](#TestFlowMarginProtocol-getIsPoolSafe-contract-LiquidityPoolInterface-)

- [`getIsTraderSafe(contract LiquidityPoolInterface _pool, address _trader)`](#TestFlowMarginProtocol-getIsTraderSafe-contract-LiquidityPoolInterface-address-)

- [`getAccumulatedSwapRateFromParameters(int256 _leveragedDebitsInUsd, uint256 _swapRate, uint256 _timeWhenOpened)`](#TestFlowMarginProtocol-getAccumulatedSwapRateFromParameters-int256-uint256-uint256-)

- [`removePositionFromPoolList(contract LiquidityPoolInterface _pool, uint256 _positionId)`](#TestFlowMarginProtocol-removePositionFromPoolList-contract-LiquidityPoolInterface-uint256-)

- [`getPositionsByPool(contract LiquidityPoolInterface _pool, address _trader)`](#TestFlowMarginProtocol-getPositionsByPool-contract-LiquidityPoolInterface-address-)

- [`getPrice(contract IERC20 _baseCurrencyId, contract IERC20 _quoteCurrencyId)`](#TestFlowMarginProtocol-getPrice-contract-IERC20-contract-IERC20-)

- [`getLeveragedDebitsOfTrader(contract LiquidityPoolInterface _pool, address _trader)`](#TestFlowMarginProtocol-getLeveragedDebitsOfTrader-contract-LiquidityPoolInterface-address-)

- [`getSwapRatesOfTrader(contract LiquidityPoolInterface _pool, address _trader)`](#TestFlowMarginProtocol-getSwapRatesOfTrader-contract-LiquidityPoolInterface-address-)

- [`getUnrealizedPlOfTrader(contract LiquidityPoolInterface _pool, address _trader)`](#TestFlowMarginProtocol-getUnrealizedPlOfTrader-contract-LiquidityPoolInterface-address-)

- [`getUnrealizedPlOfPosition(uint256 _positionId)`](#TestFlowMarginProtocol-getUnrealizedPlOfPosition-uint256-)

- [`getEquityOfTrader(contract LiquidityPoolInterface _pool, address _trader)`](#TestFlowMarginProtocol-getEquityOfTrader-contract-LiquidityPoolInterface-address-)

- [`getEquityOfPool(contract LiquidityPoolInterface _pool)`](#TestFlowMarginProtocol-getEquityOfPool-contract-LiquidityPoolInterface-)

- [`getAccumulatedSwapRateOfPosition(uint256 _positionId)`](#TestFlowMarginProtocol-getAccumulatedSwapRateOfPosition-uint256-)

- [`getEnpAndEll(contract LiquidityPoolInterface _pool)`](#TestFlowMarginProtocol-getEnpAndEll-contract-LiquidityPoolInterface-)

### [Function `getPositionById(uint256 _id) → uint256, address, contract LiquidityPoolInterface, contract FlowToken, contract FlowToken, int256, int256, int256, int256, uint256, uint256, uint256`](#TestFlowMarginProtocol-getPositionById-uint256-)

No description

### [Function `getLastPositionByPoolPart1(contract LiquidityPoolInterface _pool) → uint256, address, contract LiquidityPoolInterface, contract FlowToken, contract FlowToken, int256`](#TestFlowMarginProtocol-getLastPositionByPoolPart1-contract-LiquidityPoolInterface-)

No description

### [Function `getLastPositionByPoolPart2(contract LiquidityPoolInterface _pool) → int256, int256, int256, uint256, uint256, uint256`](#TestFlowMarginProtocol-getLastPositionByPoolPart2-contract-LiquidityPoolInterface-)

No description

### [Function `getLastPositionByPoolAndTraderPart1(contract LiquidityPoolInterface _pool, address _trader) → uint256, address, contract LiquidityPoolInterface, contract FlowToken, contract FlowToken, int256`](#TestFlowMarginProtocol-getLastPositionByPoolAndTraderPart1-contract-LiquidityPoolInterface-address-)

No description

### [Function `getLastPositionByPoolAndTraderPart2(contract LiquidityPoolInterface _pool, address _trader) → int256, int256, int256, uint256, uint256, uint256`](#TestFlowMarginProtocol-getLastPositionByPoolAndTraderPart2-contract-LiquidityPoolInterface-address-)

No description

### [Function `getUnrealizedPlAndMarketPriceOfPosition(contract LiquidityPoolInterface _pool, contract FlowToken _base, contract FlowToken _quote, int256 _leverage, int256 _leveragedHeld, int256 _leveragedDebits, uint256 maxPrice) → int256, uint256`](#TestFlowMarginProtocol-getUnrealizedPlAndMarketPriceOfPosition-contract-LiquidityPoolInterface-contract-FlowToken-contract-FlowToken-int256-int256-int256-uint256-)

No description

### [Function `getUsdValue(contract IERC20 _currencyToken, int256 _amount) → int256`](#TestFlowMarginProtocol-getUsdValue-contract-IERC20-int256-)

No description

### [Function `getMarginLevel(contract LiquidityPoolInterface _pool, address _trader) → int256`](#TestFlowMarginProtocol-getMarginLevel-contract-LiquidityPoolInterface-address-)

No description

### [Function `getAskPrice(contract LiquidityPoolInterface _pool, contract FlowToken _base, contract FlowToken _quote, uint256 _max) → uint256`](#TestFlowMarginProtocol-getAskPrice-contract-LiquidityPoolInterface-contract-FlowToken-contract-FlowToken-uint256-)

No description

### [Function `getBidPrice(contract LiquidityPoolInterface _pool, contract FlowToken _base, contract FlowToken _quote, uint256 _min) → uint256`](#TestFlowMarginProtocol-getBidPrice-contract-LiquidityPoolInterface-contract-FlowToken-contract-FlowToken-uint256-)

No description

### [Function `getIsPoolSafe(contract LiquidityPoolInterface _pool) → bool`](#TestFlowMarginProtocol-getIsPoolSafe-contract-LiquidityPoolInterface-)

No description

### [Function `getIsTraderSafe(contract LiquidityPoolInterface _pool, address _trader) → bool`](#TestFlowMarginProtocol-getIsTraderSafe-contract-LiquidityPoolInterface-address-)

No description

### [Function `getAccumulatedSwapRateFromParameters(int256 _leveragedDebitsInUsd, uint256 _swapRate, uint256 _timeWhenOpened) → uint256`](#TestFlowMarginProtocol-getAccumulatedSwapRateFromParameters-int256-uint256-uint256-)

No description

### [Function `removePositionFromPoolList(contract LiquidityPoolInterface _pool, uint256 _positionId)`](#TestFlowMarginProtocol-removePositionFromPoolList-contract-LiquidityPoolInterface-uint256-)

No description

### [Function `getPositionsByPool(contract LiquidityPoolInterface _pool, address _trader) → uint256[]`](#TestFlowMarginProtocol-getPositionsByPool-contract-LiquidityPoolInterface-address-)

No description

### [Function `getPrice(contract IERC20 _baseCurrencyId, contract IERC20 _quoteCurrencyId) → uint256`](#TestFlowMarginProtocol-getPrice-contract-IERC20-contract-IERC20-)

No description

### [Function `getLeveragedDebitsOfTrader(contract LiquidityPoolInterface _pool, address _trader) → uint256`](#TestFlowMarginProtocol-getLeveragedDebitsOfTrader-contract-LiquidityPoolInterface-address-)

No description

### [Function `getSwapRatesOfTrader(contract LiquidityPoolInterface _pool, address _trader) → uint256`](#TestFlowMarginProtocol-getSwapRatesOfTrader-contract-LiquidityPoolInterface-address-)

No description

### [Function `getUnrealizedPlOfTrader(contract LiquidityPoolInterface _pool, address _trader) → int256`](#TestFlowMarginProtocol-getUnrealizedPlOfTrader-contract-LiquidityPoolInterface-address-)

No description

### [Function `getUnrealizedPlOfPosition(uint256 _positionId) → int256`](#TestFlowMarginProtocol-getUnrealizedPlOfPosition-uint256-)

No description

### [Function `getEquityOfTrader(contract LiquidityPoolInterface _pool, address _trader) → int256`](#TestFlowMarginProtocol-getEquityOfTrader-contract-LiquidityPoolInterface-address-)

No description

### [Function `getEquityOfPool(contract LiquidityPoolInterface _pool) → int256`](#TestFlowMarginProtocol-getEquityOfPool-contract-LiquidityPoolInterface-)

No description

### [Function `getAccumulatedSwapRateOfPosition(uint256 _positionId) → uint256`](#TestFlowMarginProtocol-getAccumulatedSwapRateOfPosition-uint256-)

No description

### [Function `getEnpAndEll(contract LiquidityPoolInterface _pool) → uint256, uint256`](#TestFlowMarginProtocol-getEnpAndEll-contract-LiquidityPoolInterface-)

No description
