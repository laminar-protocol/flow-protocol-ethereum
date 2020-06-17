// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.6.10;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TestToken is ERC20 {
    constructor() public ERC20("Test Token", "TEST") {
        _mint(msg.sender, 1000000000 ether);
    }
}
