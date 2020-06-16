// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.6.10;
import "@openzeppelin/contracts-ethereum-package/contracts/access/Ownable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/ERC20.sol";

// TODO: simpify this
contract MintableToken is OwnableUpgradeSafe, ERC20UpgradeSafe {
    function initialize(string memory name, string memory symbol) public initializer {
        ERC20UpgradeSafe.__ERC20_init(name, symbol);
    }

    function mint(address account, uint256 amount) public onlyOwner {
        _mint(account, amount);
    }

    function burn(address account, uint256 amount) public onlyOwner {
        _burn(account, amount);
    }

    function ownerTransferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) public onlyOwner {
        _transfer(sender, recipient, amount);
    }
}
