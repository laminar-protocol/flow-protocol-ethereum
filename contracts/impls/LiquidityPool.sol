pragma solidity ^0.5.8;

import "@openzeppelin/contracts/ownership/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";

import "../interfaces/CErc20Interface.sol";

contract LiquidityPool is Ownable {
    using SafeERC20 for IERC20;

    uint constant MAX_UINT = 2**256 - 1;

    CErc20Interface cToken;
    uint private spread;
    uint private collateralRatio;

    mapping (address => bool) private allowedTokens;

    constructor(address protocol, CErc20Interface cToken_, uint spread_, address[] memory fTokens) public {        
        cToken = cToken_;
        spread = spread_;
        collateralRatio = 0; // use fToken default

        IERC20 baseToken = IERC20(cToken.underlying());
        require(cToken.approve(protocol, MAX_UINT), "cToken failed to approve");
        baseToken.safeApprove(address(cToken), MAX_UINT);

        for (uint i = 0; i < fTokens.length; i++) {
            allowedTokens[fTokens[i]] = true;
        }
    }

    function getBidSpread(address fToken) external view returns (uint) {
        if (allowedTokens[fToken]) {
            return spread;
        }
        return 0;
    }

    function getAskSpread(address fToken) external view returns (uint) {
        if (allowedTokens[fToken]) {
            return spread;
        }
        return 0;
    }

    function getAdditoinalCollateralRatio(address fToken) external view returns (uint) {
        if (allowedTokens[fToken]) {
            return collateralRatio;
        }
        return 0;
    }

    function setSpread(uint value) external onlyOwner {
        spread = value;
    }

    function setCollateralRatio(uint value) external onlyOwner {
        collateralRatio = value;
    }

    function enableToken(address token) external onlyOwner {
        allowedTokens[token] = true;
    }

    function disableToken(address token) external onlyOwner {
        allowedTokens[token] = false;
    }

    function deposit(uint amount) external {
        IERC20 baseToken = IERC20(cToken.underlying());
        baseToken.safeTransferFrom(msg.sender, address(this), amount);
        require(cToken.mint(amount) == 0, "Failed to mint cToken");
    }

    function withdrawBaseToken(uint amount) external onlyOwner {
        IERC20 baseToken = IERC20(cToken.underlying());
        baseToken.safeTransfer(msg.sender, amount);
    }

    function withdrawCToken(uint amount) external onlyOwner {
        require(cToken.transfer(msg.sender, amount), "Failed to transfer cToken");
    }
}