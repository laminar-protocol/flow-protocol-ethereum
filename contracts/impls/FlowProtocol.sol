pragma solidity ^0.5.8;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/ownership/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/math/Math.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import "../libs/Percentage.sol";
import "../interfaces/LiquidityPoolInterface.sol";
import "../interfaces/PriceOracleInterface.sol";
import "../interfaces/MoneyMarketInterface.sol";
import "./FlowToken.sol";

contract FlowProtocol is Ownable, ReentrancyGuard {
    using SafeMath for uint256;
    using Percentage for uint256;
    using SafeERC20 for IERC20;

    uint constant MAX_UINT = 2**256 - 1;

    PriceOracleInterface public oracle;
    MoneyMarketInterface public moneyMarket;

    mapping (string => FlowToken) public tokens;
    mapping (address => bool) public tokenWhitelist;

    constructor(PriceOracleInterface oracle_, MoneyMarketInterface moneyMarket_) public {
        oracle = oracle_;
        moneyMarket = moneyMarket_;

        moneyMarket.baseToken().safeApprove(address(moneyMarket), MAX_UINT);
    }

    function addFlowToken(FlowToken token) external onlyOwner {
        string memory symbol = token.symbol();
        require(address(tokens[symbol]) == address(0), "already exists");
        tokens[symbol] = token;
        tokenWhitelist[address(token)] = true;
    }

    function mint(FlowToken token, LiquidityPoolInterface pool, uint baseTokenAmount) external nonReentrant returns (uint) {
        IERC20 baseToken = moneyMarket.baseToken();

        require(baseToken.balanceOf(msg.sender) >= baseTokenAmount, "Not enough balance");
        require(tokenWhitelist[address(token)], "FlowToken not in whitelist");

        uint price = getPrice(address(token));

        uint askPrice = price.add(pool.getAskSpread(address(token)));
        uint flowTokenAmount = baseTokenAmount.mul(1 ether).div(askPrice);
        uint flowTokenCurrentValue = flowTokenAmount.mul(price).div(1 ether);
        uint additionalCollateralAmount = _calcAdditionalCollateralAmount(flowTokenCurrentValue, token, pool, baseTokenAmount);
        uint additionalCollateralITokenAmount = moneyMarket.convertAmountFromBase(moneyMarket.exchangeRate(), additionalCollateralAmount);

        uint totalCollateralAmount = baseTokenAmount.add(additionalCollateralAmount);

        baseToken.safeTransferFrom(msg.sender, address(this), baseTokenAmount);
        moneyMarket.mintTo(address(token), baseTokenAmount);
        moneyMarket.iToken().safeTransferFrom(address(pool), address(this), additionalCollateralITokenAmount);
        token.mint(msg.sender, flowTokenAmount);

        token.addPosition(address(pool), totalCollateralAmount, flowTokenAmount, additionalCollateralAmount);

        return flowTokenAmount;
    }

    function _calcAdditionalCollateralAmount(uint flowTokenCurrentValue, FlowToken token, LiquidityPoolInterface pool, uint baseTokenAmount) private view returns (uint) {
        return flowTokenCurrentValue.mulPercent(getAdditoinalCollateralRatio(token, pool)).add(flowTokenCurrentValue).sub(baseTokenAmount);
    }

    function redeem(FlowToken token, LiquidityPoolInterface pool, uint flowTokenAmount) external nonReentrant returns (uint) {
        IERC20 iToken = moneyMarket.iToken();

        require(token.balanceOf(msg.sender) >= flowTokenAmount, "Not enough balance");
        require(tokenWhitelist[address(token)], "FlowToken not in whitelist");

        address poolAddr = address(pool);
        address tokenAddr = address(token);
        uint price = getPrice(tokenAddr);

        uint bidPrice = price.sub(pool.getBidSpread(tokenAddr));
        uint baseTokenAmount = flowTokenAmount.mul(bidPrice).div(1 ether);

        uint collateralsToRemove;
        uint refundToPool;
        (collateralsToRemove, refundToPool) = _calculateRemovePosition(token, pool, price, flowTokenAmount, baseTokenAmount);

        uint interest = token.removePosition(poolAddr, collateralsToRemove, flowTokenAmount);
        refundToPool = refundToPool.add(interest);

        uint refundToPoolITokenAmount = moneyMarket.convertAmountFromBase(moneyMarket.exchangeRate(), refundToPool);
        iToken.safeTransferFrom(tokenAddr, poolAddr, refundToPoolITokenAmount);
        token.withdrawTo(msg.sender, baseTokenAmount);

        token.burn(msg.sender, flowTokenAmount);

        return baseTokenAmount;
    }

    function liquidate(FlowToken token, LiquidityPoolInterface pool, uint flowTokenAmount) external nonReentrant returns (uint) {
        require(token.balanceOf(msg.sender) >= flowTokenAmount, "Not enough balance");
        require(tokenWhitelist[address(token)], "FlowToken not in whitelist");

        IERC20 iToken = moneyMarket.iToken();

        uint price = getPrice(address(token));

        uint bidPrice = price.sub(pool.getBidSpread(address(token)));
        uint baseTokenAmount = flowTokenAmount.mul(bidPrice).div(1 ether);

        uint collateralsToRemove;
        uint refundToPool;
        uint incentive;
        (collateralsToRemove, refundToPool, incentive) = _calculateRemovePositionAndIncentive(token, pool, price, flowTokenAmount, baseTokenAmount);

        uint interest = token.removePosition(address(pool), collateralsToRemove, flowTokenAmount);
        refundToPool = refundToPool.add(interest);

        uint refundToPoolITokenAmount = moneyMarket.convertAmountFromBase(moneyMarket.exchangeRate(), refundToPool);
        iToken.safeTransferFrom(address(token), address(pool), refundToPoolITokenAmount);
        token.withdrawTo(msg.sender, baseTokenAmount.add(incentive));

        token.burn(msg.sender, flowTokenAmount);

        return baseTokenAmount;
    }

    function addCollateral(FlowToken token, address poolAddr, uint baseTokenAmount) external nonReentrant {
        require(tokenWhitelist[address(token)], "FlowToken not in whitelist");

        uint iTokenAmount = moneyMarket.convertAmountFromBase(moneyMarket.exchangeRate(), baseTokenAmount);

        moneyMarket.iToken().safeTransferFrom(msg.sender, address(token), iTokenAmount);
        token.addPosition(poolAddr, baseTokenAmount, 0, baseTokenAmount);
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

        return refundToPoolITokenAmount;
    }

    function deposit(FlowToken token, uint flowTokenAmount) external nonReentrant {
        require(token.balanceOf(msg.sender) >= flowTokenAmount, "Not enough balance");
        require(tokenWhitelist[address(token)], "FlowToken not in whitelist");

        uint price = getPrice(address(token));

        token.deposit(msg.sender, flowTokenAmount, price);
    }

    function withdraw(FlowToken token, uint flowTokenAmount) external nonReentrant {
        require(tokenWhitelist[address(token)], "FlowToken not in whitelist");

        token.withdraw(msg.sender, flowTokenAmount);
    }

    function _calculateRemovePosition(FlowToken token, LiquidityPoolInterface pool, uint price, uint flowTokenAmount, uint baseTokenAmount) private view returns (uint collateralsToRemove, uint refundToPool) {
        uint collaterals;
        uint minted;
        (collaterals, minted) = token.getPosition(address(pool));

        require(minted >= flowTokenAmount, "Liquidity pool does not have enough position");

        uint mintedAfter = minted.sub(flowTokenAmount);

        uint mintedValue = mintedAfter.mul(price).div(1 ether);
        uint requiredCollaterals = mintedValue.mulPercent(getAdditoinalCollateralRatio(token, pool)).add(mintedValue);
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

        Percentage.Percent memory currentRatio = getCurrentTotalCollateralRatio(collaterals, minted, price);

        require(currentRatio.value < token.minCollateralRatio().add(Percentage.one()), "Still in a safe position");

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

    function getCurrentTotalCollateralRatio(uint collaterals, uint minted, uint price) internal pure returns (Percentage.Percent memory) {
        uint mintedValue = minted.mul(price).div(1 ether);
        return Percentage.fromFraction(collaterals, mintedValue);
    }

    function getAdditoinalCollateralRatio(FlowToken token, LiquidityPoolInterface pool) internal view returns (Percentage.Percent memory) {
        uint ratio = pool.getAdditoinalCollateralRatio(address(token));
        return Percentage.Percent(Math.max(ratio, token.defaultCollateralRatio()));
    }

    function getPrice(address tokenAddr) internal view returns (uint) {
        uint price = oracle.getPrice(tokenAddr);
        require(price > 0, "no oracle price");
        return price;
    }
}