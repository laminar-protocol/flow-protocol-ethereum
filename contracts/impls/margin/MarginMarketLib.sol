pragma solidity ^0.6.4;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/math/Math.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/math/SignedSafeMath.sol";

import "../../interfaces/MarginLiquidityPoolInterface.sol";
import "../../interfaces/PriceOracleInterface.sol";
import "../../libs/Percentage.sol";

import "./MarginFlowProtocol.sol";
import "./MarginFlowProtocolConfig.sol";
import "./MarginFlowProtocolSafety.sol";
import "./MarginLiquidityPoolRegistry.sol";

library MarginMarketLib {
    using Percentage for uint256;
    using Percentage for int256;
    using SafeMath for uint256;
    using SignedSafeMath for int256;

    struct MarketData {
        MoneyMarketInterface moneyMarket;
        PriceOracleInterface oracle;
        MarginFlowProtocolConfig config;
        MarginFlowProtocolSafety protocolSafety;
        MarginLiquidityPoolRegistry liquidityPoolRegistry;
        address marketBaseToken;
    }

    // usdValue = amount * price
    function getUsdValue(MarketData storage self, address _currencyToken, int256 _amount) public returns (int256) {
        Percentage.Percent memory price = getPriceForPair(self, _currencyToken, self.marketBaseToken);

        return _amount.signedMulPercent(Percentage.SignedPercent(int256(price.value)));
    }

    // The price from oracle.
    function getPriceForPair(MarketData storage self, address _baseCurrencyId, address _quoteCurrencyId) public returns (Percentage.Percent memory) {
        uint256 basePrice = getPrice(self, _baseCurrencyId);
        uint256 quotePrice = getPrice(self, _quoteCurrencyId);

        return Percentage.fromFraction(basePrice, quotePrice);
    }

    function getPrice(MarketData storage self, address _token) public returns (uint) {
        uint256 price = self.oracle.getPrice(_token);
        require(price > 0, "no oracle price");

        return price;
    }

    // bidPrice = price - askSpread
    function getBidPrice(
        MarketData storage self,
        MarginLiquidityPoolInterface _pool,
        MarginFlowProtocol.TradingPair memory _pair,
        uint256 _min
    ) public returns (Percentage.Percent memory) {
        Percentage.Percent memory price = getPriceForPair(self, _pair.base, _pair.quote);
        uint256 spread = getBidSpread(self, _pool, address(_pair.base), address(_pair.quote));
        Percentage.Percent memory bidPrice = Percentage.Percent(price.value.sub(spread));

        if (_min > 0) {
            require(bidPrice.value >= _min, "BP1");
        }

        return bidPrice;
    }

    // askPrice = price + askSpread
    function getAskPrice(
        MarketData storage self,
        MarginLiquidityPoolInterface _pool,
        MarginFlowProtocol.TradingPair memory _pair,
        uint256 _max
    ) public returns (Percentage.Percent memory) {
        Percentage.Percent memory price = getPriceForPair(self, _pair.base, _pair.quote);

        uint256 spread = getAskSpread(self, _pool, address(_pair.base), address(_pair.quote));
        Percentage.Percent memory askPrice = Percentage.Percent(price.value.add(spread));

        if (_max > 0) {
            require(askPrice.value <= _max, "AP1");
        }

        return askPrice;
    }

    function getAskSpread(
        MarketData storage self,
        MarginLiquidityPoolInterface _pool,
        address _baseToken,
        address _quoteToken
    ) public view returns (uint) {
        uint256 spread = _pool.getAskSpread(_baseToken, _quoteToken);
        return getSpread(self, spread);
    }

    function getBidSpread(
        MarketData storage self,
        MarginLiquidityPoolInterface _pool,
        address _baseToken,
        address _quoteToken
    ) public view returns (uint) {
        uint256 spread = _pool.getBidSpread(_baseToken, _quoteToken);
        return getSpread(self, spread);
    }

    function getSpread(MarketData storage self, uint256 _spread) public view returns (uint256) {
        require(_spread > 0, "Token disabled for this pool");
        return Math.min(_spread, self.config.maxSpread());
    }

    function getMarginHeld(MarginFlowProtocol.Position[] memory _positions) public pure returns (uint256) {
        uint256 accumulatedMarginHeld = 0;

        for (uint256 i = 0; i < _positions.length; i++) {
            accumulatedMarginHeld = accumulatedMarginHeld.add(_positions[i].marginHeld);
        }

        return accumulatedMarginHeld;
    }

    // equityOfTrader = balance + unrealizedPl - accumulatedSwapRate
    function getEquityOfTrader(
        MarketData storage self,
        MarginFlowProtocol.Position[] memory _positions,
        int256 _traderBalance
    ) public returns (int256) {
        int256 unrealized = getUnrealizedPlOfTrader(self, _positions);
        int256 accumulatedSwapRates = getSwapRatesOfTrader(self, _positions);
        uint256 traderBalanceAbs = _traderBalance >= 0 ? uint256(_traderBalance) : uint256(-_traderBalance);
        uint256 traderBalanceBaseTokenAbs = self.moneyMarket.convertAmountToBase(traderBalanceAbs);
        int256 traderBalanceBaseToken = _traderBalance >= 0 ? int256(traderBalanceBaseTokenAbs) : int256(-traderBalanceBaseTokenAbs);
        int256 totalBalance = traderBalanceBaseToken.add(unrealized);

        return totalBalance.add(accumulatedSwapRates);
    }

    function getFreeMargin(
        MarketData storage self,
        MarginFlowProtocol.Position[] memory _positions,
        int256 _traderBalance
    ) public returns (uint256) {
        int256 equity = getEquityOfTrader(self, _positions, _traderBalance);
        uint256 marginHeld = getMarginHeld(_positions);

        if (equity <= int256(marginHeld)) {
            return 0;
        }

        // freeMargin = equity - marginHeld
        return uint256(equity).sub(marginHeld);
    }

    // Unrealized profit and loss of a given trader(USD value). It is the sum of unrealized profit and loss of all positions
	// opened by a trader.
    function getUnrealizedPlOfTrader(
        MarketData storage self,
        MarginFlowProtocol.Position[] memory _positions
    ) public returns (int256) {
        int256 accumulatedUnrealized = 0;

        for (uint256 i = 0; i < _positions.length; i++) {
            (int256 unrealized,) = getUnrealizedPlAndMarketPriceOfPosition(self, _positions[i], 0);
            accumulatedUnrealized = accumulatedUnrealized.add(unrealized);
        }

        return accumulatedUnrealized;
    }

    function getSwapRatesOfTrader(
        MarketData storage self,
        MarginFlowProtocol.Position[] memory _positions
    ) public returns (int256) {
        int256 accumulatedSwapRates = int256(0);

        for (uint256 i = 0; i < _positions.length; i++) {
            accumulatedSwapRates = accumulatedSwapRates.add(getAccumulatedSwapRateOfPosition(self, _positions[i]));
        }

        return accumulatedSwapRates;
    }

    // accumulated interest rate = rate * swap unit
    function getAccumulatedSwapRateOfPosition(
        MarketData storage self,
        MarginFlowProtocol.Position memory position
    ) public returns (int256) {
        Percentage.Percent memory price = position.leverage > 0
            ? getAskPrice(self, position.pool, position.pair, 0)
            : getBidPrice(self, position.pool, position.pair, 0);
        Percentage.Percent memory usdPairPrice = getPriceForPair(self, position.pair.quote, self.marketBaseToken);

        return getAccumulatedSwapRateOfPositionUntilDate(position, self.config.swapRateUnit(), now, price, usdPairPrice);
    }

    function getAccumulatedSwapRateOfPositionUntilDate(
        MarginFlowProtocol.Position memory position,
        uint256 _swapRateUnit,
        uint256 _time,
        Percentage.Percent memory _price,
        Percentage.Percent memory _usdPairPrice
    ) public pure returns (int256) {
        uint256 timeDeltaInSeconds = _time.sub(position.timeWhenOpened);
        uint256 timeUnitsSinceOpen = timeDeltaInSeconds.div(_swapRateUnit);
        uint256 leveragedHeldAbs = position.leveragedHeld >= 0
            ? uint256(position.leveragedHeld)
            : uint256(-position.leveragedHeld);

        Percentage.Percent memory swapRate = position.swapRate.value >= 0
            ? Percentage.Percent(uint256(position.swapRate.value))
            : Percentage.Percent(uint256(-position.swapRate.value));
        uint256 accumulatedSwapRateInBase = leveragedHeldAbs
            .mul(timeUnitsSinceOpen)
            .mulPercent(_price)
            .mulPercent(swapRate);
        uint256 accumulatedSwapRateInUsd = accumulatedSwapRateInBase.mulPercent(_usdPairPrice);
        int256 signedSwapRate = position.swapRate.value >= 0
            ? int256(accumulatedSwapRateInUsd)
            : int256(-accumulatedSwapRateInUsd);

        return signedSwapRate;
    }

    function getUnrealizedPlForParams(
        MarketData storage self,
        MarginLiquidityPoolInterface _pool,
        MarginFlowProtocol.TradingPair memory _pair,
        int256 _leveragedDebits,
        int256 _leveragedHeld,
        int256 _leverage,
        uint256 _price
    ) public returns (int256, Percentage.Percent memory) {
        Percentage.SignedPercent memory openPrice = Percentage.signedFromFraction(-_leveragedDebits, _leveragedHeld);

        Percentage.SignedPercent memory currentPrice = _leverage > 0
            ? Percentage.SignedPercent(int256(getBidPrice(self, _pool, _pair, _price).value))
            : Percentage.SignedPercent(int256(getAskPrice(self, _pool, _pair, _price).value));

        Percentage.SignedPercent memory priceDelta = Percentage.signedSubPercent(currentPrice, openPrice);
        int256 unrealized = _leveragedHeld.signedMulPercent(priceDelta);

        return (getUsdValue(self, _pair.quote, unrealized), Percentage.Percent(uint256(currentPrice.value)));
    }

    // Returns `(unrealizedPl, marketPrice)` of a given position. If `price`, market price must fit this bound, else reverts.
    function getUnrealizedPlAndMarketPriceOfPosition(
        MarketData storage self,
        MarginFlowProtocol.Position memory _position,
        uint256 _price
    ) public returns (int256, Percentage.Percent memory) {
        return getUnrealizedPlForParams(
            self,
            _position.pool,
            _position.pair,
            _position.leveragedDebits,
            _position.leveragedHeld,
            _position.leverage,
            _price
        );
    }

    function getUnrealizedForPair(
        MarketData storage self,
        MarginLiquidityPoolInterface _pool,
        MarginFlowProtocol.TradingPair memory _pair,
        uint256[4] memory _pairValues
    ) public returns (int256) {
        (int256 longUnrealized,) = _pairValues[2] > 0 ? getUnrealizedPlForParams(
            self,
            _pool,
            _pair,
            int256(_pairValues[0]).mul(-1),
            int256(_pairValues[2]),
            1,
            0
        ) : (int256(0), Percentage.Percent(0));
        (int256 shortUnrealized,) = _pairValues[3] > 0 ? getUnrealizedPlForParams(
            self,
            _pool,
            _pair,
            int256(_pairValues[1]),
            int256(_pairValues[3]).mul(-1),
            -1,
            0
        ) : (int256(0), Percentage.Percent(0));

        return longUnrealized.add(shortUnrealized);
    }

    function getUnrealizedPlForStoppedPool(
        Percentage.Percent memory _usdPairPrice,
        Percentage.Percent memory _closePrice,
        int256 _leveragedDebits,
        int256 _leveragedHeld
    ) public pure returns (int256) {
        Percentage.SignedPercent memory openPrice = Percentage.signedFromFraction(-_leveragedDebits, _leveragedHeld);
        Percentage.SignedPercent memory priceDelta = Percentage.signedSubPercent(Percentage.SignedPercent(int256(_closePrice.value)), openPrice);

        int256 unrealized = _leveragedHeld.signedMulPercent(priceDelta);
        int256 unrealizedUsd = unrealized.signedMulPercent(Percentage.SignedPercent(int256(_usdPairPrice.value)));

        return unrealizedUsd;
    }

    function getPairSafetyInfo(
        MarketData storage self,
        MarginLiquidityPoolInterface _pool,
        MarginFlowProtocol.TradingPair memory _pair,
        uint256[4] memory _pairValues,
        uint256 _longUsd,
        uint256 _shortUsd
    ) public returns (uint256, uint256, int256) {
        Percentage.Percent memory basePrice = Percentage.Percent(getPrice(self, address(self.moneyMarket.baseToken())));

        uint256 net = (_longUsd > _shortUsd
            ? uint256(int256(_longUsd).sub(int256(_shortUsd)))
            : uint256(-(int256(_longUsd).sub(int256(_shortUsd))))
        ).mulPercent(basePrice);
        uint256 longestLeg = Math.max(_longUsd, _shortUsd).mulPercent(basePrice);

        int256 unrealized = getUnrealizedForPair(
            self,
            _pool,
            _pair,
            _pairValues
        );

        return (net, longestLeg, unrealized);
    }
}
