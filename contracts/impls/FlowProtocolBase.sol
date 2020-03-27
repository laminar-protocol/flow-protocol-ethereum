pragma solidity ^0.6.4;
import "@openzeppelin/upgrades/contracts/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/math/Math.sol";

import "../libs/Percentage.sol";
import "../libs/upgrades/UpgradeOwnable.sol";
import "../libs/upgrades/UpgradeReentrancyGuard.sol";

import "../interfaces/PriceOracleInterface.sol";
import "../interfaces/MoneyMarketInterface.sol";
import "../interfaces/LiquidityPoolInterface.sol";
import "./FlowToken.sol";

contract FlowProtocolBase is Initializable, UpgradeOwnable, UpgradeReentrancyGuard {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    // DO NOT CHANGE ORDER WHEN UPDATING, ONLY ADDING NEW VARIABLES IS ALLOWED
    PriceOracleInterface public oracle;
    MoneyMarketInterface public moneyMarket;

    uint public maxSpread;

    int constant MAX_INT = 2**256 / 2 - 1;
    uint constant MAX_UINT = 2**256 - 1;

    function initialize(PriceOracleInterface _oracle, MoneyMarketInterface _moneyMarket) public initializer {
        UpgradeOwnable.initialize(msg.sender);
        UpgradeReentrancyGuard.initialize();

        oracle = _oracle;
        moneyMarket = _moneyMarket;

        moneyMarket.baseToken().safeApprove(address(moneyMarket), MAX_UINT);

        maxSpread = 1 ether / 10; // 10% TODO: pick a justified value
    }

    function setMaxSpread(uint value) external onlyOwner {
        maxSpread = value;
    }

    function getPrice(address token) internal returns (uint) {
        uint price = oracle.getPrice(token);
        require(price > 0, "no oracle price");
        return price;
    }

    function getAskSpread(LiquidityPoolInterface pool, address token) internal view returns (uint) {
        uint spread = pool.getAskSpread(token);
        require(spread > 0, "Token disabled for this pool");
        return Math.min(spread, maxSpread);
    }

    function getBidSpread(LiquidityPoolInterface pool, address token) internal view returns (uint) {
        uint spread = pool.getBidSpread(token);
        require(spread > 0, "Token disabled for this pool");
        return Math.min(spread, maxSpread);
    }

    function getAskPrice(LiquidityPoolInterface pool, address token, uint price) internal view returns (uint) {
        uint spread = getAskSpread(pool, token);
        return price.add(price.mul(spread).div(1 ether));
    }

    function getBidPrice(LiquidityPoolInterface pool, address token, uint price) internal view returns (uint) {
        uint spread = getBidSpread(pool, token);
        return price.sub(price.mul(spread).div(1 ether));
    }
}