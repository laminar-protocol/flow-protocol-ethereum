## Functions:

- [`initialize(contract MoneyMarketInterface _moneyMarket, address _protocol, uint256 _initialMinLeverage, uint256 _initialMaxLeverage, uint256 _initialMinLeverageAmount)`](#MarginLiquidityPool-initialize-contract-MoneyMarketInterface-address-uint256-uint256-uint256-)

- [`setSpreadForPair(address _baseToken, address _quoteToken, uint256 _value)`](#MarginLiquidityPool-setSpreadForPair-address-address-uint256-)

- [`depositLiquidity(uint256 _baseTokenAmount)`](#MarginLiquidityPool-depositLiquidity-uint256-)

- [`increaseAllowanceForProtocol(uint256 _iTokenAmount)`](#MarginLiquidityPool-increaseAllowanceForProtocol-uint256-)

- [`increaseAllowanceForProtocolSafety(uint256 _iTokenAmount)`](#MarginLiquidityPool-increaseAllowanceForProtocolSafety-uint256-)

- [`withdrawLiquidityOwner(uint256 _iTokenAmount)`](#MarginLiquidityPool-withdrawLiquidityOwner-uint256-)

- [`getLiquidity()`](#MarginLiquidityPool-getLiquidity--)

- [`getBidSpread(address _baseToken, address _quoteToken)`](#MarginLiquidityPool-getBidSpread-address-address-)

- [`getAskSpread(address _baseToken, address _quoteToken)`](#MarginLiquidityPool-getAskSpread-address-address-)

- [`enableToken(address _baseToken, address _quoteToken, uint256 _spread, int256 _newSwapRateMarkup)`](#MarginLiquidityPool-enableToken-address-address-uint256-int256-)

- [`disableToken(address _baseToken, address _quoteToken)`](#MarginLiquidityPool-disableToken-address-address-)

- [`setMinLeverage(uint256 _newMinLeverage)`](#MarginLiquidityPool-setMinLeverage-uint256-)

- [`setMaxLeverage(uint256 _newMaxLeverage)`](#MarginLiquidityPool-setMaxLeverage-uint256-)

- [`setMinLeverageAmount(uint256 _newMinLeverageAmount)`](#MarginLiquidityPool-setMinLeverageAmount-uint256-)

- [`setCurrentSwapRateMarkupForPair(address _base, address _quote, int256 _newSwapRateMarkup)`](#MarginLiquidityPool-setCurrentSwapRateMarkupForPair-address-address-int256-)

- [`getSwapRateMarkupForPair(address _baseToken, address _quoteToken)`](#MarginLiquidityPool-getSwapRateMarkupForPair-address-address-)

### [Function `initialize(contract MoneyMarketInterface _moneyMarket, address _protocol, uint256 _initialMinLeverage, uint256 _initialMaxLeverage, uint256 _initialMinLeverageAmount)`](#MarginLiquidityPool-initialize-contract-MoneyMarketInterface-address-uint256-uint256-uint256-)

No description

### [Function `setSpreadForPair(address _baseToken, address _quoteToken, uint256 _value)`](#MarginLiquidityPool-setSpreadForPair-address-address-uint256-)

No description

### [Function `depositLiquidity(uint256 _baseTokenAmount) → uint256`](#MarginLiquidityPool-depositLiquidity-uint256-)

No description

### [Function `increaseAllowanceForProtocol(uint256 _iTokenAmount)`](#MarginLiquidityPool-increaseAllowanceForProtocol-uint256-)

No description

### [Function `increaseAllowanceForProtocolSafety(uint256 _iTokenAmount)`](#MarginLiquidityPool-increaseAllowanceForProtocolSafety-uint256-)

No description

### [Function `withdrawLiquidityOwner(uint256 _iTokenAmount) → uint256`](#MarginLiquidityPool-withdrawLiquidityOwner-uint256-)

Withdraw liquidity for owner.

#### Parameters:

- `_iTokenAmount`: The MarginLiquidityPool.

#### Return Values:

- The amount withdrawn in base tokens.

### [Function `getLiquidity() → uint256`](#MarginLiquidityPool-getLiquidity--)

Get amounts of iTokens in pool.

#### Return Values:

- The iTokens amount.

### [Function `getBidSpread(address _baseToken, address _quoteToken) → uint256`](#MarginLiquidityPool-getBidSpread-address-address-)

Get the current bid spread for trading pair.

#### Return Values:

- The bid spread.

### [Function `getAskSpread(address _baseToken, address _quoteToken) → uint256`](#MarginLiquidityPool-getAskSpread-address-address-)

Get the current ask spread for trading pair.

#### Return Values:

- The ask spread.

### [Function `enableToken(address _baseToken, address _quoteToken, uint256 _spread, int256 _newSwapRateMarkup)`](#MarginLiquidityPool-enableToken-address-address-uint256-int256-)

Enable the trading pair.

#### Parameters:

- `_baseToken`: The base token.

- `_quoteToken`: The quote token.

- `_spread`: The initial spread.

- `_newSwapRateMarkup`: The initial swap rate markup.

### [Function `disableToken(address _baseToken, address _quoteToken)`](#MarginLiquidityPool-disableToken-address-address-)

Disable the trading pair.

#### Parameters:

- `_baseToken`: The base token.

- `_quoteToken`: The quote token.

### [Function `setMinLeverage(uint256 _newMinLeverage)`](#MarginLiquidityPool-setMinLeverage-uint256-)

Set new minimum leverage, only for the owner.

#### Parameters:

- `_newMinLeverage`: The new minimum leverage.

### [Function `setMaxLeverage(uint256 _newMaxLeverage)`](#MarginLiquidityPool-setMaxLeverage-uint256-)

Set new maximum leverage, only for the owner.

#### Parameters:

- `_newMaxLeverage`: The new maximum leverage.

### [Function `setMinLeverageAmount(uint256 _newMinLeverageAmount)`](#MarginLiquidityPool-setMinLeverageAmount-uint256-)

Set new minimum leverage amount, only for the owner.

#### Parameters:

- `_newMinLeverageAmount`: The new minimum leverage amount.

### [Function `setCurrentSwapRateMarkupForPair(address _base, address _quote, int256 _newSwapRateMarkup)`](#MarginLiquidityPool-setCurrentSwapRateMarkupForPair-address-address-int256-)

Set new swap rate for token pair, only for the owner.

#### Parameters:

- `_base`: The base token.

- `_quote`: The quote token.

- `_newSwapRateMarkup`: The new swap rate as percentage for longs.

### [Function `getSwapRateMarkupForPair(address _baseToken, address _quoteToken) → int256`](#MarginLiquidityPool-getSwapRateMarkupForPair-address-address-)

Get the swap rate markup for trading pair.

#### Parameters:

- `_baseToken`: The base token.

- `_quoteToken`: The quote token.

#### Return Values:

- The swap rate markup.
