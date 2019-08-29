pragma solidity ^0.5.8;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20Detailed.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";

import "../roles/ProtocolOwnable.sol";
import "../libs/Percentage.sol";

contract FlowToken is ProtocolOwnable, ERC20, ERC20Detailed {
    using SafeERC20 for IERC20;

    uint constant MAX_UINT = 2**256 - 1;

    Percentage.Percent public minCollateralRatio;
    Percentage.Percent public defaultCollateralRatio;

    constructor(
        string memory name,
        string memory symbol,
        IERC20 baseToken
    ) ERC20Detailed(name, symbol, 18) public {
        baseToken.safeApprove(msg.sender, MAX_UINT);

        // TODO: from constructor parameter
        minCollateralRatio = Percentage.fromFraction(5, 100);
        defaultCollateralRatio = Percentage.fromFraction(10, 100);
    }

    function setMinCollateralRatio(uint percent) public onlyProtocol {
        minCollateralRatio.value = percent;
    }

    function setDefaultCollateralRatio(uint percent) public onlyProtocol {
        defaultCollateralRatio.value = percent;
    }

    function mint(address account, uint amount) public onlyProtocol {
        _mint(account, amount);
    }

    function burn(address account, uint amount) public onlyProtocol {
        _burn(account, amount);
    }
}
