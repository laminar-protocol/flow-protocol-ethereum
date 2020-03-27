pragma solidity ^0.6.4;

import "@openzeppelin/upgrades/contracts/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/math/SignedSafeMath.sol";
import "@openzeppelin/contracts/math/Math.sol";

import "@nomiclabs/buidler/console.sol";

import "../libs/Percentage.sol";
import "../libs/upgrades/UpgradeOwnable.sol";
import "../libs/upgrades/UpgradeReentrancyGuard.sol";

import "../interfaces/PriceOracleInterface.sol";
import "../interfaces/MoneyMarketInterface.sol";
import "../interfaces/LiquidityPoolInterface.sol";

import "./FlowProtocolBase.sol";
import "./FlowToken.sol";


contract FlowMarginProtocol2 is FlowProtocolBase {
    using Percentage for uint256;
    using Percentage for int256;
    using SafeERC20 for IERC20;
    using SafeMath for uint256;
    using SignedSafeMath for int256;

    struct TradingPair {
        FlowToken base;
        FlowToken quote;
    }

    struct Position {
        uint256 id;
        address owner;
        LiquidityPoolInterface pool;
        TradingPair pair;
        int256 leverage;
        int256 leveragedHeld;
        int256 leveragedDebits;

        // USD value of leveraged debits on open position.
        int256 leveragedDebitsInUsd;
        int256 openMargin;

        uint256 swapRate;
        uint256 timeWhenOpened;
    }

    event PositionOpened(
        address indexed sender,
        address indexed liquidityPool,
        address baseToken,
        address indexed quoteToken,
        int256 leverage,
        int256 amount,
        uint256 price
    );
    event PositionClosed(address indexed sender, uint256 positionId, uint256 price);
    event Deposited(address indexed sender, uint256 amount);
    event Withdrew(address indexed sender, uint256 amount);
    event TraderMarginCalled(address indexed liquidityPool, address indexed sender);
    event TraderBecameSafe(address indexed liquidityPool, address indexed sender);
    event TraderLiquidated(address indexed sender);
    event LiquidityPoolMarginCalled(address indexed liquidityPool);
    event LiquidityPoolBecameSafe(address indexed liquidityPool);
    event LiquidityPoolLiquidated(address indexed liquidityPool);

    uint256 public nextPositionId;

    // positions
    mapping (uint256 => Position) private positionsById;
    mapping (LiquidityPoolInterface => mapping (address => Position[])) private positionsByPoolAndTrader;
    mapping (LiquidityPoolInterface => Position[]) internal positionsByPool;

    // protocol state per pool
    mapping (LiquidityPoolInterface => mapping(address => uint256)) public balances;
    mapping (LiquidityPoolInterface => mapping(address => bool)) public traderHasPaidFees;
    mapping (LiquidityPoolInterface => mapping(address => bool)) public traderIsMarginCalled;
    mapping (LiquidityPoolInterface => bool) public poolIsMarginCalled;
    mapping (LiquidityPoolInterface => bool) public poolHasPaidFees;
    mapping (LiquidityPoolInterface => bool) public isVerifiedPool;

    uint256 public currentSwapRate;
    Percentage.Percent public traderRiskMarginCallThreshold;
    Percentage.Percent public traderRiskLiquidateThreshold;
    uint256 public liquidityPoolENPMarginThreshold;
    uint256 public liquidityPoolELLMarginThreshold;
    uint256 public liquidityPoolENPLiquidateThreshold;
    uint256 public liquidityPoolELLLiquidateThreshold;

    uint256 constant public TRADER_MARGIN_CALL_FEE = 20 ether; // TODO
    uint256 constant public LIQUIDITY_POOL_MARGIN_CALL_FEE = 1000 ether; // TODO

    uint256 constant public TRADER_LIQUIDATION_FEE = 60 ether; // TODO
    uint256 constant public LIQUIDITY_POOL_LIQUIDATION_FEE = 3000 ether; // TODO

    modifier poolIsVerified(LiquidityPoolInterface _pool) {
        require(isVerifiedPool[_pool], "LiquidityPool is not registered!");

        _;
    }

    /**
     * @dev Initialize the FlowMarginProtocol.
     * @param _oracle The price oracle
     * @param _moneyMarket The money market.
     * @param _initialSwapRate The initial swap rate.
     * @param _initialTraderRiskMarginCallThreshold The initial trader risk threshold as percentage.
     */
    function initialize(
        PriceOracleInterface _oracle,
        MoneyMarketInterface _moneyMarket,
        uint256 _initialSwapRate,
        uint256 _initialTraderRiskMarginCallThreshold,
        uint256 _initialTraderRiskLiquidateThreshold,
        uint256 _initialLiquidityPoolENPMarginThreshold,
        uint256 _initialLiquidityPoolELLMarginThreshold,
        uint256 _initialLiquidityPoolENPLiquidateThreshold,
        uint256 _initialLiquidityPoolELLLiquidateThreshold
    ) public initializer {
        FlowProtocolBase.initialize(_oracle, _moneyMarket);

        currentSwapRate = _initialSwapRate;
        traderRiskMarginCallThreshold = Percentage.Percent(_initialTraderRiskMarginCallThreshold);
        traderRiskLiquidateThreshold = Percentage.Percent(_initialTraderRiskLiquidateThreshold);
        liquidityPoolENPMarginThreshold = _initialLiquidityPoolENPMarginThreshold;
        liquidityPoolELLMarginThreshold = _initialLiquidityPoolELLMarginThreshold;
        liquidityPoolENPLiquidateThreshold = _initialLiquidityPoolENPLiquidateThreshold;
        liquidityPoolELLLiquidateThreshold = _initialLiquidityPoolELLLiquidateThreshold;
    }

    /**
     * @dev Set new swap rate, only for the owner.
     * @param _newSwapRate The new swap rate.
     */
    function setSwapRate(uint256 _newSwapRate) public onlyOwner {
        currentSwapRate = _newSwapRate;
    }

    /**
     * @dev Set new trader risk threshold for trader margin calls, only set by owner.
     * @param _newTraderRiskMarginCallThreshold The new trader risk threshold as percentage.
     */
    function setTraderRiskMarginCallThreshold(uint256 _newTraderRiskMarginCallThreshold) public onlyOwner {
        traderRiskMarginCallThreshold = Percentage.Percent(_newTraderRiskMarginCallThreshold);
    }

    /**
     * @dev Set new trader risk threshold for trader liquidation, only set by owner.
     * @param _newTraderRiskLiquidateThreshold The new trader risk threshold as percentage.
     */
    function setTraderRiskLiquidateThreshold(uint256 _newTraderRiskLiquidateThreshold) public onlyOwner {
        traderRiskLiquidateThreshold = Percentage.Percent(_newTraderRiskLiquidateThreshold);
    }

    /**
     * @dev Set new trader risk threshold, only for the owner.
     * @param _newLiquidityPoolENPMarginThreshold The new trader risk threshold.
     */
    function setLiquidityPoolENPMarginThreshold(uint256 _newLiquidityPoolENPMarginThreshold) public onlyOwner {
        liquidityPoolENPMarginThreshold = _newLiquidityPoolENPMarginThreshold;
    }

    /**
     * @dev Set new trader risk threshold, only for the owner.
     * @param _newLiquidityPoolELLMarginThreshold The new trader risk threshold.
     */
    function setLiquidityPoolELLMarginThreshold(uint256 _newLiquidityPoolELLMarginThreshold) public onlyOwner {
        liquidityPoolELLMarginThreshold = _newLiquidityPoolELLMarginThreshold;
    }

    /**
     * @dev Set new trader risk threshold, only for the owner.
     * @param _newLiquidityPoolENPLiquidateThreshold The new trader risk threshold.
     */
    function setLiquidityPoolENPLiquidateThreshold(uint256 _newLiquidityPoolENPLiquidateThreshold) public onlyOwner {
        liquidityPoolENPLiquidateThreshold = _newLiquidityPoolENPLiquidateThreshold;
    }

    /**
     * @dev Set new trader risk threshold, only for the owner.
     * @param _newLiquidityPoolELLLiquidateThreshold The new trader risk threshold.
     */
    function setLiquidityPoolELLLiquidateThreshold(uint256 _newLiquidityPoolELLLiquidateThreshold) public onlyOwner {
        liquidityPoolELLLiquidateThreshold = _newLiquidityPoolELLLiquidateThreshold;
    }

    /**
     * @dev Register a new pool by sending the combined margin and liquidation fees.
     * @param _pool The MarginLiquidityPool.
     */
    function registerPool(LiquidityPoolInterface _pool) public nonReentrant {
        uint256 feeSum = LIQUIDITY_POOL_MARGIN_CALL_FEE.add(LIQUIDITY_POOL_LIQUIDATION_FEE);
        IERC20(moneyMarket.baseToken()).safeTransferFrom(msg.sender, address(this), feeSum);

        poolHasPaidFees[_pool] = true;
    }

    /**
     * @dev Verify a new pool, only for the owner.
     * @param _pool The MarginLiquidityPool.
     */
    function verifyPool(LiquidityPoolInterface _pool) public onlyOwner {
        require(poolHasPaidFees[_pool], "Pool has not paid fees yet!");
        isVerifiedPool[_pool] = true;
    }

    /**
     * @dev Unverify a pool, only for the owner.
     * @param _pool The MarginLiquidityPool.
     */
    function unverifyPool(LiquidityPoolInterface _pool) public onlyOwner {
        require(isVerifiedPool[_pool], "Pool is not verified!");
        isVerifiedPool[_pool] = false;
    }

    /**
     * @dev Deposit amount to pool balance.
     * @param _pool The MarginLiquidityPool.
     * @param _baseTokenAmount The base token amount to deposit.
     */
    function deposit(LiquidityPoolInterface _pool, uint256 _baseTokenAmount) public nonReentrant poolIsVerified(_pool) {
        moneyMarket.baseToken().safeTransferFrom(msg.sender, address(this), _baseTokenAmount);
        uint256 iTokenAmount = moneyMarket.mint(_baseTokenAmount);
        balances[_pool][msg.sender] = balances[_pool][msg.sender].add(iTokenAmount);

        emit Deposited(msg.sender, _baseTokenAmount);
    }

    /**
     * @dev Withdraw amount from pool balance.
     * @param _pool The MarginLiquidityPool.
     * @param _baseTokenAmount The base token amount to withdraw.
     */
    function withdraw(LiquidityPoolInterface _pool, uint256 _baseTokenAmount) public nonReentrant poolIsVerified(_pool) {
        uint256 iTokenAmount = moneyMarket.redeemBaseTokenTo(msg.sender, _baseTokenAmount);
        require(getFreeBalance(_pool, msg.sender) >= int256(iTokenAmount), "Not enough free balance to withdraw!");
        // TODO should be allowed to withdraw more than this

        balances[_pool][msg.sender] = balances[_pool][msg.sender].sub(iTokenAmount);

        emit Withdrew(msg.sender, iTokenAmount);
    }

    /**
     * @dev Open a new position with a min/max price. Set price to 0 if you want to use the current market price.
     * @param _pool The MarginLiquidityPool.
     * @param _base The base FlowToken.
     * @param _quote The quote FlowToken.
     * @param _leverage The leverage number, e.g., 20x.
     * @param _leveragedHeld The leveraged held balance.
     * @param _price The max/min price when opening the position.
     */
    function openPosition(
        LiquidityPoolInterface _pool,
        FlowToken _base,
        FlowToken _quote,
        int256 _leverage,
        int256 _leveragedHeld,
        uint256 _price
    ) public nonReentrant poolIsVerified(_pool) {
        if (!traderHasPaidFees[_pool][msg.sender]) {
            uint256 lockedFeesAmount = TRADER_MARGIN_CALL_FEE.add(TRADER_LIQUIDATION_FEE);
            IERC20(moneyMarket.baseToken()).safeTransferFrom(msg.sender, address(this), lockedFeesAmount);
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

        // TODO higher threshold?
        require(_isTraderSafe(_pool, msg.sender), "Trader has not enough balance to safely open position!");

        emit PositionOpened(
            msg.sender,
            address(_pool),
            address(_base),
            address(_quote),
            _leverage,
            _leveragedHeld,
            debitsPrice.value
        );
    }

    /**
     * @dev Close the given position with a min/max price. Set price to 0 if you want to use the current market price.
     * @param _positionId The id of the position to close.
     * @param _price The max/min price when closing the position..
     */
    function closePosition(uint256 _positionId, uint256 _price) public nonReentrant poolIsVerified(positionsById[_positionId].pool) {
        Position memory position = positionsById[_positionId];
        (int256 unrealizedPl, Percentage.Percent memory marketPrice) = _getUnrealizedPlAndMarketPriceOfPosition(position, _price);
        uint256 accumulatedSwapRate = _getAccumulatedSwapRateOfPosition(position);
        int256 balanceDelta = unrealizedPl.sub(int256(accumulatedSwapRate));

        // realizing
        uint256 balanceDeltaAbs = balanceDelta >= 0 ? uint256(balanceDelta) : uint256(-balanceDelta);

        if (balanceDelta >= 0) {
            // trader has profit
            uint256 realized = Math.min(LiquidityPoolInterface(position.pool).getLiquidity(), balanceDeltaAbs);
            LiquidityPoolInterface(position.pool).withdrawLiquidity(realized);

            uint256 iTokenAmount = moneyMarket.convertAmountFromBase(realized);
            balances[position.pool][msg.sender] = balances[position.pool][msg.sender].add(iTokenAmount);
        } else {
            // trader has loss
            uint256 realized = Math.min(FlowToken(position.pair.base).balanceOf(address(this)), balanceDeltaAbs);
            FlowToken(position.pair.base).approve(address(position.pool), realized);
            LiquidityPoolInterface(position.pool).depositLiquidity(realized);

            uint256 iTokenAmount = moneyMarket.convertAmountFromBase(realized);
            balances[position.pool][msg.sender] = balances[position.pool][msg.sender].sub(iTokenAmount);
        }

		// remove position
        delete positionsById[_positionId];
        _removePositionFromTraderList(position, _positionId);
        _removePositionFromPoolList(position, _positionId);

        emit PositionClosed(
            msg.sender,
            _positionId,
            marketPrice.value
        );
    }

    /**
     * @dev Margin call a trader, reducing his allowed trading functionality given a MarginLiquidityPool send `TRADER_MARGIN_CALL_FEE` to caller..
     * @param _pool The MarginLiquidityPool.
     * @param _trader The Trader.
     */
    function marginCallTrader(LiquidityPoolInterface _pool, address _trader) public nonReentrant poolIsVerified(_pool) {
        require(!traderIsMarginCalled[_pool][_trader], "Trader is already margin called!");
        require(!_isTraderSafe(_pool, _trader), "Trader cannot be margin called!");

        traderIsMarginCalled[_pool][_trader] = true;
        IERC20(moneyMarket.baseToken()).safeTransfer(msg.sender, TRADER_MARGIN_CALL_FEE);

        emit TraderMarginCalled(address(_pool), _trader);
    }

    /**
     * @dev Enable full trading functionality for trader, undoing a previous `marginCallTrader` given a MarginLiquidityPool.
     * @param _pool The MarginLiquidityPool.
     * @param _trader The Trader.
     */
    function makeTraderSafe(LiquidityPoolInterface _pool, address _trader) public nonReentrant poolIsVerified(_pool) {
        require(traderIsMarginCalled[_pool][_trader], "Trader is not margin called!");
        require(_isTraderSafe(_pool, _trader), "Trader cannot become safe!");

        traderIsMarginCalled[_pool][_trader] = false;
        IERC20(moneyMarket.baseToken()).safeTransferFrom(msg.sender, address(this), TRADER_MARGIN_CALL_FEE);

        emit TraderBecameSafe(address(_pool), _trader);
    }

    /**
     * @dev Margin call a given MarginLiquidityPool, reducing its allowed trading functionality for all traders send `LIQUIDITY_POOL_MARGIN_CALL_FEE` to caller..
     * @param _pool The MarginLiquidityPool.
     */
    function marginCallLiquidityPool(LiquidityPoolInterface _pool) public nonReentrant poolIsVerified(_pool) {
        require(!poolIsMarginCalled[_pool], "Pool is already margin called!");
        require(!_isPoolSafe(_pool), "Pool cannot be margin called!");

        poolIsMarginCalled[_pool] = true;
        IERC20(moneyMarket.baseToken()).safeTransfer(msg.sender, LIQUIDITY_POOL_MARGIN_CALL_FEE);

        emit LiquidityPoolMarginCalled(address(_pool));
    }

    /**
     * @dev Enable full trading functionality for pool, undoing a previous `marginCallLiquidityPool`.
     * @param _pool The MarginLiquidityPool.
     */
    function makeLiquidityPoolSafe(LiquidityPoolInterface _pool) public nonReentrant poolIsVerified(_pool) {
        require(poolIsMarginCalled[_pool], "Pool is not margin called!");
        require(_isPoolSafe(_pool), "Pool cannot become safe!");

        poolIsMarginCalled[_pool] = false;
        IERC20(moneyMarket.baseToken()).safeTransferFrom(msg.sender, address(this), LIQUIDITY_POOL_MARGIN_CALL_FEE);

        emit LiquidityPoolBecameSafe(address(_pool));
    }

    /**
     * @dev Liquidate trader due to funds running too low, close all positions and send `TRADER_LIQUIDATION_FEE` to caller.
     * @param _pool The MarginLiquidityPool.
     * @param _trader The trader address.
     */
    function liquidateTrader(LiquidityPoolInterface _pool, address _trader) public nonReentrant poolIsVerified(_pool) {
        Percentage.SignedPercent memory marginLevel = _getMarginLevel(_pool, _trader);

        require(marginLevel.value <= int256(traderRiskLiquidateThreshold.value), "Trader cannot be liquidated!");

        Position[] memory positions = positionsByPoolAndTrader[_pool][_trader];

        for (uint256 i = 0; i < positions.length; i++) {
            closePosition(positions[i].id, 0);
        }

        traderIsMarginCalled[_pool][_trader] = false;
        traderHasPaidFees[_pool][msg.sender] = false;

        IERC20(moneyMarket.baseToken()).safeTransferFrom(address(this), msg.sender, TRADER_LIQUIDATION_FEE);

        emit TraderLiquidated(_trader);
    }

    /**
    * @dev Liquidate pool due to funds running too low, distribute funds to all users and send `LIQUIDITY_POOL_LIQUIDATION_FEE` to caller.
    * @param _pool The MarginLiquidityPool.
    */
    function liquidateLiquidityPool(LiquidityPoolInterface _pool) public nonReentrant poolIsVerified(_pool) {
        // close positions as much as possible, send fee back to caller

        (Percentage.Percent memory enp, Percentage.Percent memory ell) = _getEnpAndEll(_pool);
        require(enp.value <= liquidityPoolENPLiquidateThreshold || ell.value <= liquidityPoolELLLiquidateThreshold, "Pool cannot be liquidated!");

        Position[] memory positions = positionsByPool[_pool];

        for (uint256 i = 0; i < positions.length; i++) {
            _liquidityPoolClosePosition(_pool, positions[i]);
        }

        poolIsMarginCalled[_pool] = false;

        IERC20(moneyMarket.baseToken()).safeTransferFrom(address(this), msg.sender, LIQUIDITY_POOL_LIQUIDATION_FEE);

        emit LiquidityPoolLiquidated(address(_pool));
    }

    /**
    * @dev Sum of all open margin of a given trader.
    * @param _pool The MarginLiquidityPool.
    * @param _trader The trader address.
    */
    function getMarginHeld(LiquidityPoolInterface _pool, address _trader) public view returns (int256) {
        int256 accumulatedOpenMargin = 0;
        Position[] memory positions = positionsByPoolAndTrader[_pool][_trader];

        for (uint256 i = 0; i < positions.length; i++) {
            accumulatedOpenMargin = accumulatedOpenMargin.add(positions[i].openMargin);
        }
    }

    /**
    * @dev Free balance: the balance available for withdraw.
    * @param _pool The MarginLiquidityPool.
    * @param _trader The trader address.
    */
    function getFreeBalance(LiquidityPoolInterface _pool, address _trader) public view returns (int256) {
        uint256 iTokenAmount = balances[_pool][_trader];
        uint256 baseTokenBalance = moneyMarket.convertAmountToBase(iTokenAmount);

        // free_balance = max(balance - margin_held, zero)
        return int256(baseTokenBalance).sub(getMarginHeld(_pool, _trader));
    }

    // Ensure a pool is safe, based on equity delta, opened positions or plus a new one to open.
	//
	// Return true if ensured safe or false if not.
    function _isPoolSafe(LiquidityPoolInterface _pool) internal returns (bool) {
        (Percentage.Percent memory enp, Percentage.Percent memory ell) = _getEnpAndEll(_pool);
        bool isSafe = enp.value > liquidityPoolENPMarginThreshold && ell.value > liquidityPoolELLMarginThreshold;

        return isSafe;
    }

    // Ensure a trader is safe, based on equity delta, opened positions or plus a new one to open.
	//
	// Return true if ensured safe or false if not.
    function _isTraderSafe(LiquidityPoolInterface _pool, address _trader) internal returns (bool) {
        Percentage.SignedPercent memory marginLevel = _getMarginLevel(_pool, _trader);
        bool isSafe = marginLevel.value > int256(traderRiskMarginCallThreshold.value);

        return isSafe;
    }

    // ENP and ELL. If `new_position` is `None`, return the ENP & ELL based on current positions,
    // else based on current positions plus this new one. If `equity_delta` is `None`, return
    // the ENP & ELL based on current equity of pool, else based on current equity of pool plus
    // the `equity_delta`.
    //
    // ENP - Equity to Net Position ratio of a liquidity pool.
    // ELL - Equity to Longest Leg ratio of a liquidity pool.
    function _getEnpAndEll(LiquidityPoolInterface _pool) internal returns (Percentage.Percent memory, Percentage.Percent memory) {
        int256 equity = _getEquityOfPool(_pool);

        if (equity < 0) {
            return (Percentage.Percent(0), Percentage.Percent(0));
        }

        (int256 net, int256 positive, int256 nonPositive) = (int256(0), int256(0), int256(0));

        Position[] memory positions = positionsByPool[_pool];

        for (uint256 i = 0; i < positions.length; i++) {
            int256 leveragedDebitsInUsd = positions[i].leveragedDebitsInUsd;

            net = net.add(leveragedDebitsInUsd);

            if (leveragedDebitsInUsd >= 0) {
                positive = positive.add(leveragedDebitsInUsd);
            } else {
                nonPositive = nonPositive.add(leveragedDebitsInUsd);
            }
        }

        uint256 netAbs = net >= 0 ? uint256(net) : uint256(-net);
        Percentage.Percent memory enp = netAbs == 0 ? Percentage.Percent(MAX_UINT) : uint256(equity).fromFraction(netAbs);

        uint256 longestLeg = Math.max(uint256(positive), uint256(-nonPositive));
        Percentage.Percent memory ell = longestLeg == 0 ? Percentage.Percent(MAX_UINT) : uint256(equity).fromFraction(longestLeg);

        return (enp, ell);
    }

    // Margin level of a given user.
    function _getMarginLevel(LiquidityPoolInterface _pool, address _trader) internal returns (Percentage.SignedPercent memory) {
        int256 equity = _getEquityOfTrader(_pool, _trader);
        uint256 leveragedDebitsInUsd = _getLeveragedDebitsOfTrader(_pool, _trader);

        if (leveragedDebitsInUsd == 0) {
            return Percentage.SignedPercent(MAX_INT);
        }

        return Percentage.signedFromFraction(equity, int256(leveragedDebitsInUsd));
    }

    // equityOfTrader = balance + unrealizedPl - accumulatedSwapRate
    function _getEquityOfTrader(LiquidityPoolInterface _pool, address _trader) internal returns (int256) {
        int256 unrealized = _getUnrealizedPlOfTrader(_pool, _trader);
        uint256 accumulatedSwapRates = _getSwapRatesOfTrader(_pool, _trader);
        int256 totalBalance = int256(moneyMarket.convertAmountToBase(balances[_pool][_trader])).add(unrealized);

        return totalBalance.sub(int256(accumulatedSwapRates));
    }

	// equityOfPool = liquidity - (allUnrealizedPl + allAccumulatedSwapRate)
    function _getEquityOfPool(LiquidityPoolInterface _pool) internal returns (int256) {
        uint256 liquidity = moneyMarket.convertAmountToBase(moneyMarket.iToken().balanceOf(address(_pool)));

        // allUnrealizedPl + allAccumulatedSwapRate
        int256 unrealizedPlAndRate = 0;

        Position[] memory positions = positionsByPool[_pool];

        for (uint256 i = 0; i < positions.length; i++) {
            Position memory position = positions[i];

            int256 unrealized = _getUnrealizedPlOfPosition(position);
            uint256 swapRate = _getAccumulatedSwapRateOfPosition(position);

            unrealizedPlAndRate = unrealizedPlAndRate.add(unrealized).add(int256(swapRate));
        }

        return int256(liquidity).sub(unrealizedPlAndRate);
    }

    // askPrice = price * (1 + ask_spread)
    function _getAskPrice(LiquidityPoolInterface _pool, TradingPair memory _pair, uint256 _max) internal returns (Percentage.Percent memory) {
        Percentage.Percent memory price = _getPrice(_pair.base, _pair.quote);
        uint256 spread = _pool.getAskSpread(address(_pair.quote));
        Percentage.Percent memory askPrice = Percentage.Percent(price.value.add(price.value.mul(spread).div(1e18)));

        if (_max > 0) {
            require(askPrice.value <= _max, "Ask price too high");
        }

        return askPrice;
    }

	// bidPrice = price * (1 - bid_spread)
    function _getBidPrice(LiquidityPoolInterface _pool, TradingPair memory _pair, uint256 _min) internal returns (Percentage.Percent memory) {
        Percentage.Percent memory price = _getPrice(_pair.base, _pair.quote);
        uint256 spread = _pool.getBidSpread(address(_pair.quote));
        Percentage.Percent memory bidPrice = Percentage.Percent(price.value.sub(price.value.mul(spread).div(1e18)));

        if (_min > 0) {
            require(bidPrice.value >= _min, "Bid price too low");
        }

        return bidPrice;
    }

    // Unrealized profit and loss of a given trader(USD value). It is the sum of unrealized profit and loss of all positions
	// opened by a trader.
    function _getUnrealizedPlOfTrader(LiquidityPoolInterface _pool, address _trader) internal returns (int256) {
        Position[] memory positions = positionsByPoolAndTrader[_pool][_trader];

        int256 accumulatedUnrealized = int256(0);

        for (uint256 i = 0; i < positions.length; i++) {
            accumulatedUnrealized = accumulatedUnrealized.add(_getUnrealizedPlOfPosition(positions[i]));
        }

        return accumulatedUnrealized;
    }

    function _getSwapRatesOfTrader(LiquidityPoolInterface _pool, address _trader) internal view returns (uint256) {
        Position[] memory positions = positionsByPoolAndTrader[_pool][_trader];

        uint256 accumulatedSwapRates = uint256(0);

        for (uint256 i = 0; i < positions.length; i++) {
            accumulatedSwapRates = accumulatedSwapRates.add(_getAccumulatedSwapRateOfPosition(positions[i]));
        }

        return accumulatedSwapRates;
    }

    function _getLeveragedDebitsOfTrader(LiquidityPoolInterface _pool, address _trader) internal view returns (uint256) {
        Position[] memory positions = positionsByPoolAndTrader[_pool][_trader];

        uint256 accumulatedLeveragedDebits = uint256(0);

        for (uint256 i = 0; i < positions.length; i++) {
            uint256 leveragedDebitsAbs = positions[i].leveragedDebitsInUsd >= 0
                ? uint256(positions[i].leveragedDebitsInUsd)
                : uint256(-positions[i].leveragedDebitsInUsd);
            accumulatedLeveragedDebits = accumulatedLeveragedDebits.add(leveragedDebitsAbs);
        }

        return accumulatedLeveragedDebits;
    }

    // Unrealized profit and loss of a position(USD value), based on current market price.
    // unrealizedPlOfPosition = (currentPrice - openPrice) * leveragedHeld * to_usd_price
    function _getUnrealizedPlOfPosition(Position memory _position) internal returns (int256) {
        (int256 unrealizedPl,) = _getUnrealizedPlAndMarketPriceOfPosition(_position, 0);
        return unrealizedPl;
    }

    // Returns `(unrealizedPl, marketPrice)` of a given position. If `price`, market price must fit this bound, else reverts.
    function _getUnrealizedPlAndMarketPriceOfPosition(
        Position memory _position,
        uint256 _price
    ) internal returns (int256, Percentage.Percent memory) {
        Percentage.SignedPercent memory openPrice = Percentage.signedFromFraction(_position.leveragedDebits, _position.leveragedHeld);
        Percentage.SignedPercent memory openPriceAbs = openPrice.value >= 0
            ? Percentage.SignedPercent(openPrice.value)
            : Percentage.SignedPercent(-openPrice.value);

        Percentage.SignedPercent memory currentPrice = _position.leverage > 0
            ? Percentage.SignedPercent(int256(_getBidPrice(_position.pool, _position.pair, _price).value))
            : Percentage.SignedPercent(int256(_getAskPrice(_position.pool, _position.pair, _price).value));

        Percentage.SignedPercent memory priceDelta = Percentage.signedSubPercent(currentPrice, openPriceAbs);
        int256 unrealized = _position.leveragedHeld.signedMulPercent(priceDelta);

        return (_getUsdValue(_position.pair.base, unrealized), Percentage.Percent(uint256(currentPrice.value)));
    }

    // usdValue = amount * price
    function _getUsdValue(IERC20 _currencyToken, int256 _amount) internal returns (int256) {
        Percentage.Percent memory price = _getPrice(moneyMarket.baseToken(), _currencyToken);

        return _amount.signedMulPercent(Percentage.SignedPercent(int256(price.value)));
    }

    // The price from oracle.
    function _getPrice(IERC20 _baseCurrencyId, IERC20 _quoteCurrencyId) internal returns (Percentage.Percent memory) {
        uint256 basePrice = oracle.getPrice(address(_baseCurrencyId));
        uint256 quotePrice = oracle.getPrice(address(_quoteCurrencyId));

        return Percentage.fromFraction(quotePrice, basePrice);
    }

    function _insertPosition(
        LiquidityPoolInterface _pool,
        TradingPair memory _pair,
        int256 _leverage,
        int256 _leveragedHeld,
        Percentage.Percent memory _debitsPrice
    ) internal {
        uint256 positionId = nextPositionId;
        nextPositionId++;

        (int256 heldSignum, int256 debitSignum) = _leverage > 0 ? (int256(1), int256(-1)) :  (int256(-1), int256(1));

        int256 leveragedDebits = _leveragedHeld.signedMulPercent(Percentage.SignedPercent(int256(_debitsPrice.value)));
        int256 leveragedHeldInUsd = _getUsdValue(_pair.base, leveragedDebits);
        int256 openMargin = leveragedHeldInUsd.div(_leverage);

        Position memory position = Position(
            positionId,
            msg.sender,
            _pool,
            _pair,
            _leverage,
            _leveragedHeld.mul(heldSignum),
            leveragedDebits.mul(debitSignum),
            leveragedHeldInUsd.mul(debitSignum),
            openMargin,
            currentSwapRate,
            now
        );

        positionsById[positionId] = position;
        positionsByPoolAndTrader[_pool][msg.sender].push(position);
        positionsByPool[_pool].push(position);
    }

    function _removePositionFromTraderList(Position memory _position, uint256 _positionId) internal {
        _removePositionFromList(positionsByPoolAndTrader[_position.pool][_position.owner], _positionId);
    }

    function _removePositionFromPoolList(Position memory _position, uint256 _positionId) internal {
        _removePositionFromList(positionsByPool[_position.pool], _positionId);
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

    // accumulated interest rate = rate * days
    function _getAccumulatedSwapRateOfPosition(Position memory _position) internal view returns (uint256) {
        uint256 timeDeltaInSeconds = now.sub(_position.timeWhenOpened);
        uint256 daysSinceOpen = timeDeltaInSeconds.div(1 days);
        uint256 accumulatedSwapRate = _position.swapRate.mul(daysSinceOpen);

        return accumulatedSwapRate;
    }

	// Force closure position to liquidate liquidity pool based on opened positions.
    function _liquidityPoolClosePosition(LiquidityPoolInterface _pool, Position memory _position) internal returns (uint256) {
        Percentage.Percent memory price = _getPrice(_position.pair.base, _position.pair.quote);
        uint256 spread = _position.leverage > 0
            ? _pool.getBidSpread(address(_position.pair.base))
            : _pool.getAskSpread(address(_position.pair.quote));

        uint256 leveragedHeldAbs = _position.leveragedHeld >= 0 ? uint256(_position.leveragedHeld) : uint256(-_position.leveragedHeld);
        uint256 spreadProfit = leveragedHeldAbs.mul(spread.mulPercent(price));
        uint256 spreadProfitInUsd = uint256(_getUsdValue(_position.pair.base, int256(spreadProfit)));

        uint256 penalty = spreadProfitInUsd;
        uint256 subAmount = spreadProfitInUsd.add(penalty);

        closePosition(_position.id, 0);

        uint256 realized = Math.min(_pool.getLiquidity(), subAmount);
        _pool.withdrawLiquidity(realized);

        return realized;
    }
}