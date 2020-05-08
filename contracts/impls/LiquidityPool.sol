pragma solidity ^0.6.4;

import "@openzeppelin/upgrades/contracts/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";

import "../libs/upgrades/UpgradeOwnable.sol";
import "../interfaces/LiquidityPoolInterface.sol";
import "../interfaces/MoneyMarketInterface.sol";

abstract contract LiquidityPool is Initializable, UpgradeOwnable, LiquidityPoolInterface {
    using SafeERC20 for IERC20;

    MoneyMarketInterface public override moneyMarket;
    address public override protocol;

    function initialize(MoneyMarketInterface _moneyMarket, address _protocol) public virtual initializer {
        UpgradeOwnable.initialize(msg.sender);

        moneyMarket = _moneyMarket;
        protocol = _protocol;
    }

    function approveToProtocol(uint256 _amount) external override onlyOwner {
        moneyMarket.iToken().safeApprove(protocol, _amount);
    }

    function owner() public view virtual override(UpgradeOwnable,LiquidityPoolInterface) returns (address) {
        return UpgradeOwnable.owner();
    }
}