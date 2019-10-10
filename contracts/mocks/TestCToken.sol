/* solium-disable error-reason */

pragma solidity ^0.5.8;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20Detailed.sol";

import "../interfaces/CErc20Interface.sol";

contract TestCToken is CErc20Interface, ERC20, ERC20Detailed {
    IERC20 baseToken;
    uint public totalBorrows;

    constructor(IERC20 baseToken_) ERC20Detailed("Test cToken", "cTEST", 18) public {
        baseToken = baseToken_;
    }

    function mint(uint baseTokenAmount) external returns (uint) {
        uint cTokenAmount = baseTokenAmount * 1 ether / getPrice();

        require(baseToken.transferFrom(msg.sender, address(this), baseTokenAmount));
        _mint(msg.sender, cTokenAmount);

        return 0;
    }

    function redeem(uint cTokenAmount) public returns (uint) {
        uint baseTokenAmount = cTokenAmount * getPrice() / 1 ether;

        _burn(msg.sender, cTokenAmount);
        require(baseToken.transfer(msg.sender, baseTokenAmount));

        return 0;
    }

    function getPrice() public view returns (uint) {
        uint poolSize = baseToken.balanceOf(address(this));
        uint issued = totalSupply();

        if (poolSize == 0 || issued == 0) {
            return 1 ether;
        }

        return poolSize * 1 ether / issued;
    }

    function borrow(address recipient, uint amount) external {
        require(baseToken.transfer(recipient, amount));
        totalBorrows += amount;
    }

    function repay(uint amount) external {
        require(baseToken.transferFrom(msg.sender, address(this), amount));
        totalBorrows -= amount;
    }

    function exchangeRateStored() external view returns (uint256) {
        return getPrice();
    }

    function getCash() external view returns (uint256) {
        return baseToken.balanceOf(address(this));
    }

    function underlying() external view returns (address) {
        return address(baseToken);
    }

    function redeemUnderlying(uint256 baseTokenAmount) external returns (uint256) {
        uint cTokenAmount = baseTokenAmount * 1 ether / getPrice();

        _burn(msg.sender, cTokenAmount);
        require(baseToken.transfer(msg.sender, baseTokenAmount));

        return 0;
    }
}
