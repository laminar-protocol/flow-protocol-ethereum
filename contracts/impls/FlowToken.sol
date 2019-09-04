pragma solidity ^0.5.8;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20Detailed.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

import "../roles/ProtocolOwnable.sol";
import "../libs/Percentage.sol";

contract FlowToken is ProtocolOwnable, ERC20, ERC20Detailed {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    uint constant MAX_UINT = 2**256 - 1;

    Percentage.Percent public minCollateralRatio;
    Percentage.Percent public defaultCollateralRatio;

    struct LiquidityPoolPosition {
        uint collaterals;
        uint minted;
    }

    mapping (address => LiquidityPoolPosition) public liquidityPoolPositions;

    constructor(
        string memory name,
        string memory symbol,
        IERC20 baseToken
    ) ERC20Detailed(name, symbol, 18) public {
        baseToken.safeApprove(msg.sender, MAX_UINT);

        // TODO: from constructor parameter
        minCollateralRatio = Percentage.fromFraction(105, 100);
        defaultCollateralRatio = Percentage.fromFraction(110, 100);
    }

    function setMinCollateralRatio(uint percent) external onlyProtocol {
        require(percent > Percentage.one(), "minCollateralRatio must be greater than 100%");
        minCollateralRatio.value = percent;
    }

    function setDefaultCollateralRatio(uint percent) external onlyProtocol {
        require(percent > Percentage.one(), "defaultCollateralRatio must be greater than 100%");
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

    function addPosition(address poolAddr, uint additonalCollaterals, uint additionaMinted) external onlyProtocol {
        LiquidityPoolPosition storage position = liquidityPoolPositions[poolAddr];
        position.collaterals = position.collaterals.add(additonalCollaterals);
        position.minted = position.minted.add(additionaMinted);
    }

    function removePosition(address poolAddr, uint collateralsToRemove, uint mintedToRemove) external onlyProtocol {
        LiquidityPoolPosition storage position = liquidityPoolPositions[poolAddr];
        position.collaterals = position.collaterals.sub(collateralsToRemove);
        position.minted = position.minted.sub(mintedToRemove);
    }
}
