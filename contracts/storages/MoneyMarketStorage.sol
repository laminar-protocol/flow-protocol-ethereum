pragma solidity ^0.6.3;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";

import "../libs/Percentage.sol";
import "../interfaces/CErc20Interface.sol";
import "../impls/MintableToken.sol";

contract MoneyMarketStorage {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;
    using Percentage for uint256;

    // DO NOT CHANGE ORDER WHEN UPDATING, ONLY ADDING NEW VARIABLES IS ALLOWED
    uint256 constant private MAX_UINT = 2**256 - 1;
    address public owner;
    bool public notEntered;

    IERC20 public _baseToken;
    IERC20 public _iToken;
    CErc20Interface public cToken;
    Percentage.Percent public insignificantPercent;
    Percentage.Percent public minLiquidity;

    constructor(
        CErc20Interface _cToken,
        string memory _iTokenName,
        string memory _iTokenSymbol,
        uint256 _minLiquidity,
        bool _isStorageInstance
    ) public {
        if (_isStorageInstance) {
            owner = msg.sender;
            notEntered = true;
            _baseToken = IERC20(_cToken.underlying());
            _iToken = IERC20(new MintableToken(_iTokenName, _iTokenSymbol));
            cToken = _cToken;

            // TODO: do we need to make this configurable and what should be the default value?
            insignificantPercent = Percentage.fromFraction(5, 100); // 5%
            minLiquidity.value = _minLiquidity;

            _baseToken.safeApprove(address(cToken), MAX_UINT);
        }
    }
}