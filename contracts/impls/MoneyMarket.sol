pragma solidity ^0.5.8;

import "@openzeppelin/contracts/ownership/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/math/Math.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import "../interfaces/CErc20Interface.sol";
import "../interfaces/MoneyMarketInterface.sol";
import "../libs/Percentage.sol";
import "./FlowToken.sol";
import "./MintableToken.sol";

contract MoneyMarket is MoneyMarketInterface, Ownable, ReentrancyGuard {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;
    using Percentage for uint256;

    uint constant MAX_UINT = 2**256 - 1;

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
        baseToken.safeApprove(address(cToken), MAX_UINT);

        // TODO: do we need to make this configurable and what should be the default value?
        insignificantPercent = Percentage.fromFraction(5, 100); // 5%

        minLiquidity.value = minLiquidity_;
    }

    function mint(uint baseTokenAmount) external {
        mintTo(msg.sender, baseTokenAmount);
    }

    function mintTo(address recipient, uint baseTokenAmount) public nonReentrant {
        baseToken.safeTransferFrom(msg.sender, address(this), baseTokenAmount);
        uint iTokenAmount = convertAmountFromBase(exchangeRate(), baseTokenAmount);
        iToken.mint(recipient, iTokenAmount);

        _rebalance(0);
    }

    function redeem(uint iTokenAmount) external {
        redeemTo(msg.sender, iTokenAmount);
    }

    function redeemTo(address recipient, uint iTokenAmount) public nonReentrant {
        uint baseTokenAmount = convertAmountToBase(exchangeRate(), iTokenAmount);

        iToken.burn(msg.sender, iTokenAmount);

        _rebalance(baseTokenAmount);

        baseToken.safeTransfer(recipient, baseTokenAmount);
    }

    function redeemBaseToken(uint baseTokenAmount) external {
        redeemBaseTokenTo(msg.sender, baseTokenAmount);
    }

    function redeemBaseTokenTo(address recipient, uint baseTokenAmount) public nonReentrant {
        uint iTokenAmount = convertAmountFromBase(exchangeRate(), baseTokenAmount);

        iToken.burn(msg.sender, iTokenAmount);

        _rebalance(baseTokenAmount);

        baseToken.safeTransfer(recipient, baseTokenAmount);
    }

    function rebalance() external nonReentrant {
        _rebalance(0);
    }

    function setMinLiquidity(uint value) public onlyOwner {
        require(value > 0 && value < Percentage.one(), "Invalid minLiquidity");
        minLiquidity.value = value;
        _rebalance(0);
    }

    function _rebalance(uint extraLiquidity) private {
        uint cTokenExchangeRate = cToken.exchangeRateStored();
        uint currentCTokenValue = cToken.balanceOf(address(this)).mul(cTokenExchangeRate).div(1 ether);
        uint totalBaseToken = currentCTokenValue.add(baseToken.balanceOf(address(this)));

        uint cash = cToken.getCash();
        uint borrows = cToken.totalBorrows();
        uint cashBaseTokenAmount = calculateCashAmount(cash, cash.add(borrows), totalBaseToken);
        uint desiredCTokenValue = totalBaseToken.sub(cashBaseTokenAmount);
        if (extraLiquidity > 0) {
            if (desiredCTokenValue > extraLiquidity) {
                desiredCTokenValue = desiredCTokenValue - extraLiquidity;
            } else {
                desiredCTokenValue = 0;
            }
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

    function calculateCashAmount(uint cTokenCash, uint cTokenTotal, uint totalValue) view public returns (uint) {
        if (cTokenTotal == 0) {
            return totalValue;
        }
        // totalValue * (cTokenTotal ^ 2 * minLIquidity - cTokenCash ^ 2) / ( cTokenTotal ^ 2 - cTokenCash ^ 2 )
        uint cTokenCashSquare = cTokenCash.mul(cTokenCash);
        uint cTokenTotalSquare = cTokenTotal.mul(cTokenTotal);
        return totalValue.mul(cTokenTotalSquare.mulPercent(minLiquidity).sub(cTokenCashSquare)).div(cTokenTotalSquare.sub(cTokenCashSquare));
    }

    function _cTokenUtilization() view private returns (Percentage.Percent memory) {
        uint cash = cToken.getCash();
        uint borrows = cToken.totalBorrows();
        uint total = cash.add(borrows);
        return Percentage.fromFraction(borrows, total);
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