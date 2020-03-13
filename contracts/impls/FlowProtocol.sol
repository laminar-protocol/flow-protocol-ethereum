pragma solidity ^0.6.3;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/math/Math.sol";

import "../libs/Percentage.sol";
import "../interfaces/LiquidityPoolInterface.sol";
import "../interfaces/PriceOracleInterface.sol";
import "../interfaces/MoneyMarketInterface.sol";
import "./FlowToken.sol";
import "./FlowProtocolBase.sol";

contract FlowProtocol is FlowProtocolBase {
    using SafeMath for uint256;
    using Percentage for uint256;
    using SafeERC20 for IERC20;

    mapping (string => FlowToken) public tokens;
    mapping (address => bool) public tokenWhitelist;

    event NewFlowToken(address indexed token);
    event Minted(address indexed sender, address indexed token, address indexed liquidityPool, uint baseTokenAmount, uint flowTokenAmount);
    event Redeemed(address indexed sender, address indexed token, address indexed liquidityPool, uint baseTokenAmount, uint flowTokenAmount);
    event Liquidated(address indexed sender, address indexed token, address indexed liquidityPool, uint baseTokenAmount, uint flowTokenAmount);
    event CollateralAdded(address indexed token, address indexed liquidityPool, uint baseTokenAmount, uint iTokenAmount);
    event CollateralWithdrew(address indexed token, address indexed liquidityPool, uint baseTokenAmount, uint iTokenAmount);
    event FlowTokenDeposited(address indexed sender, address indexed token, uint baseTokenAmount, uint flowTokenAmount);
    event FlowTokenWithdrew(address indexed sender, address indexed token, uint baseTokenAmount, uint flowTokenAmount);

    function addFlowToken(FlowToken token) external onlyOwner {
        string memory symbol = token.symbol();
        require(address(tokens[symbol]) == address(0), "already exists");
        tokens[symbol] = token;
        tokenWhitelist[address(token)] = true;

        emit NewFlowToken(address(token));
    }

    function mint(FlowToken token, LiquidityPoolInterface pool, uint baseTokenAmount) external nonReentrant returns (uint) {
        IERC20 baseToken = moneyMarket.baseToken();

        require(baseToken.balanceOf(msg.sender) >= baseTokenAmount, "Not enough balance");
        require(tokenWhitelist[address(token)], "FlowToken not in whitelist");

        uint price = getPrice(address(token));

        uint askPrice = getAskPrice(pool, address(token), price);
        uint flowTokenAmount = baseTokenAmount.mul(1 ether).div(askPrice);
        uint flowTokenCurrentValue = flowTokenAmount.mul(price).div(1 ether);
        uint additionalCollateralAmount = _calcAdditionalCollateralAmount(flowTokenCurrentValue, token, pool, baseTokenAmount);
        uint additionalCollateralITokenAmount = moneyMarket.convertAmountFromBase(moneyMarket.exchangeRate(), additionalCollateralAmount);

        uint totalCollateralAmount = baseTokenAmount.add(additionalCollateralAmount);

        token.addPosition(address(pool), totalCollateralAmount, flowTokenAmount, additionalCollateralAmount);

        baseToken.safeTransferFrom(msg.sender, address(this), baseTokenAmount);
        moneyMarket.mintTo(address(token), baseTokenAmount);
        moneyMarket.iToken().safeTransferFrom(address(pool), address(token), additionalCollateralITokenAmount);
        token.mint(msg.sender, flowTokenAmount);

        emit Minted(msg.sender, address(token), address(pool), baseTokenAmount, flowTokenAmount);

        return flowTokenAmount;
    }

    function _calcAdditionalCollateralAmount(
        uint flowTokenCurrentValue,
        FlowToken token,
        LiquidityPoolInterface pool,
        uint baseTokenAmount
    ) private view returns (uint) {
        return flowTokenCurrentValue.mulPercent(getAdditionalCollateralRatio(token, pool)).add(flowTokenCurrentValue).sub(baseTokenAmount);
    }

    function redeem(FlowToken token, LiquidityPoolInterface pool, uint flowTokenAmount) external nonReentrant returns (uint) {
        IERC20 iToken = moneyMarket.iToken();

        require(token.balanceOf(msg.sender) >= flowTokenAmount, "Not enough balance");
        require(tokenWhitelist[address(token)], "FlowToken not in whitelist");

        uint price = getPrice(address(token));

        uint bidPrice = getBidPrice(pool, address(token), price);
        uint baseTokenAmount = flowTokenAmount.mul(bidPrice).div(1 ether);

        uint collateralsToRemove;
        uint refundToPool;
        (collateralsToRemove, refundToPool) = _calculateRemovePosition(token, pool, price, flowTokenAmount, baseTokenAmount);

        uint interest = token.removePosition(address(pool), collateralsToRemove, flowTokenAmount);
        refundToPool = refundToPool.add(interest);

        uint refundToPoolITokenAmount = moneyMarket.convertAmountFromBase(moneyMarket.exchangeRate(), refundToPool);
        iToken.safeTransferFrom(address(token), address(pool), refundToPoolITokenAmount);
        token.withdrawTo(msg.sender, baseTokenAmount);

        token.burn(msg.sender, flowTokenAmount);

        emit Redeemed(msg.sender, address(token), address(pool), baseTokenAmount, flowTokenAmount);

        return baseTokenAmount;
    }

    function liquidate(FlowToken token, LiquidityPoolInterface pool, uint flowTokenAmount) external nonReentrant returns (uint) {
        require(token.balanceOf(msg.sender) >= flowTokenAmount, "Not enough balance");
        require(tokenWhitelist[address(token)], "FlowToken not in whitelist");

        uint price = getPrice(address(token));

        uint bidPrice = getBidPrice(pool, address(token), price);
        uint baseTokenAmount = flowTokenAmount.mul(bidPrice).div(1 ether);

        uint collateralsToRemove;
        uint refundToPool;
        uint incentive;
        (collateralsToRemove, refundToPool, incentive) = _calculateRemovePositionAndIncentive(token, pool, price, flowTokenAmount, baseTokenAmount);

        uint interest = token.removePosition(address(pool), collateralsToRemove, flowTokenAmount);
        refundToPool = refundToPool.add(interest);

        uint refundToPoolITokenAmount = moneyMarket.convertAmountFromBase(moneyMarket.exchangeRate(), refundToPool);
        moneyMarket.iToken().safeTransferFrom(address(token), address(pool), refundToPoolITokenAmount);
        token.withdrawTo(msg.sender, baseTokenAmount.add(incentive));

        token.burn(msg.sender, flowTokenAmount);

        emit Liquidated(msg.sender, address(token), address(pool), baseTokenAmount, flowTokenAmount);

        return baseTokenAmount;
    }

    function addCollateral(FlowToken token, address poolAddr, uint baseTokenAmount) external nonReentrant {
        require(tokenWhitelist[address(token)], "FlowToken not in whitelist");

        uint iTokenAmount = moneyMarket.convertAmountFromBase(moneyMarket.exchangeRate(), baseTokenAmount);

        token.addPosition(poolAddr, baseTokenAmount, 0, baseTokenAmount);
        moneyMarket.iToken().safeTransferFrom(msg.sender, address(token), iTokenAmount);

        emit CollateralAdded(address(token), poolAddr, baseTokenAmount, iTokenAmount);
    }

    function withdrawCollateral(FlowToken token) external nonReentrant returns (uint) {
        require(tokenWhitelist[address(token)], "FlowToken not in whitelist");

        IERC20 iToken = moneyMarket.iToken();

        LiquidityPoolInterface pool = LiquidityPoolInterface(msg.sender);
        address tokenAddr = address(token);
        uint price = getPrice(tokenAddr);

        uint collateralsToRemove;
        uint refundToPool;
        (collateralsToRemove, refundToPool) = _calculateRemovePosition(token, pool, price, 0, 0);
        uint interest = token.removePosition(msg.sender, collateralsToRemove, 0);
        refundToPool = refundToPool.add(interest);

        uint refundToPoolITokenAmount = moneyMarket.convertAmountFromBase(moneyMarket.exchangeRate(), refundToPool);
        iToken.safeTransferFrom(tokenAddr, msg.sender, refundToPoolITokenAmount);

        emit CollateralWithdrew(address(token), msg.sender, refundToPool, refundToPoolITokenAmount);

        return refundToPoolITokenAmount;
    }

    function deposit(FlowToken token, uint flowTokenAmount) external nonReentrant {
        require(token.balanceOf(msg.sender) >= flowTokenAmount, "Not enough balance");
        require(tokenWhitelist[address(token)], "FlowToken not in whitelist");

        uint price = getPrice(address(token));

        uint baseTokenAmount = token.deposit(msg.sender, flowTokenAmount, price);

        emit FlowTokenDeposited(msg.sender, address(token), baseTokenAmount, flowTokenAmount);
    }

    function withdraw(FlowToken token, uint flowTokenAmount) external nonReentrant {
        require(tokenWhitelist[address(token)], "FlowToken not in whitelist");

        uint baseTokenAmount = token.withdraw(msg.sender, flowTokenAmount);

        emit FlowTokenWithdrew(msg.sender, address(token), baseTokenAmount, flowTokenAmount);
    }

    function _calculateRemovePosition(
        FlowToken token,
        LiquidityPoolInterface pool,
        uint price,
        uint flowTokenAmount,
        uint baseTokenAmount
    ) private view returns (uint collateralsToRemove, uint refundToPool) {
        uint collaterals;
        uint minted;
        (collaterals, minted) = token.getPosition(address(pool));

        require(minted >= flowTokenAmount, "Liquidity pool does not have enough position");

        uint mintedAfter = minted.sub(flowTokenAmount);

        uint mintedValue = mintedAfter.mul(price).div(1 ether);
        uint requiredCollaterals = mintedValue.mulPercent(getAdditionalCollateralRatio(token, pool)).add(mintedValue);
        collateralsToRemove = baseTokenAmount;
        refundToPool = 0;
        if (requiredCollaterals <= collaterals) {
            collateralsToRemove = collaterals.sub(requiredCollaterals);
            refundToPool = collateralsToRemove.sub(baseTokenAmount);
        }
    }

    function _calculateRemovePositionAndIncentive(
        FlowToken token,
        LiquidityPoolInterface pool,
        uint price,
        uint flowTokenAmount,
        uint baseTokenAmount
    ) private view returns (uint collateralsToRemove, uint refundToPool, uint incentive) {
        uint collaterals;
        uint minted;
        (collaterals, minted) = token.getPosition(address(pool));

        require(minted >= flowTokenAmount, "Liquidity pool does not have enough position");

        uint mintedValue = minted.mul(price).div(1 ether);

        if (collaterals <= mintedValue) {
            // this should never happen but it happned for some reason
            // no incentive
            return (baseTokenAmount, 0, 0);
        }

        Percentage.Percent memory currentRatio = Percentage.fromFraction(collaterals, mintedValue);

        require(currentRatio.value < token.liquidationCollateralRatio().add(Percentage.one()), "Still in a safe position");

        uint mintedAfter = minted.sub(flowTokenAmount);

        return _calculateIncentive(token, mintedAfter, price, collaterals, baseTokenAmount, currentRatio);
    }

    // just to get it compile without stack too deep issue
    function _calculateIncentive(
        FlowToken token,
        uint mintedAfter,
        uint price,
        uint collaterals,
        uint baseTokenAmount,
        Percentage.Percent memory currentRatio
    ) private view returns (uint, uint, uint) {
        uint newCollaterals = collaterals.sub(baseTokenAmount);
        uint withCurrentRatio = mintedAfter.mul(price).div(1 ether).mulPercent(currentRatio);

        if (newCollaterals > withCurrentRatio) {
            uint availableForIncentive = newCollaterals.sub(withCurrentRatio);
            uint incentiveRatio = token.incentiveRatio(currentRatio.value);
            uint incentive = availableForIncentive.mul(incentiveRatio).div(Percentage.one());
            uint refundToPool = availableForIncentive.sub(incentive);
            return (baseTokenAmount.add(incentive).add(refundToPool), refundToPool, incentive);
        } // else no more incentive can be given

        return (baseTokenAmount, 0, 0);
    }

    function getAdditionalCollateralRatio(FlowToken token, LiquidityPoolInterface pool) internal view returns (Percentage.Percent memory) {
        uint ratio = pool.getAdditionalCollateralRatio(address(token));
        return Percentage.Percent(Math.max(ratio, token.defaultCollateralRatio()));
    }
}
