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

contract FlowProtocolBase is Initializable, UpgradeOwnable, UpgradeReentrancyGuard {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    PriceOracleInterface public oracle;
    MoneyMarketInterface public moneyMarket;

    int256 constant MAX_INT = 2**256 / 2 - 1;
    uint256 constant MAX_UINT = 2**256 - 1;

    uint256 public maxSpread;

    function initialize(PriceOracleInterface _oracle, MoneyMarketInterface _moneyMarket) public initializer {
        UpgradeOwnable.initialize(msg.sender);
        UpgradeReentrancyGuard.initialize();

        oracle = _oracle;
        moneyMarket = _moneyMarket;

        moneyMarket.baseToken().safeApprove(address(moneyMarket), MAX_UINT);

        maxSpread = 1 ether / 10; // 10% TODO: pick a justified value
    }

    function setMaxSpread(uint256 _maxSpread) external onlyOwner {
        maxSpread = _maxSpread;
    }

    function getPrice(address _token) internal returns (uint) {
        uint256 price = oracle.getPrice(_token);
        require(price > 0, "no oracle price");

        return price;
    }

    function _getSpread(uint256 _spread) internal view returns (uint256) {
        require(_spread > 0, "Token disabled for this pool");
        return Math.min(_spread, maxSpread);
    }
}