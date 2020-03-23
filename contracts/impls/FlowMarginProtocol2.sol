pragma solidity ^0.6.4;

import "@openzeppelin/upgrades/contracts/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/math/SignedSafeMath.sol";
import "@openzeppelin/contracts/math/Math.sol";

import "../libs/Percentage.sol";
import "../libs/upgrades/UpgradeOwnable.sol";
import "../libs/upgrades/UpgradeReentrancyGuard.sol";

import "../interfaces/PriceOracleInterface.sol";
import "../interfaces/MoneyMarketInterface.sol";
import "../interfaces/LiquidityPoolInterface.sol";
import "./FlowToken.sol";

contract FlowMarginProtocol2 is Initializable, UpgradeOwnable, UpgradeReentrancyGuard {
    using SafeMath for uint256;
    using SignedSafeMath for int256;
    using SafeERC20 for IERC20;

    struct TradingPair {
        FlowToken base;
        FlowToken quote;
    }

    struct Position {
        address owner;
        LiquidityPoolInterface pool;
        TradingPair pair;
        int256 leverage;
        int256 leveragedHeld;
        int256 leveragedDebits;

        /// USD value of leveraged debits on open position.
        uint256 leveragedDebitsInUsd;
        uint256 openAccumulatedSwapRate;
        uint256 openMargin;
    }

    uint256 public nextPositionId;

    mapping (uint256 => Position) private positions;
    mapping (address => mapping (LiquidityPoolInterface => Position[])) private positionsByTrader;
    // mapping (LiquidityPoolInterface => mapping (TradingPair => Position[])) public positionsByPool;
    // mapping (TradingPair => Option<SwapPeriod>) public swapPeriods;
    mapping (address => uint256) public balances;
    mapping (address => address[]) public marginCalledTraders;
    mapping (LiquidityPoolInterface => LiquidityPoolInterface[]) public marginCalledLiquidityPools;

    uint256 public traderRiskThreshold;
    uint256 public liquidityPoolENPThreshold;
    uint256 public liquidityPoolELLThreshold;

    uint256 constant MAX_UINT = 2**256 - 1;
    uint256 constant MARGIN_CALL_FEE = 3; // TODO
    uint256 constant LIQUIDATION_FEE = 3; // TODO

    MoneyMarketInterface public moneyMarket;
    PriceOracleInterface public oracle;
    ERC20 public baseToken;

    /*
    TODO:

    - Actual Trading:
        - fn open_position(MarginProtocolLiquidityPoolInterface pool, TradingPair pair, int leverage, uint leveraged_amount, price: uint): uint
            - `price` is the max (long) / min (short) acceptable trade price spread included
        - fn close_position(uint positionId, uint price)

    - Trader Margin Calls:
        - fn trader_margin_call(address who)
            - Upon successful call, caller get `MARGIN_CALL_FEE` from trader
        - fn trader_become_safe(address who)

    - LiquidityPool Margin Calls:
        - fn liquidity_pool_margin_call(MarginProtocolLiquidityPoolInterface pool)
        - fn liquidity_pool_become_safe(MarginProtocolLiquidityPoolInterface pool)
        - fn liquidity_pool_liquidate(MarginProtocolLiquidityPoolInterface pool)
            - Upon successful call, caller get `MARGIN_CALL_FEE` from liquidity pool

    - Balances:
        - fn deposit(uint baseTokenAmount)
        - fn withdraw(uint baseTokenAmount)
    */

    function initialize(PriceOracleInterface _oracle, MoneyMarketInterface _moneyMarket) public initializer {
        UpgradeOwnable.initialize(msg.sender);
        UpgradeReentrancyGuard.initialize();

        oracle = _oracle;
        moneyMarket = _moneyMarket;

        moneyMarket.baseToken().safeApprove(address(moneyMarket), MAX_UINT);

        // maxSpread = 1 ether / 10; // 10% TODO: pick a justified value
    }

    /// askPrice = price * (1 + ask_spread)
    function _getAskPriceInWei(LiquidityPoolInterface _pool, TradingPair memory _pair, uint256 _max) internal returns(uint256) {
        uint256 price = _getPrice(_pair.base, _pair.quote);
        uint256 spread = _pool.getAskSpread(address(_pair.quote));
        uint256 askPrice = price.add(price.mul(spread).div(1e18));

        if (_max > 0) {
            require(askPrice <= _max, "Ask price too high");
        }

        return askPrice;
    }

	/// bidPrice = price * (1 - bid_spread)
    function _getBidPriceInWei(LiquidityPoolInterface _pool, TradingPair memory _pair, uint256 _min) internal returns(uint256) {
        uint256 price = _getPrice(_pair.base, _pair.quote);
        uint256 spread = _pool.getBidSpread(address(_pair.quote));
        uint256 bidPrice = price.sub(price.mul(spread).div(1e18));

        if (_min > 0) {
            require(bidPrice >= _min, "Bid price too low");
        }

        return bidPrice;
    }


    /// unrealizedPlOfPosition = (currentPrice - openPrice) * leveragedHeld * price
    function _getUnrealizedPlOfPosition(Position memory _position) internal returns (int256) {
        int256 openPriceValue = _position.leveragedDebits.div(_position.leveragedHeld);
        int256 openPrice = openPriceValue >= 0 ? openPriceValue : -openPriceValue;

        uint256 currentPrice = _position.leverage > 0
            ? _getBidPriceInWei(_position.pool, _position.pair, 0)
            : _getAskPriceInWei(_position.pool, _position.pair, 0);

        int256 priceDelta = int256(currentPrice).sub(openPrice);
        int256 unrealized = _position.leveragedHeld.mul(priceDelta);

        return _getUsdValue(_position.pair.base, unrealized);
    }

    /// usdValue = amount * price
    function _getUsdValue(IERC20 _currencyToken, int256 _amount) internal returns (int256) {
        uint256 price = _getPrice(moneyMarket.baseToken(), _currencyToken);

        return _amount.mul(int256(price)).div(1e18);
    }

    /// The price from oracle.
    function _getPrice(IERC20 _baseCurrencyId, IERC20 _quoteCurrencyId) internal returns (uint256) {
        uint256 basePrice = oracle.getPrice(address(_baseCurrencyId));
        uint256 quotePrice = oracle.getPrice(address(_quoteCurrencyId));

        return quotePrice.mul(1e18).div(basePrice);
    }
}