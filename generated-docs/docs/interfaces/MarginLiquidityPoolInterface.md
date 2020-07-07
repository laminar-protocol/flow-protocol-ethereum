## Functions:

- [`depositLiquidity(uint256 _realized)`](#MarginLiquidityPoolInterface-depositLiquidity-uint256-)

- [`increaseAllowanceForProtocol(uint256 _realized)`](#MarginLiquidityPoolInterface-increaseAllowanceForProtocol-uint256-)

- [`increaseAllowanceForProtocolSafety(uint256 _realized)`](#MarginLiquidityPoolInterface-increaseAllowanceForProtocolSafety-uint256-)

- [`withdrawLiquidityOwner(uint256 _realized)`](#MarginLiquidityPoolInterface-withdrawLiquidityOwner-uint256-)

- [`getLiquidity()`](#MarginLiquidityPoolInterface-getLiquidity--)

- [`getBidSpread(address baseToken, address quoteToken)`](#MarginLiquidityPoolInterface-getBidSpread-address-address-)

- [`getAskSpread(address baseToken, address quoteToken)`](#MarginLiquidityPoolInterface-getAskSpread-address-address-)

- [`spreadsPerTokenPair(address baseToken, address quoteToken)`](#MarginLiquidityPoolInterface-spreadsPerTokenPair-address-address-)

- [`setSpreadForPair(address baseToken, address quoteToken, uint256 spread)`](#MarginLiquidityPoolInterface-setSpreadForPair-address-address-uint256-)

- [`enableToken(address baseToken, address quoteToken, uint256 spread, int256 _newSwapRateMarkup)`](#MarginLiquidityPoolInterface-enableToken-address-address-uint256-int256-)

- [`disableToken(address baseToken, address quoteToken)`](#MarginLiquidityPoolInterface-disableToken-address-address-)

- [`allowedTokens(address baseToken, address quoteToken)`](#MarginLiquidityPoolInterface-allowedTokens-address-address-)

- [`minLeverage()`](#MarginLiquidityPoolInterface-minLeverage--)

- [`maxLeverage()`](#MarginLiquidityPoolInterface-maxLeverage--)

- [`minLeverageAmount()`](#MarginLiquidityPoolInterface-minLeverageAmount--)

- [`getSwapRateMarkupForPair(address baseToken, address quoteToken)`](#MarginLiquidityPoolInterface-getSwapRateMarkupForPair-address-address-)

- [`setMinLeverage(uint256 _minLeverage)`](#MarginLiquidityPoolInterface-setMinLeverage-uint256-)

- [`setMaxLeverage(uint256 _maxLeverage)`](#MarginLiquidityPoolInterface-setMaxLeverage-uint256-)

- [`setMinLeverageAmount(uint256 _newMinLeverageAmount)`](#MarginLiquidityPoolInterface-setMinLeverageAmount-uint256-)

- [`setCurrentSwapRateMarkupForPair(address base, address quote, int256 newSwapRateMarkup)`](#MarginLiquidityPoolInterface-setCurrentSwapRateMarkupForPair-address-address-int256-)

## Events:

- [`SpreadUpdated(address baseToken, address quoteToken, uint256 newSpread)`](#MarginLiquidityPoolInterface-SpreadUpdated-address-address-uint256-)

### [Function `depositLiquidity(uint256 _realized) → uint256`](#MarginLiquidityPoolInterface-depositLiquidity-uint256-)

No description

### [Function `increaseAllowanceForProtocol(uint256 _realized)`](#MarginLiquidityPoolInterface-increaseAllowanceForProtocol-uint256-)

No description

### [Function `increaseAllowanceForProtocolSafety(uint256 _realized)`](#MarginLiquidityPoolInterface-increaseAllowanceForProtocolSafety-uint256-)

No description

### [Function `withdrawLiquidityOwner(uint256 _realized) → uint256`](#MarginLiquidityPoolInterface-withdrawLiquidityOwner-uint256-)

No description

### [Function `getLiquidity() → uint256`](#MarginLiquidityPoolInterface-getLiquidity--)

No description

### [Function `getBidSpread(address baseToken, address quoteToken) → uint256`](#MarginLiquidityPoolInterface-getBidSpread-address-address-)

No description

### [Function `getAskSpread(address baseToken, address quoteToken) → uint256`](#MarginLiquidityPoolInterface-getAskSpread-address-address-)

No description

### [Function `spreadsPerTokenPair(address baseToken, address quoteToken) → uint256`](#MarginLiquidityPoolInterface-spreadsPerTokenPair-address-address-)

No description

### [Function `setSpreadForPair(address baseToken, address quoteToken, uint256 spread)`](#MarginLiquidityPoolInterface-setSpreadForPair-address-address-uint256-)

No description

### [Function `enableToken(address baseToken, address quoteToken, uint256 spread, int256 _newSwapRateMarkup)`](#MarginLiquidityPoolInterface-enableToken-address-address-uint256-int256-)

No description

### [Function `disableToken(address baseToken, address quoteToken)`](#MarginLiquidityPoolInterface-disableToken-address-address-)

No description

### [Function `allowedTokens(address baseToken, address quoteToken) → bool`](#MarginLiquidityPoolInterface-allowedTokens-address-address-)

No description

### [Function `minLeverage() → uint256`](#MarginLiquidityPoolInterface-minLeverage--)

No description

### [Function `maxLeverage() → uint256`](#MarginLiquidityPoolInterface-maxLeverage--)

No description

### [Function `minLeverageAmount() → uint256`](#MarginLiquidityPoolInterface-minLeverageAmount--)

No description

### [Function `getSwapRateMarkupForPair(address baseToken, address quoteToken) → int256`](#MarginLiquidityPoolInterface-getSwapRateMarkupForPair-address-address-)

No description

### [Function `setMinLeverage(uint256 _minLeverage)`](#MarginLiquidityPoolInterface-setMinLeverage-uint256-)

No description

### [Function `setMaxLeverage(uint256 _maxLeverage)`](#MarginLiquidityPoolInterface-setMaxLeverage-uint256-)

No description

### [Function `setMinLeverageAmount(uint256 _newMinLeverageAmount)`](#MarginLiquidityPoolInterface-setMinLeverageAmount-uint256-)

No description

### [Function `setCurrentSwapRateMarkupForPair(address base, address quote, int256 newSwapRateMarkup)`](#MarginLiquidityPoolInterface-setCurrentSwapRateMarkupForPair-address-address-int256-)

No description

### Event `SpreadUpdated(address baseToken, address quoteToken, uint256 newSpread)` {#MarginLiquidityPoolInterface-SpreadUpdated-address-address-uint256-}

No description
