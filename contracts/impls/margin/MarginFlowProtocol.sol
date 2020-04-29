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
    event Deposited(address indexed sender, uint256 amount);

    /**
     * @dev Event for withdrawals..
     * @param sender The sender
     * @param amount The amount
     */
    event Withdrew(address indexed sender, uint256 amount);

    /**
     * @dev Event for new trading pair being added.
     * @param base The base token
     * @param quote The quote token
     */
    event NewTradingPair(address indexed base, address indexed quote);

    uint256 public nextPositionId;
    MarginFlowProtocolSafety public safetyProtocol;
    MarginLiquidityPoolRegistry public liquidityPoolRegistry;

    mapping (uint256 => Position) public positionsById;
    mapping (MarginLiquidityPoolInterface => mapping (address => Position[])) public positionsByPoolAndTrader;
    mapping (MarginLiquidityPoolInterface => Position[]) public positionsByPool;
    mapping (MarginLiquidityPoolInterface => mapping(address => int256)) public balances;
    mapping (MarginLiquidityPoolInterface => mapping(address => bool)) public traderHasPaidFees;
    mapping (MarginLiquidityPoolInterface => mapping(address => bool)) public traderIsMarginCalled;
    mapping(address => mapping (address => bool)) public tradingPairWhitelist;

    Percentage.Percent public currentSwapRate;
    uint256 public minLeverage;
    uint256 public maxLeverage;
    uint256 public minLeverageAmount;
    uint256 public rateUnit;
    uint256 constant public TRADER_MARGIN_CALL_FEE = 20 ether; // TODO
    uint256 constant public TRADER_LIQUIDATION_FEE = 60 ether; // TODO

    modifier poolIsVerified(MarginLiquidityPoolInterface _pool) {
        require(liquidityPoolRegistry.isVerifiedPool(_pool), "LR1");

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
     * @param _liquidityPoolRegistry The liquidity pool registry.
     * @param _initialSwapRate The initial swap rate as percentage.
     */
    function initialize(
        PriceOracleInterface _oracle,
        MoneyMarketInterface _moneyMarket,
        MarginFlowProtocolSafety _safetyProtocol,
        MarginLiquidityPoolRegistry _liquidityPoolRegistry,
        uint256 _initialSwapRate,
        uint256 _initialMinLeverage,
        uint256 _initialMaxLeverage,
        uint256 _initialMinLeverageAmount,
        uint256 _rateUnit
    ) external initializer {
        FlowProtocolBase.initialize(_oracle, _moneyMarket);
        safetyProtocol = _safetyProtocol;
        liquidityPoolRegistry = _liquidityPoolRegistry;
        currentSwapRate = Percentage.Percent(_initialSwapRate);
        minLeverage = _initialMinLeverage;
        maxLeverage = _initialMaxLeverage;
        minLeverageAmount = _initialMinLeverageAmount;
        rateUnit = _rateUnit;
    }

    /**
     * @dev Add new trading pair, only for the owner.
     * @param _base The base token.
     * @param _quote The quote token.
     */
    function addTradingPair(address _base, address _quote) external onlyOwner {
        require(_base != address(0) && _quote != address(0), "0");
        require(_base != _quote, "TP3");
        require(!tradingPairWhitelist[_base][_quote], "TP2");
        tradingPairWhitelist[_base][_quote] = true;

        emit NewTradingPair(_base, _quote);
    }

    /**
     * @dev Set new swap rate, only for the owner.
     * @param _newSwapRate The new swap rate as percentage.
     */
    function setCurrentSwapRate(uint256 _newSwapRate) external onlyOwner {
        require(_newSwapRate > 0, "0");
        currentSwapRate = Percentage.Percent(_newSwapRate);
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
    function deposit(MarginLiquidityPoolInterface _pool, uint256 _baseTokenAmount) external nonReentrant poolIsVerified(_pool) {
        require(_baseTokenAmount > 0, "0");
        moneyMarket.baseToken().safeTransferFrom(msg.sender, address(this), _baseTokenAmount);
        moneyMarket.baseToken().approve(address(moneyMarket), _baseTokenAmount);
        uint256 iTokenAmount = moneyMarket.mint(_baseTokenAmount);
        balances[_pool][msg.sender] = balances[_pool][msg.sender].add(int256(iTokenAmount));

        emit Deposited(msg.sender, _baseTokenAmount);
    }

    /**
     * @dev Withdraw amount from pool balance.
     * @param _pool The MarginLiquidityPool.
     * @param _baseTokenAmount The base token amount to withdraw.
     */
    function withdraw(MarginLiquidityPoolInterface _pool, uint256 _baseTokenAmount) external nonReentrant poolIsVerified(_pool) {
        require(getFreeMargin(_pool, msg.sender) >= _baseTokenAmount, "W1");
        require(_baseTokenAmount > 0, "0");

        uint256 iTokenAmount = moneyMarket.redeemBaseTokenTo(msg.sender, _baseTokenAmount);
        balances[_pool][msg.sender] = balances[_pool][msg.sender].sub(int256(iTokenAmount));

        emit Withdrew(msg.sender, _baseTokenAmount);
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
    ) external nonReentrant poolIsVerified(_pool) tradingPairWhitelisted(_base, _quote) {
        require(!traderIsMarginCalled[_pool][msg.sender], "OP2");
        require(!liquidityPoolRegistry.isMarginCalled(_pool), "OP3");

        uint256 leverageAbs = _leverage >= 0 ? uint256(_leverage) : uint256(-_leverage);

        require(leverageAbs >= minLeverage, "OP4");
        require(leverageAbs <= maxLeverage, "OP5");
        require(_leveragedHeld >= minLeverageAmount, "OP6");

        if (!traderHasPaidFees[_pool][msg.sender]) {
            uint256 lockedFeesAmount = TRADER_MARGIN_CALL_FEE.add(TRADER_LIQUIDATION_FEE);
            moneyMarket.baseToken().safeTransferFrom(msg.sender, address(safetyProtocol), lockedFeesAmount);
            traderHasPaidFees[_pool][msg.sender] = true;
        }

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
    function closePosition(uint256 _positionId, uint256 _price) public nonReentrant {
        Position memory position = positionsById[_positionId];
        require(msg.sender == position.owner, "CP1");

        (int256 unrealizedPl, Percentage.Percent memory marketPrice) = _getUnrealizedPlAndMarketPriceOfPosition(position, _price);
        uint256 accumulatedSwapRate = getAccumulatedSwapRateOfPosition(_positionId);
        int256 balanceDelta = unrealizedPl.sub(int256(accumulatedSwapRate));

        if (balanceDelta >= 0) {
            // trader has profit, max realizable is the pool's liquidity
            uint256 poolLiquidityIToken = MarginLiquidityPoolInterface(position.pool).getLiquidity();
            uint256 realizedIToken = moneyMarket.convertAmountFromBase(uint256(balanceDelta));
            uint256 realized = Math.min(poolLiquidityIToken, realizedIToken);

            MarginLiquidityPoolInterface(position.pool).withdrawLiquidity(realized);
            balances[position.pool][msg.sender] = balances[position.pool][msg.sender].add(int256(realized));
        } else {
            // trader has loss, max realizable is the trader's equity without the given position
            int256 equity = getEquityOfTrader(position.pool, msg.sender);
            uint256 balanceDeltaAbs = uint256(-balanceDelta);
            int256 maxRealizable = equity.add(int256(balanceDeltaAbs));

            // pool gets nothing if no realizable from traders
            if (maxRealizable > 0) {
                uint256 realized = Math.min(uint256(maxRealizable), balanceDeltaAbs);
                moneyMarket.baseToken().approve(address(position.pool), realized);

                uint256 iTokenAmount = MarginLiquidityPoolInterface(position.pool).depositLiquidity(realized);
                balances[position.pool][msg.sender] = balances[position.pool][msg.sender].sub(int256(iTokenAmount));
            }
        }

		// remove position
        delete positionsById[_positionId];
        _removePositionFromLists(position);

        emit PositionClosed(
            _positionId,
            msg.sender,
            address(position.pool),
            address(position.pair.base),
            address(position.pair.quote),
            balanceDelta,
            marketPrice.value
        );
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

    // accumulated interest rate = rate * days
    function getAccumulatedSwapRateOfPosition(uint256 _positionId) public view returns (uint256) {
        Position memory position = positionsById[_positionId];

        uint256 timeDeltaInSeconds = now.sub(position.timeWhenOpened);
        uint256 daysSinceOpen = timeDeltaInSeconds.div(rateUnit);
        uint256 leveragedDebitsAbs = position.leveragedDebitsInUsd >= 0
            ? uint256(position.leveragedDebitsInUsd)
            : uint256(-position.leveragedDebitsInUsd);
        uint256 accumulatedSwapRate = leveragedDebitsAbs.mul(daysSinceOpen).mulPercent(position.swapRate);

        return accumulatedSwapRate;
    }

    function getPositionsByPoolLength(MarginLiquidityPoolInterface _pool) public view returns (uint256) {
        return positionsByPool[_pool].length;
    }

    function getPositionIdByPoolAndIndex(MarginLiquidityPoolInterface _pool, uint256 _index) public view returns (uint256) {
        return positionsByPool[_pool][_index].id;
    }

    function getLeveragedDebitsByPoolAndIndex(MarginLiquidityPoolInterface _pool, uint256 _index) public view returns (int256) {
        return positionsByPool[_pool][_index].leveragedDebitsInUsd;
    }

    function getPositionsByPoolAndTraderLength(MarginLiquidityPoolInterface _pool, address _trader) public view returns (uint256) {
        return positionsByPoolAndTrader[_pool][_trader].length;
    }

    function getPositionIdByPoolAndTraderAndIndex(MarginLiquidityPoolInterface _pool, address _trader, uint256 _index) public view returns (uint256) {
        return positionsByPoolAndTrader[_pool][_trader][_index].id;
    }

    function getLeveragedDebitsByPoolAndTraderAndIndex(
        MarginLiquidityPoolInterface _pool,
        address _trader, uint256 _index
    ) public view returns (int256) {
        return positionsByPoolAndTrader[_pool][_trader][_index].leveragedDebitsInUsd;
    }

    function setTraderIsMarginCalled(MarginLiquidityPoolInterface _pool, address _trader, bool _isMarginCalled) public {
        require(msg.sender == address(safetyProtocol), "SP1");
        traderIsMarginCalled[_pool][_trader] = _isMarginCalled;
    }

    function setTraderHasPaidFees(MarginLiquidityPoolInterface _pool, address _trader, bool _hasPaidFees) public {
        require(msg.sender == address(safetyProtocol), "SP1");
        traderHasPaidFees[_pool][_trader] = _hasPaidFees;
    }

    function getAskSpread(MarginLiquidityPoolInterface _pool, address _baseToken, address _quoteToken) public view returns (uint) {
        uint256 spread = _pool.getAskSpread(_baseToken, _quoteToken);
        return _getSpread(spread);
    }

    function getBidSpread(MarginLiquidityPoolInterface _pool, address _baseToken, address _quoteToken) public view returns (uint) {
        uint256 spread = _pool.getBidSpread(_baseToken, _quoteToken);
        return _getSpread(spread);
    }

    // askPrice = price + askSpread
    function _getAskPrice(MarginLiquidityPoolInterface _pool, TradingPair memory _pair, uint256 _max) internal returns (Percentage.Percent memory) {
        Percentage.Percent memory price = getPrice(_pair.base, _pair.quote);

        uint256 spread = getAskSpread(_pool, address(_pair.base), address(_pair.quote));
        Percentage.Percent memory askPrice = Percentage.Percent(price.value.add(spread));

        if (_max > 0) {
            require(askPrice.value <= _max, "AP1");
        }

        return askPrice;
    }

    // bidPrice = price - askSpread
    function _getBidPrice(MarginLiquidityPoolInterface _pool, TradingPair memory _pair, uint256 _min) internal returns (Percentage.Percent memory) {
        Percentage.Percent memory price = getPrice(_pair.base, _pair.quote);
        uint256 spread = getBidSpread(_pool, address(_pair.base), address(_pair.quote));
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
        Percentage.SignedPercent memory openPrice = Percentage.signedFromFraction(-_position.leveragedDebits, _position.leveragedHeld);

        Percentage.SignedPercent memory currentPrice = _position.leverage > 0
            ? Percentage.SignedPercent(int256(_getBidPrice(_position.pool, _position.pair, _price).value))
            : Percentage.SignedPercent(int256(_getAskPrice(_position.pool, _position.pair, _price).value));

        Percentage.SignedPercent memory priceDelta = Percentage.signedSubPercent(currentPrice, openPrice);
        int256 unrealized = _position.leveragedHeld.signedMulPercent(priceDelta);

        return (getUsdValue(_position.pair.base, unrealized), Percentage.Percent(uint256(currentPrice.value)));
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
            currentSwapRate,
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
}