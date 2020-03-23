pragma solidity ^0.6.4;

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
    event Minted(address indexed sender, address indexed token, address indexed liquidityPool, uint256 baseTokenAmount, uint256 flowTokenAmount);
    event Redeemed(address indexed sender, address indexed token, address indexed liquidityPool, uint256 baseTokenAmount, uint256 flowTokenAmount);
    event Liquidated(address indexed sender, address indexed token, address indexed liquidityPool, uint256 baseTokenAmount, uint256 flowTokenAmount);
    event CollateralAdded(address indexed token, address indexed liquidityPool, uint256 baseTokenAmount, uint256 iTokenAmount);
    event CollateralWithdrew(address indexed token, address indexed liquidityPool, uint256 baseTokenAmount, uint256 iTokenAmount);
    event FlowTokenDeposited(address indexed sender, address indexed token, uint256 baseTokenAmount, uint256 flowTokenAmount);
    event FlowTokenWithdrew(address indexed sender, address indexed token, uint256 baseTokenAmount, uint256 flowTokenAmount);

    function addFlowToken(FlowToken token) external onlyOwner {
        string memory symbol = token.symbol();
        require(address(tokens[symbol]) == address(0), "already exists");
        tokens[symbol] = token;
        tokenWhitelist[address(token)] = true;

        emit NewFlowToken(address(token));
    }

    function mint(FlowToken _token, LiquidityPoolInterface _pool, uint256 _baseTokenAmount) external nonReentrant returns (uint256) {
        return _mint(_token, _pool, _baseTokenAmount, 0);
    }

    function mintWithMaxPrice(
        FlowToken _token,
        LiquidityPoolInterface _pool,
        uint256 _baseTokenAmount,
        uint256 _maxPrice
    ) external nonReentrant returns (uint256) {
        require(_maxPrice > 0, "Max price cannot be 0!");

        return _mint(_token, _pool, _baseTokenAmount, _maxPrice);
    }

    function redeem(FlowToken _token, LiquidityPoolInterface _pool, uint256 _flowTokenAmount) external nonReentrant returns (uint256) {
        return _redeem(_token, _pool, _flowTokenAmount, 0);
    }

    function redeemWithMinPrice(
        FlowToken _token,
        LiquidityPoolInterface _pool,
        uint256 _flowTokenAmount,
        uint256 _minPrice
    ) external nonReentrant returns (uint256) {
        require(_minPrice > 0, "Min price cannot be 0!");

        return _redeem(_token, _pool, _flowTokenAmount, _minPrice);
    }

    function liquidate(FlowToken token, LiquidityPoolInterface pool, uint256 flowTokenAmount) external nonReentrant returns (uint256) {
        require(token.balanceOf(msg.sender) >= flowTokenAmount, "Not enough balance");
        require(tokenWhitelist[address(token)], "FlowToken not in whitelist");

        uint256 price = getPrice(address(token));

        uint256 bidPrice = getBidPrice(pool, address(token), price);
        uint256 baseTokenAmount = flowTokenAmount.mul(bidPrice).div(1 ether);

        uint256 collateralsToRemove;
        uint256 refundToPool;
        uint256 incentive;
        (collateralsToRemove, refundToPool, incentive) = _calculateRemovePositionAndIncentive(token, pool, price, flowTokenAmount, baseTokenAmount);

        uint256 interest = token.removePosition(address(pool), collateralsToRemove, flowTokenAmount);
        refundToPool = refundToPool.add(interest);

        uint256 refundToPoolITokenAmount = moneyMarket.convertAmountFromBase(moneyMarket.exchangeRate(), refundToPool);
        moneyMarket.iToken().safeTransferFrom(address(token), address(pool), refundToPoolITokenAmount);
        token.withdrawTo(msg.sender, baseTokenAmount.add(incentive));

        token.burn(msg.sender, flowTokenAmount);

        emit Liquidated(msg.sender, address(token), address(pool), baseTokenAmount, flowTokenAmount);

        return baseTokenAmount;
    }

    function addCollateral(FlowToken token, address poolAddr, uint256 baseTokenAmount) external nonReentrant {
        require(tokenWhitelist[address(token)], "FlowToken not in whitelist");

        uint256 iTokenAmount = moneyMarket.convertAmountFromBase(moneyMarket.exchangeRate(), baseTokenAmount);

        token.addPosition(poolAddr, baseTokenAmount, 0, baseTokenAmount);
        moneyMarket.iToken().safeTransferFrom(msg.sender, address(token), iTokenAmount);

        emit CollateralAdded(address(token), poolAddr, baseTokenAmount, iTokenAmount);
    }

    function withdrawCollateral(FlowToken token) external nonReentrant returns (uint256) {
        require(tokenWhitelist[address(token)], "FlowToken not in whitelist");

        IERC20 iToken = moneyMarket.iToken();

        LiquidityPoolInterface pool = LiquidityPoolInterface(msg.sender);
        address tokenAddr = address(token);
        uint256 price = getPrice(tokenAddr);

        uint256 collateralsToRemove;
        uint256 refundToPool;
        (collateralsToRemove, refundToPool) = _calculateRemovePosition(token, pool, price, 0, 0);
        uint256 interest = token.removePosition(msg.sender, collateralsToRemove, 0);
        refundToPool = refundToPool.add(interest);

        uint256 refundToPoolITokenAmount = moneyMarket.convertAmountFromBase(moneyMarket.exchangeRate(), refundToPool);
        iToken.safeTransferFrom(tokenAddr, msg.sender, refundToPoolITokenAmount);

        emit CollateralWithdrew(address(token), msg.sender, refundToPool, refundToPoolITokenAmount);

        return refundToPoolITokenAmount;
    }

    function deposit(FlowToken token, uint256 flowTokenAmount) external nonReentrant {
        require(token.balanceOf(msg.sender) >= flowTokenAmount, "Not enough balance");
        require(tokenWhitelist[address(token)], "FlowToken not in whitelist");

        uint256 price = getPrice(address(token));

        uint256 baseTokenAmount = token.deposit(msg.sender, flowTokenAmount, price);

        emit FlowTokenDeposited(msg.sender, address(token), baseTokenAmount, flowTokenAmount);
    }

    function withdraw(FlowToken token, uint256 flowTokenAmount) external nonReentrant {
        require(tokenWhitelist[address(token)], "FlowToken not in whitelist");

        uint256 baseTokenAmount = token.withdraw(msg.sender, flowTokenAmount);

        emit FlowTokenWithdrew(msg.sender, address(token), baseTokenAmount, flowTokenAmount);
    }

    function _mint(
        FlowToken _token,
        LiquidityPoolInterface _pool,
        uint256 _baseTokenAmount,
        uint256 _maxPrice
    ) private returns (uint256) {
        IERC20 baseToken = moneyMarket.baseToken();
        uint256 oraclePrice = getPrice(address(_token));
        uint256 askPrice = getAskPrice(_pool, address(_token), oraclePrice);

        require(baseToken.balanceOf(msg.sender) >= _baseTokenAmount, "Not enough balance");
        require(tokenWhitelist[address(_token)], "FlowToken not in whitelist");

        if (_maxPrice > 0) {
            require(askPrice <= _maxPrice, "Ask price too high");
        }

        uint256 flowTokenAmount = _baseTokenAmount.mul(1 ether).div(askPrice);
        uint256 flowTokenCurrentValue = flowTokenAmount.mul(oraclePrice).div(1 ether);
        uint256 additionalCollateralAmount = _calcAdditionalCollateralAmount(flowTokenCurrentValue, _token, _pool, _baseTokenAmount);
        uint256 additionalCollateralITokenAmount = moneyMarket.convertAmountFromBase(moneyMarket.exchangeRate(), additionalCollateralAmount);

        uint256 totalCollateralAmount = _baseTokenAmount.add(additionalCollateralAmount);

        _token.addPosition(address(_pool), totalCollateralAmount, flowTokenAmount, additionalCollateralAmount);

        baseToken.safeTransferFrom(msg.sender, address(this), _baseTokenAmount);
        moneyMarket.mintTo(address(_token), _baseTokenAmount);
        moneyMarket.iToken().safeTransferFrom(address(_pool), address(_token), additionalCollateralITokenAmount);
        _token.mint(msg.sender, flowTokenAmount);

        emit Minted(msg.sender, address(_token), address(_pool), _baseTokenAmount, flowTokenAmount);

        return flowTokenAmount;
    }

    function _redeem(
        FlowToken _token,
        LiquidityPoolInterface _pool,
        uint256 _flowTokenAmount,
        uint256 _minPrice
    ) private returns (uint256) {
        uint256 oraclePrice = getPrice(address(_token));
        uint256 bidPrice = getBidPrice(_pool, address(_token), oraclePrice);

        require(_token.balanceOf(msg.sender) >= _flowTokenAmount, "Not enough balance");
        require(tokenWhitelist[address(_token)], "FlowToken not in whitelist");

        if (_minPrice > 0) {
            require(bidPrice >= _minPrice, "Bid price too low");
        }

        uint256 baseTokenAmount = _flowTokenAmount.mul(bidPrice).div(1 ether);
        (uint256 collateralsToRemove, uint256 refundToPool) = _calculateRemovePosition(_token, _pool, oraclePrice, _flowTokenAmount, baseTokenAmount);

        uint256 interest = _token.removePosition(address(_pool), collateralsToRemove, _flowTokenAmount);
        refundToPool = refundToPool.add(interest);

        uint256 refundToPoolITokenAmount = moneyMarket.convertAmountFromBase(moneyMarket.exchangeRate(), refundToPool);
        moneyMarket.iToken().safeTransferFrom(address(_token), address(_pool), refundToPoolITokenAmount);
        _token.withdrawTo(msg.sender, baseTokenAmount);

        _token.burn(msg.sender, _flowTokenAmount);

        emit Redeemed(msg.sender, address(_token), address(_pool), baseTokenAmount, _flowTokenAmount);

        return baseTokenAmount;
    }

    function _calculateRemovePosition(
        FlowToken token,
        LiquidityPoolInterface pool,
        uint256 price,
        uint256 flowTokenAmount,
        uint256 baseTokenAmount
    ) private view returns (uint256 collateralsToRemove, uint256 refundToPool) {
        uint256 collaterals;
        uint256 minted;
        (collaterals, minted) = token.getPosition(address(pool));

        require(minted >= flowTokenAmount, "Liquidity pool does not have enough position");

        uint256 mintedAfter = minted.sub(flowTokenAmount);

        uint256 mintedValue = mintedAfter.mul(price).div(1 ether);
        uint256 requiredCollaterals = mintedValue.mulPercent(_getAdditionalCollateralRatio(token, pool)).add(mintedValue);
        collateralsToRemove = baseTokenAmount;
        refundToPool = 0;
        if (requiredCollaterals <= collaterals) {
            collateralsToRemove = collaterals.sub(requiredCollaterals);
            refundToPool = collateralsToRemove.sub(baseTokenAmount);
        }
    }

    function _calcAdditionalCollateralAmount(
        uint256 flowTokenCurrentValue,
        FlowToken token,
        LiquidityPoolInterface pool,
        uint256 baseTokenAmount
    ) private view returns (uint256) {
        return flowTokenCurrentValue.mulPercent(_getAdditionalCollateralRatio(token, pool)).add(flowTokenCurrentValue).sub(baseTokenAmount);
    }

    function _calculateRemovePositionAndIncentive(
        FlowToken token,
        LiquidityPoolInterface pool,
        uint256 price,
        uint256 flowTokenAmount,
        uint256 baseTokenAmount
    ) private view returns (uint256 collateralsToRemove, uint256 refundToPool, uint256 incentive) {
        uint256 collaterals;
        uint256 minted;
        (collaterals, minted) = token.getPosition(address(pool));

        require(minted >= flowTokenAmount, "Liquidity pool does not have enough position");

        uint256 mintedValue = minted.mul(price).div(1 ether);

        if (collaterals <= mintedValue) {
            // this should never happen but it happned for some reason
            // no incentive
            return (baseTokenAmount, 0, 0);
        }

        Percentage.Percent memory currentRatio = Percentage.fromFraction(collaterals, mintedValue);

        require(currentRatio.value < token.liquidationCollateralRatio().add(Percentage.one()), "Still in a safe position");

        uint256 mintedAfter = minted.sub(flowTokenAmount);

        return _calculateIncentive(token, mintedAfter, price, collaterals, baseTokenAmount, currentRatio);
    }

    // just to get it compile without stack too deep issue
    function _calculateIncentive(
        FlowToken token,
        uint256 mintedAfter,
        uint256 price,
        uint256 collaterals,
        uint256 baseTokenAmount,
        Percentage.Percent memory currentRatio
    ) private view returns (uint256, uint256, uint256) {
        uint256 newCollaterals = collaterals.sub(baseTokenAmount);
        uint256 withCurrentRatio = mintedAfter.mul(price).div(1 ether).mulPercent(currentRatio);

        if (newCollaterals > withCurrentRatio) {
            uint256 availableForIncentive = newCollaterals.sub(withCurrentRatio);
            uint256 incentiveRatio = token.incentiveRatio(currentRatio.value);
            uint256 incentive = availableForIncentive.mul(incentiveRatio).div(Percentage.one());
            uint256 refundToPool = availableForIncentive.sub(incentive);
            return (baseTokenAmount.add(incentive).add(refundToPool), refundToPool, incentive);
        } // else no more incentive can be given

        return (baseTokenAmount, 0, 0);
    }

    function _getAdditionalCollateralRatio(FlowToken token, LiquidityPoolInterface pool) private view returns (Percentage.Percent memory) {
        uint256 ratio = pool.getAdditionalCollateralRatio(address(token));
        return Percentage.Percent(Math.max(ratio, token.defaultCollateralRatio()));
    }
}
