pragma solidity ^0.6.4;

import "@openzeppelin/contracts-ethereum-package/contracts/Initializable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/math/SignedSafeMath.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/math/Math.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/access/Ownable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/utils/ReentrancyGuard.sol";

import "@nomiclabs/buidler/console.sol";

import "../interfaces/CErc20Interface.sol";
import "../interfaces/MoneyMarketInterface.sol";
import "../libs/Percentage.sol";

import "./MintableToken.sol";

contract MoneyMarket is Initializable, OwnableUpgradeSafe, ReentrancyGuardUpgradeSafe, MoneyMarketInterface {
    using SafeMath for uint256;
    using SignedSafeMath for int256;
    using SafeERC20 for IERC20;
    using Percentage for uint256;

    uint256 constant private MAX_UINT = 2**256 - 1;

    IERC20 public _baseToken;
    IERC20 public _iToken;
    CErc20Interface public cToken;
    Percentage.Percent public insignificantPercent;
    Percentage.Percent public minLiquidity;

    function initialize(
        CErc20Interface _cToken,
        string memory _iTokenName,
        string memory _iTokenSymbol,
        uint256 _minLiquidity
    ) public initializer {
        OwnableUpgradeSafe.__Ownable_init();
        ReentrancyGuardUpgradeSafe.__ReentrancyGuard_init();

        _baseToken = IERC20(_cToken.underlying());
        MintableToken iToken = new MintableToken();
        iToken.initialize(_iTokenName, _iTokenSymbol);
        _iToken = IERC20(iToken);
        cToken = _cToken;

        // TODO: do we need to make this configurable and what should be the default value?
        insignificantPercent = Percentage.fromFraction(5, 100); // 5%
        minLiquidity.value = _minLiquidity;

        _baseToken.safeApprove(address(cToken), MAX_UINT);
    }

    function baseToken() external view override returns (IERC20) {
        return _baseToken;
    }

    function iToken() external view override returns (IERC20) {
        return _iToken;
    }

    function mint(uint _baseTokenAmount) external override returns (uint) {
        return mintTo(msg.sender, _baseTokenAmount);
    }

    function mintTo(address recipient, uint _baseTokenAmount) public nonReentrant override returns (uint) {
        uint iTokenAmount = convertAmountFromBase(exchangeRate(), _baseTokenAmount);

        _baseToken.safeTransferFrom(msg.sender, address(this), _baseTokenAmount);
        MintableToken(address(_iToken)).mint(recipient, iTokenAmount);

        _rebalance(0);

        emit Minted(recipient, _baseTokenAmount, iTokenAmount);

        return iTokenAmount;
    }

    function redeem(uint iTokenAmount) external override returns (uint) {
        return redeemTo(msg.sender, iTokenAmount);
    }

    function redeemTo(address recipient, uint iTokenAmount) public nonReentrant override returns (uint) {
        uint _baseTokenAmount = convertAmountToBase(exchangeRate(), iTokenAmount);

        MintableToken(address(_iToken)).burn(msg.sender, iTokenAmount);

        _rebalance(_baseTokenAmount);

        _baseToken.safeTransfer(recipient, _baseTokenAmount);

        emit Redeemed(recipient, _baseTokenAmount, iTokenAmount);

        return _baseTokenAmount;
    }

    function redeemBaseToken(uint _baseTokenAmount) external override returns (uint) {
        return redeemBaseTokenTo(msg.sender, _baseTokenAmount);
    }

    function redeemBaseTokenTo(address recipient, uint _baseTokenAmount) public nonReentrant override returns (uint) {
        uint iTokenAmount = convertAmountFromBase(exchangeRate(), _baseTokenAmount);

        MintableToken(address(_iToken)).burn(msg.sender, iTokenAmount);

        _rebalance(_baseTokenAmount);

        _baseToken.safeTransfer(recipient, _baseTokenAmount);

        emit Redeemed(recipient, _baseTokenAmount, iTokenAmount);

        return iTokenAmount;
    }

    function rebalance() external nonReentrant {
        _rebalance(0);
    }

    function setMinLiquidity(uint256 _newMinLiquidity) public onlyOwner {
        require(_newMinLiquidity >= 0 && _newMinLiquidity <= Percentage.one(), "Invalid minLiquidity");
        minLiquidity.value = _newMinLiquidity;
        _rebalance(0);
    }

    function _rebalance(uint extraLiquidity) private {
        uint cTokenExchangeRate = cToken.exchangeRateStored();
        uint currentCTokenValue = cToken.balanceOf(address(this)).mul(cTokenExchangeRate).div(1 ether);
        uint currentBaseToken = _baseToken.balanceOf(address(this));
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

    function calculateInvestAmount(uint cTokenCash, uint cTokenBorrow, uint totalValue) public view returns (uint) {
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

    function exchangeRate() public view override returns (uint) {
        uint totalSupply = _iToken.totalSupply();
        if (totalSupply == 0) {
            return 0.1 ether;
        }
        return totalHoldings().mul(1 ether).div(totalSupply);
    }

    function totalHoldings() public view override returns (uint) {
        uint256 cTokenBalance = cToken.balanceOf(address(this));
        uint256 exchangedCTokenBalance = cTokenBalance.mul(cToken.exchangeRateStored()).div(1 ether);
        uint256 baseTokenBalance = _baseToken.balanceOf(address(this));

        return exchangedCTokenBalance.add(baseTokenBalance);
    }

    function convertAmountFromBase(uint _baseTokenAmount) public view override returns (uint) {
        return convertAmountFromBase(exchangeRate(), _baseTokenAmount);
    }

    function convertAmountFromBase(int _baseTokenAmount) public view override returns (int) {
        return convertAmountFromBase(int(exchangeRate()), _baseTokenAmount);
    }

    function convertAmountFromBase(uint rate, uint _baseTokenAmount) public pure override returns (uint) {
        return _baseTokenAmount.mul(1 ether).div(rate);
    }

    function convertAmountFromBase(int rate, int _baseTokenAmount) public pure override returns (int) {
        return _baseTokenAmount.mul(int(1 ether)).div(rate);
    }

    function convertAmountToBase(uint iTokenAmount) public view override returns (uint) {
        return convertAmountToBase(exchangeRate(), iTokenAmount);
    }

    function convertAmountToBase(int iTokenAmount) public view override returns (int) {
        return convertAmountToBase(int(exchangeRate()), iTokenAmount);
    }

    function convertAmountToBase(uint rate, uint iTokenAmount) public pure override returns (uint) {
        return iTokenAmount.mul(rate).div(1 ether);
    }

    function convertAmountToBase(int rate, int iTokenAmount) public pure override returns (int) {
        return iTokenAmount.mul(rate).div(1 ether);
    }
}