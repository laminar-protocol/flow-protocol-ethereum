pragma solidity ^0.5.8;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20Detailed.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

import "../interfaces/MoneyMarketInterface.sol";
import "../roles/ProtocolOwnable.sol";
import "../libs/Percentage.sol";

contract FlowToken is ProtocolOwnable, ERC20, ERC20Detailed {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;
    using Percentage for uint256;

    uint constant MAX_UINT = 2**256 - 1;

    MoneyMarketInterface moneyMarket;

    Percentage.Percent public minCollateralRatio;
    Percentage.Percent public defaultCollateralRatio;

    struct LiquidityPoolPosition {
        uint collaterals;
        uint minted;
    }

    mapping (address => LiquidityPoolPosition) public liquidityPoolPositions;
    uint public totalPrincipalAmount; // collateral amount without interest
    uint public totalInterestShares;
    mapping (address => uint) public interestShares;
    mapping (address => uint) public interestDebits;

    constructor(
        string memory name,
        string memory symbol,
        MoneyMarketInterface moneyMarket_
    ) ERC20Detailed(name, symbol, 18) public {
        moneyMarket = moneyMarket_;

        moneyMarket.iToken().safeApprove(msg.sender, MAX_UINT);

        // TODO: from constructor parameter
        minCollateralRatio = Percentage.fromFraction(5, 100);
        defaultCollateralRatio = Percentage.fromFraction(10, 100);
    }

    function setMinCollateralRatio(uint percent) external onlyProtocol {
        minCollateralRatio.value = percent;
    }

    function setDefaultCollateralRatio(uint percent) external onlyProtocol {
        defaultCollateralRatio.value = percent;
    }

    function mint(address account, uint amount) external onlyProtocol {
        _mint(account, amount);
    }

    function burn(address account, uint amount) external onlyProtocol {
        _burn(account, amount);
    }

    function getPosition(address poolAddr) view external returns (uint collaterals, uint minted) {
        LiquidityPoolPosition storage position = liquidityPoolPositions[poolAddr];
        collaterals = position.collaterals;
        minted = position.minted;
    }

    function addPosition(address poolAddr, uint additonalCollaterals, uint additionaMinted, uint liquidityPoolShares) external onlyProtocol {
        LiquidityPoolPosition storage position = liquidityPoolPositions[poolAddr];
        position.collaterals = position.collaterals.add(additonalCollaterals);
        position.minted = position.minted.add(additionaMinted);

        totalPrincipalAmount = totalPrincipalAmount.add(additonalCollaterals);
        _mintInterestShares(poolAddr, liquidityPoolShares);
    }

    function removePosition(address poolAddr, uint collateralsToRemove, uint mintedToRemove) external onlyProtocol returns (uint) {
        LiquidityPoolPosition storage position = liquidityPoolPositions[poolAddr];
        uint prevMinted = position.minted;

        position.collaterals = position.collaterals.sub(collateralsToRemove);
        position.minted = position.minted.sub(mintedToRemove);

        totalPrincipalAmount = totalPrincipalAmount.sub(collateralsToRemove);

        uint interestBaseTokenAmount = _burnInterestShares(poolAddr, Percentage.fromFraction(mintedToRemove, prevMinted));

        return interestBaseTokenAmount;
    }

    function _mintInterestShares(address recipient, uint shares) private {
        totalInterestShares = totalInterestShares.add(shares);
        interestShares[recipient] = interestShares[recipient].add(shares);

        uint debits = shares.mul(interestShareExchangeRate()).div(1 ether);
        interestDebits[recipient] = interestDebits[recipient].add(debits);
    }

    function _burnInterestShares(address recipient, Percentage.Percent memory percentShare) private returns (uint) {
        uint prevShares = interestShares[recipient];

        uint sharesToBurn = prevShares.mulPercent(percentShare);
        uint sharesToBurnValue = sharesToBurn.mul(interestShareExchangeRate()).div(1 ether);

        uint newShares = interestShares[recipient].sub(sharesToBurn);
        
        uint oldDebits = interestDebits[recipient];
        uint newDebits = newShares.mul(interestShareExchangeRate()).div(1 ether);

        uint netValue = sharesToBurnValue.add(newDebits).sub(oldDebits);

        totalInterestShares = totalInterestShares.sub(sharesToBurn);
        interestShares[recipient] = newShares;
        interestDebits[recipient] = newDebits;

        return netValue;
    }

    function interestShareExchangeRate() public view returns (uint) {
        // totalBaseTokenAmount = iTokenAmount * iTokenExcahngeRate
        // totalInterest = totalBaseTokenAmount - totalPrincipalAmount
        // interestShareExchangeRate = totalInterest / totalInterestShares
        return moneyMarket.iToken().balanceOf(address(this))
            .mul(moneyMarket.exchangeRate()).div(1 ether)
            .sub(totalPrincipalAmount)
            .div(totalInterestShares);
    }

    function withdrawTo(address recipient, uint baseTokenAmount) external onlyProtocol {
        moneyMarket.redeemBaseTokenTo(recipient, baseTokenAmount);
    }

    function deposit(address sender, uint amount, uint price) external onlyProtocol {
        _transfer(sender, address(this), amount);
        uint shares = amount.mul(price).div(1 ether);
        _mintInterestShares(sender, shares);
    }

    function withdraw(address sender, uint amount) external onlyProtocol {
        _transfer(address(this), sender, amount);

        Percentage.Percent memory percentShare = Percentage.fromFraction(amount, interestShares[sender]);

        uint interestBaseTokenAmount = _burnInterestShares(sender, percentShare);
        moneyMarket.redeemBaseTokenTo(sender, interestBaseTokenAmount);
    }
}
