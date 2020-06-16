pragma solidity ^0.6.4;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TestToken is ERC20 {
    constructor() ERC20("Test Token", "TEST") public {
        _mint(msg.sender, 1000000000 ether);
    }
}
