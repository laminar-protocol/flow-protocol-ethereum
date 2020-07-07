## Functions:

- [`getUsdValue(struct MarginMarketLib.MarketData self, address _currencyToken, int256 _amount)`](#MarginMarketLib-getUsdValue-struct-MarginMarketLib-MarketData-address-int256-)

- [`getPriceForPair(struct MarginMarketLib.MarketData self, address _baseCurrencyId, address _quoteCurrencyId)`](#MarginMarketLib-getPriceForPair-struct-MarginMarketLib-MarketData-address-address-)

- [`getPrice(struct MarginMarketLib.MarketData self, address _token)`](#MarginMarketLib-getPrice-struct-MarginMarketLib-MarketData-address-)

- [`getBidPrice(struct MarginMarketLib.MarketData self, contract MarginLiquidityPoolInterface _pool, struct MarginFlowProtocol.TradingPair _pair, uint256 _min)`](#MarginMarketLib-getBidPrice-struct-MarginMarketLib-MarketData-contract-MarginLiquidityPoolInterface-struct-MarginFlowProtocol-TradingPair-uint256-)

- [`getAskPrice(struct MarginMarketLib.MarketData self, contract MarginLiquidityPoolInterface _pool, struct MarginFlowProtocol.TradingPair _pair, uint256 _max)`](#MarginMarketLib-getAskPrice-struct-MarginMarketLib-MarketData-contract-MarginLiquidityPoolInterface-struct-MarginFlowProtocol-TradingPair-uint256-)

- [`getAskSpread(struct MarginMarketLib.MarketData self, contract MarginLiquidityPoolInterface _pool, address _baseToken, address _quoteToken)`](#MarginMarketLib-getAskSpread-struct-MarginMarketLib-MarketData-contract-MarginLiquidityPoolInterface-address-address-)

- [`getBidSpread(struct MarginMarketLib.MarketData self, contract MarginLiquidityPoolInterface _pool, address _baseToken, address _quoteToken)`](#MarginMarketLib-getBidSpread-struct-MarginMarketLib-MarketData-contract-MarginLiquidityPoolInterface-address-address-)

- [`getSpread(struct MarginMarketLib.MarketData self, uint256 _spread)`](#MarginMarketLib-getSpread-struct-MarginMarketLib-MarketData-uint256-)

- [`getExactEquityOfTrader(struct MarginMarketLib.MarketData self, struct MarginFlowProtocol.Position[] _positions, int256 _traderBalance)`](#MarginMarketLib-getExactEquityOfTrader-struct-MarginMarketLib-MarketData-struct-MarginFlowProtocol-Position---int256-)

- [`getEstimatedEquityOfTrader(struct MarginMarketLib.MarketData self, contract MarginLiquidityPoolInterface _pool, address _trader, int256 _traderBalance)`](#MarginMarketLib-getEstimatedEquityOfTrader-struct-MarginMarketLib-MarketData-contract-MarginLiquidityPoolInterface-address-int256-)

- [`getLeveragedDebitsOfTraderInUsd(struct MarginMarketLib.MarketData self, contract MarginLiquidityPoolInterface _pool, address _trader)`](#MarginMarketLib-getLeveragedDebitsOfTraderInUsd-struct-MarginMarketLib-MarketData-contract-MarginLiquidityPoolInterface-address-)

- [`getExactFreeMargin(struct MarginMarketLib.MarketData self, struct MarginFlowProtocol.Position[] _positions, uint256 _marginHeld, int256 _traderBalance)`](#MarginMarketLib-getExactFreeMargin-struct-MarginMarketLib-MarketData-struct-MarginFlowProtocol-Position---uint256-int256-)

- [`getEstimatedFreeMargin(struct MarginMarketLib.MarketData self, contract MarginLiquidityPoolInterface _pool, address _trader, uint256 _marginHeld, int256 _traderBalance)`](#MarginMarketLib-getEstimatedFreeMargin-struct-MarginMarketLib-MarketData-contract-MarginLiquidityPoolInterface-address-uint256-int256-)

- [`getUnrealizedPlOfTrader(struct MarginMarketLib.MarketData self, struct MarginFlowProtocol.Position[] _positions)`](#MarginMarketLib-getUnrealizedPlOfTrader-struct-MarginMarketLib-MarketData-struct-MarginFlowProtocol-Position---)

- [`getSwapRatesOfTrader(struct MarginMarketLib.MarketData self, struct MarginFlowProtocol.Position[] _positions)`](#MarginMarketLib-getSwapRatesOfTrader-struct-MarginMarketLib-MarketData-struct-MarginFlowProtocol-Position---)

- [`getAccumulatedSwapRateOfPosition(struct MarginMarketLib.MarketData self, struct MarginFlowProtocol.Position position)`](#MarginMarketLib-getAccumulatedSwapRateOfPosition-struct-MarginMarketLib-MarketData-struct-MarginFlowProtocol-Position-)

- [`getAccumulatedSwapRateOfPositionUntilDate(struct MarginMarketLib.MarketData self, struct MarginFlowProtocol.Position _position, uint256 _time, struct Percentage.Percent _price)`](#MarginMarketLib-getAccumulatedSwapRateOfPositionUntilDate-struct-MarginMarketLib-MarketData-struct-MarginFlowProtocol-Position-uint256-struct-Percentage-Percent-)

- [`getUnrealizedPlForParams(struct MarginMarketLib.MarketData self, contract MarginLiquidityPoolInterface _pool, struct MarginFlowProtocol.TradingPair _pair, int256 _leveragedDebits, int256 _leveragedHeld, int256 _leverage, uint256 _price)`](#MarginMarketLib-getUnrealizedPlForParams-struct-MarginMarketLib-MarketData-contract-MarginLiquidityPoolInterface-struct-MarginFlowProtocol-TradingPair-int256-int256-int256-uint256-)

- [`getUnrealizedPlAndMarketPriceOfPosition(struct MarginMarketLib.MarketData self, struct MarginFlowProtocol.Position _position, uint256 _price)`](#MarginMarketLib-getUnrealizedPlAndMarketPriceOfPosition-struct-MarginMarketLib-MarketData-struct-MarginFlowProtocol-Position-uint256-)

- [`getUnrealizedForPair(struct MarginMarketLib.MarketData self, contract MarginLiquidityPoolInterface _pool, struct MarginFlowProtocol.TradingPair _pair, uint256[4] _pairValues)`](#MarginMarketLib-getUnrealizedForPair-struct-MarginMarketLib-MarketData-contract-MarginLiquidityPoolInterface-struct-MarginFlowProtocol-TradingPair-uint256-4--)

- [`getNet(struct MarginMarketLib.MarketData self, struct MarginFlowProtocol.TradingPair _pair, uint256 longQuote, uint256 shortQuote)`](#MarginMarketLib-getNet-struct-MarginMarketLib-MarketData-struct-MarginFlowProtocol-TradingPair-uint256-uint256-)

- [`getUnrealizedPlForStoppedPoolOrTrader(struct MarginMarketLib.MarketData self, struct Percentage.Percent _usdPairPrice, struct Percentage.Percent _closePrice, int256 _leveragedDebits, int256 _leveragedHeld)`](#MarginMarketLib-getUnrealizedPlForStoppedPoolOrTrader-struct-MarginMarketLib-MarketData-struct-Percentage-Percent-struct-Percentage-Percent-int256-int256-)

- [`getPairPoolSafetyInfo(struct MarginMarketLib.MarketData self, contract MarginLiquidityPoolInterface _pool, struct MarginFlowProtocol.TradingPair _pair, uint256[4] _pairValues)`](#MarginMarketLib-getPairPoolSafetyInfo-struct-MarginMarketLib-MarketData-contract-MarginLiquidityPoolInterface-struct-MarginFlowProtocol-TradingPair-uint256-4--)

### [Function `getUsdValue(struct MarginMarketLib.MarketData self, address _currencyToken, int256 _amount) → int256`](#MarginMarketLib-getUsdValue-struct-MarginMarketLib-MarketData-address-int256-)

No description

### [Function `getPriceForPair(struct MarginMarketLib.MarketData self, address _baseCurrencyId, address _quoteCurrencyId) → struct Percentage.Percent`](#MarginMarketLib-getPriceForPair-struct-MarginMarketLib-MarketData-address-address-)

No description

### [Function `getPrice(struct MarginMarketLib.MarketData self, address _token) → uint256`](#MarginMarketLib-getPrice-struct-MarginMarketLib-MarketData-address-)

No description

### [Function `getBidPrice(struct MarginMarketLib.MarketData self, contract MarginLiquidityPoolInterface _pool, struct MarginFlowProtocol.TradingPair _pair, uint256 _min) → struct Percentage.Percent`](#MarginMarketLib-getBidPrice-struct-MarginMarketLib-MarketData-contract-MarginLiquidityPoolInterface-struct-MarginFlowProtocol-TradingPair-uint256-)

No description

### [Function `getAskPrice(struct MarginMarketLib.MarketData self, contract MarginLiquidityPoolInterface _pool, struct MarginFlowProtocol.TradingPair _pair, uint256 _max) → struct Percentage.Percent`](#MarginMarketLib-getAskPrice-struct-MarginMarketLib-MarketData-contract-MarginLiquidityPoolInterface-struct-MarginFlowProtocol-TradingPair-uint256-)

No description

### [Function `getAskSpread(struct MarginMarketLib.MarketData self, contract MarginLiquidityPoolInterface _pool, address _baseToken, address _quoteToken) → uint256`](#MarginMarketLib-getAskSpread-struct-MarginMarketLib-MarketData-contract-MarginLiquidityPoolInterface-address-address-)

No description

### [Function `getBidSpread(struct MarginMarketLib.MarketData self, contract MarginLiquidityPoolInterface _pool, address _baseToken, address _quoteToken) → uint256`](#MarginMarketLib-getBidSpread-struct-MarginMarketLib-MarketData-contract-MarginLiquidityPoolInterface-address-address-)

No description

### [Function `getSpread(struct MarginMarketLib.MarketData self, uint256 _spread) → uint256`](#MarginMarketLib-getSpread-struct-MarginMarketLib-MarketData-uint256-)

No description

### [Function `getExactEquityOfTrader(struct MarginMarketLib.MarketData self, struct MarginFlowProtocol.Position[] _positions, int256 _traderBalance) → int256`](#MarginMarketLib-getExactEquityOfTrader-struct-MarginMarketLib-MarketData-struct-MarginFlowProtocol-Position---int256-)

No description

### [Function `getEstimatedEquityOfTrader(struct MarginMarketLib.MarketData self, contract MarginLiquidityPoolInterface _pool, address _trader, int256 _traderBalance) → int256`](#MarginMarketLib-getEstimatedEquityOfTrader-struct-MarginMarketLib-MarketData-contract-MarginLiquidityPoolInterface-address-int256-)

No description

### [Function `getLeveragedDebitsOfTraderInUsd(struct MarginMarketLib.MarketData self, contract MarginLiquidityPoolInterface _pool, address _trader) → uint256`](#MarginMarketLib-getLeveragedDebitsOfTraderInUsd-struct-MarginMarketLib-MarketData-contract-MarginLiquidityPoolInterface-address-)

No description

### [Function `getExactFreeMargin(struct MarginMarketLib.MarketData self, struct MarginFlowProtocol.Position[] _positions, uint256 _marginHeld, int256 _traderBalance) → uint256`](#MarginMarketLib-getExactFreeMargin-struct-MarginMarketLib-MarketData-struct-MarginFlowProtocol-Position---uint256-int256-)

No description

### [Function `getEstimatedFreeMargin(struct MarginMarketLib.MarketData self, contract MarginLiquidityPoolInterface _pool, address _trader, uint256 _marginHeld, int256 _traderBalance) → uint256`](#MarginMarketLib-getEstimatedFreeMargin-struct-MarginMarketLib-MarketData-contract-MarginLiquidityPoolInterface-address-uint256-int256-)

No description

### [Function `getUnrealizedPlOfTrader(struct MarginMarketLib.MarketData self, struct MarginFlowProtocol.Position[] _positions) → int256`](#MarginMarketLib-getUnrealizedPlOfTrader-struct-MarginMarketLib-MarketData-struct-MarginFlowProtocol-Position---)

No description

### [Function `getSwapRatesOfTrader(struct MarginMarketLib.MarketData self, struct MarginFlowProtocol.Position[] _positions) → int256`](#MarginMarketLib-getSwapRatesOfTrader-struct-MarginMarketLib-MarketData-struct-MarginFlowProtocol-Position---)

No description

### [Function `getAccumulatedSwapRateOfPosition(struct MarginMarketLib.MarketData self, struct MarginFlowProtocol.Position position) → int256`](#MarginMarketLib-getAccumulatedSwapRateOfPosition-struct-MarginMarketLib-MarketData-struct-MarginFlowProtocol-Position-)

No description

### [Function `getAccumulatedSwapRateOfPositionUntilDate(struct MarginMarketLib.MarketData self, struct MarginFlowProtocol.Position _position, uint256 _time, struct Percentage.Percent _price) → int256`](#MarginMarketLib-getAccumulatedSwapRateOfPositionUntilDate-struct-MarginMarketLib-MarketData-struct-MarginFlowProtocol-Position-uint256-struct-Percentage-Percent-)

No description

### [Function `getUnrealizedPlForParams(struct MarginMarketLib.MarketData self, contract MarginLiquidityPoolInterface _pool, struct MarginFlowProtocol.TradingPair _pair, int256 _leveragedDebits, int256 _leveragedHeld, int256 _leverage, uint256 _price) → int256, struct Percentage.Percent`](#MarginMarketLib-getUnrealizedPlForParams-struct-MarginMarketLib-MarketData-contract-MarginLiquidityPoolInterface-struct-MarginFlowProtocol-TradingPair-int256-int256-int256-uint256-)

No description

### [Function `getUnrealizedPlAndMarketPriceOfPosition(struct MarginMarketLib.MarketData self, struct MarginFlowProtocol.Position _position, uint256 _price) → int256, struct Percentage.Percent`](#MarginMarketLib-getUnrealizedPlAndMarketPriceOfPosition-struct-MarginMarketLib-MarketData-struct-MarginFlowProtocol-Position-uint256-)

No description

### [Function `getUnrealizedForPair(struct MarginMarketLib.MarketData self, contract MarginLiquidityPoolInterface _pool, struct MarginFlowProtocol.TradingPair _pair, uint256[4] _pairValues) → int256`](#MarginMarketLib-getUnrealizedForPair-struct-MarginMarketLib-MarketData-contract-MarginLiquidityPoolInterface-struct-MarginFlowProtocol-TradingPair-uint256-4--)

No description

### [Function `getNet(struct MarginMarketLib.MarketData self, struct MarginFlowProtocol.TradingPair _pair, uint256 longQuote, uint256 shortQuote) → uint256`](#MarginMarketLib-getNet-struct-MarginMarketLib-MarketData-struct-MarginFlowProtocol-TradingPair-uint256-uint256-)

No description

### [Function `getUnrealizedPlForStoppedPoolOrTrader(struct MarginMarketLib.MarketData self, struct Percentage.Percent _usdPairPrice, struct Percentage.Percent _closePrice, int256 _leveragedDebits, int256 _leveragedHeld) → int256`](#MarginMarketLib-getUnrealizedPlForStoppedPoolOrTrader-struct-MarginMarketLib-MarketData-struct-Percentage-Percent-struct-Percentage-Percent-int256-int256-)

No description

### [Function `getPairPoolSafetyInfo(struct MarginMarketLib.MarketData self, contract MarginLiquidityPoolInterface _pool, struct MarginFlowProtocol.TradingPair _pair, uint256[4] _pairValues) → uint256, uint256, int256`](#MarginMarketLib-getPairPoolSafetyInfo-struct-MarginMarketLib-MarketData-contract-MarginLiquidityPoolInterface-struct-MarginFlowProtocol-TradingPair-uint256-4--)

No description
