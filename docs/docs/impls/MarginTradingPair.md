## Functions:

- [`initialize(address protocol, contract MoneyMarketInterface moneyMarket_, address quoteToken_, int256 leverage_, uint256 safeMarginPercent_, uint256 liquidationFee_)`](#MarginTradingPair-initialize-address-contract-MoneyMarketInterface-address-int256-uint256-uint256-)

- [`openPosition(address sender, address liquidityPool, uint256 baseTokenAmount, uint256 iTokenAmount, uint256 price, uint256 closeSpread)`](#MarginTradingPair-openPosition-address-address-uint256-uint256-uint256-uint256-)

- [`closePosition(address sender, uint256 positionId, uint256 price)`](#MarginTradingPair-closePosition-address-uint256-uint256-)

## Events:

- [`OpenPosition(address sender, address liquidityPool, uint256 positionId, uint256 baseTokenAmount, uint256 openPrice, uint256 closeSpread)`](#MarginTradingPair-OpenPosition-address-address-uint256-uint256-uint256-uint256-)

- [`ClosePosition(address owner, address liquidityPool, address liquidator, uint256 positionId, uint256 closePrice, uint256 ownerAmount, uint256 liquidityPoolAmount)`](#MarginTradingPair-ClosePosition-address-address-address-uint256-uint256-uint256-uint256-)

### [Function `initialize(address protocol, contract MoneyMarketInterface moneyMarket_, address quoteToken_, int256 leverage_, uint256 safeMarginPercent_, uint256 liquidationFee_)`](#MarginTradingPair-initialize-address-contract-MoneyMarketInterface-address-int256-uint256-uint256-)

No description

### [Function `openPosition(address sender, address liquidityPool, uint256 baseTokenAmount, uint256 iTokenAmount, uint256 price, uint256 closeSpread) → uint256`](#MarginTradingPair-openPosition-address-address-uint256-uint256-uint256-uint256-)

No description

### [Function `closePosition(address sender, uint256 positionId, uint256 price)`](#MarginTradingPair-closePosition-address-uint256-uint256-)

No description

### Event `OpenPosition(address sender, address liquidityPool, uint256 positionId, uint256 baseTokenAmount, uint256 openPrice, uint256 closeSpread)` {#MarginTradingPair-OpenPosition-address-address-uint256-uint256-uint256-uint256-}

No description

### Event `ClosePosition(address owner, address liquidityPool, address liquidator, uint256 positionId, uint256 closePrice, uint256 ownerAmount, uint256 liquidityPoolAmount)` {#MarginTradingPair-ClosePosition-address-address-address-uint256-uint256-uint256-uint256-}

No description
