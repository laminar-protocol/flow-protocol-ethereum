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

import "../FlowProtocolBase.sol";
import "./MarginLiquidityPoolRegistry.sol";
import "./MarginFlowProtocolSafety.sol";

contract MarginFlowProtocol is FlowProtocolBase {
    using Percentage for uint256;
    using Percentage for int256;
    using SafeERC20 for IERC20;
    using SafeMath for uint256;
    using SignedSafeMath for int256;

    struct TradingPair {
        address base;
        address quote;
    }

    struct Position {
        uint256 id;
        address owner;
        MarginLiquidityPoolInterface pool;
        TradingPair pair;
        int256 leverage;
        int256 leveragedHeld;
        int256 leveragedDebits;

        // USD value of leveraged debits on open position.
        int256 leveragedDebitsInUsd;
        uint256 marginHeld;

        Percentage.Percent swapRate;
        uint256 timeWhenOpened;
    }

    /**
     * @dev Event for deposits.
     * @param sender The sender
     * @param liquidityPool The MarginLiquidityPool
     * @param liquidityPool The MarginLiquidityPool
     * @param baseToken The base token
     * @param quoteToken The quote token
     * @param leverage The leverage, e.g., 20x
     * @param leveragedDebitsInUsd The base token amount to open position
     * @param price The max/min price for opening, 0 means accept all.
     */
    event PositionOpened(
        uint256 positionId,
        address indexed sender,
        address indexed liquidityPool,
        address indexed baseToken,
        address quoteToken,
        int256 leverage,
        int256 leveragedDebitsInUsd,
        uint256 price
    );

    /**
     * @dev Event for deposits.
     * @param sender The sender
     * @param liquidityPool The MarginLiquidityPool
     * @param baseToken The base token
     * @param quoteToken The quote token
     * @param realizedPl The realized profit or loss after closing
     * @param positionId The position id
     * @param price The max/min price for closing, 0 means accept all.
     */
    event PositionClosed(
        uint256 positionId,
        address indexed sender,
        address indexed liquidityPool,
        address indexed baseToken,
        address quoteToken,
        int256 realizedPl,
        uint256 price
    );

    /**
     * @dev Event for deposits.
     * @param sender The sender
     * @param amount The amount
     */
    event Deposited(MarginLiquidityPoolInterface pool, address indexed sender, uint256 amount);

    /**
     * @dev Event for withdrawals.
     * @param sender The sender
     * @param amount The amount
     */
    event Withdrew(MarginLiquidityPoolInterface pool, address indexed sender, uint256 amount);

    /**
     * @dev Event for withdrawals of stopped pools.
     * @param sender The sender
     * @param amount The amount
     */
    event WithdrewStoppedPool(MarginLiquidityPoolInterface pool, address indexed sender, uint256 amount);

    /**
     * @dev Event for new trading pair being added.
     * @param base The base token
     * @param quote The quote token
     */
    event NewTradingPair(address indexed base, address indexed quote);

    MarginFlowProtocolSafety public safetyProtocol;
    MarginLiquidityPoolRegistry public liquidityPoolRegistry;

    enum CurrencyType {
        USD,
        BASE,
        QUOTE
    }

    mapping (uint256 => Position) public positionsById;
    mapping (MarginLiquidityPoolInterface => mapping (address => Position[])) public positionsByPoolAndTrader;
    mapping (MarginLiquidityPoolInterface => Position[]) public positionsByPool;

    mapping (MarginLiquidityPoolInterface => mapping(address => int256)) public balances;
    mapping (MarginLiquidityPoolInterface => mapping(address => mapping (address => mapping (CurrencyType => uint256)))) public poolLongPositionAccPerPair;
    mapping (MarginLiquidityPoolInterface => mapping(address => mapping (address => mapping (CurrencyType => uint256)))) public poolShortPositionAccPerPair;
    mapping (MarginLiquidityPoolInterface => mapping(address => bool)) public traderIsMarginCalled;

    // stopped pools
    mapping (MarginLiquidityPoolInterface => bool) public stoppedPools;
    mapping (MarginLiquidityPoolInterface => uint256) private storedLiquidatedPoolClosingTimes;
    mapping (MarginLiquidityPoolInterface => uint256) public storedLiquidatedPoolBasePrices;
    mapping (MarginLiquidityPoolInterface => mapping(address => uint256)) private storedLiquidatedPoolPairPrices;
    mapping (MarginLiquidityPoolInterface => mapping(address => mapping (address => uint256))) public storedLiquidatedPoolBidPrices;
    mapping (MarginLiquidityPoolInterface => mapping(address => mapping (address => uint256))) public storedLiquidatedPoolAskPrices;

    mapping(address => mapping (address => bool)) public tradingPairWhitelist;
    mapping (address => mapping(address => mapping (bool => Percentage.Percent))) public currentSwapRates;

    TradingPair[] private tradingPairs;

    uint256 public nextPositionId;
    uint256 public minLeverage;
    uint256 public maxLeverage;
    uint256 public minLeverageAmount;
    uint256 public swapRateUnit;

    bool constant private LONG = true;
    bool constant private SHORT = false;

    modifier poolIsVerifiedAndRunning(MarginLiquidityPoolInterface _pool) {
        require(liquidityPoolRegistry.isVerifiedPool(_pool), "LR1");
        require(!stoppedPools[_pool], "LR2");

        _;
    }

    modifier tradingPairWhitelisted(address _base, address _quote) {
        require(tradingPairWhitelist[address(_base)][address(_quote)], "TP1");

        _;
    }

    /**
     * @dev Initialize the MarginFlowProtocol.
     * @param _oracle The price oracle
     * @param _moneyMarket The money market.
     * @param _safetyProtocol The _safetyProtocol.
     * @param _liquidityPoolRegistry The liquidity pool registry.
     * @param _initialMinLeverage The _initialMinLeverage.
     * @param _initialMaxLeverage The _initialMaxLeverage.
     * @param _initialMinLeverageAmount The _initialMinLeverageAmount.
     * @param _swapRateUnit The _swapRateUnit.
     */
    function initialize(
        PriceOracleInterface _oracle,
        MoneyMarketInterface _moneyMarket,
        MarginFlowProtocolSafety _safetyProtocol,
        MarginLiquidityPoolRegistry _liquidityPoolRegistry,
        uint256 _initialMinLeverage,
        uint256 _initialMaxLeverage,
        uint256 _initialMinLeverageAmount,
        uint256 _swapRateUnit
    ) external initializer {
        FlowProtocolBase.initialize(_oracle, _moneyMarket);
        safetyProtocol = _safetyProtocol;
        liquidityPoolRegistry = _liquidityPoolRegistry;
        minLeverage = _initialMinLeverage;
        maxLeverage = _initialMaxLeverage;
        minLeverageAmount = _initialMinLeverageAmount;
        swapRateUnit = _swapRateUnit;
    }

    function getTradingPairs() external view returns (TradingPair[] memory) {
        return tradingPairs;
    }

    function stopPool(MarginLiquidityPoolInterface _pool) external {
        require(msg.sender == address(safetyProtocol), "SP1");
        stoppedPools[_pool] = true;

        storedLiquidatedPoolClosingTimes[_pool] = now;
        storedLiquidatedPoolBasePrices[_pool] = getPrice(address(moneyMarket.baseToken()));

        for (uint256 i = 0; i < tradingPairs.length; i++) {
            address base = tradingPairs[i].base;
            address quote = tradingPairs[i].quote;
            storedLiquidatedPoolPairPrices[_pool][base] = getPrice(base);
            storedLiquidatedPoolPairPrices[_pool][quote] = getPrice(quote);
            storedLiquidatedPoolBidPrices[_pool][base][quote] = _getBidSpread(_pool, base, quote);
            storedLiquidatedPoolAskPrices[_pool][base][quote] = _getAskSpread(_pool, base, quote);
        }
    }

    /**
     * @dev Add new trading pair, only for the owner.
     * @param _base The base token.
     * @param _quote The quote token.
     * @param _swapRateLong The swap rate as percentage for longs.
     * @param _swapRateShort The swap rate as percentage for shorts.
     */
    function addTradingPair(address _base, address _quote, uint256 _swapRateLong, uint256 _swapRateShort) external onlyOwner {
        require(_base != address(0) && _quote != address(0), "0");
        require(_base != _quote, "TP3");
        require(!tradingPairWhitelist[_base][_quote], "TP2");

        currentSwapRates[_base][_quote][LONG] = Percentage.Percent(_swapRateLong);
        currentSwapRates[_base][_quote][SHORT] = Percentage.Percent(_swapRateShort);
        tradingPairWhitelist[_base][_quote] = true;

        tradingPairs.push(TradingPair(_base, _quote));

        emit NewTradingPair(_base, _quote);
    }

    /**
     * @dev Set new swap rate for token pair, only for the owner.
     * @param _base The base token.
     * @param _quote The quote token.
     * @param _newSwapRateLong The new swap rate as percentage for longs.
     * @param _newSwapRateShort The new swap rate as percentage for shorts.
     */
    function setCurrentSwapRateForPair(address _base, address _quote, uint256 _newSwapRateLong, uint256 _newSwapRateShort) external onlyOwner {
        require(_newSwapRateLong > 0 && _newSwapRateShort > 0, "0");
        currentSwapRates[_base][_quote][LONG] = Percentage.Percent(_newSwapRateLong);
        currentSwapRates[_base][_quote][SHORT] = Percentage.Percent(_newSwapRateShort);
    }

    /**
     * @dev Set new minimum leverage, only for the owner.
     * @param _newMinLeverage The new minimum leverage.
     */
    function setMinLeverage(uint256 _newMinLeverage) external onlyOwner {
        require(_newMinLeverage > 0, "0");
        minLeverage = _newMinLeverage;
    }

    /**
     * @dev Set new maximum leverage, only for the owner.
     * @param _newMaxLeverage The new maximum leverage.
     */
    function setMaxLeverage(uint256 _newMaxLeverage) external onlyOwner {
        require(_newMaxLeverage > 0, "0");
        maxLeverage = _newMaxLeverage;
    }

    /**
     * @dev Set new minimum leverage amount, only for the owner.
     * @param _newMinLeverageAmount The new minimum leverage amount.
     */
    function setMinLeverageAmount(uint256 _newMinLeverageAmount) external onlyOwner {
        require(_newMinLeverageAmount > 0, "0");
        minLeverageAmount = _newMinLeverageAmount;
    }

    /**
     * @dev Deposit amount to pool balance.
     * @param _pool The MarginLiquidityPool.
     * @param _baseTokenAmount The base token amount to deposit.
     */
    function deposit(MarginLiquidityPoolInterface _pool, uint256 _baseTokenAmount) external nonReentrant poolIsVerifiedAndRunning(_pool) {
        require(_baseTokenAmount > 0, "0");
        moneyMarket.baseToken().safeTransferFrom(msg.sender, address(this), _baseTokenAmount);
        moneyMarket.baseToken().approve(address(moneyMarket), _baseTokenAmount);
        uint256 iTokenAmount = moneyMarket.mint(_baseTokenAmount);
        balances[_pool][msg.sender] = balances[_pool][msg.sender].add(int256(iTokenAmount));

        emit Deposited(_pool, msg.sender, _baseTokenAmount);
    }

    /**
     * @dev Withdraw amount from pool balance.
     * @param _pool The MarginLiquidityPool.
     * @param _iTokenAmount The iToken amount to withdraw.
     */
    function withdraw(MarginLiquidityPoolInterface _pool, uint256 _iTokenAmount) external nonReentrant {
        require(liquidityPoolRegistry.isVerifiedPool(_pool), "LR1");
        uint256 baseTokenAmount = moneyMarket.redeemTo(msg.sender, _iTokenAmount);

        if (stoppedPools[_pool]) {
            require(positionsByPoolAndTrader[_pool][msg.sender].length == 0, "W2");
        }

        require(getFreeMargin(_pool, msg.sender) >= baseTokenAmount, "W1");
        require(baseTokenAmount > 0, "0");

        balances[_pool][msg.sender] = balances[_pool][msg.sender].sub(int256(_iTokenAmount));

        emit Withdrew(_pool, msg.sender, baseTokenAmount);
    }

    /**
     * @dev Withdraw amount from pool balance for pool.
     * @param _iTokenAmount The iToken amount to withdraw.
     */
    function withdrawForPool(uint256 _iTokenAmount) external nonReentrant poolIsVerifiedAndRunning(MarginLiquidityPoolInterface(msg.sender)) {
        require(_iTokenAmount > 0, "0");
        MarginLiquidityPoolInterface pool = MarginLiquidityPoolInterface(msg.sender);

        require(int256(_iTokenAmount) <= balances[pool][msg.sender], "WP1");

        balances[pool][msg.sender] = balances[pool][msg.sender].sub(int256(_iTokenAmount));
        moneyMarket.iToken().safeTransfer(msg.sender, _iTokenAmount);
    }

    /**
     * @dev Open a new position with a min/max price. Trader must pay fees for first position.
     * Set price to 0 if you want to use the current market price.
     * @param _pool The MarginLiquidityPool.
     * @param _base The base token.
     * @param _quote The quote token.
     * @param _leverage The leverage number, e.g., 20x.
     * @param _leveragedHeld The leveraged held balance.
     * @param _price The max/min price when opening the position.
     */
    function openPosition(
        MarginLiquidityPoolInterface _pool,
        address _base,
        address _quote,
        int256 _leverage,
        uint256 _leveragedHeld,
        uint256 _price
    ) external nonReentrant poolIsVerifiedAndRunning(_pool) tradingPairWhitelisted(_base, _quote) {
        require(!traderIsMarginCalled[_pool][msg.sender], "OP2");
        require(!liquidityPoolRegistry.isMarginCalled(_pool), "OP3");

        uint256 leverageAbs = _leverage >= 0 ? uint256(_leverage) : uint256(-_leverage);

        require(leverageAbs >= minLeverage, "OP4");
        require(leverageAbs <= maxLeverage, "OP5");
        require(_leveragedHeld >= minLeverageAmount, "OP6");
        require(safetyProtocol.traderHasPaidDeposits(_pool, msg.sender), "OP7");

        Percentage.Percent memory debitsPrice = (_leverage > 0)
            ? _getAskPrice(_pool, TradingPair(_base, _quote), _price)
            : _getBidPrice(_pool, TradingPair(_base, _quote), _price);

        _insertPosition(
            _pool,
            TradingPair(_base, _quote),
            _leverage,
            _leveragedHeld,
            debitsPrice
        );
    }

    /**
     * @dev Close the given position with a min/max price. Set price to 0 if you want to use the current market price.
     * @param _positionId The id of the position to close.
     * @param _price The max/min price when closing the position..
     */
    function closePosition(uint256 _positionId, uint256 _price) external nonReentrant {
        Position memory position = positionsById[_positionId];
        require(msg.sender == position.owner || msg.sender == address(safetyProtocol), "CP1");

        (int256 unrealizedPl, Percentage.Percent memory marketPrice) = _getUnrealizedPlAndMarketPriceOfPosition(position, _price);
        uint256 accumulatedSwapRate = getAccumulatedSwapRateOfPosition(_positionId);
        int256 totalUnrealized = unrealizedPl.sub(int256(accumulatedSwapRate));

        _transferUnrealized(position.pool, msg.sender, totalUnrealized);
        _removePosition(position, totalUnrealized, marketPrice);
    }

    /**
    * @dev Sum of all margin held of a given trader.
    * @param _pool The MarginLiquidityPool.
    * @param _trader The trader address.
    * @return The margin held sum.
    */
    function getMarginHeld(MarginLiquidityPoolInterface _pool, address _trader) public view returns (uint256) {
        uint256 accumulatedMarginHeld = 0;
        Position[] memory positions = positionsByPoolAndTrader[_pool][_trader];

        for (uint256 i = 0; i < positions.length; i++) {
            accumulatedMarginHeld = accumulatedMarginHeld.add(positions[i].marginHeld);
        }

        return accumulatedMarginHeld;
    }

    /**
    * @dev Get the free margin: the free margin of the trader.
    * @param _pool The MarginLiquidityPool.
    * @param _trader The trader address.
    * @return The free margin amount (int256).
    */
    function getFreeMargin(MarginLiquidityPoolInterface _pool, address _trader) public returns (uint256) {
        int256 equity = getEquityOfTrader(_pool, _trader);
        uint256 marginHeld = getMarginHeld(_pool, _trader);

        if (equity <= int256(marginHeld)) {
            return 0;
        }

        // freeMargin = equity - marginHeld
        return uint256(equity).sub(marginHeld);
    }

    // equityOfTrader = balance + unrealizedPl - accumulatedSwapRate
    function getEquityOfTrader(MarginLiquidityPoolInterface _pool, address _trader) public returns (int256) {
        int256 unrealized = _getUnrealizedPlOfTrader(_pool, _trader);
        uint256 accumulatedSwapRates = _getSwapRatesOfTrader(_pool, _trader);
        int256 traderBalance = balances[_pool][_trader];
        uint256 traderBalanceAbs = traderBalance >= 0 ? uint256(traderBalance) : uint256(-traderBalance);
        uint256 traderBalanceBaseTokenAbs = moneyMarket.convertAmountToBase(traderBalanceAbs);
        int256 traderBalanceBaseToken = traderBalance >= 0 ? int256(traderBalanceBaseTokenAbs) : int256(-traderBalanceBaseTokenAbs);
        int256 totalBalance = traderBalanceBaseToken.add(unrealized);

        return totalBalance.sub(int256(accumulatedSwapRates));
    }

    // Unrealized profit and loss of a position(USD value), based on current market price.
    // unrealizedPlOfPosition = (currentPrice - openPrice) * leveragedHeld * to_usd_price
    function getUnrealizedPlOfPosition(uint256 _positionId) public returns (int256) {
        (int256 unrealizedPl,) = _getUnrealizedPlAndMarketPriceOfPosition(positionsById[_positionId], 0);
        return unrealizedPl;
    }

    // usdValue = amount * price
    function getUsdValue(address _currencyToken, int256 _amount) public returns (int256) {
        Percentage.Percent memory price = getPrice(address(moneyMarket.baseToken()), _currencyToken);

        return _amount.signedMulPercent(Percentage.SignedPercent(int256(price.value)));
    }

    // The price from oracle.
    function getPrice(address _baseCurrencyId, address _quoteCurrencyId) public returns (Percentage.Percent memory) {
        uint256 basePrice = getPrice(_baseCurrencyId);
        uint256 quotePrice = getPrice(_quoteCurrencyId);

        return Percentage.fromFraction(quotePrice, basePrice);
    }

    // accumulated interest rate = rate * swap unit
    function getAccumulatedSwapRateOfPosition(uint256 _positionId) public view returns (uint256) {
        return _getAccumulatedSwapRateOfPositionUntilDate(_positionId, now);
    }

    function _getAccumulatedSwapRateOfPositionUntilDate(uint256 _positionId, uint256 _time) private view returns (uint256) {
        Position memory position = positionsById[_positionId];

        uint256 timeDeltaInSeconds = _time.sub(position.timeWhenOpened);
        uint256 timeUnitsSinceOpen = timeDeltaInSeconds.div(swapRateUnit);
        uint256 leveragedDebitsAbs = position.leveragedDebitsInUsd >= 0
            ? uint256(position.leveragedDebitsInUsd)
            : uint256(-position.leveragedDebitsInUsd);
        uint256 accumulatedSwapRate = leveragedDebitsAbs.mul(timeUnitsSinceOpen).mulPercent(position.swapRate);

        return accumulatedSwapRate;
    }

    function getPositionsByPoolLength(MarginLiquidityPoolInterface _pool) external view returns (uint256) {
        return positionsByPool[_pool].length;
    }

    function getPositionIdByPoolAndIndex(MarginLiquidityPoolInterface _pool, uint256 _index) external view returns (uint256) {
        return positionsByPool[_pool][_index].id;
    }

    function getLeveragedDebitsByPoolAndIndex(MarginLiquidityPoolInterface _pool, uint256 _index) external view returns (int256) {
        return positionsByPool[_pool][_index].leveragedDebitsInUsd;
    }

    function getPositionsByPoolAndTraderLength(MarginLiquidityPoolInterface _pool, address _trader) external view returns (uint256) {
        return positionsByPoolAndTrader[_pool][_trader].length;
    }

    function getPositionIdByPoolAndTraderAndIndex(MarginLiquidityPoolInterface _pool, address _trader, uint256 _index) external view returns (uint256) {
        return positionsByPoolAndTrader[_pool][_trader][_index].id;
    }

    function getLeveragedDebitsByPoolAndTraderAndIndex(
        MarginLiquidityPoolInterface _pool,
        address _trader,
        uint256 _index
    ) external view returns (int256) {
        return positionsByPoolAndTrader[_pool][_trader][_index].leveragedDebitsInUsd;
    }

    function setTraderIsMarginCalled(MarginLiquidityPoolInterface _pool, address _trader, bool _isMarginCalled) external {
        require(msg.sender == address(safetyProtocol), "SP1");
        traderIsMarginCalled[_pool][_trader] = _isMarginCalled;
    }

    function _getAskSpread(MarginLiquidityPoolInterface _pool, address _baseToken, address _quoteToken) private view returns (uint) {
        uint256 spread = _pool.getAskSpread(_baseToken, _quoteToken);
        return _getSpread(spread);
    }

    function _getBidSpread(MarginLiquidityPoolInterface _pool, address _baseToken, address _quoteToken) private view returns (uint) {
        uint256 spread = _pool.getBidSpread(_baseToken, _quoteToken);
        return _getSpread(spread);
    }

    // askPrice = price + askSpread
    function _getAskPrice(MarginLiquidityPoolInterface _pool, TradingPair memory _pair, uint256 _max) internal returns (Percentage.Percent memory) {
        Percentage.Percent memory price = getPrice(_pair.base, _pair.quote);

        uint256 spread = _getAskSpread(_pool, address(_pair.base), address(_pair.quote));
        Percentage.Percent memory askPrice = Percentage.Percent(price.value.add(spread));

        if (_max > 0) {
            require(askPrice.value <= _max, "AP1");
        }

        return askPrice;
    }

    // bidPrice = price - askSpread
    function _getBidPrice(MarginLiquidityPoolInterface _pool, TradingPair memory _pair, uint256 _min) internal returns (Percentage.Percent memory) {
        Percentage.Percent memory price = getPrice(_pair.base, _pair.quote);
        uint256 spread = _getBidSpread(_pool, address(_pair.base), address(_pair.quote));
        Percentage.Percent memory bidPrice = Percentage.Percent(price.value.sub(spread));

        if (_min > 0) {
            require(bidPrice.value >= _min, "BP1");
        }

        return bidPrice;
    }

    function _getSwapRatesOfTrader(MarginLiquidityPoolInterface _pool, address _trader) internal view returns (uint256) {
        Position[] memory positions = positionsByPoolAndTrader[_pool][_trader];

        uint256 accumulatedSwapRates = uint256(0);

        for (uint256 i = 0; i < positions.length; i++) {
            accumulatedSwapRates = accumulatedSwapRates.add(getAccumulatedSwapRateOfPosition(positions[i].id));
        }

        return accumulatedSwapRates;
    }

    // Unrealized profit and loss of a given trader(USD value). It is the sum of unrealized profit and loss of all positions
	// opened by a trader.
    function _getUnrealizedPlOfTrader(MarginLiquidityPoolInterface _pool, address _trader) internal returns (int256) {
        Position[] memory positions = positionsByPoolAndTrader[_pool][_trader];
        int256 accumulatedUnrealized = 0;

        for (uint256 i = 0; i < positions.length; i++) {
            accumulatedUnrealized = accumulatedUnrealized.add(getUnrealizedPlOfPosition(positions[i].id));
        }

        return accumulatedUnrealized;
    }

    // Returns `(unrealizedPl, marketPrice)` of a given position. If `price`, market price must fit this bound, else reverts.
    function _getUnrealizedPlAndMarketPriceOfPosition(
        Position memory _position,
        uint256 _price
    ) internal returns (int256, Percentage.Percent memory) {
        return _getUnrealizedPlForParams(
            _position.pool,
            _position.pair,
            _position.leveragedDebits,
            _position.leveragedHeld,
            _position.leverage,
            _price
        );
    }

    function getPairSafetyInfo(MarginLiquidityPoolInterface _pool, TradingPair calldata pair) external returns (uint256, uint256, int256) {
        uint256 pairInfoLongUsdAmount = poolLongPositionAccPerPair[_pool][pair.base][pair.quote][CurrencyType.USD];
        uint256 pairInfoShortUsdAmount = poolShortPositionAccPerPair[_pool][pair.base][pair.quote][CurrencyType.USD];
        Percentage.Percent memory basePrice = Percentage.Percent(getPrice(address(moneyMarket.baseToken())));

        int256 netRaw = int256(pairInfoLongUsdAmount).sub(int256(pairInfoShortUsdAmount));
        uint256 net = (netRaw >= 0 ? uint256(netRaw) : uint256(-netRaw)).mulPercent(basePrice);
        uint256 longestLeg = Math.max(pairInfoLongUsdAmount, pairInfoShortUsdAmount).mulPercent(basePrice);
        int256 unrealized = _getUnrealizedForPair(
            _pool,
            pair
        );

        return (net, longestLeg, unrealized);
    }

    function _getUnrealizedForPair(
        MarginLiquidityPoolInterface _pool,
        MarginFlowProtocol.TradingPair memory _pair
    ) private returns (int256) {
        uint256 longBaseAmount = poolLongPositionAccPerPair[_pool][_pair.base][_pair.quote][CurrencyType.BASE];
        uint256 shortBaseAmount = poolShortPositionAccPerPair[_pool][_pair.base][_pair.quote][CurrencyType.BASE];
        uint256 longQuoteAmount = poolLongPositionAccPerPair[_pool][_pair.base][_pair.quote][CurrencyType.QUOTE];
        uint256 shortQuoteAmount = poolShortPositionAccPerPair[_pool][_pair.base][_pair.quote][CurrencyType.QUOTE];
        
        (int256 longUnrealized,) =  _getUnrealizedPlForParams(
            _pool,
            _pair,
            int256(longBaseAmount).mul(-1),
            int256(longQuoteAmount),
            1,
            0
        );
        (int256 shortUnrealized,) = _getUnrealizedPlForParams(
            _pool,
            _pair,
            int256(shortBaseAmount),
            int256(shortQuoteAmount).mul(-1),
            -1,
            0
        );

        return longUnrealized.add(shortUnrealized);
    }

    function _getUnrealizedPlForParams(
        MarginLiquidityPoolInterface _pool,
        TradingPair memory _pair,
        int256 _leveragedDebits,
        int256 _leveragedHeld,
        int256 _leverage,
        uint256 _price
    ) private returns (int256, Percentage.Percent memory) {
        Percentage.SignedPercent memory openPrice = Percentage.signedFromFraction(-_leveragedDebits, _leveragedHeld);

        Percentage.SignedPercent memory currentPrice = _leverage > 0
            ? Percentage.SignedPercent(int256(_getBidPrice(_pool, _pair, _price).value))
            : Percentage.SignedPercent(int256(_getAskPrice(_pool, _pair, _price).value));

        Percentage.SignedPercent memory priceDelta = Percentage.signedSubPercent(currentPrice, openPrice);
        int256 unrealized = _leveragedHeld.signedMulPercent(priceDelta);

        return (getUsdValue(_pair.base, unrealized), Percentage.Percent(uint256(currentPrice.value)));
    }

    function _getUnrealizedPlForStoppedPool(
        Percentage.Percent memory _usdPairPrice,
        Percentage.Percent memory _closePrice,
        int256 _leveragedDebits,
        int256 _leveragedHeld
    ) private pure returns (int256) {
        Percentage.SignedPercent memory openPrice = Percentage.signedFromFraction(-_leveragedDebits, _leveragedHeld);
        Percentage.SignedPercent memory priceDelta = Percentage.signedSubPercent(Percentage.SignedPercent(int256(_closePrice.value)), openPrice);

        int256 unrealized = _leveragedHeld.signedMulPercent(priceDelta);
        int256 unrealizedUsd = unrealized.signedMulPercent(Percentage.SignedPercent(int256(_usdPairPrice.value)));

        return unrealizedUsd;
    }

    function _insertPosition(
        MarginLiquidityPoolInterface _pool,
        TradingPair memory _pair,
        int256 _leverage,
        uint256 _leveragedHeld,
        Percentage.Percent memory _debitsPrice
    ) internal {
        uint256 positionId = nextPositionId;
        nextPositionId++;

        (int256 heldSignum, int256 debitSignum) = _leverage > 0 ? (int256(1), int256(-1)) :  (int256(-1), int256(1));

        uint256 leveragedDebits = _leveragedHeld.mulPercent(_debitsPrice);
        uint256 leveragedHeldInUsd = uint256(getUsdValue(_pair.base, int256(leveragedDebits)));
        uint256 marginHeld = uint256(int256(leveragedHeldInUsd).mul(heldSignum).div(_leverage));

        if (_leverage > 0) {
            poolLongPositionAccPerPair[_pool][_pair.base][_pair.quote][CurrencyType.QUOTE] = poolLongPositionAccPerPair[_pool][_pair.base][_pair.quote][CurrencyType.QUOTE]
                .add(_leveragedHeld);
            poolLongPositionAccPerPair[_pool][_pair.base][_pair.quote][CurrencyType.BASE] = poolLongPositionAccPerPair[_pool][_pair.base][_pair.quote][CurrencyType.BASE]
                .add(leveragedDebits);
            poolLongPositionAccPerPair[_pool][_pair.base][_pair.quote][CurrencyType.USD] = poolLongPositionAccPerPair[_pool][_pair.base][_pair.quote][CurrencyType.USD]
                .add(leveragedHeldInUsd);
        } else {
            poolShortPositionAccPerPair[_pool][_pair.base][_pair.quote][CurrencyType.QUOTE] = poolShortPositionAccPerPair[_pool][_pair.base][_pair.quote][CurrencyType.QUOTE]
                .add(_leveragedHeld);
            poolShortPositionAccPerPair[_pool][_pair.base][_pair.quote][CurrencyType.BASE] = poolShortPositionAccPerPair[_pool][_pair.base][_pair.quote][CurrencyType.BASE]
                .add(leveragedDebits);
            poolShortPositionAccPerPair[_pool][_pair.base][_pair.quote][CurrencyType.USD] = poolShortPositionAccPerPair[_pool][_pair.base][_pair.quote][CurrencyType.USD]
                .add(leveragedHeldInUsd);
        }

        Position memory position = Position(
            positionId,
            msg.sender,
            _pool,
            _pair,
            _leverage,
            int256(_leveragedHeld).mul(heldSignum),
            int256(leveragedDebits).mul(debitSignum),
            int256(leveragedHeldInUsd).mul(debitSignum),
            marginHeld,
            currentSwapRates[_pair.base][_pair.quote][_leverage > 0 ? LONG : SHORT],
            now
        );

        require(getFreeMargin(_pool, msg.sender) >= marginHeld, "OP1");

        positionsById[positionId] = position;
        positionsByPoolAndTrader[_pool][msg.sender].push(position);
        positionsByPool[_pool].push(position);

        emit PositionOpened(
            positionId,
            msg.sender,
            address(_pool),
            _pair.base,
            _pair.quote,
            _leverage,
            int256(leveragedHeldInUsd).mul(debitSignum),
            _debitsPrice.value
        );
    }

    function _removePositionFromLists(Position memory _position) internal {
        _removePositionFromList(positionsByPoolAndTrader[_position.pool][_position.owner], _position.id);
        _removePositionFromList(positionsByPool[_position.pool], _position.id);
    }

    function _removePositionFromList(Position[] storage positions, uint256 _positionId) private {
        for (uint256 i = 0; i < positions.length; i++) { // TODO pass correct index to minimise gas
            if (positions[i].id == _positionId) {
                positions[i] = positions[positions.length.sub(1)];
                positions.pop();

                return;
            }
        }
    }

    function _transferItokenBalanceToPool(MarginLiquidityPoolInterface _pool, address owner, uint256 amount) private {
        _transferItokenBalance(_pool, owner, address(_pool), amount);
    }

    function _transferItokenBalanceFromPool(MarginLiquidityPoolInterface _pool, address owner, uint256 amount) private {
        _transferItokenBalance(_pool, address(_pool), owner, amount);

        int256 poolBalance = balances[_pool][address(_pool)];

        if (poolBalance < 0) {
            uint256 transferITokenAmount = uint256(-poolBalance);

            // approve might fail if MAX UINT is already approved
            try _pool.increaseAllowanceForProtocol(transferITokenAmount) {} catch (bytes memory) {}
            moneyMarket.iToken().safeTransferFrom(address(_pool), address(this), transferITokenAmount);
            balances[_pool][address(_pool)] = 0;
        }
    }

    function _transferItokenBalance(MarginLiquidityPoolInterface _pool, address from, address to, uint256 amount) private {
        balances[_pool][from] = balances[_pool][from].sub(int256(amount));
        balances[_pool][to] = balances[_pool][to].add(int256(amount));
    }

    function _removePosition(Position memory _position, int256 _unrealizedPosition, Percentage.Percent memory _marketStopPrice) private {
        MarginLiquidityPoolInterface pool = _position.pool;
        address base = _position.pair.base;
        address quote = _position.pair.quote;

        if (_position.leverage > 0) {
            poolLongPositionAccPerPair[pool][base][quote][CurrencyType.QUOTE] = poolLongPositionAccPerPair[pool][base][quote][CurrencyType.QUOTE]
                .sub(uint256(_position.leveragedHeld));
            poolLongPositionAccPerPair[pool][base][quote][CurrencyType.BASE] = poolLongPositionAccPerPair[pool][base][quote][CurrencyType.BASE]
                .sub(uint256(-_position.leveragedDebits));
            poolLongPositionAccPerPair[pool][base][quote][CurrencyType.USD] = poolLongPositionAccPerPair[pool][base][quote][CurrencyType.USD]
                .sub(uint256(-_position.leveragedDebitsInUsd));
        } else {
            poolShortPositionAccPerPair[pool][base][quote][CurrencyType.QUOTE] = poolShortPositionAccPerPair[pool][base][quote][CurrencyType.QUOTE]
                .sub(uint256(-_position.leveragedHeld));
            poolShortPositionAccPerPair[pool][base][quote][CurrencyType.BASE] = poolShortPositionAccPerPair[pool][base][quote][CurrencyType.BASE]
                .sub(uint256(_position.leveragedDebits));
            poolShortPositionAccPerPair[pool][base][quote][CurrencyType.USD] = poolShortPositionAccPerPair[pool][base][quote][CurrencyType.USD]
                .sub(uint256(_position.leveragedDebitsInUsd));
        }

        delete positionsById[_position.id];
        _removePositionFromLists(_position);

        emit PositionClosed(
            _position.id,
            _position.owner,
            address(pool),
            base,
            quote,
            _unrealizedPosition,
            _marketStopPrice.value
        );
    }

    /**
     * @dev Force close all positions for trader for liquidated pool.
     */
    function closePositionForLiquidatedPool(uint256 _positionId) external nonReentrant {
        Position memory position = positionsById[_positionId];

        // allow anyone to close position

        require(stoppedPools[position.pool], "CPL1");

        uint256 usdStopPrice = storedLiquidatedPoolBasePrices[position.pool];
        int256 poolLiquidityIToken = int256(position.pool.getLiquidity()).add(balances[position.pool][address(position.pool)]);

        require(poolLiquidityIToken > 0, "CPL2");
            
        uint256 closingTime = storedLiquidatedPoolClosingTimes[position.pool];
        uint256 baseStopPrice = storedLiquidatedPoolPairPrices[position.pool][position.pair.base];
        uint256 quoteStopPrice = storedLiquidatedPoolPairPrices[position.pool][position.pair.quote];
        uint256 spread = position.leverage > 0
            ? storedLiquidatedPoolBidPrices[position.pool][position.pair.base][position.pair.quote]
            : storedLiquidatedPoolAskPrices[position.pool][position.pair.base][position.pair.quote];

        Percentage.Percent memory usdPairPrice = Percentage.fromFraction(baseStopPrice, usdStopPrice);
        Percentage.Percent memory marketStopPrice = Percentage.fromFraction(quoteStopPrice, baseStopPrice);
        Percentage.Percent memory marketStopPriceWithSpread = position.leverage > 0
            ? Percentage.Percent(marketStopPrice.value.sub(spread))
            : Percentage.Percent(marketStopPrice.value.add(spread));

        int256 unrealized = _getUnrealizedPlForStoppedPool(
            usdPairPrice,
            marketStopPriceWithSpread,
            position.leveragedDebits,
            position.leveragedHeld
        );
        uint256 accumulatedSwapRate = _getAccumulatedSwapRateOfPositionUntilDate(position.id, closingTime);
        int256 totalUnrealized = unrealized.sub(int256(accumulatedSwapRate));

        _transferUnrealized(position.pool, msg.sender, totalUnrealized);
        _removePosition(position, totalUnrealized, marketStopPrice);
    }

    function _transferUnrealized(MarginLiquidityPoolInterface _pool, address _owner, int256 _unrealized) private {
        if (_unrealized >= 0) { // trader has profit, max realizable is the pool's liquidity
            int256 storedITokenBalance = balances[_pool][address(_pool)];
            int256 poolLiquidityIToken = int256(_pool.getLiquidity()).add(storedITokenBalance);
            uint256 realizedIToken = moneyMarket.convertAmountFromBase(uint256(_unrealized));
            uint256 realized = poolLiquidityIToken > 0 ? Math.min(uint256(poolLiquidityIToken), realizedIToken) : 0;

            _transferItokenBalanceFromPool(_pool, _owner, realized);
            return;
        }

        // trader has loss, max realizable is the trader's equity without the given position
        int256 equity = getEquityOfTrader(_pool, _owner);
        uint256 unrealizedAbs = uint256(-_unrealized);
        int256 maxRealizable = equity.add(int256(unrealizedAbs));

        if (maxRealizable > 0) { // pool gets nothing if no realizable from traders
            uint256 realized = Math.min(uint256(maxRealizable), unrealizedAbs);
            uint256 realizedIToken = moneyMarket.convertAmountFromBase(realized);

            _transferItokenBalanceToPool(_pool, _owner, realizedIToken);
        }
    }
}