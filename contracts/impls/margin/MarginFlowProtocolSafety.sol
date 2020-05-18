pragma solidity ^0.6.4;
pragma experimental ABIEncoderV2;

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
import "./MarginFlowProtocol.sol";
import "./MarginLiquidityPoolRegistry.sol";

contract MarginFlowProtocolSafety is Initializable, UpgradeOwnable, UpgradeReentrancyGuard {
    using Percentage for uint256;
    using Percentage for int256;
    using SafeERC20 for IERC20;
    using SafeMath for uint256;
    using SignedSafeMath for int256;

    uint256 constant MAX_UINT = 2**256 - 1;
    int256 constant MAX_INT = 2**256 / 2 - 1;

    event TraderMarginCalled(
        address indexed liquidityPool,
        address indexed sender
    );
    event TraderBecameSafe(
        address indexed liquidityPool,
        address indexed sender
    );
    event TraderLiquidated(address indexed sender);
    event LiquidityPoolMarginCalled(address indexed liquidityPool);
    event LiquidityPoolBecameSafe(address indexed liquidityPool);
    event LiquidityPoolLiquidated(address indexed liquidityPool);

    address public laminarTreasury;
    MarginFlowProtocol private marginProtocol;

    Percentage.Percent public traderRiskMarginCallThreshold;
    Percentage.Percent public traderRiskLiquidateThreshold;
    uint256 public liquidityPoolENPMarginThreshold;
    uint256 public liquidityPoolELLMarginThreshold;
    uint256 public liquidityPoolENPLiquidateThreshold;
    uint256 public liquidityPoolELLLiquidateThreshold;

    mapping (MarginLiquidityPoolInterface => mapping(address => bool)) public traderHasPaidDeposits;
    mapping (MarginLiquidityPoolInterface => mapping(address => uint256)) public traderLiquidationITokens;
    mapping (MarginLiquidityPoolInterface => mapping(address => uint256)) public traderMarginCallITokens;

    uint256 constant public TRADER_MARGIN_CALL_FEE = 4; // TODO
    uint256 constant public TRADER_LIQUIDATION_FEE = 5; // TODO

    modifier poolIsVerified(MarginLiquidityPoolInterface _pool) {
        require(
            marginProtocol.liquidityPoolRegistry().isVerifiedPool(_pool),
            "LR1"
        );

        _;
    }

    /**
     * @dev Initialize the MarginFlowProtocolSafety.
     * @param _marginProtocol The _marginProtocol.
     * @param _laminarTreasury The _laminarTreasury.
     * @param _initialTraderRiskMarginCallThreshold The initial trader risk margin call threshold as percentage.
     * @param _initialTraderRiskLiquidateThreshold The initial trader risk liquidate threshold as percentage.
     * @param _initialLiquidityPoolENPMarginThreshold The initial pool ENP margin threshold.
     * @param _initialLiquidityPoolELLMarginThreshold The initial pool ELL margin threshold.
     * @param _initialLiquidityPoolENPLiquidateThreshold The initial pool ENP liquidate threshold.
     * @param _initialLiquidityPoolELLLiquidateThreshold The initial pool ELL liquidate threshold.
     */
    function initialize(
        MarginFlowProtocol _marginProtocol,
        address _laminarTreasury,
        uint256 _initialTraderRiskMarginCallThreshold,
        uint256 _initialTraderRiskLiquidateThreshold,
        uint256 _initialLiquidityPoolENPMarginThreshold,
        uint256 _initialLiquidityPoolELLMarginThreshold,
        uint256 _initialLiquidityPoolENPLiquidateThreshold,
        uint256 _initialLiquidityPoolELLLiquidateThreshold
    ) public initializer {
        UpgradeOwnable.initialize(msg.sender);
        UpgradeReentrancyGuard.initialize();

        marginProtocol = _marginProtocol;
        laminarTreasury = _laminarTreasury;
        traderRiskMarginCallThreshold = Percentage.Percent(
            _initialTraderRiskMarginCallThreshold
        );
        traderRiskLiquidateThreshold = Percentage.Percent(
            _initialTraderRiskLiquidateThreshold
        );
        liquidityPoolENPMarginThreshold = _initialLiquidityPoolENPMarginThreshold;
        liquidityPoolELLMarginThreshold = _initialLiquidityPoolELLMarginThreshold;
        liquidityPoolENPLiquidateThreshold = _initialLiquidityPoolENPLiquidateThreshold;
        liquidityPoolELLLiquidateThreshold = _initialLiquidityPoolELLLiquidateThreshold;
    }

    /**
     * @dev Set new trader risk threshold for trader margin calls, only set by owner.
     * @param _newTraderRiskMarginCallThreshold The new trader risk threshold as percentage.
     */
    function setTraderRiskMarginCallThreshold(
        uint256 _newTraderRiskMarginCallThreshold
    ) external onlyOwner {
        require(_newTraderRiskMarginCallThreshold > 0, "0");
        traderRiskMarginCallThreshold = Percentage.Percent(
            _newTraderRiskMarginCallThreshold
        );
    }

    /**
     * @dev Set new trader risk threshold for trader liquidation, only set by owner.
     * @param _newTraderRiskLiquidateThreshold The new trader risk threshold as percentage.
     */
    function setTraderRiskLiquidateThreshold(
        uint256 _newTraderRiskLiquidateThreshold
    ) external onlyOwner {
        require(_newTraderRiskLiquidateThreshold > 0, "0");
        traderRiskLiquidateThreshold = Percentage.Percent(
            _newTraderRiskLiquidateThreshold
        );
    }

    /**
     * @dev Set new trader risk threshold, only for the owner.
     * @param _newLiquidityPoolENPMarginThreshold The new trader risk threshold.
     */
    function setLiquidityPoolENPMarginThreshold(
        uint256 _newLiquidityPoolENPMarginThreshold
    ) external onlyOwner {
        require(_newLiquidityPoolENPMarginThreshold > 0, "0");
        liquidityPoolENPMarginThreshold = _newLiquidityPoolENPMarginThreshold;
    }

    /**
     * @dev Set new trader risk threshold, only for the owner.
     * @param _newLiquidityPoolELLMarginThreshold The new trader risk threshold.
     */
    function setLiquidityPoolELLMarginThreshold(
        uint256 _newLiquidityPoolELLMarginThreshold
    ) external onlyOwner {
        require(_newLiquidityPoolELLMarginThreshold > 0, "0");
        liquidityPoolELLMarginThreshold = _newLiquidityPoolELLMarginThreshold;
    }

    /**
     * @dev Set new trader risk threshold, only for the owner.
     * @param _newLiquidityPoolENPLiquidateThreshold The new trader risk threshold.
     */
    function setLiquidityPoolENPLiquidateThreshold(
        uint256 _newLiquidityPoolENPLiquidateThreshold
    ) external onlyOwner {
        require(_newLiquidityPoolENPLiquidateThreshold > 0, "0");
        liquidityPoolENPLiquidateThreshold = _newLiquidityPoolENPLiquidateThreshold;
    }

    /**
     * @dev Set new trader risk threshold, only for the owner.
     * @param _newLiquidityPoolELLLiquidateThreshold The new trader risk threshold.
     */
    function setLiquidityPoolELLLiquidateThreshold(
        uint256 _newLiquidityPoolELLLiquidateThreshold
    ) external onlyOwner {
        require(_newLiquidityPoolELLLiquidateThreshold > 0, "0");
        liquidityPoolELLLiquidateThreshold = _newLiquidityPoolELLLiquidateThreshold;
    }

    /**
     * @dev Ensure a pool is safe, based on equity delta, opened positions or plus a new one to open.
     * @param _pool The MarginLiquidityPool.
     * @return Boolean: true if ensured safe or false if not.
     */
    function isPoolSafe(MarginLiquidityPoolInterface _pool)
        public
        returns (bool)
    {
        (
            Percentage.Percent memory enp,
            Percentage.Percent memory ell
        ) = getEnpAndEll(_pool);
        bool isSafe = enp.value > liquidityPoolENPMarginThreshold &&
            ell.value > liquidityPoolELLMarginThreshold;

        return isSafe;
    }

    /**
     * @dev Pay the trader deposits
     * @param _pool The MarginLiquidityPool.
     */
    function payTraderDeposits(MarginLiquidityPoolInterface _pool)
        public
        virtual
        returns (bool)
    {
        MoneyMarketInterface moneyMarket = marginProtocol.moneyMarket();
        uint256 lockedFeesAmount = TRADER_MARGIN_CALL_FEE.add(TRADER_LIQUIDATION_FEE);

        moneyMarket.baseToken().safeTransferFrom(msg.sender, address(this), lockedFeesAmount);
        moneyMarket.baseToken().approve(address(moneyMarket), lockedFeesAmount);

        traderMarginCallITokens[_pool][msg.sender] = moneyMarket.mint(TRADER_MARGIN_CALL_FEE);
        traderLiquidationITokens[_pool][msg.sender] = moneyMarket.mint(TRADER_LIQUIDATION_FEE);        
        traderHasPaidDeposits[_pool][msg.sender] = true;
    }

    /**
     * @dev Withdraw the trader deposits, only possible when no positions are open.
     * @param _pool The MarginLiquidityPool.
     */
    function withdrawTraderDeposits(MarginLiquidityPoolInterface _pool)
        public
        virtual
        returns (bool)
    {
        require(marginProtocol.getPositionsByPoolAndTraderLength(_pool, msg.sender) == 0, 'WD1');

        uint256 iTokenDeposits = traderMarginCallITokens[_pool][msg.sender].add(traderLiquidationITokens[_pool][msg.sender]);
        marginProtocol.moneyMarket().redeemTo(msg.sender, iTokenDeposits);

        traderMarginCallITokens[_pool][msg.sender] = 0;
        traderLiquidationITokens[_pool][msg.sender] = 0;       
        traderHasPaidDeposits[_pool][msg.sender] = false;
    }

    /**
     * @dev Margin call a trader, reducing his allowed trading functionality given a MarginLiquidityPool send `TRADER_MARGIN_CALL_FEE` to caller..
     * @param _pool The MarginLiquidityPool.
     * @param _trader The Trader.
     */
    function marginCallTrader(
        MarginLiquidityPoolInterface _pool,
        address _trader
    ) external nonReentrant poolIsVerified(_pool) {
        require(!marginProtocol.traderIsMarginCalled(_pool, _trader), "TM1");
        require(!isTraderSafe(_pool, _trader), "TM2");

        uint256 marginCallFeeTraderITokens = traderMarginCallITokens[_pool][ _trader];
        marginProtocol.moneyMarket().redeemTo(
            msg.sender,
            marginCallFeeTraderITokens
        );

        marginProtocol.setTraderIsMarginCalled(_pool, _trader, true);
        traderMarginCallITokens[_pool][ _trader] = 0;

        emit TraderMarginCalled(address(_pool), _trader);
    }

    /**
     * @dev Enable full trading functionality for trader, undoing a previous `marginCallTrader` given a MarginLiquidityPool.
     * @param _pool The MarginLiquidityPool.
     * @param _trader The Trader.
     */
    function makeTraderSafe(MarginLiquidityPoolInterface _pool, address _trader)
        external
        nonReentrant
        poolIsVerified(_pool)
    {
        require(marginProtocol.traderIsMarginCalled(_pool, _trader), "TS1");
        require(isTraderSafe(_pool, _trader), "TS2");

        MoneyMarketInterface moneyMarket = marginProtocol.moneyMarket();
        moneyMarket.baseToken().safeTransferFrom(msg.sender, address(this), TRADER_MARGIN_CALL_FEE);
        moneyMarket.baseToken().approve(address(moneyMarket), TRADER_MARGIN_CALL_FEE);
        traderMarginCallITokens[_pool][_trader] = moneyMarket.mint(TRADER_MARGIN_CALL_FEE);

        marginProtocol.setTraderIsMarginCalled(_pool, _trader, false);

        emit TraderBecameSafe(address(_pool), _trader);
    }

    /**
     * @dev Margin call a given MarginLiquidityPool, reducing its allowed trading functionality for all traders send `LIQUIDITY_POOL_MARGIN_CALL_FEE` to caller..
     * @param _pool The MarginLiquidityPool.
     */
    function marginCallLiquidityPool(MarginLiquidityPoolInterface _pool)
        external
        nonReentrant
        poolIsVerified(_pool)
    {
        require(!isPoolSafe(_pool), "PM2");

        uint256 depositedITokens = marginProtocol.liquidityPoolRegistry().marginCallPool(_pool);
        marginProtocol.moneyMarket().redeemTo(msg.sender, depositedITokens);

        emit LiquidityPoolMarginCalled(address(_pool));
    }

    /**
     * @dev Enable full trading functionality for pool, undoing a previous `marginCallLiquidityPool`.
     * @param _pool The MarginLiquidityPool.
     */
    function makeLiquidityPoolSafe(MarginLiquidityPoolInterface _pool)
        external
        nonReentrant
        poolIsVerified(_pool)
    {
        require(isPoolSafe(_pool), "PS2");

        marginProtocol.liquidityPoolRegistry().makePoolSafe(_pool);
        marginProtocol.moneyMarket().baseToken().safeTransferFrom(
            msg.sender,
            address(this),
            marginProtocol
                .liquidityPoolRegistry()
                .LIQUIDITY_POOL_MARGIN_CALL_FEE()
        );

        emit LiquidityPoolBecameSafe(address(_pool));
    }

    /**
     * @dev Liquidate trader due to funds running too low, close all positions and send `TRADER_LIQUIDATION_FEE` to caller.
     * @param _pool The MarginLiquidityPool.
     * @param _trader The trader address.
     */
    function liquidateTrader(
        MarginLiquidityPoolInterface _pool,
        address _trader
    ) external nonReentrant poolIsVerified(_pool) {
        Percentage.SignedPercent memory marginLevel = getMarginLevel(_pool, _trader);

        require(marginLevel.value <= int256(traderRiskLiquidateThreshold.value), "TL1");

        uint256 positionsLength = marginProtocol
            .getPositionsByPoolAndTraderLength(_pool, _trader);

        for (uint256 i = 0; i < positionsLength; i++) {
            uint256 positionId = marginProtocol.getPositionIdByPoolAndTraderAndIndex(_pool, _trader, i);
            marginProtocol.closePosition(positionId, 0);
        }

        marginProtocol.moneyMarket().redeemTo(msg.sender, traderLiquidationITokens[_pool][ _trader]);

        marginProtocol.setTraderIsMarginCalled(_pool, _trader, false);
        traderHasPaidDeposits[_pool][_trader] = false;
        traderLiquidationITokens[_pool][_trader] = 0;

        emit TraderLiquidated(_trader);
    }

    /**
     * @dev Liquidate pool due to funds running too low, distribute funds to all users and send `LIQUIDITY_POOL_LIQUIDATION_FEE` to caller.
     * @param _pool The MarginLiquidityPool.
     */
    function liquidateLiquidityPool(MarginLiquidityPoolInterface _pool)
        external
        nonReentrant
        poolIsVerified(_pool)
    {
        // close positions as much as possible, send fee back to caller
        (
            Percentage.Percent memory enp,
            Percentage.Percent memory ell
        ) = getEnpAndEll(_pool);

        require(
            enp.value <= liquidityPoolENPLiquidateThreshold ||
                ell.value <= liquidityPoolELLLiquidateThreshold,
            "PL1"
        );

        marginProtocol.stopPool(_pool);

        MoneyMarketInterface moneyMarket = marginProtocol.moneyMarket();
        MarginFlowProtocol.TradingPair[] memory pairs = marginProtocol.getTradingPairs();

        uint256 penalty = 0;
        Percentage.Percent memory usdBasePrice = Percentage.Percent(marginProtocol.storedLiquidatedPoolBasePrices(_pool));

        for (uint256 i = 0; i < pairs.length; i++) {
            uint256 leveragedDebitsLong = marginProtocol.poolLongPositionAccPerPair(
                    _pool,
                    pairs[i].base,
                    pairs[i].quote,
                    MarginFlowProtocol.CurrencyType.BASE
            );
            uint256 leveragedDebitsShort = marginProtocol.poolShortPositionAccPerPair(
                _pool,
                pairs[i].base,
                pairs[i].quote,
                MarginFlowProtocol.CurrencyType.BASE
            );

            uint256 bidSpread = marginProtocol.storedLiquidatedPoolBidPrices(_pool, pairs[i].base, pairs[i].quote);
            uint256 askSpread = marginProtocol.storedLiquidatedPoolAskPrices(_pool, pairs[i].base, pairs[i].quote);
            uint256 spreadProfitLong = leveragedDebitsLong.mul(bidSpread).div(1e18);
            uint256 spreadProfitShort = leveragedDebitsShort.mul(askSpread).div(1e18);

            penalty = penalty
                .add(spreadProfitLong.mulPercent(usdBasePrice))
                .add(spreadProfitShort.mulPercent(usdBasePrice));
        }

        uint256 penaltyITokens = moneyMarket.convertAmountFromBase(penalty.mul(2));
        uint256 realizedPenalty = Math.min(_pool.getLiquidity(), penaltyITokens);

        // approve might fail if MAX UINT is already approved
        try _pool.increaseAllowanceForProtocolSafety(realizedPenalty) {} catch (bytes memory) {}
        moneyMarket.iToken().safeTransferFrom(address(_pool), laminarTreasury, realizedPenalty);

        uint256 depositedITokens = marginProtocol.liquidityPoolRegistry().liquidatePool(_pool);
        moneyMarket.redeemTo(msg.sender, depositedITokens);

        emit LiquidityPoolLiquidated(address(_pool));
    }

    // Ensure a trader is safe, based on equity delta, opened positions or plus a new one to open.
    //
    // Return true if ensured safe or false if not.
    function isTraderSafe(MarginLiquidityPoolInterface _pool, address _trader) public returns (bool) {
        Percentage.SignedPercent memory marginLevel = getMarginLevel(
            _pool,
            _trader
        );
        bool isSafe = marginLevel.value >
            int256(traderRiskMarginCallThreshold.value);

        return isSafe;
    }

    // Margin level of a given user.
    function getMarginLevel(MarginLiquidityPoolInterface _pool, address _trader) public returns (Percentage.SignedPercent memory) {
        int256 equity = marginProtocol.getEquityOfTrader(_pool, _trader);
        uint256 leveragedDebitsInUsd = getLeveragedDebitsOfTrader(
            _pool,
            _trader
        );

        if (leveragedDebitsInUsd == 0) {
            return Percentage.SignedPercent(MAX_INT);
        }

        return
            Percentage.signedFromFraction(equity, int256(leveragedDebitsInUsd));
    }

    // ENP and ELL. If `new_position` is `None`, return the ENP & ELL based on current positions,
    // else based on current positions plus this new one. If `equity_delta` is `None`, return
    // the ENP & ELL based on current equity of pool, else based on current equity of pool plus
    // the `equity_delta`.
    //
    // ENP - Equity to Net Position ratio of a liquidity pool.
    // ELL - Equity to Longest Leg ratio of a liquidity pool.
    function getEnpAndEll(MarginLiquidityPoolInterface _pool) public returns (Percentage.Percent memory, Percentage.Percent memory) {
        MarginFlowProtocol.TradingPair[] memory pairs = marginProtocol.getTradingPairs();

        uint256 net = 0;
        uint256 longestLeg = 0;
        int256 unrealized = 0;

        for (uint256 i = 0; i < pairs.length; i++) {
            (uint256 netPair, uint256 longestLegPair, int256 unrealizedPair) = marginProtocol.getPairSafetyInfo(_pool, pairs[i]);
            net = net.add(netPair);
            longestLeg = longestLeg.add(longestLegPair);
            unrealized = unrealized.add(unrealizedPair);
        }

        int256 equity = int256(_getPoolLiquidity(_pool)).sub(unrealized);

        if (equity < 0) {
            return (Percentage.Percent(0), Percentage.Percent(0));
        }

        uint256 netAbs = net >= 0 ? uint256(net) : uint256(-net);
        Percentage.Percent memory enp = netAbs == 0
            ? Percentage.Percent(MAX_UINT)
            : uint256(equity).fromFraction(netAbs);

        Percentage.Percent memory ell = longestLeg == 0
            ? Percentage.Percent(MAX_UINT)
            : uint256(equity).fromFraction(longestLeg);

        return (enp, ell);
    }

    function _getPoolLiquidity(MarginLiquidityPoolInterface _pool) private view returns (uint256) {
        int256 iTokensPool = int256(marginProtocol.moneyMarket().iToken().balanceOf(address(_pool)));
        int256 iTokensProtocol = marginProtocol.balances(_pool, address(_pool));
        int256 totalItokens = iTokensPool.add(iTokensProtocol);
        uint256 liquidity = totalItokens > 0 ? marginProtocol.moneyMarket().convertAmountToBase(
            uint256(totalItokens)
        ) : 0;

        return liquidity;
    }

    function getLeveragedDebitsOfTrader(MarginLiquidityPoolInterface _pool, address _trader) public view returns (uint256) {
        uint256 accumulatedLeveragedDebits = uint256(0);
        uint256 positionsLength = marginProtocol
            .getPositionsByPoolAndTraderLength(_pool, _trader);

        for (uint256 i = 0; i < positionsLength; i++) {
            int256 leveragedDebitsInUsd = marginProtocol
                .getLeveragedDebitsByPoolAndTraderAndIndex(_pool, _trader, i);
            uint256 leveragedDebitsAbs = leveragedDebitsInUsd >= 0
                ? uint256(leveragedDebitsInUsd)
                : uint256(-leveragedDebitsInUsd);
            accumulatedLeveragedDebits = accumulatedLeveragedDebits.add(
                leveragedDebitsAbs
            );
        }

        return accumulatedLeveragedDebits;
    }

    // equityOfPool = liquidity - (allUnrealizedPl + allAccumulatedSwapRate (left out swap rates))
    function getEquityOfPool(MarginLiquidityPoolInterface _pool) public returns (int256) {
        MarginFlowProtocol.TradingPair[] memory pairs = marginProtocol.getTradingPairs();
        int256 unrealized = 0;

        for (uint256 i = 0; i < pairs.length; i++) {
            (,,int256 unrealizedPair) = marginProtocol.getPairSafetyInfo(_pool, pairs[i]);
            unrealized = unrealized.add(unrealizedPair);
        }

        return int256(_getPoolLiquidity(_pool)).sub(unrealized);
    }
}