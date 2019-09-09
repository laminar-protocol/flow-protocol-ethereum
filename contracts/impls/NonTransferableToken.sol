pragma solidity ^0.5.8;

import "@openzeppelin/contracts/ownership/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

contract NonTransferableToken is Ownable {
    using SafeMath for uint256;

    string public name;
    string public symbol;
    uint8 constant public decimals = 18;

    event Transfer(address indexed from, address indexed to, uint256 value);

    mapping (address => uint256) private _balances;

    uint256 private _totalSupply;

    constructor (string memory name_, string memory symbol_) public {
        name = name_;
        symbol = symbol_;
    }

    function totalSupply() public view returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(address account) public view returns (uint256) {
        return _balances[account];
    }

    function _mint(address account, uint256 amount) internal {
        require(account != address(0), "ERC20: mint to the zero address");

        _totalSupply = _totalSupply.add(amount);
        _balances[account] = _balances[account].add(amount);
        emit Transfer(address(0), account, amount);
    }

    function _burn(address account, uint256 value) internal {
        require(account != address(0), "ERC20: burn from the zero address");

        _totalSupply = _totalSupply.sub(value);
        _balances[account] = _balances[account].sub(value);
        emit Transfer(account, address(0), value);
    }
}
