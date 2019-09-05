pragma solidity ^0.5.8;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20Detailed.sol";

contract InterestBearingToken is ERC20, ERC20Detailed {
    IERC20 baseToken;

    constructor(IERC20 baseToken_) ERC20Detailed("Interest Bearing Token", "iTEST", 18) public {
        baseToken = baseToken_;
    }

    function mint(uint baseTokenAmount) external {
        uint iTokenAmount = baseTokenAmount * 1 ether / getPrice();

        require(baseToken.transferFrom(msg.sender, address(this), baseTokenAmount));
        _mint(msg.sender, iTokenAmount);
    }

    function burn(uint iTokenAmount) external {        
        uint baseTokenAmount = iTokenAmount * getPrice() / 1 ether;

        _burn(msg.sender, iTokenAmount);
        require(baseToken.transfer(msg.sender, baseTokenAmount));
    }

    function getPrice() public view returns (uint) {
        uint poolSize = baseToken.balanceOf(address(this));
        uint issued = totalSupply();
        
        if (issued == 0) {
            return 1 ether;
        }

        return poolSize * 1 ether / issued;
    }
}
