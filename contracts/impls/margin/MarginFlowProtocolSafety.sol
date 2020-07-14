// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2; // not experimental anymore

import "@openzeppelin/contracts-ethereum-package/contracts/Initializable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/math/SignedSafeMath.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/math/Math.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/access/Ownable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/utils/ReentrancyGuard.sol";

import "../../libs/Percentage.sol";

import "../../interfaces/PriceOracleInterface.sol";
import "../../interfaces/MoneyMarketInterface.sol";
import "../../interfaces/MarginLiquidityPoolInterface.sol";

import "../FlowProtocolBase.sol";
import "./MarginFlowProtocol.sol";
import "./MarginFlowProtocolConfig.sol";
import "./MarginLiquidityPoolRegistry.sol";
import "./MarginFlowProtocolAccPositions.sol";
import "./MarginMarketLib.sol";

contract MarginFlowProtocolSafety is Initializable, ReentrancyGuardUpgradeSafe {
    using Percentage for uint256;
    using Percentage for int256;
    using SafeERC20 for IERC20;
    using SafeMath for uint256;
    using SignedSafeMath for int256;
    using MarginMarketLib for MarginMarketLib.MarketData;

    uint256 private constant MAX_UINT = type(uint256).max;
    int256 private constant MAX_INT = type(int256).max;

    event TraderMarginCalled(address indexed liquidityPool, address indexed sender);
    event TraderBecameSafe(address indexed liquidityPool, address indexed sender);
    event TraderLiquidated(address indexed sender);
    event LiquidityPoolMarginCalled(address indexed liquidityPool);
    event LiquidityPoolBecameSafe(address indexed liquidityPool);
    event LiquidityPoolLiquidated(address indexed liquidityPool);

    address public laminarTreasury;
    MarginMarketLib.MarketData private market;

    mapping(MarginLiquidityPoolInterface => mapping(address => bool)) public traderHasPaidDeposits;
    mapping(MarginLiquidityPoolInterface => mapping(address => uint256)) public traderLiquidationITokens;
    mapping(MarginLiquidityPoolInterface => mapping(address => uint256)) public traderMarginCallITokens;

    modifier poolIsVerified(MarginLiquidityPoolInterface _pool) {
        require(market.liquidityPoolRegistry.isVerifiedPool(_pool), "LR1");

        _;
    }

    /**
     * @dev Initialize the MarginFlowProtocolSafety.
     * @param _market The market data.
     * @param _laminarTreasury The laminarTreasury.
     */
    function initialize(MarginMarketLib.MarketData memory _market, address _laminarTreasury) public initializer {
        ReentrancyGuardUpgradeSafe.__ReentrancyGuard_init();
        market = _market;
        laminarTreasury = _laminarTreasury;
    }

    /**
     * @dev Ensure a pool is safe, based on equity delta, opened positions or plus a new one to open.
     * @param _pool The MarginLiquidityPool.
     * @return Boolean: true if ensured safe or false if not.
     */
    function isPoolSafe(MarginLiquidityPoolInterface _pool) public returns (bool) {
        (Percentage.Percent memory enp, Percentage.Percent memory ell) = getEnpAndEll(_pool);
        (uint256 enpThreshold, uint256 ellThreshold) = market.config.getEnpAndEllMarginThresholds();

        return enp.value > enpThreshold && ell.value > ellThreshold;
    }

    /**
     * @dev Pay the trader deposits
     * @param _pool The MarginLiquidityPool.
     */
    function payTraderDeposits(MarginLiquidityPoolInterface _pool) public nonReentrant {
        uint256 traderMarginCallDeposit = market.config.traderMarginCallDeposit();
        uint256 traderLiquidationDeposit = market.config.traderLiquidationDeposit();
        uint256 lockedFeesAmount = traderMarginCallDeposit.add(traderLiquidationDeposit);

        market.moneyMarket.baseToken().safeTransferFrom(msg.sender, address(this), lockedFeesAmount);
        market.moneyMarket.baseToken().approve(address(market.moneyMarket), lockedFeesAmount);

        _markTraderDepositsAsPaid(
            _pool,
            msg.sender,
            market.moneyMarket.mint(traderMarginCallDeposit),
            market.moneyMarket.mint(traderLiquidationDeposit)
        );
    }

    /**
     * @dev Withdraw the trader deposits, only possible when no positions are open.
     * @param _pool The MarginLiquidityPool.
     */
    function withdrawTraderDeposits(MarginLiquidityPoolInterface _pool) public nonReentrant {
        _withdrawTraderDeposits(_pool, msg.sender);
    }

    /**
     * @dev Margin call a trader, reducing his allowed trading functionality given a MarginLiquidityPool send `TRADER_MARGIN_CALL_FEE` to caller..
     * @param _pool The MarginLiquidityPool.
     * @param _trader The Trader.
     */
    function marginCallTrader(MarginLiquidityPoolInterface _pool, address _trader) external nonReentrant poolIsVerified(_pool) {
        require(!market.marginProtocol.traderIsMarginCalled(_pool, _trader), "TM1");
        require(!isTraderSafe(_pool, _trader), "TM2");

        uint256 marginCallFeeTraderITokens = traderMarginCallITokens[_pool][_trader];
        market.moneyMarket.redeemTo(msg.sender, marginCallFeeTraderITokens);

        market.marginProtocol.__setTraderIsMarginCalled(_pool, _trader, true);
        traderMarginCallITokens[_pool][_trader] = 0;

        emit TraderMarginCalled(address(_pool), _trader);
    }

    /**
     * @dev Enable full trading functionality for trader, undoing a previous `marginCallTrader` given a MarginLiquidityPool.
     * @param _pool The MarginLiquidityPool.
     * @param _trader The Trader.
     */
    function makeTraderSafe(MarginLiquidityPoolInterface _pool, address _trader) external nonReentrant poolIsVerified(_pool) {
        require(market.marginProtocol.traderIsMarginCalled(_pool, _trader), "TS1");
        require(isTraderSafe(_pool, _trader), "TS2");

        uint256 traderMarginCallDeposit = market.config.traderMarginCallDeposit();
        market.moneyMarket.baseToken().safeTransferFrom(msg.sender, address(this), traderMarginCallDeposit);
        market.moneyMarket.baseToken().approve(address(market.moneyMarket), traderMarginCallDeposit);
        traderMarginCallITokens[_pool][_trader] = market.moneyMarket.mint(traderMarginCallDeposit);

        market.marginProtocol.__setTraderIsMarginCalled(_pool, _trader, false);

        emit TraderBecameSafe(address(_pool), _trader);
    }

    /**
     * @dev Margin call a given MarginLiquidityPool, reducing its allowed trading functionality for all traders
     * send `LIQUIDITY_POOL_MARGIN_CALL_FEE` to caller..
     * @param _pool The MarginLiquidityPool.
     */
    function marginCallLiquidityPool(MarginLiquidityPoolInterface _pool) external nonReentrant poolIsVerified(_pool) {
        require(!isPoolSafe(_pool), "PM2");

        uint256 depositedITokens = market.liquidityPoolRegistry.marginCallPool(_pool);
        market.moneyMarket.redeemTo(msg.sender, depositedITokens);

        emit LiquidityPoolMarginCalled(address(_pool));
    }

    /**
     * @dev Enable full trading functionality for pool, undoing a previous `marginCallLiquidityPool`.
     * @param _pool The MarginLiquidityPool.
     */
    function makeLiquidityPoolSafe(MarginLiquidityPoolInterface _pool) external nonReentrant poolIsVerified(_pool) {
        require(isPoolSafe(_pool), "PS2");

        uint256 poolMarginCallDeposit = market.config.poolMarginCallDeposit();

        market.moneyMarket.baseToken().safeTransferFrom(msg.sender, address(this), poolMarginCallDeposit);
        market.moneyMarket.baseToken().approve(address(market.protocolSafety), poolMarginCallDeposit);
        market.liquidityPoolRegistry.makePoolSafe(_pool);

        emit LiquidityPoolBecameSafe(address(_pool));
    }

    /**
     * @dev Liquidate trader due to funds running too low, close all positions and send `TRADER_LIQUIDATION_FEE` to caller.
     * @param _pool The MarginLiquidityPool.
     * @param _trader The trader address.
     */
    function liquidateTrader(MarginLiquidityPoolInterface _pool, address _trader) external nonReentrant poolIsVerified(_pool) {
        Percentage.SignedPercent memory marginLevel = getMarginLevel(_pool, _trader);

        require(marginLevel.value <= int256(market.config.traderRiskLiquidateThreshold()), "TL1");
        require(!market.protocolLiquidated.stoppedTradersInPool(_pool, _trader), "TL2");
        require(!market.protocolLiquidated.stoppedPools(_pool), "TL3");

        market.protocolLiquidated.__stopTraderInPool(_pool, _trader);
        market.moneyMarket.redeemTo(msg.sender, traderLiquidationITokens[_pool][_trader]);

        market.marginProtocol.__setTraderIsMarginCalled(_pool, _trader, false);
        traderHasPaidDeposits[_pool][_trader] = false;
        traderLiquidationITokens[_pool][_trader] = 0;

        emit TraderLiquidated(_trader);
    }

    /**
     * @dev Liquidate pool due to funds running too low, distribute funds to all users and send `LIQUIDITY_POOL_LIQUIDATION_FEE` to caller.
     * @param _pool The MarginLiquidityPool.
     */
    function liquidateLiquidityPool(MarginLiquidityPoolInterface _pool) external nonReentrant poolIsVerified(_pool) {
        // close positions as much as possible, send fee back to caller
        (Percentage.Percent memory enp, Percentage.Percent memory ell) = getEnpAndEll(_pool);
        (uint256 enpThreshold, uint256 ellThreshold) = market.config.getEnpAndEllLiquidateThresholds();

        require(enp.value <= enpThreshold || ell.value <= ellThreshold, "PL1");

        market.protocolLiquidated.__stopPool(_pool);

        MarginFlowProtocol.TradingPair[] memory pairs = market.config.getTradingPairs();

        uint256 penalty = 0;
        Percentage.Percent memory usdBasePrice = Percentage.Percent(market.protocolLiquidated.poolBasePrices(_pool));

        for (uint256 i = 0; i < pairs.length; i++) {
            penalty = penalty.add(_getPairPenalty(_pool, pairs[i].base, pairs[i].quote, usdBasePrice));
        }

        uint256 realizedPenalty = Math.min(_pool.getLiquidity(), market.moneyMarket.convertAmountFromBase(penalty.mul(2)));

        // approve might fail if MAX UINT is already approved
        try _pool.increaseAllowanceForProtocolSafety(realizedPenalty)  {
            this; // ignore empty code
        } catch (bytes memory) {
            this; // ignore empty code
        }
        market.moneyMarket.iToken().safeTransferFrom(address(_pool), laminarTreasury, realizedPenalty);

        uint256 depositedITokens = market.liquidityPoolRegistry.liquidatePool(_pool);
        market.moneyMarket.redeemTo(msg.sender, depositedITokens);

        emit LiquidityPoolLiquidated(address(_pool));
    }

    /**
     * @dev Ensure a trader is safe, based on equity delta, opened positions or plus a new one to open.
     * @param _pool The MarginLiquidityPool.
     * @param _trader The trader.
     * @return True if ensured safe or false if not.
     */
    function isTraderSafe(MarginLiquidityPoolInterface _pool, address _trader) public returns (bool) {
        Percentage.SignedPercent memory marginLevel = getMarginLevel(_pool, _trader);

        bool isSafe = marginLevel.value > int256(market.config.traderRiskMarginCallThreshold());

        return isSafe;
    }

    /**
     * @dev Get the margin level of a trader based on equity and net positions.
     * @param _pool The MarginLiquidityPool.
     * @param _trader The trader.
     * @return The current margin level.
     */
    function getMarginLevel(MarginLiquidityPoolInterface _pool, address _trader) public returns (Percentage.SignedPercent memory) {
        int256 equity = market.getEstimatedEquityOfTrader(_pool, _trader, market.marginProtocol.balances(_pool, _trader));
        uint256 leveragedDebitsITokens = market.getLeveragedDebitsOfTraderInUsd(_pool, _trader);

        if (leveragedDebitsITokens == 0) {
            return Percentage.SignedPercent(MAX_INT);
        }

        return Percentage.signedFromFraction(equity, int256(leveragedDebitsITokens));
    }

    // ENP and ELL. If `new_position` is `None`, return the ENP & ELL based on current positions,
    // else based on current positions plus this new one. If `equity_delta` is `None`, return
    // the ENP & ELL based on current equity of pool, else based on current equity of pool plus
    // the `equity_delta`.
    //
    // ENP - Equity to Net Position ratio of a liquidity pool.
    // ELL - Equity to Longest Leg ratio of a liquidity pool.

    /**
     * @dev ENP and ELL. If `new_position` is `None`, return the ENP & ELL based on current positions,
     * else based on current positions plus this new one. If `equity_delta` is `None`, return
     * the ENP & ELL based on current equity of pool, else based on current equity of pool plus
     * the `equity_delta`.
     * @param _pool The MarginLiquidityPool.
     * @return The current ENP and ELL as percentages.
     */
    function getEnpAndEll(MarginLiquidityPoolInterface _pool) public returns (Percentage.Percent memory, Percentage.Percent memory) {
        MarginFlowProtocol.TradingPair[] memory pairs = market.config.getTradingPairs();

        uint256 net = 0;
        uint256 longestLeg = 0;
        int256 unrealized = 0;

        for (uint256 i = 0; i < pairs.length; i++) {
            (uint256 netPair, uint256 longestLegPair, int256 unrealizedPair) = market.protocolAcc.getPairPoolSafetyInfo(_pool, pairs[i]);
            net = net.add(netPair);
            longestLeg = longestLeg.add(longestLegPair);
            unrealized = unrealized.add(unrealizedPair);
        }

        int256 equity = market.marginProtocol.getTotalPoolLiquidity(_pool).sub(unrealized);

        if (equity < 0) {
            return (Percentage.Percent(0), Percentage.Percent(0));
        }

        uint256 netAbs = net >= 0 ? uint256(net) : uint256(-net);
        Percentage.Percent memory enp = netAbs == 0 ? Percentage.Percent(MAX_UINT) : uint256(equity).fromFraction(netAbs);
        Percentage.Percent memory ell = longestLeg == 0 ? Percentage.Percent(MAX_UINT) : uint256(equity).fromFraction(longestLeg);

        return (enp, ell);
    }

    /**
     * @dev Get the estimated equity of a pool.
     * @param _pool The MarginLiquidityPool.
     * @return The pool's equity.
     */
    function getEquityOfPool(MarginLiquidityPoolInterface _pool) public returns (int256) {
        MarginFlowProtocol.TradingPair[] memory pairs = market.config.getTradingPairs();
        int256 unrealized = 0;

        for (uint256 i = 0; i < pairs.length; i++) {
            (, , int256 unrealizedPair) = market.protocolAcc.getPairPoolSafetyInfo(_pool, pairs[i]);
            unrealized = unrealized.add(unrealizedPair);
        }

        // equityOfPool = liquidity - (allUnrealizedPl + allAccumulatedSwapRate (left out swap rates))
        return market.marginProtocol.getTotalPoolLiquidity(_pool).sub(unrealized);
    }

    /**
     * @dev Get the required deposit amount to make pool safe for pool owners (not incl swap rates).
     * @param _pool The MarginLiquidityPool.
     * @return The required deposit.
     */
    function getEstimatedRequiredDepositForPool(MarginLiquidityPoolInterface _pool) public returns (uint256) {
        MarginFlowProtocol.TradingPair[] memory pairs = market.config.getTradingPairs();
        uint256 net = 0;
        uint256 longestLeg = 0;
        int256 unrealized = 0;

        for (uint256 i = 0; i < pairs.length; i++) {
            (uint256 netPair, uint256 longestLegPair, int256 unrealizedPair) = market.protocolAcc.getPairPoolSafetyInfo(_pool, pairs[i]);
            net = net.add(netPair);
            longestLeg = longestLeg.add(longestLegPair);
            unrealized = unrealized.add(unrealizedPair);
        }

        (uint256 enpThreshold, uint256 ellThreshold) = market.config.getEnpAndEllMarginThresholds();

        uint256 forEnp = net.mul(enpThreshold).div(1e18);
        uint256 forEll = longestLeg.mul(ellThreshold).div(1e18);
        uint256 requiredEquity = Math.max(forEnp, forEll);
        int256 equity = getEquityOfPool(_pool);
        int256 gap = int256(requiredEquity).sub(equity);

        if (gap < 0) {
            return 0;
        }

        return uint256(gap);
    }

    // Only for protocol functions

    function __markTraderDepositsAsPaid(
        MarginLiquidityPoolInterface _pool,
        address _trader,
        uint256 _paidMarginITokens,
        uint256 _paidLiquidationITokens
    ) external nonReentrant {
        require(msg.sender == address(market.marginProtocol), "P1");
        _markTraderDepositsAsPaid(_pool, _trader, _paidMarginITokens, _paidLiquidationITokens);
    }

    // extra function required to pass along proper msg.sender as trader variable
    function __withdrawTraderDeposits(MarginLiquidityPoolInterface _pool, address _trader) public nonReentrant {
        require(msg.sender == address(market.marginProtocol), "P1");
        _withdrawTraderDeposits(_pool, _trader);
    }

    // Internal functions

    function _withdrawTraderDeposits(MarginLiquidityPoolInterface _pool, address _trader) private {
        require(market.marginProtocol.getPositionsByPoolAndTraderLength(_pool, _trader) == 0, "WD1");

        uint256 iTokenDeposits = traderMarginCallITokens[_pool][_trader].add(traderLiquidationITokens[_pool][_trader]);
        market.moneyMarket.redeemTo(_trader, iTokenDeposits);

        traderMarginCallITokens[_pool][_trader] = 0;
        traderLiquidationITokens[_pool][_trader] = 0;
        traderHasPaidDeposits[_pool][_trader] = false;
    }

    function _markTraderDepositsAsPaid(
        MarginLiquidityPoolInterface _pool,
        address _trader,
        uint256 _paidMarginITokens,
        uint256 _paidLiquidationITokens
    ) private {
        traderMarginCallITokens[_pool][_trader] = _paidMarginITokens;
        traderLiquidationITokens[_pool][_trader] = _paidLiquidationITokens;
        traderHasPaidDeposits[_pool][_trader] = true;
    }

    function _getPairPenalty(
        MarginLiquidityPoolInterface _pool,
        address _base,
        address _quote,
        Percentage.Percent memory _usdBasePrice
    ) private view returns (uint256) {
        uint256 leveragedHeldsLong = market.protocolAcc.poolLongPositionAccPerPair(
            _pool,
            _base,
            _quote,
            MarginFlowProtocolAccPositions.CurrencyType.BASE
        );
        uint256 leveragedHeldsShort = market.protocolAcc.poolShortPositionAccPerPair(
            _pool,
            _base,
            _quote,
            MarginFlowProtocolAccPositions.CurrencyType.BASE
        );

        uint256 bidSpread = market.protocolLiquidated.poolBidSpreads(_pool, _base, _quote);
        uint256 askSpread = market.protocolLiquidated.poolAskSpreads(_pool, _base, _quote);
        uint256 spreadProfitLong = leveragedHeldsLong.mul(bidSpread).div(1e18);
        uint256 spreadProfitShort = leveragedHeldsShort.mul(askSpread).div(1e18);

        return spreadProfitLong.add(spreadProfitShort).mulPercent(_usdBasePrice);
    }
}
