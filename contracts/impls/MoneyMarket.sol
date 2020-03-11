pragma solidity ^0.6.3;
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
import "./LaminarStorage.sol";

contract MoneyMarket is MoneyMarketInterface, Ownable, ReentrancyGuard {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;
    using Percentage for uint256;

    uint256 constant private MAX_UINT = 2**256 - 1;
    uint256 private MONEY_MARKET_ID;

    function baseToken() external view override returns (IERC20) {
        return _baseToken;
    }

    function iToken() external view override returns (IERC20) {
        return _iToken;
    }

    IERC20 private _baseToken;
    IERC20 private _iToken;
    CErc20Interface public cToken;

    LaminarStorage public laminarStorage;

    Percentage.Percent private insignificantPercent;

    constructor(
        LaminarStorage _laminarStorage,
        CErc20Interface cToken_,
        string memory iTokenName,
        string memory iTokenSymbol
    ) public {
        laminarStorage = LaminarStorage(_laminarStorage);

        cToken = cToken_;
        _baseToken = IERC20(cToken_.underlying());
        _iToken = IERC20(new MintableToken(iTokenName, iTokenSymbol));
        _baseToken.safeApprove(address(cToken), MAX_UINT);

        // TODO: do we need to make this configurable and what should be the default value?
        insignificantPercent = Percentage.fromFraction(5, 100); // 5%
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

    function redeemBaseToken(uint _baseTokenAmount) external override {
        redeemBaseTokenTo(msg.sender, _baseTokenAmount);
    }

    function redeemBaseTokenTo(address recipient, uint _baseTokenAmount) public nonReentrant override {
        uint iTokenAmount = convertAmountFromBase(exchangeRate(), _baseTokenAmount);

        MintableToken(address(_iToken)).burn(msg.sender, iTokenAmount);

        _rebalance(_baseTokenAmount);

        _baseToken.safeTransfer(recipient, _baseTokenAmount);

        emit Redeemed(recipient, _baseTokenAmount, iTokenAmount);
    }

    function rebalance() external nonReentrant {
        _rebalance(0);
    }

    function getMinLiquidityValue() public view returns(uint256) {
        return laminarStorage.getUint256(
            keccak256(abi.encodePacked("min_liquidity", MONEY_MARKET_ID))
        );
    }

    function _getMinLiquidityPercentage() private view returns(Percentage.Percent memory) {
        Percentage.Percent memory minLiquidity;
        minLiquidity.value = getMinLiquidityValue();

        return minLiquidity;
    } 
	
    function setMinLiquidity(uint256 _newMinLiquidity) public onlyOwner {
        require(_newMinLiquidity >= 0 && _newMinLiquidity <= Percentage.one(), "Invalid minLiquidity");        

        laminarStorage.setUint256(
            keccak256(abi.encodePacked("min_liquidity", MONEY_MARKET_ID)),
            _newMinLiquidity
        );

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
        uint targetLiquidityAmount = totalValue.mulPercent(_getMinLiquidityPercentage());

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

    function totalHoldings() public view returns (uint) {
        return cToken.balanceOf(address(this)).mul(cToken.exchangeRateStored()).div(1 ether).add(_baseToken.balanceOf(address(this)));
    }

    function convertAmountFromBase(uint rate, uint _baseTokenAmount) public override pure returns (uint) {
        return _baseTokenAmount.mul(1 ether).div(rate);
    }
    function convertAmountToBase(uint rate, uint iTokenAmount) public override pure returns (uint) {
        return iTokenAmount.mul(rate).div(1 ether);
    }
}
