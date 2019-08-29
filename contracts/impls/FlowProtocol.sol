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

contract FlowProtoco is FlowProtocolInterface, Ownable {
    using SafeMath for uint256;
    using Percentage for uint256;
    using SafeERC20 for IERC20;

    PriceOracle public oracle;
    IERC20 public baseToken;
    mapping (string => FlowToken) public tokens;

    struct LiquidityPoolPosition {
        uint collaterals;
        uint minted;
    }

    mapping (address => LiquidityPoolPosition) public liquidityPoolPositions;

    constructor(PriceOracle oracle_, IERC20 baseToken_) public {
        oracle = oracle_;
        baseToken = baseToken_;
    }

    function createFlowToken(string memory name, string memory symbol) public onlyOwner {
        require(address(tokens[name]) == address(0), "already exists");
        FlowToken token = new FlowToken(name, symbol, baseToken);
        tokens[name] = token;
    }

    function deposit(FlowToken token, LiquidityPoolInterface pool, uint baseTokenAmount) public {
        address poolAddr = address(pool);
        address tokenAddr = address(token);
        uint price = getPrice(token);

        uint spread = pool.getSpread(tokenAddr);
        uint askPrice = price.add(spread);
        uint flowTokenAmount = baseTokenAmount.mul(1 ether).div(askPrice);
        // TODO: maybe should be: flowTokenAmount * price * collateralRatio? use mid price instead of ask price
        uint additionalCollateralAmount = baseTokenAmount.mulPercent(getCollateralRatio(token, pool));

        LiquidityPoolPosition storage position = liquidityPoolPositions[poolAddr];
        position.collaterals = position.collaterals.add(baseTokenAmount).add(additionalCollateralAmount);
        position.minted = position.minted.add(flowTokenAmount);

        baseToken.safeTransferFrom(msg.sender, tokenAddr, baseTokenAmount);
        baseToken.safeTransferFrom(poolAddr, tokenAddr, additionalCollateralAmount);
        token.mint(msg.sender, flowTokenAmount);
    }

    function withdraw(FlowToken token, LiquidityPoolInterface pool, uint flowTokenAmount) public {
        address poolAddr = address(pool);
        address tokenAddr = address(token);
        uint price = getPrice(token);

        uint spread = pool.getSpread(tokenAddr);
        uint bidPrice = price.sub(spread);
        uint baseTokenAmount = flowTokenAmount.mul(bidPrice).div(1 ether);

        LiquidityPoolPosition storage position = liquidityPoolPositions[poolAddr];
        position.minted = position.minted.sub(flowTokenAmount);

        uint mintedValue = position.minted.mul(price).div(1 ether);
        uint requiredCollaterals = mintedValue.mulPercent(getCollateralRatio(token, pool));
        if (requiredCollaterals <= position.collaterals) {
            uint refund = position.collaterals.sub(requiredCollaterals);
            position.collaterals = requiredCollaterals;
            baseToken.safeTransfer(poolAddr, refund);
        } else {
            // position is unsafe, what to do?
        }
        baseToken.safeTransfer(msg.sender, baseTokenAmount);

        token.burn(msg.sender, flowTokenAmount);
    }

    function getCollateralRatio(FlowToken token, LiquidityPoolInterface pool) internal view returns (Percentage.Percent memory) {
        uint ratio = pool.collateralRatio(address(token));
        return Percentage.Percent(Math.max(ratio, token.defaultCollateralRatio()));
    }

    function getPrice(FlowToken token) internal view returns (uint) {
        uint price = oracle.getPrice(address(token));
        require(price > 0, "no oracle price");
        return price;
    }
}