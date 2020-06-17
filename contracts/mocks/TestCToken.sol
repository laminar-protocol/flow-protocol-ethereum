/* solium-disable error-reason */

// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.6.10;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TestCToken is ERC20 {
    IERC20 public baseToken;
    uint256 public totalBorrows;

    constructor(IERC20 baseToken_) public ERC20("Test cToken", "cTEST") {
        baseToken = baseToken_;
    }

    function mint(uint256 baseTokenAmount) public returns (uint256) {
        uint256 cTokenAmount = (baseTokenAmount * 1 ether) / getPrice();

        require(baseToken.transferFrom(msg.sender, address(this), baseTokenAmount), "TransferFrom failed");
        _mint(msg.sender, cTokenAmount);

        return 0;
    }

    function redeem(uint256 cTokenAmount) public returns (uint256) {
        uint256 baseTokenAmount = (cTokenAmount * getPrice()) / 1 ether;

        _burn(msg.sender, cTokenAmount);
        require(baseToken.transfer(msg.sender, baseTokenAmount), "Transfer failed");

        return 0;
    }

    function getPrice() public view returns (uint256) {
        uint256 poolSize = baseToken.balanceOf(address(this));
        uint256 issued = totalSupply();

        if (poolSize == 0 || issued == 0) {
            return 1 ether;
        }

        return (poolSize * 1 ether) / issued;
    }

    function borrow(address recipient, uint256 amount) public {
        totalBorrows += amount;
        require(baseToken.transfer(recipient, amount), "Transfer failed");
    }

    function repay(uint256 amount) public {
        totalBorrows -= amount;
        require(baseToken.transferFrom(msg.sender, address(this), amount), "TransferFrom failed");
    }

    function exchangeRateStored() public view returns (uint256) {
        return getPrice();
    }

    function getCash() public view returns (uint256) {
        return baseToken.balanceOf(address(this));
    }

    function underlying() public view returns (address) {
        return address(baseToken);
    }

    function redeemUnderlying(uint256 baseTokenAmount) public returns (uint256) {
        uint256 cTokenAmount = (baseTokenAmount * 1 ether) / getPrice();

        _burn(msg.sender, cTokenAmount);
        require(baseToken.transfer(msg.sender, baseTokenAmount), "Transfer failed");

        return 0;
    }
}
