/* solium-disable error-reason */

pragma solidity ^0.6.4;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TestCToken is ERC20 {
    IERC20 public baseToken;
    uint public totalBorrows;

    constructor(IERC20 baseToken_) ERC20("Test cToken", "cTEST") public {
        baseToken = baseToken_;
    }

    function mint(uint baseTokenAmount) public returns (uint) {
        uint cTokenAmount = baseTokenAmount * 1 ether / getPrice();

        require(baseToken.transferFrom(msg.sender, address(this), baseTokenAmount));
        _mint(msg.sender, cTokenAmount);

        return 0;
    }

    function redeem(uint cTokenAmount) public returns (uint) {
        uint baseTokenAmount = cTokenAmount * getPrice() / 1 ether;

        _burn(msg.sender, cTokenAmount);
        require(baseToken.transfer(msg.sender, baseTokenAmount));

        return 0;
    }

    function getPrice() public view returns (uint) {
        uint poolSize = baseToken.balanceOf(address(this));
        uint issued = totalSupply();

        if (poolSize == 0 || issued == 0) {
            return 1 ether;
        }

        return poolSize * 1 ether / issued;
    }

    function borrow(address recipient, uint amount) public {
        require(baseToken.transfer(recipient, amount));
        totalBorrows += amount;
    }

    function repay(uint amount) public {
        require(baseToken.transferFrom(msg.sender, address(this), amount));
        totalBorrows -= amount;
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
        uint cTokenAmount = baseTokenAmount * 1 ether / getPrice();

        _burn(msg.sender, cTokenAmount);
        require(baseToken.transfer(msg.sender, baseTokenAmount));

        return 0;
    }
}
