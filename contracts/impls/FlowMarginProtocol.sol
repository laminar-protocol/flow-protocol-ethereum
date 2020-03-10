// solium-disable linebreak-style
pragma solidity ^0.6.3;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/math/Math.sol";

import "../libs/Percentage.sol";
import "../interfaces/LiquidityPoolInterface.sol";
import "../interfaces/PriceOracleInterface.sol";
import "../interfaces/MoneyMarketInterface.sol";
import "./MarginTradingPair.sol";
import "./FlowProtocolBase.sol";

contract FlowMarginProtocol is FlowProtocolBase {
    using SafeMath for uint256;
    using Percentage for uint256;
    using SafeERC20 for IERC20;

    mapping (address => bool) public tradingPairWhitelist;

    event NewTradingPair(address pair);

    constructor(
        PriceOracleInterface oracle_,
        MoneyMarketInterface moneyMarket_
    ) FlowProtocolBase(oracle_, moneyMarket_) public {
    }

    function addTradingPair(address pair) external onlyOwner {
        require(!tradingPairWhitelist[pair], "Already added");
        tradingPairWhitelist[pair] = true;

        emit NewTradingPair(pair);
    }

    function openPosition(MarginTradingPair pair, LiquidityPoolInterface pool, uint baseTokenAmount) external nonReentrant returns (uint) {
        require(tradingPairWhitelist[address(pair)], "Invalid trading pair");

        address quoteToken = address(pair.quoteToken());
        int leverage = pair.leverage();

        require(
            pool.openPosition(address(pair), pair.nextPositionId(), quoteToken, leverage, baseTokenAmount),
            "Cannot open position with liquidity pool"
        );

        uint price = getPrice(quoteToken);
        uint openPrice;
        uint closeSpread;

        if (leverage > 0) {
            // long
            openPrice = getAskPrice(pool, quoteToken, price);
            closeSpread = getBidSpread(pool, quoteToken);
        } else {
            // short
            openPrice = getBidPrice(pool, quoteToken, price);
            closeSpread = getAskSpread(pool, quoteToken);
        }

        moneyMarket.baseToken().safeTransferFrom(msg.sender, address(this), baseTokenAmount);
        uint iTokenAmount = moneyMarket.mintTo(address(pair), baseTokenAmount);
        moneyMarket.iToken().safeTransferFrom(address(pool), address(pair), iTokenAmount);

        uint id = pair.openPosition(msg.sender, address(pool), baseTokenAmount, iTokenAmount, openPrice, closeSpread);

        return id;
    }

    function closePosition(MarginTradingPair pair, uint positionId) external nonReentrant {
        require(tradingPairWhitelist[address(pair)], "Invalid trading pair");

        address quoteToken = address(pair.quoteToken());
        uint price = getPrice(quoteToken);

        pair.closePosition(msg.sender, positionId, price);
    }
}
