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
import "./MarginFlowProtocolConfig.sol";
import "./MarginLiquidityPoolRegistry.sol";

contract MarginFlowProtocolSafety is Initializable, UpgradeReentrancyGuard {
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

    mapping (MarginLiquidityPoolInterface => mapping(address => bool)) public traderHasPaidDeposits;
    mapping (MarginLiquidityPoolInterface => mapping(address => uint256)) public traderLiquidationITokens;
    mapping (MarginLiquidityPoolInterface => mapping(address => uint256)) public traderMarginCallITokens;

    uint256 constant public TRADER_MARGIN_CALL_FEE = 4; // TODO
    uint256 constant public TRADER_LIQUIDATION_FEE = 5; // TODO

    modifier poolIsVerified(MarginLiquidityPoolInterface _pool) {
        (,,,,MarginLiquidityPoolRegistry registry,) = marginProtocol.market();
        require(
            registry.isVerifiedPool(_pool),
            "LR1"
        );

        _;
    }

    /**
     * @dev Initialize the MarginFlowProtocolSafety.
     * @param _marginProtocol The _marginProtocol.
     * @param _laminarTreasury The _laminarTreasury.
     */
    function initialize(
        MarginFlowProtocol _marginProtocol,
        address _laminarTreasury
    ) public initializer {
        UpgradeReentrancyGuard.initialize();
        marginProtocol = _marginProtocol;
        laminarTreasury = _laminarTreasury;
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

        (,,MarginFlowProtocolConfig config,,,) = marginProtocol.market();
        bool isSafe = enp.value > config.liquidityPoolENPMarginThreshold() &&
            ell.value > config.liquidityPoolELLMarginThreshold();

        return isSafe;
    }

    /**
     * @dev Pay the trader deposits
     * @param _pool The MarginLiquidityPool.
     */
    function payTraderDeposits(MarginLiquidityPoolInterface _pool)
        public
        virtual
        nonReentrant
        returns (bool)
    {
        (MoneyMarketInterface moneyMarket,,,,,) = marginProtocol.market();
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
        nonReentrant
        returns (bool)
    {
        (MoneyMarketInterface moneyMarket,,,,,) = marginProtocol.market();
        require(marginProtocol.getPositionsByPoolAndTraderLength(_pool, msg.sender) == 0, 'WD1');

        uint256 iTokenDeposits = traderMarginCallITokens[_pool][msg.sender].add(traderLiquidationITokens[_pool][msg.sender]);
        moneyMarket.redeemTo(msg.sender, iTokenDeposits);

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

        (MoneyMarketInterface moneyMarket,,,,,) = marginProtocol.market();
        uint256 marginCallFeeTraderITokens = traderMarginCallITokens[_pool][ _trader];
        moneyMarket.redeemTo(
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

        (MoneyMarketInterface moneyMarket,,,,,) = marginProtocol.market();
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

        (MoneyMarketInterface moneyMarket,,,,MarginLiquidityPoolRegistry registry,) = marginProtocol.market();
        uint256 depositedITokens = registry.marginCallPool(_pool);
        moneyMarket.redeemTo(msg.sender, depositedITokens);

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

        (MoneyMarketInterface moneyMarket,,,,MarginLiquidityPoolRegistry registry,) = marginProtocol.market();
        registry.makePoolSafe(_pool);
        moneyMarket.baseToken().safeTransferFrom(
            msg.sender,
            address(this),
            registry.LIQUIDITY_POOL_MARGIN_CALL_FEE()
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
        (MoneyMarketInterface moneyMarket,,MarginFlowProtocolConfig config,,,) = marginProtocol.market();

        require(marginLevel.value <= int256(config.traderRiskLiquidateThreshold()), "TL1");

        uint256 positionsLength = marginProtocol
            .getPositionsByPoolAndTraderLength(_pool, _trader);

        for (uint256 i = 0; i < positionsLength; i++) {
            uint256 positionId = marginProtocol.getPositionIdByPoolAndTraderAndIndex(_pool, _trader, i);
            marginProtocol.closePosition(positionId, 0);
        }

        moneyMarket.redeemTo(msg.sender, traderLiquidationITokens[_pool][ _trader]);

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
        (MoneyMarketInterface moneyMarket,,MarginFlowProtocolConfig config,,MarginLiquidityPoolRegistry registry,) = marginProtocol.market();

        // close positions as much as possible, send fee back to caller
        (
            Percentage.Percent memory enp,
            Percentage.Percent memory ell
        ) = getEnpAndEll(_pool);

        require(
            enp.value <= config.liquidityPoolENPLiquidateThreshold() ||
                ell.value <= config.liquidityPoolELLLiquidateThreshold(),
            "PL1"
        );

        marginProtocol.stopPool(_pool);

        MarginFlowProtocol.TradingPair[] memory pairs = config.getTradingPairs();

        uint256 penalty = 0;
        Percentage.Percent memory usdBasePrice = Percentage.Percent(marginProtocol.storedLiquidatedPoolBasePrices(_pool));

        for (uint256 i = 0; i < pairs.length; i++) {
            penalty = penalty.add(
                _getPairPenalty(
                    _pool,
                    pairs[i].base,
                    pairs[i].quote,
                    usdBasePrice
                )
            );
        }

        uint256 realizedPenalty = Math.min(
            _pool.getLiquidity(),
            moneyMarket.convertAmountFromBase(penalty.mul(2))
        );

        // approve might fail if MAX UINT is already approved
        try _pool.increaseAllowanceForProtocolSafety(realizedPenalty) {} catch (bytes memory) {}
        moneyMarket.iToken().safeTransferFrom(address(_pool), laminarTreasury, realizedPenalty);

        uint256 depositedITokens = registry.liquidatePool(_pool);
        moneyMarket.redeemTo(msg.sender, depositedITokens);

        emit LiquidityPoolLiquidated(address(_pool));
    }

    // Ensure a trader is safe, based on equity delta, opened positions or plus a new one to open.
    //
    // Return true if ensured safe or false if not.
    function isTraderSafe(MarginLiquidityPoolInterface _pool, address _trader) public returns (bool) {
        (,,MarginFlowProtocolConfig config,,,) = marginProtocol.market();
        Percentage.SignedPercent memory marginLevel = getMarginLevel(
            _pool,
            _trader
        );
        bool isSafe = marginLevel.value >
            int256(config.traderRiskMarginCallThreshold());

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
        (,,MarginFlowProtocolConfig config,,,) = marginProtocol.market();
        MarginFlowProtocol.TradingPair[] memory pairs = config.getTradingPairs();

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
        (,,MarginFlowProtocolConfig config,,,) = marginProtocol.market();
        MarginFlowProtocol.TradingPair[] memory pairs = config.getTradingPairs();
        int256 unrealized = 0;

        for (uint256 i = 0; i < pairs.length; i++) {
            (,,int256 unrealizedPair) = marginProtocol.getPairSafetyInfo(_pool, pairs[i]);
            unrealized = unrealized.add(unrealizedPair);
        }

        return int256(_getPoolLiquidity(_pool)).sub(unrealized);
    }

    function _getPairPenalty(
        MarginLiquidityPoolInterface _pool,
        address _base,
        address _quote,
        Percentage.Percent memory _usdBasePrice
    ) private view returns (uint256) {
        uint256 leveragedHeldsLong = marginProtocol.poolLongPositionAccPerPair(
                _pool,
                _base,
                _quote,
                MarginFlowProtocol.CurrencyType.QUOTE
        );
        uint256 leveragedHeldsShort = marginProtocol.poolShortPositionAccPerPair(
            _pool,
            _base,
            _quote,
            MarginFlowProtocol.CurrencyType.QUOTE
        );

        uint256 bidSpread = marginProtocol.storedLiquidatedPoolBidSpreads(_pool, _base, _quote);
        uint256 askSpread = marginProtocol.storedLiquidatedPoolAskSpreads(_pool, _base, _quote);
        uint256 spreadProfitLong = leveragedHeldsLong.mul(bidSpread).div(1e18);
        uint256 spreadProfitShort = leveragedHeldsShort.mul(askSpread).div(1e18);

        return spreadProfitLong.mulPercent(_usdBasePrice).add(spreadProfitShort.mulPercent(_usdBasePrice));
    }
    
    function _getPoolLiquidity(MarginLiquidityPoolInterface _pool) private view returns (uint256) {
        (MoneyMarketInterface moneyMarket,,,,,) = marginProtocol.market();
        int256 iTokensPool = int256(_pool.getLiquidity());
        int256 iTokensProtocol = marginProtocol.balances(_pool, address(_pool));
        int256 totalItokens = iTokensPool.add(iTokensProtocol);
        uint256 liquidity = totalItokens > 0 ? moneyMarket.convertAmountToBase(
            uint256(totalItokens)
        ) : 0;

        return liquidity;
    }
}