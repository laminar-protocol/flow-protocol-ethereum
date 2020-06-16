// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.6.10;

import "@openzeppelin/contracts-ethereum-package/contracts/Initializable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/math/Math.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/access/Ownable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/utils/ReentrancyGuard.sol";

import "../libs/Percentage.sol";

import "../interfaces/PriceOracleInterface.sol";
import "../interfaces/MoneyMarketInterface.sol";

contract FlowProtocolBase is Initializable, OwnableUpgradeSafe, ReentrancyGuardUpgradeSafe {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    PriceOracleInterface public oracle;
    MoneyMarketInterface public moneyMarket;

    int256 private constant MAX_INT = type(int256).max;
    uint256 private constant MAX_UINT = type(uint256).max;

    uint256 public maxSpread;

    function initialize(PriceOracleInterface _oracle, MoneyMarketInterface _moneyMarket) public initializer {
        OwnableUpgradeSafe.__Ownable_init();
        ReentrancyGuardUpgradeSafe.__ReentrancyGuard_init();

        oracle = _oracle;
        moneyMarket = _moneyMarket;

        moneyMarket.baseToken().safeApprove(address(moneyMarket), MAX_UINT);

        maxSpread = 1 ether / 10; // 10% TODO: pick a justified value
    }

    function setMaxSpread(uint256 _maxSpread) external onlyOwner {
        maxSpread = _maxSpread;
    }

    function getPrice(address _token) internal returns (uint256) {
        uint256 price = oracle.getPrice(_token);
        require(price > 0, "no oracle price");

        return price;
    }

    function _getSpread(uint256 _spread) internal view returns (uint256) {
        require(_spread > 0, "Token disabled for this pool");
        return Math.min(_spread, maxSpread);
    }
}
