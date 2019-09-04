pragma solidity ^0.5.8;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/ownership/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/math/Math.sol";

import "../libs/Percentage.sol";
import "../interfaces/FlowProtocolInterface.sol";
import "../interfaces/LiquidityPoolInterface.sol";
import "../interfaces/PriceOracleInterface.sol";
import "../roles/ProtocolOwnable.sol";
import "./FlowToken.sol";

contract FlowProtocol is FlowProtocolInterface, Ownable {
    using SafeMath for uint256;
    using Percentage for uint256;
    using SafeERC20 for IERC20;

    PriceOracle public oracle;
    IERC20 public baseToken;
    mapping (string => FlowToken) public tokens;

    constructor(PriceOracle oracle_, IERC20 baseToken_) public {
        oracle = oracle_;
        baseToken = baseToken_;
    }

    function createFlowToken(string memory name, string memory symbol) public onlyOwner {
        require(address(tokens[name]) == address(0), "already exists");
        FlowToken token = new FlowToken(name, symbol, baseToken);
        tokens[symbol] = token;
    }

    function deposit(FlowToken token, LiquidityPoolInterface pool, uint baseTokenAmount) public {
        address poolAddr = address(pool);
        address tokenAddr = address(token);
        uint price = getPrice(tokenAddr);

        uint spread = pool.getSpread(tokenAddr);
        uint askPrice = price.add(spread);
        uint flowTokenAmount = baseTokenAmount.mul(1 ether).div(askPrice);
        // TODO: maybe should be: flowTokenAmount * price * collateralRatio? use mid price instead of ask price
        uint additionalCollateralAmount = baseTokenAmount.mulPercent(getCollateralRatio(token, pool)).sub(baseTokenAmount);

        uint totalCollateralAmount = baseTokenAmount.add(additionalCollateralAmount);
        token.addPosition(poolAddr, totalCollateralAmount, flowTokenAmount);

        baseToken.safeTransferFrom(msg.sender, tokenAddr, baseTokenAmount);
        baseToken.safeTransferFrom(poolAddr, tokenAddr, additionalCollateralAmount);
        token.mint(msg.sender, flowTokenAmount);
    }

    function withdraw(FlowToken token, LiquidityPoolInterface pool, uint flowTokenAmount) public {
        address poolAddr = address(pool);
        address tokenAddr = address(token);
        uint price = getPrice(tokenAddr);

        uint spread = pool.getSpread(tokenAddr);
        uint bidPrice = price.sub(spread);
        uint baseTokenAmount = flowTokenAmount.mul(bidPrice).div(1 ether);

        uint collateralsToRemove;
        uint refundToPool;
        (collateralsToRemove, refundToPool) = _calculateRemovePosition(token, pool, price, flowTokenAmount, baseTokenAmount);

        token.removePosition(poolAddr, collateralsToRemove, flowTokenAmount);

        baseToken.safeTransferFrom(tokenAddr, poolAddr, refundToPool);
        baseToken.safeTransferFrom(tokenAddr, msg.sender, baseTokenAmount);

        token.burn(msg.sender, flowTokenAmount);
    }

    function _calculateRemovePosition(FlowToken token, LiquidityPoolInterface pool, uint price, uint flowTokenAmount, uint baseTokenAmount) private view returns (uint collateralsToRemove, uint refundToPool) {
        uint collaterals;
        uint minted;
        (collaterals, minted) = token.getPosition(address(pool));

        require(minted >= flowTokenAmount, "Liquidity pool does not have enough position");

        uint mintedAfter = minted.sub(flowTokenAmount);

        uint mintedValue = mintedAfter.mul(price).div(1 ether);
        uint requiredCollaterals = mintedValue.mulPercent(getCollateralRatio(token, pool));
        collateralsToRemove = baseTokenAmount;
        refundToPool = 0;
        if (requiredCollaterals <= collaterals) {
            collateralsToRemove = collaterals.sub(requiredCollaterals);
            refundToPool = collateralsToRemove.sub(baseTokenAmount);
        } else {
            // TODO: position is unsafe, do we want to do anything?
        }
    }

    function getCollateralRatio(FlowToken token, LiquidityPoolInterface pool) internal view returns (Percentage.Percent memory) {
        uint ratio = pool.getCollateralRatio(address(token));
        return Percentage.Percent(Math.max(ratio, token.defaultCollateralRatio()));
    }

    function getPrice(address tokenAddr) internal view returns (uint) {
        uint price = oracle.getPrice(tokenAddr);
        require(price > 0, "no oracle price");
        return price;
    }
}