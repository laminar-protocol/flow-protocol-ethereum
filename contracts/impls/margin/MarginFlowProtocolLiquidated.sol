pragma solidity ^0.6.4;
pragma experimental ABIEncoderV2; // not experimental anymore

import "@openzeppelin/upgrades/contracts/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/math/SignedSafeMath.sol";
import "@openzeppelin/contracts/math/Math.sol";

import "@nomiclabs/buidler/console.sol";

import "../../libs/Percentage.sol";
import "../../libs/upgrades/UpgradeOwnable.sol";
import "../../libs/upgrades/UpgradeReentrancyGuard.sol";

import "../../interfaces/PriceOracleInterface.sol";
import "../../interfaces/MoneyMarketInterface.sol";
import "../../interfaces/MarginLiquidityPoolInterface.sol";

import "./MarginLiquidityPoolRegistry.sol";
import "./MarginFlowProtocolConfig.sol";
import "./MarginFlowProtocolSafety.sol";
import "./MarginMarketLib.sol";

contract MarginFlowProtocolLiquidated is Initializable, UpgradeReentrancyGuard {
    using Percentage for uint256;
    using Percentage for int256;
    using SafeERC20 for IERC20;
    using SafeMath for uint256;
    using SignedSafeMath for int256;
    using MarginMarketLib for MarginMarketLib.MarketData;

    int256 constant MAX_INT = 2**256 / 2 - 1;
    MarginMarketLib.MarketData private market;

    // stopped pools
    mapping (MarginLiquidityPoolInterface => bool) public stoppedPools;
    mapping (MarginLiquidityPoolInterface => uint256) private poolClosingTimes;
    mapping (MarginLiquidityPoolInterface => uint256) public poolBasePrices;
    mapping (MarginLiquidityPoolInterface => mapping(address => uint256)) private poolPairPrices;
    mapping (MarginLiquidityPoolInterface => mapping(address => mapping (address => uint256))) public poolBidSpreads;
    mapping (MarginLiquidityPoolInterface => mapping(address => mapping (address => uint256))) public poolAskSpreads;

    // stopped traders
    mapping (MarginLiquidityPoolInterface => mapping(address => bool)) public stoppedTradersInPool;
    mapping (MarginLiquidityPoolInterface => mapping(address => bool)) public hasClosedLossPosition;
    mapping (MarginLiquidityPoolInterface => mapping(address => uint256)) private traderClosingTimes;
    mapping (MarginLiquidityPoolInterface => mapping(address => uint256)) public traderBasePrices;
    mapping (MarginLiquidityPoolInterface => mapping(address => mapping(address => uint256))) private traderPairPrices;
    mapping (MarginLiquidityPoolInterface => mapping(address => mapping(address => mapping (address => uint256)))) public traderBidSpreads;
    mapping (MarginLiquidityPoolInterface => mapping(address => mapping(address => mapping (address => uint256)))) public traderAskSpreads;

    /**
     * @dev Initialize the MarginFlowProtocolLiquidated.
     * @param _market The market data.
     */
    function initialize(
        MarginMarketLib.MarketData memory _market
    ) public initializer {
        UpgradeReentrancyGuard.initialize();
        market = _market;
    }

    /**
     * @dev Force close position for trader for liquidated pool.
     * @param _positionId The id of the position to close.
     */
    function closePositionForLiquidatedPool(uint256 _positionId) external nonReentrant {
        MarginFlowProtocol.Position memory position = market.marginProtocol.getPositionById(_positionId);
        // allow anyone to close positions with loss

        require(stoppedPools[position.pool], "CPL1");
        require(!stoppedTradersInPool[position.pool][position.owner], "CPL3");

        uint256 bidSpread = poolBidSpreads[position.pool][position.pair.base][position.pair.quote];
        uint256 askSpread = poolAskSpreads[position.pool][position.pair.base][position.pair.quote];
        uint256 closingTime = poolClosingTimes[position.pool];
        Percentage.Percent memory usdPairPrice = Percentage.fromFraction(
            poolPairPrices[position.pool][position.pair.quote],
            poolBasePrices[position.pool]
        );
        Percentage.Percent memory marketStopPrice = Percentage.fromFraction(
            poolPairPrices[position.pool][position.pair.base],
            poolPairPrices[position.pool][position.pair.quote]
        );

        Percentage.Percent memory openPrice = Percentage.Percent(
            position.leverage > 0 ?  marketStopPrice.value.add(askSpread) : marketStopPrice.value.sub(bidSpread)
        );
        Percentage.Percent memory closePrice = Percentage.Percent(
            position.leverage > 0 ? marketStopPrice.value.sub(bidSpread) : marketStopPrice.value.add(askSpread)
        );

        int256 totalUnrealized = _closePositionForStoppedPool(
            position,
            closingTime,
            usdPairPrice,
            marketStopPrice,
            openPrice,
            closePrice
        );

        if (totalUnrealized > 0) {
            require(msg.sender == position.owner, "CPL2");
        }
    }

    /**
     * @dev Force close position for trader for liquidated trader.
     * @param _positionId The id of the position to close.
     */
    function closePositionForLiquidatedTrader(uint256 _positionId) external nonReentrant returns (int256) {
        MarginFlowProtocol.Position memory position = market.marginProtocol.getPositionById(_positionId);

        require(stoppedTradersInPool[position.pool][msg.sender], "CPL1");
        require(position.owner == msg.sender, "CPL2");

        uint256 bidSpread = traderBidSpreads[position.pool][msg.sender][position.pair.base][position.pair.quote];
        uint256 askSpread = traderAskSpreads[position.pool][msg.sender][position.pair.base][position.pair.quote];
        uint256 closingTime = traderClosingTimes[position.pool][msg.sender];
        Percentage.Percent memory usdPairPrice = Percentage.fromFraction(
            traderPairPrices[position.pool][msg.sender][position.pair.quote],
            traderBasePrices[position.pool][msg.sender]
        );
        Percentage.Percent memory marketStopPrice = Percentage.fromFraction(
            traderPairPrices[position.pool][msg.sender][position.pair.base],
            traderPairPrices[position.pool][msg.sender][position.pair.quote]
        );

        Percentage.Percent memory openPrice = Percentage.Percent(
            position.leverage > 0 ?  marketStopPrice.value.add(askSpread) : marketStopPrice.value.sub(bidSpread)
        );
        Percentage.Percent memory closePrice = Percentage.Percent(
            position.leverage > 0 ? marketStopPrice.value.sub(bidSpread) : marketStopPrice.value.add(askSpread)
        );

        int256 totalUnrealized = _closePositionForStoppedTrader(
            position,
            closingTime,
            usdPairPrice,
            marketStopPrice,
            openPrice,
            closePrice
        );

        return totalUnrealized;
    }

    function restoreTraderInPool(MarginLiquidityPoolInterface _pool, address _trader) external nonReentrant {
        require(market.marginProtocol.getPositionsByPoolAndTraderLength(_pool, msg.sender) == 0, "W2");
        stoppedTradersInPool[_pool][_trader] = false;
        hasClosedLossPosition[_pool][_trader] = false;

        MarginFlowProtocol.TradingPair[] memory tradingPairs = market.config.getTradingPairs();

        for (uint256 i = 0; i < tradingPairs.length; i++) {
            traderPairPrices[_pool][_trader][tradingPairs[i].base] = 0;
            traderPairPrices[_pool][_trader][tradingPairs[i].quote] = 0;
            traderBidSpreads[_pool][_trader][tradingPairs[i].base][tradingPairs[i].quote] = 0;
            traderAskSpreads[_pool][_trader][tradingPairs[i].base][tradingPairs[i].quote] = 0;
        }
    }

    function restoreLiquidatedPool(MarginLiquidityPoolInterface _pool) external nonReentrant {
        require(market.marginProtocol.getPositionsByPoolLength(_pool) == 0, "W2");
        stoppedPools[_pool] = false;

        MarginFlowProtocol.TradingPair[] memory tradingPairs = market.config.getTradingPairs();

        for (uint256 i = 0; i < tradingPairs.length; i++) {
            poolPairPrices[_pool][tradingPairs[i].base] = 0;
            poolPairPrices[_pool][tradingPairs[i].quote] = 0;
            poolBidSpreads[_pool][tradingPairs[i].base][tradingPairs[i].quote] = 0;
            poolAskSpreads[_pool][tradingPairs[i].base][tradingPairs[i].quote] = 0;
        }
    }

    /// Safety protocol functions

    function __stopPool(MarginLiquidityPoolInterface _pool) external nonReentrant {
        require(msg.sender == address(market.protocolSafety), "SP1");
        stoppedPools[_pool] = true;

        poolClosingTimes[_pool] = now;
        poolBasePrices[_pool] = market.getPrice(address(market.moneyMarket.baseToken()));

        MarginFlowProtocol.TradingPair[] memory tradingPairs = market.config.getTradingPairs();

        for (uint256 i = 0; i < tradingPairs.length; i++) {
            address base = tradingPairs[i].base;
            address quote = tradingPairs[i].quote;
            poolPairPrices[_pool][base] = market.getPrice(base);
            poolPairPrices[_pool][quote] = market.getPrice(quote);
            poolBidSpreads[_pool][base][quote] = market.getBidSpread(_pool, base, quote);
            poolAskSpreads[_pool][base][quote] = market.getAskSpread(_pool, base, quote);
        }
    }

    function __stopTraderInPool(MarginLiquidityPoolInterface _pool, address _trader) external nonReentrant {
        require(msg.sender == address(market.protocolSafety), "SP1");
        stoppedTradersInPool[_pool][_trader] = true;

        traderClosingTimes[_pool][_trader] = now;
        traderBasePrices[_pool][_trader] = market.getPrice(address(market.moneyMarket.baseToken()));

        MarginFlowProtocol.TradingPair[] memory tradingPairs = market.config.getTradingPairs();

        for (uint256 i = 0; i < tradingPairs.length; i++) {
            address base = tradingPairs[i].base;
            address quote = tradingPairs[i].quote;
            traderPairPrices[_pool][_trader][base] = market.getPrice(base);
            traderPairPrices[_pool][_trader][quote] = market.getPrice(quote);
            traderBidSpreads[_pool][_trader][base][quote] = market.getBidSpread(_pool, base, quote);
            traderAskSpreads[_pool][_trader][base][quote] = market.getAskSpread(_pool, base, quote);
        }
    }

    function getEstimatedEquityOfTrader(
        MarginLiquidityPoolInterface _pool,
        address _trader,
        Percentage.Percent memory _usdPairPrice,
        Percentage.Percent memory _closePrice
    ) public view returns (int256) {
        MarginFlowProtocol.TradingPair[] memory tradingPairs = market.config.getTradingPairs();
        int256 unrealized = 0;

        for (uint256 i = 0; i < tradingPairs.length; i++) {
            int256 longPairBase = int256(
                market.marginProtocol.traderLongPositionAccPerPair(
                    _pool,
                    _trader,
                    tradingPairs[i].base,
                    tradingPairs[i].quote,
                    MarginFlowProtocol.CurrencyType.BASE
                )
            );
            int256 longPairQuote = int256(
                market.marginProtocol.traderLongPositionAccPerPair(
                    _pool,
                    _trader,
                    tradingPairs[i].base,
                    tradingPairs[i].quote,
                    MarginFlowProtocol.CurrencyType.QUOTE
                )
            );
            int256 shortPairBase = int256(
                market.marginProtocol.traderShortPositionAccPerPair(
                    _pool,
                    _trader,
                    tradingPairs[i].base,
                    tradingPairs[i].quote,
                    MarginFlowProtocol.CurrencyType.BASE
                )
            );
            int256 shortPairQuote = int256(
                market.marginProtocol.traderShortPositionAccPerPair(
                    _pool,
                    _trader,
                    tradingPairs[i].base,
                    tradingPairs[i].quote,
                    MarginFlowProtocol.CurrencyType.QUOTE
                )
            );

            int256 longUnrealized = longPairQuote > 0 ? market.getUnrealizedPlForStoppedPoolOrTrader(
                _usdPairPrice,
                _closePrice,
                longPairBase.mul(-1),
                longPairQuote
            ) : int256(0);
            int256 shortUnrealized = shortPairQuote > 0 ? market.getUnrealizedPlForStoppedPoolOrTrader(
                _usdPairPrice,
                _closePrice,
                shortPairBase.mul(-1),
                shortPairQuote
            ) : int256(0);

            unrealized = unrealized.add(longUnrealized.add(shortUnrealized));
        }

        return market.marginProtocol.balances(_pool, _trader).add(unrealized);
    }

    /// Internal functions

    function _closePositionForStoppedPool(
        MarginFlowProtocol.Position memory _position,
        uint256 _closingTime,
        Percentage.Percent memory _usdPairPrice,
        Percentage.Percent memory _marketStopPrice,
        Percentage.Percent memory _openPrice,
        Percentage.Percent memory _closePrice
    ) private returns (int256) {
        int256 unrealized = market.getUnrealizedPlForStoppedPoolOrTrader(
            _usdPairPrice,
            _closePrice,
            _position.leveragedDebits,
            _position.leveragedHeld
        );
        int256 swapRates = market.getAccumulatedSwapRateOfPositionUntilDate(
            _position,
            market.config.currentSwapUnits(_position.pair.base, _position.pair.quote),
            _closingTime,
            _openPrice,
            _usdPairPrice
        );
        int256 totalUnrealized = unrealized.add(swapRates);

        int256 storedTraderEquity = getEstimatedEquityOfTrader(_position.pool, _position.owner, _usdPairPrice, _closePrice);
        return _closePositionWithTransfer(totalUnrealized, storedTraderEquity, _position, _marketStopPrice);
    }

    function _closePositionForStoppedTrader(
        MarginFlowProtocol.Position memory _position,
        uint256 _closingTime,
        Percentage.Percent memory _usdPairPrice,
        Percentage.Percent memory _marketStopPrice,
        Percentage.Percent memory _openPrice,
        Percentage.Percent memory _closePrice
    ) private returns (int256) {
        int256 unrealized = market.getUnrealizedPlForStoppedPoolOrTrader(
            _usdPairPrice,
            _closePrice,
            _position.leveragedDebits,
            _position.leveragedHeld
        );
        int256 swapRates = market.getAccumulatedSwapRateOfPositionUntilDate(
            _position,
            market.config.currentSwapUnits(_position.pair.base, _position.pair.quote),
            _closingTime,
            _openPrice,
            _usdPairPrice
        );
        int256 totalUnrealized = unrealized.add(swapRates);

        if (totalUnrealized > 0) {
            return _handleProfit(_position, totalUnrealized, _usdPairPrice, _marketStopPrice, _closePrice);
        }

        return _handleLoss(_position, totalUnrealized, _marketStopPrice);
    }

    function _handleLoss(
        MarginFlowProtocol.Position memory _position,
        int256 _unrealized,
        Percentage.Percent memory _marketStopPrice
    ) private returns (int256) {
        int256 unrealized = _unrealized;
        int256 traderBalance = market.marginProtocol.balances(_position.pool, _position.owner);

        if (traderBalance <= 0) {
            // dont allow negative resulting balances
            return _closePositionWithoutTransfer(_position, _marketStopPrice);
        }

        if (traderBalance.add(unrealized) < 0) {
            // dont allow negative resulting balances
            unrealized = -traderBalance;
        }

        hasClosedLossPosition[_position.pool][msg.sender] = true;

        // pass MAX_INT as equity to ensure transferring adjusted unrealized amount
        return _closePositionWithTransfer(unrealized, MAX_INT.add(unrealized), _position, _marketStopPrice);
    }

    function _handleProfit(
        MarginFlowProtocol.Position memory _position,
        int256 _unrealized,
        Percentage.Percent memory _usdPairPrice,
        Percentage.Percent memory _marketStopPrice,
        Percentage.Percent memory _closePrice
    ) private returns (int256) {
        if (hasClosedLossPosition[_position.pool][msg.sender]) {
            // enforce closing profit positions first
            return _closePositionWithoutTransfer(_position, _marketStopPrice);
        }

        int256 storedTraderEquity = getEstimatedEquityOfTrader(_position.pool, _position.owner, _usdPairPrice, _closePrice);
        return _closePositionWithTransfer(_unrealized, storedTraderEquity, _position, _marketStopPrice);
    }

    function _closePositionWithoutTransfer(
        MarginFlowProtocol.Position memory _position,
        Percentage.Percent memory _marketStopPrice
    ) private returns (int256) {
        market.marginProtocol.__removePosition(_position, 0, _marketStopPrice);
        return 0;
    }

    function _closePositionWithTransfer(
        int256 _unrealized,
        int256 _storedTraderEquity,
        MarginFlowProtocol.Position memory _position,
        Percentage.Percent memory _marketStopPrice
    ) private returns (int256) {
        market.marginProtocol.__transferUnrealized(_position.pool, _position.owner, _unrealized, _storedTraderEquity);
        market.marginProtocol.__removePosition(_position, _unrealized, _marketStopPrice);

        return _unrealized;
    }
}