pragma solidity ^0.5.8;

import "@openzeppelin/contracts/ownership/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

import "../interfaces/CErc20Interface.sol";
import "../libs/Percentage.sol";
import "./FlowToken.sol";
import "./MintableToken.sol";

contract MoneyMarket is Ownable {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;
    using Percentage for uint256;

    uint constant MAX_UINT = 2**256 - 1;

    IERC20 public baseToken;
    CErc20Interface public cToken;
    MintableToken public mToken;
    MintableToken public iToken;

    Percentage.Percent public minLiquidity;

    constructor(
        CErc20Interface cToken_,
        uint minLiquidity_,
        string memory mTokenName,
        string memory mTokenSymbol,
        string memory iTokenName,
        string memory iTokenSymbol
    ) public {
        cToken = cToken_;
        baseToken = IERC20(cToken_.underlying());
        mToken = new MintableToken(mTokenName, mTokenSymbol);
        iToken = new MintableToken(iTokenName, iTokenSymbol);

        setMinLiquidity(minLiquidity_);
    }

    function mint(uint amount) external {
        baseToken.safeTransferFrom(msg.sender, address(this), amount);
        mToken.mint(msg.sender, amount);

        _rebalance();
    }

    function redeem(uint amount) external {
        mToken.burn(msg.sender, amount);

        uint bal = baseToken.balanceOf(address(this));
        if (bal < amount) {
            uint withdrawAmount = amount - bal;
            require(cToken.redeemUnderlying(withdrawAmount) == 0, "Failed to redeem cToken");
        }
        baseToken.safeTransfer(msg.sender, amount);
        
        _rebalance();
    }

    function deposit(uint amount) external {
        mToken.ownerTransferFrom(msg.sender, address(this), amount);
        iToken.mint(msg.sender, amount);
    }

    function withdraw(uint amount) external {
        require(amount <= iToken.balanceOf(msg.sender), "Not enough token");
        uint iTokenTotalSupply = iToken.totalSupply();
        Percentage.Percent memory percent = Percentage.fromFraction(amount, iTokenTotalSupply);
        uint totalInterest = totalHoldings().sub(mToken.totalSupply());

        uint share = totalInterest.mulPercent(percent);

        iToken.burn(msg.sender, amount);
        mToken.ownerTransferFrom(address(this), msg.sender, amount);
        mToken.mint(msg.sender, share);
    }

    function rebalance() external {
        _rebalance();
    }

    function setMinLiquidity(uint value) public onlyOwner {
        require(value > 0 && value < Percentage.one(), "Invalid minLiquidity");
        minLiquidity.value = value;
        _rebalance();
    }

    function _rebalance() private {
        Percentage.Percent memory cTokenLiquidity = _cTokenLiquidity();
        if (cTokenLiquidity.value >= minLiquidity.value) {
            require(cToken.mint(baseToken.balanceOf(address(this))) == 0, "Failed to mint cToken");
            return;
        }
        uint expectedUtilization = Percentage.one().sub(minLiquidity.value);
        uint cTokenUtilization = Percentage.one().sub(cTokenLiquidity.value);
        Percentage.Percent memory toCTokenPercent = Percentage.fromFraction(expectedUtilization, cTokenUtilization);
        assert(toCTokenPercent.value < Percentage.one());

        uint currentCTokenValue = cToken.balanceOf(address(this)).mul(cToken.exchangeRateStored());
        uint totalBaseToken = currentCTokenValue.add(baseToken.balanceOf(address(this)));
        uint desiredCTokenValue = totalBaseToken.mulPercent(toCTokenPercent);
        if (desiredCTokenValue > currentCTokenValue) {
            require(cToken.mint(desiredCTokenValue - currentCTokenValue) == 0, "Failed to mint cToken");
        } else {
            require(cToken.redeemUnderlying(currentCTokenValue - desiredCTokenValue) == 0, "Failed to redeem cToken");
        }
    }

    function _cTokenLiquidity() view private returns (Percentage.Percent memory) {
        uint cash = cToken.getCash();
        uint borrows = cToken.totalBorrows();
        uint total = cash.add(borrows);
        return Percentage.fromFraction(cash, total);
    }

    function exchangeRate() view public returns (uint) {
        uint totalSupply = iToken.totalSupply();
        if (totalSupply == 0) {
            return 1 ether;
        }
        return totalHoldings().div(totalSupply);
    }

    function totalHoldings() view public returns (uint) {
        return cToken.balanceOf(address(this)).mul(cToken.exchangeRateStored()).add(baseToken.balanceOf(address(this)));
    }
}