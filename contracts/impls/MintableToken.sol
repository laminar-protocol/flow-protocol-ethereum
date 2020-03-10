// solium-disable linebreak-style
pragma solidity ^0.5.8;

import "@openzeppelin/contracts/ownership/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20Detailed.sol";

// TODO: simpify this
contract MintableToken is Ownable, ERC20, ERC20Detailed {
    constructor(
        string memory name,
        string memory symbol
    ) ERC20Detailed(name, symbol, 18) public {
    }

    function mint(address account, uint256 amount) public onlyOwner {
        _mint(account, amount);
    }

    function burn(address account, uint256 amount) public onlyOwner {
        _burn(account, amount);
    }

    function ownerTransferFrom(address sender, address recipient, uint256 amount) public onlyOwner {
        _transfer(sender, recipient, amount);
    }
}
