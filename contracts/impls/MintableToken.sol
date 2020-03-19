pragma solidity ^0.6.3;
import "@openzeppelin/contracts/access/Ownable.sol";
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
