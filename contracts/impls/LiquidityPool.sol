// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.6.10;

import "@openzeppelin/contracts-ethereum-package/contracts/Initializable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/access/Ownable.sol";

import "../interfaces/LiquidityPoolInterface.sol";
import "../interfaces/MoneyMarketInterface.sol";

abstract contract LiquidityPool is Initializable, OwnableUpgradeSafe, LiquidityPoolInterface {
    using SafeERC20 for IERC20;

    MoneyMarketInterface public override moneyMarket;
    address public override protocol;

    function initialize(MoneyMarketInterface _moneyMarket, address _protocol) public virtual initializer {
        OwnableUpgradeSafe.__Ownable_init();

        moneyMarket = _moneyMarket;
        protocol = _protocol;
    }

    function approveToProtocol(uint256 _amount) external override onlyOwner {
        moneyMarket.iToken().safeApprove(protocol, _amount);
    }

    function getOwner() public override view returns (address) {
        return OwnableUpgradeSafe.owner();
    }
}
