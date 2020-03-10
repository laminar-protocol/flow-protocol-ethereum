pragma solidity ^0.6.3;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20Detailed.sol";

contract TestToken is ERC20, ERC20Detailed {
    constructor() ERC20Detailed("Test Token", "TEST", 18) public {
        _mint(msg.sender, 1000000000 ether);
    }
}
