pragma solidity ^0.5.8;

import "@openzeppelin/contracts/ownership/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract LiquidityPool is Ownable {
    uint constant MAX_UINT = 2**256 - 1;

    IERC20 public baseToken;
    address public fToken;

    constructor(IERC20 baseToken_) public {
        baseToken = baseToken_;
        require(baseToken.approve(fToken, MAX_UINT));
    }

    function withdraw(uint amount) public onlyOwner {
        baseToken.transfer(msg.sender, amount);
    }
}
