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
        baseToken.safeTransferFrom(msg.sender, address(this), baseTokenAmount);
        uint iTokenAmount = baseTokenAmount.mul(exchangeRate()).div(1 ether);
        iToken.mint(msg.sender, iTokenAmount);

        _rebalance(0);
    }

    function redeem(uint iTokenAmount) external {
        redeemTo(msg.sender, iTokenAmount);
    }

    function redeemTo(address recipient, uint iTokenAmount) public {
        iToken.burn(msg.sender, iTokenAmount);

        uint baseTokenAmount = iTokenAmount.mul(1 ether).div(exchangeRate());

        _rebalance(baseTokenAmount);

        baseToken.safeTransfer(recipient, baseTokenAmount);
    }

    function mintWithCToken(uint cTokenAmount) external {
        require(cToken.transferFrom(msg.sender, address(this), cTokenAmount), "cToken transferFrom failed");
        // baseTokenAmount = cTokenAmount / cTokenExchangeRate
        // iTokenAmount = baseTokenAmount * exchangeRate
        uint iTokenAmount = cTokenAmount.mul(exchangeRate()).div(cToken.exchangeRateStored());
        iToken.mint(msg.sender, iTokenAmount);

        _rebalance(0);
    }

    function redeemCToken(uint iTokenAmount) external {
        redeemCTokenTo(msg.sender, iTokenAmount);
    }

    function redeemCTokenTo(address recipent, uint iTokenAmount) public {
        iToken.burn(msg.sender, iTokenAmount);

        // baseTokenAmount = iTokenAmount / exchangeRate
        // cTokenAmount = baseTokenAmount * cTokenExchangeRate
        uint cTokenAmount = iTokenAmount.mul(cToken.exchangeRateStored()).div(exchangeRate());
        // TODO: handle the unlikely case where we need to convert base token to cToken to fillfull the withdraw
        cToken.transfer(recipent, cTokenAmount);

        _rebalance(0);
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
        uint currentCTokenValue = cToken.balanceOf(address(this)).mul(1 ether).div(cTokenExchangeRate);
        uint totalBaseToken = currentCTokenValue.add(baseToken.balanceOf(address(this)));
        uint desiredCTokenValue = totalBaseToken.mulPercent(toCTokenPercent);
        if (extraLiquidity != 0) {
            desiredCTokenValue = desiredCTokenValue.sub(extraLiquidity.mul(cTokenExchangeRate).div(1 ether));
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
        return cToken.balanceOf(address(this)).mul(1 ether).div(cToken.exchangeRateStored()).add(baseToken.balanceOf(address(this)));
    }
}