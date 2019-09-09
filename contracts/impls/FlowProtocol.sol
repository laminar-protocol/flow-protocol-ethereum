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
import "./MoneyMarket.sol";

contract FlowProtocol is FlowProtocolInterface, Ownable {
    using SafeMath for uint256;
    using Percentage for uint256;
    using SafeERC20 for IERC20;

    PriceOracleInterface public oracle;
    IERC20 public baseToken;
    MoneyMarket public moneyMarket;

    mapping (string => FlowToken) public tokens;

    constructor(PriceOracleInterface oracle_, IERC20 baseToken_, MoneyMarket moneyMarket_) public {
        oracle = oracle_;
        baseToken = baseToken_;
        moneyMarket = moneyMarket_;
    }

    function createFlowToken(string calldata name, string calldata symbol) external onlyOwner {
        require(address(tokens[name]) == address(0), "already exists");
        FlowToken token = new FlowToken(name, symbol, baseToken);
        tokens[symbol] = token;
    }

    function deposit(FlowToken token, LiquidityPoolInterface pool, uint baseTokenAmount) external {
        require(baseToken.balanceOf(msg.sender) >= baseTokenAmount, "Not enough balance");

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

    function withdraw(FlowToken token, LiquidityPoolInterface pool, uint flowTokenAmount) external {
        require(token.balanceOf(msg.sender) >= flowTokenAmount, "Not enough balance");

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

    function liquidate(FlowToken token, LiquidityPoolInterface pool, uint flowTokenAmount) external {
        require(token.balanceOf(msg.sender) >= flowTokenAmount, "Not enough balance");

        address poolAddr = address(pool);
        address tokenAddr = address(token);
        uint price = getPrice(tokenAddr);

        uint spread = pool.getSpread(tokenAddr);
        uint bidPrice = price.sub(spread);
        uint baseTokenAmount = flowTokenAmount.mul(bidPrice).div(1 ether);

        uint collateralsToRemove;
        uint refundToPool;
        uint incentive;
        (collateralsToRemove, refundToPool, incentive) = _calculateRemovePositionAndIncentive(token, pool, price, flowTokenAmount, baseTokenAmount);

        token.removePosition(poolAddr, collateralsToRemove, flowTokenAmount);

        if (refundToPool > 0) {
            baseToken.safeTransferFrom(tokenAddr, poolAddr, refundToPool);
        }
        baseToken.safeTransferFrom(tokenAddr, msg.sender, baseTokenAmount.add(incentive));

        token.burn(msg.sender, flowTokenAmount);
    }

    function addCollateral(FlowToken token, address poolAddr, uint amount) external {
        baseToken.safeTransferFrom(msg.sender, address(token), amount);
        token.addPosition(poolAddr, amount, 0);
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
        }
    }

    function _calculateRemovePositionAndIncentive(FlowToken token, LiquidityPoolInterface pool, uint price, uint flowTokenAmount, uint baseTokenAmount) private view returns (uint collateralsToRemove, uint refundToPool, uint incentive) {
        uint collaterals;
        uint minted;
        (collaterals, minted) = token.getPosition(address(pool));

        require(minted >= flowTokenAmount, "Liquidity pool does not have enough position");

        Percentage.Percent memory currentRatio = getCurrentCollateralRatio(collaterals, minted, price);

        require(currentRatio.value < token.minCollateralRatio(), "Still in a safe position");

        uint mintedAfter = minted.sub(flowTokenAmount);
        uint mintedAfterValue = mintedAfter.mul(price).div(1 ether);

        collateralsToRemove = baseTokenAmount;
        refundToPool = 0;
        incentive = 0;
        uint newCollaterals = collaterals.sub(collateralsToRemove);
        uint withCurrentRatio = mintedAfterValue.mulPercent(currentRatio);
        
        if (newCollaterals > withCurrentRatio) {
            uint availableForIncentive = newCollaterals.sub(withCurrentRatio);
            incentive = availableForIncentive / 2; // TODO: maybe need a better formula
            refundToPool = availableForIncentive.sub(incentive);
            collateralsToRemove = collateralsToRemove.add(incentive).add(refundToPool);
        } // else no more incentive can be given
    }

    function getCurrentCollateralRatio(uint collaterals, uint minted, uint price) internal pure returns (Percentage.Percent memory) {
        uint mintedValue = minted.mul(price).div(1 ether);
        return Percentage.fromFraction(collaterals, mintedValue);
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