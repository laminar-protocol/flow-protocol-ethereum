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

contract MarginFlowProtocol is Initializable, UpgradeReentrancyGuard {
    using Percentage for uint256;
    using Percentage for int256;
    using SafeERC20 for IERC20;
    using SafeMath for uint256;
    using SignedSafeMath for int256;
    using MarginMarketLib for MarginMarketLib.MarketData;

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

        Percentage.SignedPercent swapRate;
        uint256 timeWhenOpened;
    }

    enum CurrencyType {
        USD,
        BASE,
        QUOTE
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

    MarginMarketLib.MarketData public market;

    // positions
    mapping (uint256 => Position) public positionsById;
    mapping (MarginLiquidityPoolInterface => mapping (address => Position[])) public positionsByPoolAndTrader;
    mapping (MarginLiquidityPoolInterface => Position[]) public positionsByPool;

    // protocol state
    mapping (MarginLiquidityPoolInterface => mapping(address => int256)) public balances;
    mapping (MarginLiquidityPoolInterface => mapping(address => mapping (address => mapping (CurrencyType => uint256)))) public poolLongPositionAccPerPair;
    mapping (MarginLiquidityPoolInterface => mapping(address => mapping (address => mapping (CurrencyType => uint256)))) public poolShortPositionAccPerPair;
    mapping (MarginLiquidityPoolInterface => mapping(address => bool)) public traderIsMarginCalled;

    // stopped pools
    mapping (MarginLiquidityPoolInterface => bool) public stoppedPools;
    mapping (MarginLiquidityPoolInterface => uint256) private storedLiquidatedPoolClosingTimes;
    mapping (MarginLiquidityPoolInterface => uint256) public storedLiquidatedPoolBasePrices;
    mapping (MarginLiquidityPoolInterface => mapping(address => uint256)) private storedLiquidatedPoolPairPrices;
    mapping (MarginLiquidityPoolInterface => mapping(address => mapping (address => uint256))) public storedLiquidatedPoolBidSpreads;
    mapping (MarginLiquidityPoolInterface => mapping(address => mapping (address => uint256))) public storedLiquidatedPoolAskSpreads;

    uint256 public nextPositionId;
    int256 constant MAX_INT = 2**256 / 2 - 1;
    uint256 constant MAX_UINT = 2**256 - 1;

    modifier poolIsVerifiedAndRunning(MarginLiquidityPoolInterface _pool) {
        require(market.liquidityPoolRegistry.isVerifiedPool(_pool), "LR1");
        require(!stoppedPools[_pool], "LR2");

        _;
    }

    /**
     * @dev Initialize the MarginFlowProtocol.
     * @param _oracle The price oracle
     * @param _moneyMarket The money market.
     * @param _protocolSafety The _protocolSafety.
     * @param _liquidityPoolRegistry The liquidity pool registry.
     */
    function initialize(
        PriceOracleInterface _oracle,
        MoneyMarketInterface _moneyMarket,
        MarginFlowProtocolConfig _protocolConfig,
        MarginFlowProtocolSafety _protocolSafety,
        MarginLiquidityPoolRegistry _liquidityPoolRegistry
    ) external initializer {
        UpgradeReentrancyGuard.initialize();
        _moneyMarket.baseToken().safeApprove(address(_moneyMarket), MAX_UINT);

        market = MarginMarketLib.MarketData(
            _moneyMarket,
            _oracle,
            _protocolConfig,
            _protocolSafety,
            _liquidityPoolRegistry,
            address(_moneyMarket.baseToken())
        );
    }

    /**
     * @dev Deposit amount to pool balance.
     * @param _pool The MarginLiquidityPool.
     * @param _baseTokenAmount The base token amount to deposit.
     */
    function deposit(MarginLiquidityPoolInterface _pool, uint256 _baseTokenAmount) external nonReentrant poolIsVerifiedAndRunning(_pool) {
        require(_baseTokenAmount > 0, "0");
        market.moneyMarket.baseToken().safeTransferFrom(msg.sender, address(this), _baseTokenAmount);
        market.moneyMarket.baseToken().approve(address(market.moneyMarket), _baseTokenAmount);
        uint256 iTokenAmount = market.moneyMarket.mint(_baseTokenAmount);
        balances[_pool][msg.sender] = balances[_pool][msg.sender].add(int256(iTokenAmount));

        emit Deposited(_pool, msg.sender, _baseTokenAmount);
    }

    /**
     * @dev Withdraw amount from pool balance.
     * @param _pool The MarginLiquidityPool.
     * @param _iTokenAmount The iToken amount to withdraw.
     */
    function withdraw(MarginLiquidityPoolInterface _pool, uint256 _iTokenAmount) external nonReentrant {
        require(market.liquidityPoolRegistry.isVerifiedPool(_pool), "LR1");
        uint256 baseTokenAmount = market.moneyMarket.redeemTo(msg.sender, _iTokenAmount);

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
        market.moneyMarket.iToken().safeTransfer(msg.sender, _iTokenAmount);
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
    ) external nonReentrant poolIsVerifiedAndRunning(_pool) {
        require(market.config.tradingPairWhitelist(address(_base), address(_quote)), "TP1");
        require(!traderIsMarginCalled[_pool][msg.sender], "OP2");
        require(!market.liquidityPoolRegistry.isMarginCalled(_pool), "OP3");
        require((_leverage >= 0 ? uint256(_leverage) : uint256(-_leverage)) >= market.config.minLeverage(), "OP4");
        require((_leverage >= 0 ? uint256(_leverage) : uint256(-_leverage)) <= market.config.maxLeverage(), "OP5");
        require(_leveragedHeld >= market.config.minLeverageAmount(), "OP6");
        require(market.protocolSafety.traderHasPaidDeposits(_pool, msg.sender), "OP7");

        Percentage.Percent memory debitsPrice = (_leverage > 0)
            ? market.getAskPrice(_pool, TradingPair(_base, _quote), _price)
            : market.getBidPrice(_pool, TradingPair(_base, _quote), _price);

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
        require(msg.sender == position.owner || msg.sender == address(market.protocolSafety), "CP1");

        (int256 unrealizedPl, Percentage.Percent memory marketPrice) = market.getUnrealizedPlAndMarketPriceOfPosition(
            position,
            _price
        );
        int256 accumulatedSwapRate = getAccumulatedSwapRateOfPosition(_positionId);
        int256 totalUnrealized = unrealizedPl.add(accumulatedSwapRate);

        _transferUnrealized(position.pool, position.owner, totalUnrealized);
        _removePosition(position, totalUnrealized, marketPrice);
    }

    /**
     * @dev Force close all positions for trader for liquidated pool.
     */
    function closePositionForLiquidatedPool(uint256 _positionId) external nonReentrant {
        Position memory position = positionsById[_positionId];
        // allow anyone to close position

        require(stoppedPools[position.pool], "CPL1");

        int256 poolLiquidityIToken = int256(position.pool.getLiquidity()).add(balances[position.pool][address(position.pool)]);

        require(poolLiquidityIToken > 0, "CPL2");

        uint256 bidSpread = storedLiquidatedPoolBidSpreads[position.pool][position.pair.base][position.pair.quote];
        uint256 askSpread = storedLiquidatedPoolAskSpreads[position.pool][position.pair.base][position.pair.quote];
        Percentage.Percent memory usdPairPrice = Percentage.fromFraction(
            storedLiquidatedPoolPairPrices[position.pool][position.pair.base],
            storedLiquidatedPoolBasePrices[position.pool]
        );
        Percentage.Percent memory marketStopPrice = Percentage.fromFraction(
            storedLiquidatedPoolPairPrices[position.pool][position.pair.quote],
            storedLiquidatedPoolPairPrices[position.pool][position.pair.base]
        );
        Percentage.Percent memory marketStopPriceWithBidSpread = Percentage.Percent(marketStopPrice.value.sub(bidSpread));
        Percentage.Percent memory marketStopPriceWithAskSpread = Percentage.Percent(marketStopPrice.value.add(askSpread));

        int256 unrealized = MarginMarketLib.getUnrealizedPlForStoppedPool(
            usdPairPrice,
            position.leverage > 0 ? marketStopPriceWithBidSpread : marketStopPriceWithAskSpread,
            position.leveragedDebits,
            position.leveragedHeld
        );

        int256 accumulatedSwapRate = MarginMarketLib.getAccumulatedSwapRateOfPositionUntilDate(
            position,
            market.config.swapRateUnit(),
            storedLiquidatedPoolClosingTimes[position.pool],
            position.leverage > 0 ? marketStopPriceWithAskSpread : marketStopPriceWithBidSpread,
            usdPairPrice
        );
        int256 totalUnrealized = unrealized.add(accumulatedSwapRate);

        _transferUnrealized(position.pool, msg.sender, totalUnrealized);
        _removePosition(position, totalUnrealized, marketStopPrice);
    }

    /**
    * @dev Get the free margin: the free margin of the trader.
    * @param _pool The MarginLiquidityPool.
    * @param _trader The trader address.
    * @return The free margin amount (int256).
    */
    function getFreeMargin(MarginLiquidityPoolInterface _pool, address _trader) public returns (uint256) {
        return market.getFreeMargin(positionsByPoolAndTrader[_pool][_trader], balances[_pool][_trader]);
    }

    // equityOfTrader = balance + unrealizedPl - accumulatedSwapRate
    function getEquityOfTrader(MarginLiquidityPoolInterface _pool, address _trader) public returns (int256) {
        return market.getEquityOfTrader(positionsByPoolAndTrader[_pool][_trader], balances[_pool][_trader]);
    }

    // Unrealized profit and loss of a position(USD value), based on current market price.
    // unrealizedPlOfPosition = (currentPrice - openPrice) * leveragedHeld * to_usd_price
    function getUnrealizedPlOfPosition(uint256 _positionId) public returns (int256) {
        (int256 unrealizedPl,) = market.getUnrealizedPlAndMarketPriceOfPosition(
            positionsById[_positionId],
            0
        );

        return unrealizedPl;
    }

    // accumulated interest rate = rate * swap unit
    function getAccumulatedSwapRateOfPosition(uint256 _positionId) public returns (int256) {
        return market.getAccumulatedSwapRateOfPosition(positionsById[_positionId]);
    }

    function getPairSafetyInfo(MarginLiquidityPoolInterface _pool, TradingPair calldata _pair) external returns (uint256, uint256, int256) {        
        return market.getPairSafetyInfo(
            _pool,
            _pair,
            [
                poolLongPositionAccPerPair[_pool][_pair.base][_pair.quote][CurrencyType.BASE],
                poolShortPositionAccPerPair[_pool][_pair.base][_pair.quote][CurrencyType.BASE],
                poolLongPositionAccPerPair[_pool][_pair.base][_pair.quote][CurrencyType.QUOTE],
                poolShortPositionAccPerPair[_pool][_pair.base][_pair.quote][CurrencyType.QUOTE]
            ],
            poolLongPositionAccPerPair[_pool][_pair.base][_pair.quote][CurrencyType.USD],
            poolShortPositionAccPerPair[_pool][_pair.base][_pair.quote][CurrencyType.USD]
        );
    }

    /// View functions

    /**
    * @dev Sum of all margin held of a given trader.
    * @param _pool The MarginLiquidityPool.
    * @param _trader The trader address.
    * @return The margin held sum.
    */
    function getMarginHeld(MarginLiquidityPoolInterface _pool, address _trader) external view returns (uint256) {
        return MarginMarketLib.getMarginHeld(positionsByPoolAndTrader[_pool][_trader]);
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

    /// Safety protocol functions

    function stopPool(MarginLiquidityPoolInterface _pool) external {
        require(msg.sender == address(market.protocolSafety), "SP1");
        stoppedPools[_pool] = true;

        storedLiquidatedPoolClosingTimes[_pool] = now;
        storedLiquidatedPoolBasePrices[_pool] = market.getPrice(address(market.moneyMarket.baseToken()));

        TradingPair[] memory tradingPairs = market.config.getTradingPairs();

        for (uint256 i = 0; i < tradingPairs.length; i++) {
            address base = tradingPairs[i].base;
            address quote = tradingPairs[i].quote;
            storedLiquidatedPoolPairPrices[_pool][base] = market.getPrice(base);
            storedLiquidatedPoolPairPrices[_pool][quote] = market.getPrice(quote);
            storedLiquidatedPoolBidSpreads[_pool][base][quote] = market.getBidSpread(_pool, base, quote);
            storedLiquidatedPoolAskSpreads[_pool][base][quote] = market.getAskSpread(_pool, base, quote);
        }
    }

    function setTraderIsMarginCalled(MarginLiquidityPoolInterface _pool, address _trader, bool _isMarginCalled) external {
        require(msg.sender == address(market.protocolSafety), "SP1");
        traderIsMarginCalled[_pool][_trader] = _isMarginCalled;
    }    
    
    /// Internal functions

    function _insertPosition(
        MarginLiquidityPoolInterface _pool,
        TradingPair memory _pair,
        int256 _leverage,
        uint256 _leveragedHeld,
        Percentage.Percent memory _debitsPrice
    ) internal {
        int256 heldSignum = _leverage > 0 ? int256(1) :  int256(-1);
        uint256 leveragedDebits = _leveragedHeld.mulPercent(_debitsPrice);
        uint256 leveragedDebitsInUsd = uint256(
            market.getUsdValue(_pair.base, int256(leveragedDebits))
        );
        uint256 marginHeld = uint256(
            int256(leveragedDebitsInUsd)
                .mul(_leverage > 0 ? int256(1) :  int256(-1))
                .div(_leverage)
        );

        if (_leverage > 0) {
            poolLongPositionAccPerPair[_pool][_pair.base][_pair.quote][CurrencyType.QUOTE] = poolLongPositionAccPerPair[_pool][_pair.base][_pair.quote][CurrencyType.QUOTE]
                .add(_leveragedHeld);
            poolLongPositionAccPerPair[_pool][_pair.base][_pair.quote][CurrencyType.BASE] = poolLongPositionAccPerPair[_pool][_pair.base][_pair.quote][CurrencyType.BASE]
                .add(leveragedDebits);
            poolLongPositionAccPerPair[_pool][_pair.base][_pair.quote][CurrencyType.USD] = poolLongPositionAccPerPair[_pool][_pair.base][_pair.quote][CurrencyType.USD]
                .add(leveragedDebitsInUsd);
        } else {
            poolShortPositionAccPerPair[_pool][_pair.base][_pair.quote][CurrencyType.QUOTE] = poolShortPositionAccPerPair[_pool][_pair.base][_pair.quote][CurrencyType.QUOTE]
                .add(_leveragedHeld);
            poolShortPositionAccPerPair[_pool][_pair.base][_pair.quote][CurrencyType.BASE] = poolShortPositionAccPerPair[_pool][_pair.base][_pair.quote][CurrencyType.BASE]
                .add(leveragedDebits);
            poolShortPositionAccPerPair[_pool][_pair.base][_pair.quote][CurrencyType.USD] = poolShortPositionAccPerPair[_pool][_pair.base][_pair.quote][CurrencyType.USD]
                .add(leveragedDebitsInUsd);
        }

        Position memory position = _createPosition(
            _pool,
            _pair,
            _leverage,
            _leveragedHeld,
            leveragedDebits,
            leveragedDebitsInUsd,
            marginHeld
        );

        require(getFreeMargin(_pool, msg.sender) >= marginHeld, "OP1");

        positionsById[position.id] = position;
        positionsByPoolAndTrader[_pool][msg.sender].push(position);
        positionsByPool[_pool].push(position);
        nextPositionId++;

        emit PositionOpened(
            position.id,
            msg.sender,
            address(_pool),
            _pair.base,
            _pair.quote,
            _leverage,
            int256(leveragedDebitsInUsd).mul(heldSignum.mul(-1)),
            _debitsPrice.value
        );
    }

    function _createPosition(
        MarginLiquidityPoolInterface _pool,
        TradingPair memory _pair,
        int256 _leverage,
        uint256 _leveragedHeld,
        uint256 _leveragedDebits,
        uint256 _leveragedHeldInUsd,
        uint256 _marginHeld
    ) private view returns (Position memory) {
        int256 heldSignum = _leverage > 0 ? int256(1) :  int256(-1);

        return Position(
            nextPositionId,
            msg.sender,
            _pool,
            _pair,
            _leverage,
            int256(_leveragedHeld).mul(heldSignum),
            int256(_leveragedDebits).mul(heldSignum.mul(-1)),
            int256(_leveragedHeldInUsd).mul(heldSignum.mul(-1)),
            _marginHeld,
            Percentage.SignedPercent(
                market.config.currentSwapRates(
                    _pair.base,
                    _pair.quote,
                    _leverage > 0 ? MarginFlowProtocolConfig.PositionType.LONG : MarginFlowProtocolConfig.PositionType.SHORT
                )
            ),
            now
        );
    }

    function _removePositionFromList(Position[] storage positions, uint256 _positionId) internal {
        for (uint256 i = 0; i < positions.length; i++) { // TODO pass correct index to minimise gas
            if (positions[i].id == _positionId) {
                positions[i] = positions[positions.length.sub(1)];
                positions.pop();

                return;
            }
        }
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

        _removePositionFromList(positionsByPoolAndTrader[_position.pool][_position.owner], _position.id);
        _removePositionFromList(positionsByPool[_position.pool], _position.id);
        delete positionsById[_position.id];

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

    function _transferUnrealized(MarginLiquidityPoolInterface _pool, address _owner, int256 _unrealized) private {
        if (_unrealized >= 0) { // trader has profit, max realizable is the pool's liquidity
            int256 storedITokenBalance = balances[_pool][address(_pool)];
            int256 poolLiquidityIToken = int256(_pool.getLiquidity()).add(storedITokenBalance);
            uint256 realizedIToken = market.moneyMarket.convertAmountFromBase(uint256(_unrealized));
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
            uint256 realizedIToken = market.moneyMarket.convertAmountFromBase(realized);

            _transferItokenBalanceToPool(_pool, _owner, realizedIToken);
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
            market.moneyMarket.iToken().safeTransferFrom(address(_pool), address(this), transferITokenAmount);
            balances[_pool][address(_pool)] = 0;
        }
    }

    function _transferItokenBalance(MarginLiquidityPoolInterface _pool, address from, address to, uint256 amount) private {
        balances[_pool][from] = balances[_pool][from].sub(int256(amount));
        balances[_pool][to] = balances[_pool][to].add(int256(amount));
    }
}