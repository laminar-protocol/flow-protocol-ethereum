pragma solidity ^0.5.8;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/ownership/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/math/Math.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import "../libs/Percentage.sol";
import "../interfaces/LiquidityPoolInterface.sol";
import "../interfaces/PriceOracleInterface.sol";
import "../interfaces/MoneyMarketInterface.sol";
import "./MarginTradingPair.sol";

contract FlowMarginProtocol is Ownable, ReentrancyGuard {
    using SafeMath for uint256;
    using Percentage for uint256;
    using SafeERC20 for IERC20;

    uint constant MAX_UINT = 2**256 - 1;

    PriceOracleInterface public oracle;
    MoneyMarketInterface public moneyMarket;

    mapping (address => bool) public tradingPairWhitelist;

    event NewTradingPiar(address pair);

    constructor(PriceOracleInterface oracle_, MoneyMarketInterface moneyMarket_) public {
        oracle = oracle_;
        moneyMarket = moneyMarket_;

        moneyMarket.baseToken().safeApprove(address(moneyMarket), MAX_UINT);
    }

    function addTradingPair(address pair) external onlyOwner {
        require(!tradingPairWhitelist[pair], "Already added");
        tradingPairWhitelist[pair] = true;

        emit NewTradingPiar(pair);
    }

    function openPosition(MarginTradingPair pair, LiquidityPoolInterface pool, uint baseTokenAmount) external nonReentrant returns (uint) {
        require(tradingPairWhitelist[address(pair)], "Invalid trading pair");

        address quoteToken = address(pair.quoteToken());
        uint price = getPrice(quoteToken);
        uint askPrice = price.add(pool.getAskSpread(quoteToken));
        uint bidSpread = pool.getBidSpread(quoteToken);

        require(
            pool.openPosition(address(pair), pair.nextPositionId(), pair.quoteToken(), pair.leverage(), baseTokenAmount),
            "Cannot open position with liquidity pool"
        );

        moneyMarket.baseToken().safeTransferFrom(msg.sender, address(this), baseTokenAmount);
        uint iTokenAmount = moneyMarket.mintTo(address(pair), baseTokenAmount);
        moneyMarket.iToken().safeTransferFrom(address(pool), address(pair), iTokenAmount);

        uint id = pair.openPosition(msg.sender, address(pool), baseTokenAmount, iTokenAmount, askPrice, bidSpread);

        return id;
    }

    function closePosition(MarginTradingPair pair, uint positionId) external nonReentrant {
        require(tradingPairWhitelist[address(pair)], "Invalid trading pair");

        address quoteToken = address(pair.quoteToken());
        uint price = getPrice(quoteToken);

        pair.closePosition(msg.sender, positionId, price);
    }

    function getPrice(address tokenAddr) internal view returns (uint) {
        uint price = oracle.getPrice(tokenAddr);
        require(price > 0, "no oracle price");
        return price;
    }

    function getAskSpread(LiquidityPoolInterface pool, address token) internal view returns (uint) {
        uint spread = pool.getAskSpread(token);
        require(spread > 0, "Token disabled for this pool");
        return spread;
    }

    function getBidSpread(LiquidityPoolInterface pool, address token) internal view returns (uint) {
        uint spread = pool.getBidSpread(token);
        require(spread > 0, "Token disabled for this pool");
        return spread;
    }
}
