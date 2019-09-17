pragma solidity ^0.5.8;

import "@openzeppelin/contracts/ownership/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

import "../interfaces/CErc20Interface.sol";
import "../interfaces/MoneyMarketInterface.sol";
import "../libs/Percentage.sol";
import "./FlowToken.sol";
import "./MintableToken.sol";

contract MoneyMarket is MoneyMarketInterface, Ownable {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;
    using Percentage for uint256;

    IERC20 public baseToken;
    CErc20Interface public cToken;
    MintableToken public iToken;

    Percentage.Percent public minLiquidity;
    
    Percentage.Percent private insignificantPercent;

    constructor(
        CErc20Interface cToken_,
        uint minLiquidity_,
        string memory iTokenName,
        string memory iTokenSymbol
    ) public {
        cToken = cToken_;
        baseToken = IERC20(cToken_.underlying());
        iToken = new MintableToken(iTokenName, iTokenSymbol);

        // TODO: do we need to make this configurable and what should be the default value?
        insignificantPercent = Percentage.fromFraction(5, 100); // 5%

        setMinLiquidity(minLiquidity_);
    }

    function mint(uint baseTokenAmount) external {
        mintTo(msg.sender, baseTokenAmount);
    }

    function mintTo(address recipient, uint baseTokenAmount) public {
        baseToken.safeTransferFrom(msg.sender, address(this), baseTokenAmount);
        uint iTokenAmount = convertAmountFromBase(exchangeRate(), baseTokenAmount);
        iToken.mint(recipient, iTokenAmount);

        _rebalance(0);
    }

    function redeem(uint iTokenAmount) external {
        redeemTo(msg.sender, iTokenAmount);
    }

    function redeemTo(address recipient, uint iTokenAmount) public {
        uint baseTokenAmount = convertAmountToBase(exchangeRate(), iTokenAmount);

        iToken.burn(msg.sender, iTokenAmount);

        _rebalance(baseTokenAmount);

        baseToken.safeTransfer(recipient, baseTokenAmount);
    }

    function redeemBaseToken(uint baseTokenAmount) external {
        redeemBaseTokenTo(msg.sender, baseTokenAmount);
    }

    function redeemBaseTokenTo(address recipient, uint baseTokenAmount) public {
        uint iTokenAmount = convertAmountFromBase(exchangeRate(), baseTokenAmount);

        iToken.burn(msg.sender, iTokenAmount);

        _rebalance(baseTokenAmount);

        baseToken.safeTransfer(recipient, baseTokenAmount);
    }

    function rebalance() external {
        _rebalance(0);
    }

    function setMinLiquidity(uint value) public onlyOwner {
        require(value > 0 && value < Percentage.one(), "Invalid minLiquidity");
        minLiquidity.value = value;
        _rebalance(0);
    }

    function _rebalance(uint extraLiquidity) private {
        Percentage.Percent memory cTokenLiquidity = _cTokenLiquidity();

        uint expectedUtilization = Percentage.one().sub(minLiquidity.value);
        uint cTokenUtilization = Percentage.one().sub(cTokenLiquidity.value);
        Percentage.Percent memory toCTokenPercent = Percentage.fromFraction(expectedUtilization, cTokenUtilization);
        assert(toCTokenPercent.value < Percentage.one());

        uint cTokenExchangeRate = cToken.exchangeRateStored();
        uint currentCTokenValue = cToken.balanceOf(address(this)).mul(cTokenExchangeRate).div(1 ether);
        uint totalBaseToken = currentCTokenValue.add(baseToken.balanceOf(address(this)));
        uint desiredCTokenValue = totalBaseToken.mulPercent(toCTokenPercent);
        if (extraLiquidity != 0) {
            desiredCTokenValue = desiredCTokenValue.sub(extraLiquidity.mul(1 ether).div(cTokenExchangeRate));
        }

        uint insignificantAmount = desiredCTokenValue.mulPercent(insignificantPercent);
        
        if (desiredCTokenValue > currentCTokenValue) {
            uint toMint = desiredCTokenValue - currentCTokenValue;
            if (toMint > insignificantAmount) {
                require(cToken.mint(toMint) == 0, "Failed to mint cToken");
            }
        } else {
            uint toRedeem = currentCTokenValue - desiredCTokenValue;
            if (toRedeem > insignificantAmount) {
                require(cToken.redeemUnderlying(toRedeem) == 0, "Failed to redeem cToken");
            }
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
        return totalHoldings().mul(1 ether).div(totalSupply);
    }

    function totalHoldings() view public returns (uint) {
        return cToken.balanceOf(address(this)).mul(cToken.exchangeRateStored()).div(1 ether).add(baseToken.balanceOf(address(this)));
    }

    function convertAmountFromBase(uint rate, uint baseTokenAmount) pure public returns (uint) {
        return baseTokenAmount.mul(1 ether).div(rate);
    }
    function convertAmountToBase(uint rate, uint iTokenAmount) pure public returns (uint) {
        return iTokenAmount.mul(rate).div(1 ether);
    }
}