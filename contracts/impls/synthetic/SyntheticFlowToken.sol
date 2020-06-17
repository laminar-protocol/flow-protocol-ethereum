// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.6.10;

import "@openzeppelin/contracts-ethereum-package/contracts/Initializable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";

import "../../interfaces/MoneyMarketInterface.sol";
import "../../roles/ProtocolOwnable.sol";
import "../../libs/Percentage.sol";

contract SyntheticFlowToken is ProtocolOwnable, ERC20UpgradeSafe {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;
    using Percentage for uint256;

    uint256 private constant MAX_UINT = type(uint256).max;

    MoneyMarketInterface private moneyMarket;

    Percentage.Percent public extremeCollateralRatio;
    Percentage.Percent public liquidationCollateralRatio;
    Percentage.Percent public defaultCollateralRatio;

    struct LiquidityPoolPosition {
        uint256 collaterals;
        uint256 minted;
    }

    mapping(address => LiquidityPoolPosition) public liquidityPoolPositions;
    uint256 public totalPrincipalAmount; // collateral amount without interest
    uint256 public totalInterestShares;
    uint256 public totalInterestDebits;
    mapping(address => uint256) public interestShares;
    mapping(address => uint256) public interestDebits;
    mapping(address => uint256) public deposits;

    function initialize(
        string memory _name,
        string memory _symbol,
        MoneyMarketInterface _moneyMarket,
        address _protocol,
        uint256 _extremeCollateralRatio,
        uint256 _liquidationCollateralRatio,
        uint256 _defaultCollateralRatio
    ) public initializer {
        ProtocolOwnable.initialize(_protocol);
        ERC20UpgradeSafe.__ERC20_init(_name, _symbol);

        moneyMarket = _moneyMarket;

        moneyMarket.iToken().safeApprove(_protocol, MAX_UINT);

        extremeCollateralRatio = Percentage.Percent(_extremeCollateralRatio);
        liquidationCollateralRatio = Percentage.Percent(_liquidationCollateralRatio);
        defaultCollateralRatio = Percentage.Percent(_defaultCollateralRatio);
    }

    function setLiquidationCollateralRatio(uint256 percent) external onlyProtocol {
        liquidationCollateralRatio.value = percent;
    }

    function setExtremeCollateralRatio(uint256 percent) external onlyProtocol {
        extremeCollateralRatio.value = percent;
    }

    function setDefaultCollateralRatio(uint256 percent) external onlyProtocol {
        defaultCollateralRatio.value = percent;
    }

    function incentiveRatio(uint256 currentRatio) external view onlyProtocol returns (uint256) {
        if (currentRatio < Percentage.one()) {
            return 0;
        }
        uint256 additionalRatio = currentRatio - Percentage.one(); // underflow is checked above
        if (additionalRatio >= liquidationCollateralRatio.value) {
            // this shouldn't happen, but it is not an unrecoverable error
            return 0;
        }
        if (additionalRatio <= extremeCollateralRatio.value) {
            return Percentage.one();
        }
        uint256 ratio = liquidationCollateralRatio.value.sub(extremeCollateralRatio.value);
        return Percentage.fromFraction(ratio.sub(additionalRatio.sub(extremeCollateralRatio.value)), ratio).value;
    }

    function mint(address account, uint256 amount) external onlyProtocol {
        _mint(account, amount);
    }

    function burn(address account, uint256 amount) external onlyProtocol {
        _burn(account, amount);
    }

    function getPosition(address poolAddr) external view returns (uint256 collaterals, uint256 minted) {
        LiquidityPoolPosition storage position = liquidityPoolPositions[poolAddr];
        collaterals = position.collaterals;
        minted = position.minted;
    }

    function addPosition(
        address poolAddr,
        uint256 additonalCollaterals,
        uint256 additionalMinted,
        uint256 liquidityPoolShares
    ) external onlyProtocol {
        uint256 exchangeRate = interestShareExchangeRate();

        LiquidityPoolPosition storage position = liquidityPoolPositions[poolAddr];
        position.collaterals = position.collaterals.add(additonalCollaterals);
        position.minted = position.minted.add(additionalMinted);

        totalPrincipalAmount = totalPrincipalAmount.add(additonalCollaterals);
        _mintInterestShares(exchangeRate, poolAddr, liquidityPoolShares);
    }

    function removePosition(
        address poolAddr,
        uint256 collateralsToRemove,
        uint256 mintedToRemove
    ) external onlyProtocol returns (uint256) {
        uint256 exchangeRate = interestShareExchangeRate();

        LiquidityPoolPosition storage position = liquidityPoolPositions[poolAddr];
        uint256 prevMinted = position.minted;

        position.collaterals = position.collaterals.sub(collateralsToRemove);
        position.minted = position.minted.sub(mintedToRemove);

        totalPrincipalAmount = totalPrincipalAmount.sub(collateralsToRemove);
        (uint256 interestBaseTokenAmount, ) = _burnInterestShares(exchangeRate, poolAddr, Percentage.fromFraction(mintedToRemove, prevMinted));

        return interestBaseTokenAmount;
    }

    function _mintInterestShares(
        uint256 exchangeRate,
        address recipient,
        uint256 shares
    ) private {
        totalInterestShares = totalInterestShares.add(shares);
        interestShares[recipient] = interestShares[recipient].add(shares);

        uint256 debits = shares.mul(exchangeRate).div(1 ether);
        totalInterestDebits = totalInterestDebits.add(debits);
        interestDebits[recipient] = interestDebits[recipient].add(debits);
    }

    function _burnInterestShares(
        uint256 exchangeRate,
        address recipient,
        Percentage.Percent memory percentShare
    ) private returns (uint256, uint256) {
        uint256 prevShares = interestShares[recipient];

        uint256 sharesToBurn = prevShares.mulPercent(percentShare);

        uint256 oldShares = interestShares[recipient];
        uint256 newShares = oldShares.sub(sharesToBurn);

        uint256 oldDebits = interestDebits[recipient];
        uint256 interests = oldShares.mul(exchangeRate).div(1 ether).sub(oldDebits);
        uint256 newDebits = newShares.mul(exchangeRate).div(1 ether);

        totalInterestShares = totalInterestShares.sub(sharesToBurn);
        totalInterestDebits = totalInterestDebits.add(newDebits).sub(oldDebits);
        interestShares[recipient] = newShares;
        interestDebits[recipient] = newDebits;

        return (interests, sharesToBurn);
    }

    function interestShareExchangeRate() public view returns (uint256) {
        if (totalInterestShares == 0) {
            return 1 ether;
        }

        return
            moneyMarket
                .iToken()
                .balanceOf(address(this))
                .mul(moneyMarket.exchangeRate())
                .div(1 ether)
                .add(totalInterestDebits)
                .sub(totalPrincipalAmount)
                .mul(1 ether)
                .div(totalInterestShares);
    }

    function withdrawTo(address recipient, uint256 baseTokenAmount) external onlyProtocol {
        moneyMarket.redeemBaseTokenTo(recipient, baseTokenAmount);
    }

    function deposit(
        address sender,
        uint256 amount,
        uint256 price
    ) external onlyProtocol returns (uint256) {
        uint256 exchangeRate = interestShareExchangeRate();

        deposits[sender] = deposits[sender].add(amount);

        _transfer(sender, address(this), amount);
        uint256 shares = amount.mul(price).div(1 ether);
        _mintInterestShares(exchangeRate, sender, shares);
        return shares;
    }

    function withdraw(address sender, uint256 amount) external onlyProtocol returns (uint256) {
        uint256 exchangeRate = interestShareExchangeRate();
        uint256 senderDeposit = deposits[sender];
        deposits[sender] = senderDeposit.sub(amount);

        Percentage.Percent memory percentShare = Percentage.fromFraction(amount, senderDeposit);

        _transfer(address(this), sender, amount);

        (uint256 interestBaseTokenAmount, uint256 sharesToBurn) = _burnInterestShares(exchangeRate, sender, percentShare);
        moneyMarket.redeemBaseTokenTo(sender, interestBaseTokenAmount);
        return sharesToBurn;
    }
}
