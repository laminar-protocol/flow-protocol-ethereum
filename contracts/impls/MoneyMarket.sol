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
        require(value >= 0 && value <= Percentage.one(), "Invalid minLiquidity");
        minLiquidity.value = value;
        _rebalance(0);
    }

    function _rebalance(uint extraLiquidity) private {
        uint cTokenExchangeRate = cToken.exchangeRateStored();
        uint currentCTokenValue = cToken.balanceOf(address(this)).mul(cTokenExchangeRate).div(1 ether);
        uint currentBaseToken = baseToken.balanceOf(address(this));
        uint totalBaseToken = currentCTokenValue.add(currentBaseToken);

        uint cash = cToken.getCash();
        uint borrows = cToken.totalBorrows();
        uint desiredCTokenValue = calculateInvestAmount(cash, borrows, totalBaseToken);
        if (desiredCTokenValue > extraLiquidity) {
            desiredCTokenValue = desiredCTokenValue - extraLiquidity;
        } else {
            desiredCTokenValue = 0;
        }

        uint insignificantAmount = desiredCTokenValue.mulPercent(insignificantPercent);
        
        if (desiredCTokenValue > currentCTokenValue) {
            uint toMint = desiredCTokenValue - currentCTokenValue;
            if (toMint > insignificantAmount) {
                require(cToken.mint(toMint) == 0, "Failed to mint cToken");
            }
        } else {
            uint toRedeem = currentCTokenValue - desiredCTokenValue;
            if (toRedeem > insignificantAmount || currentBaseToken < extraLiquidity) {
                require(cToken.redeemUnderlying(toRedeem) == 0, "Failed to redeem cToken");
            }
        }
    }

    function calculateInvestAmount(uint cTokenCash, uint cTokenBorrow, uint totalValue) view public returns (uint) {
        if (cTokenBorrow == 0) {
            // cToken is not been used? withdraw all
            return 0;
        }

        // targetLiquidityAmount = totalValue * minLiquidity
        uint targetLiquidityAmount = totalValue.mulPercent(minLiquidity);

        // a = cTokenBorrow + targetLiquidityAmount
        uint a = cTokenBorrow.add(targetLiquidityAmount);
        if (a <= totalValue) {
            // already more than enough liquidity in cToken, deposit all
            return totalValue;
        }

        // invest = ((totalValue - targetLiquidityAmount) * (cTokenCash + cTokenBorrow)) / (a - totalValue)
        uint invest = totalValue.sub(targetLiquidityAmount).mul(cTokenCash.add(cTokenBorrow)).div(a.sub(totalValue));
        if (invest > totalValue) {
            // liquidity in cToken is more than enough after we deposit all
            return totalValue;
        }

        return invest;
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