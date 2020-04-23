pragma solidity ^0.6.4;

import "@openzeppelin/upgrades/contracts/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

import "../../interfaces/MoneyMarketInterface.sol";
import "../../roles/ProtocolOwnable.sol";
import "../../libs/Percentage.sol";
import "../../libs/upgrades/ERC20DetailedUpgradable.sol";

contract SyntheticFlowToken is ProtocolOwnable, ERC20, ERC20DetailedUpgradable {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;
    using Percentage for uint256;

    uint constant MAX_UINT = 2**256 - 1;

    MoneyMarketInterface moneyMarket;

    Percentage.Percent public extremeCollateralRatio;
    Percentage.Percent public liquidationCollateralRatio;
    Percentage.Percent public defaultCollateralRatio;

    struct LiquidityPoolPosition {
        uint collaterals;
        uint minted;
    }

    mapping (address => LiquidityPoolPosition) public liquidityPoolPositions;
    uint public totalPrincipalAmount; // collateral amount without interest
    uint public totalInterestShares;
    uint public totalInterestDebits;
    mapping (address => uint) public interestShares;
    mapping (address => uint) public interestDebits;
    mapping (address => uint) public deposits;

    function initialize(
        string memory _name,
        string memory _symbol,
        MoneyMarketInterface _moneyMarket,
        address _protocol
    ) public initializer {
        ProtocolOwnable.initialize(_protocol);
        ERC20DetailedUpgradable.initialize(_name, _symbol, 18);

        moneyMarket = _moneyMarket;

        moneyMarket.iToken().safeApprove(_protocol, MAX_UINT);

        // TODO: from constructor parameter
        extremeCollateralRatio = Percentage.fromFraction(1, 100);
        liquidationCollateralRatio = Percentage.fromFraction(5, 100);
        defaultCollateralRatio = Percentage.fromFraction(10, 100);
    }

    function setLiquidationCollateralRatio(uint percent) external onlyProtocol {
        liquidationCollateralRatio.value = percent;
    }

    function setExtremeCollateralRatio(uint percent) external onlyProtocol {
        extremeCollateralRatio.value = percent;
    }

    function setDefaultCollateralRatio(uint percent) external onlyProtocol {
        defaultCollateralRatio.value = percent;
    }

    function incentiveRatio(uint currentRatio) external view onlyProtocol returns (uint) {
        if (currentRatio < Percentage.one()) {
            return 0;
        }
        uint additionalRatio = currentRatio - Percentage.one(); // underflow is checked above
        if (additionalRatio >= liquidationCollateralRatio.value) {
            // this shouldn't happen, but it is not an unrecoverable error
            return 0;
        }
        if (additionalRatio <= extremeCollateralRatio.value) {
            return Percentage.one();
        }
        uint ratio = liquidationCollateralRatio.value.sub(extremeCollateralRatio.value);
        return Percentage.fromFraction(
            ratio.sub(additionalRatio.sub(extremeCollateralRatio.value)),
            ratio
        ).value;
    }

    function mint(address account, uint amount) external onlyProtocol {
        _mint(account, amount);
    }

    function burn(address account, uint amount) external onlyProtocol {
        _burn(account, amount);
    }

    function getPosition(address poolAddr) external view returns (uint collaterals, uint minted) {
        LiquidityPoolPosition storage position = liquidityPoolPositions[poolAddr];
        collaterals = position.collaterals;
        minted = position.minted;
    }

    function addPosition(address poolAddr, uint additonalCollaterals, uint additionaMinted, uint liquidityPoolShares) external onlyProtocol {
        uint exchangeRate = interestShareExchangeRate();

        LiquidityPoolPosition storage position = liquidityPoolPositions[poolAddr];
        position.collaterals = position.collaterals.add(additonalCollaterals);
        position.minted = position.minted.add(additionaMinted);

        totalPrincipalAmount = totalPrincipalAmount.add(additonalCollaterals);
        _mintInterestShares(exchangeRate, poolAddr, liquidityPoolShares);
    }

    function removePosition(address poolAddr, uint collateralsToRemove, uint mintedToRemove) external onlyProtocol returns (uint) {
        uint exchangeRate = interestShareExchangeRate();

        LiquidityPoolPosition storage position = liquidityPoolPositions[poolAddr];
        uint prevMinted = position.minted;

        position.collaterals = position.collaterals.sub(collateralsToRemove);
        position.minted = position.minted.sub(mintedToRemove);

        totalPrincipalAmount = totalPrincipalAmount.sub(collateralsToRemove);
        (uint interestBaseTokenAmount, ) = _burnInterestShares(exchangeRate, poolAddr, Percentage.fromFraction(mintedToRemove, prevMinted));

        return interestBaseTokenAmount;
    }

    function _mintInterestShares(uint exchangeRate, address recipient, uint shares) private {
        totalInterestShares = totalInterestShares.add(shares);
        interestShares[recipient] = interestShares[recipient].add(shares);

        uint debits = shares.mul(exchangeRate).div(1 ether);
        totalInterestDebits = totalInterestDebits.add(debits);
        interestDebits[recipient] = interestDebits[recipient].add(debits);
    }

    function _burnInterestShares(uint exchangeRate, address recipient, Percentage.Percent memory percentShare) private returns (uint, uint) {
        uint prevShares = interestShares[recipient];

        uint sharesToBurn = prevShares.mulPercent(percentShare);

        uint oldShares = interestShares[recipient];
        uint newShares = oldShares.sub(sharesToBurn);

        uint oldDebits = interestDebits[recipient];
        uint interests = oldShares.mul(exchangeRate).div(1 ether).sub(oldDebits);
        uint newDebits = newShares.mul(exchangeRate).div(1 ether);

        totalInterestShares = totalInterestShares.sub(sharesToBurn);
        totalInterestDebits = totalInterestDebits.add(newDebits).sub(oldDebits);
        interestShares[recipient] = newShares;
        interestDebits[recipient] = newDebits;

        return (interests, sharesToBurn);
    }

    function interestShareExchangeRate() public view returns (uint) {
        if (totalInterestShares == 0) {
            return 1 ether;
        }

        return moneyMarket.iToken().balanceOf(address(this))
            .mul(moneyMarket.exchangeRate()).div(1 ether)
            .add(totalInterestDebits)
            .sub(totalPrincipalAmount)
            .mul(1 ether).div(totalInterestShares);
    }

    function withdrawTo(address recipient, uint baseTokenAmount) external onlyProtocol {
        moneyMarket.redeemBaseTokenTo(recipient, baseTokenAmount);
    }

    function deposit(address sender, uint amount, uint price) external onlyProtocol returns (uint) {
        uint exchangeRate = interestShareExchangeRate();

        deposits[sender] = deposits[sender].add(amount);

        _transfer(sender, address(this), amount);
        uint shares = amount.mul(price).div(1 ether);
        _mintInterestShares(exchangeRate, sender, shares);
        return shares;
    }

    function withdraw(address sender, uint amount) external onlyProtocol returns (uint) {
        uint exchangeRate = interestShareExchangeRate();
        uint senderDeposit = deposits[sender];
        deposits[sender] = senderDeposit.sub(amount);

        Percentage.Percent memory percentShare = Percentage.fromFraction(amount, senderDeposit);

        _transfer(address(this), sender, amount);

        (uint interestBaseTokenAmount, uint sharesToBurn) = _burnInterestShares(exchangeRate, sender, percentShare);
        moneyMarket.redeemBaseTokenTo(sender, interestBaseTokenAmount);
        return sharesToBurn;
    }
}
