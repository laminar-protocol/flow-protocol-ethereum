## Functions:

- [`initialize(uint256 _maxSpread, uint256 _maxTradingPairCount, uint256 _initialTraderRiskMarginCallThreshold, uint256 _initialTraderRiskLiquidateThreshold, uint256 _initialLiquidityPoolENPMarginThreshold, uint256 _initialLiquidityPoolELLMarginThreshold, uint256 _initialLiquidityPoolENPLiquidateThreshold, uint256 _initialLiquidityPoolELLLiquidateThreshold)`](#MarginFlowProtocolConfig-initialize-uint256-uint256-uint256-uint256-uint256-uint256-uint256-uint256-)

- [`setCurrentSwapRateForPair(address _base, address _quote, int256 _newSwapRateLong, int256 _newSwapRateShort)`](#MarginFlowProtocolConfig-setCurrentSwapRateForPair-address-address-int256-int256-)

- [`setMaxSpread(uint256 _maxSpread)`](#MarginFlowProtocolConfig-setMaxSpread-uint256-)

- [`setMaxTradingPairCount(uint256 _maxTradingPairCount)`](#MarginFlowProtocolConfig-setMaxTradingPairCount-uint256-)

- [`addTradingPair(address _base, address _quote, uint256 _swapUnit, int256 _swapRateLong, int256 _swapRateShort)`](#MarginFlowProtocolConfig-addTradingPair-address-address-uint256-int256-int256-)

- [`setTraderRiskMarginCallThreshold(uint256 _newTraderRiskMarginCallThreshold)`](#MarginFlowProtocolConfig-setTraderRiskMarginCallThreshold-uint256-)

- [`setTraderRiskLiquidateThreshold(uint256 _newTraderRiskLiquidateThreshold)`](#MarginFlowProtocolConfig-setTraderRiskLiquidateThreshold-uint256-)

- [`setLiquidityPoolENPMarginThreshold(uint256 _newLiquidityPoolENPMarginThreshold)`](#MarginFlowProtocolConfig-setLiquidityPoolENPMarginThreshold-uint256-)

- [`setLiquidityPoolELLMarginThreshold(uint256 _newLiquidityPoolELLMarginThreshold)`](#MarginFlowProtocolConfig-setLiquidityPoolELLMarginThreshold-uint256-)

- [`setLiquidityPoolENPLiquidateThreshold(uint256 _newLiquidityPoolENPLiquidateThreshold)`](#MarginFlowProtocolConfig-setLiquidityPoolENPLiquidateThreshold-uint256-)

- [`setLiquidityPoolELLLiquidateThreshold(uint256 _newLiquidityPoolELLLiquidateThreshold)`](#MarginFlowProtocolConfig-setLiquidityPoolELLLiquidateThreshold-uint256-)

- [`getTradingPairs()`](#MarginFlowProtocolConfig-getTradingPairs--)

- [`getEnpAndEllMarginThresholds()`](#MarginFlowProtocolConfig-getEnpAndEllMarginThresholds--)

- [`getEnpAndEllLiquidateThresholds()`](#MarginFlowProtocolConfig-getEnpAndEllLiquidateThresholds--)

- [`getCurrentTotalSwapRateForPoolAndPair(contract MarginLiquidityPoolInterface _pool, struct MarginFlowProtocol.TradingPair _pair, enum MarginFlowProtocolConfig.PositionType _type)`](#MarginFlowProtocolConfig-getCurrentTotalSwapRateForPoolAndPair-contract-MarginLiquidityPoolInterface-struct-MarginFlowProtocol-TradingPair-enum-MarginFlowProtocolConfig-PositionType-)

## Events:

- [`NewTradingPair(address base, address quote)`](#MarginFlowProtocolConfig-NewTradingPair-address-address-)

### [Function `initialize(uint256 _maxSpread, uint256 _maxTradingPairCount, uint256 _initialTraderRiskMarginCallThreshold, uint256 _initialTraderRiskLiquidateThreshold, uint256 _initialLiquidityPoolENPMarginThreshold, uint256 _initialLiquidityPoolELLMarginThreshold, uint256 _initialLiquidityPoolENPLiquidateThreshold, uint256 _initialLiquidityPoolELLLiquidateThreshold)`](#MarginFlowProtocolConfig-initialize-uint256-uint256-uint256-uint256-uint256-uint256-uint256-uint256-)

No description

### [Function `setCurrentSwapRateForPair(address _base, address _quote, int256 _newSwapRateLong, int256 _newSwapRateShort)`](#MarginFlowProtocolConfig-setCurrentSwapRateForPair-address-address-int256-int256-)

Set new swap rate for token pair, only for the owner.

#### Parameters:

- `_base`: The base token.

- `_quote`: The quote token.

- `_newSwapRateLong`: The new swap rate as percentage for longs.

- `_newSwapRateShort`: The new swap rate as percentage for shorts.

### [Function `setMaxSpread(uint256 _maxSpread)`](#MarginFlowProtocolConfig-setMaxSpread-uint256-)

Set new max spread.

#### Parameters:

- `_maxSpread`: The new max spread.

### [Function `setMaxTradingPairCount(uint256 _maxTradingPairCount)`](#MarginFlowProtocolConfig-setMaxTradingPairCount-uint256-)

Set new max trading pair count.

#### Parameters:

- `_maxTradingPairCount`: The new max trading pair count.

### [Function `addTradingPair(address _base, address _quote, uint256 _swapUnit, int256 _swapRateLong, int256 _swapRateShort)`](#MarginFlowProtocolConfig-addTradingPair-address-address-uint256-int256-int256-)

Add new trading pair, only for the owner.

#### Parameters:

- `_base`: The base token.

- `_quote`: The quote token.

- `_swapUnit`: The swap unit.

- `_swapRateLong`: The swap rate as percentage for longs.

- `_swapRateShort`: The swap rate as percentage for shorts.

### [Function `setTraderRiskMarginCallThreshold(uint256 _newTraderRiskMarginCallThreshold)`](#MarginFlowProtocolConfig-setTraderRiskMarginCallThreshold-uint256-)

Set new trader risk threshold for trader margin calls, only set by owner.

#### Parameters:

- `_newTraderRiskMarginCallThreshold`: The new trader risk threshold as percentage.

### [Function `setTraderRiskLiquidateThreshold(uint256 _newTraderRiskLiquidateThreshold)`](#MarginFlowProtocolConfig-setTraderRiskLiquidateThreshold-uint256-)

Set new trader risk threshold for trader liquidation, only set by owner.

#### Parameters:

- `_newTraderRiskLiquidateThreshold`: The new trader risk threshold as percentage.

### [Function `setLiquidityPoolENPMarginThreshold(uint256 _newLiquidityPoolENPMarginThreshold)`](#MarginFlowProtocolConfig-setLiquidityPoolENPMarginThreshold-uint256-)

Set new trader risk threshold, only for the owner.

#### Parameters:

- `_newLiquidityPoolENPMarginThreshold`: The new trader risk threshold.

### [Function `setLiquidityPoolELLMarginThreshold(uint256 _newLiquidityPoolELLMarginThreshold)`](#MarginFlowProtocolConfig-setLiquidityPoolELLMarginThreshold-uint256-)

Set new trader risk threshold, only for the owner.

#### Parameters:

- `_newLiquidityPoolELLMarginThreshold`: The new trader risk threshold.

### [Function `setLiquidityPoolENPLiquidateThreshold(uint256 _newLiquidityPoolENPLiquidateThreshold)`](#MarginFlowProtocolConfig-setLiquidityPoolENPLiquidateThreshold-uint256-)

Set new trader risk threshold, only for the owner.

#### Parameters:

- `_newLiquidityPoolENPLiquidateThreshold`: The new trader risk threshold.

### [Function `setLiquidityPoolELLLiquidateThreshold(uint256 _newLiquidityPoolELLLiquidateThreshold)`](#MarginFlowProtocolConfig-setLiquidityPoolELLLiquidateThreshold-uint256-)

Set new trader risk threshold, only for the owner.

#### Parameters:

- `_newLiquidityPoolELLLiquidateThreshold`: The new trader risk threshold.

### [Function `getTradingPairs() → struct MarginFlowProtocol.TradingPair[]`](#MarginFlowProtocolConfig-getTradingPairs--)

Get all tradings pairs for the protocol.

#### Return Values:

- The trading pairs.

### [Function `getEnpAndEllMarginThresholds() → uint256, uint256`](#MarginFlowProtocolConfig-getEnpAndEllMarginThresholds--)

Get the ENP and ELL margin thresholds.

#### Return Values:

- The ENP and ELL margin thresholds.

### [Function `getEnpAndEllLiquidateThresholds() → uint256, uint256`](#MarginFlowProtocolConfig-getEnpAndEllLiquidateThresholds--)

Get the ENP and ELL liquidation thresholds.

#### Return Values:

- The ENP and ELL liquidation thresholds.

### [Function `getCurrentTotalSwapRateForPoolAndPair(contract MarginLiquidityPoolInterface _pool, struct MarginFlowProtocol.TradingPair _pair, enum MarginFlowProtocolConfig.PositionType _type) → struct Percentage.SignedPercent`](#MarginFlowProtocolConfig-getCurrentTotalSwapRateForPoolAndPair-contract-MarginLiquidityPoolInterface-struct-MarginFlowProtocol-TradingPair-enum-MarginFlowProtocolConfig-PositionType-)

Get the total swap rate from base swap rate and pool markup.

#### Parameters:

- `_pool`: The margin liquidity pool.

- `_pair`: The trading pair.

- `_type`: The position type (Long or Short).

#### Return Values:

- The the total swap rate.

### Event `NewTradingPair(address base, address quote)` {#MarginFlowProtocolConfig-NewTradingPair-address-address-}

Event for new trading pair being added.

#### Parameters:

- `base`: The base token

- `quote`: The quote token
