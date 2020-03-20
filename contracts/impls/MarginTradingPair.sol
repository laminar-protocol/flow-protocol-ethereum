pragma solidity ^0.6.3;
import "@openzeppelin/upgrades/contracts/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/math/Math.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import "../libs/upgrades/UpgradeOwnable.sol";
import "../libs/Percentage.sol";
import "../interfaces/LiquidityPoolInterface.sol";
import "../interfaces/MoneyMarketInterface.sol";

contract MarginTradingPair is Initializable, UpgradeOwnable {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;
    using Percentage for uint256;

    MoneyMarketInterface public moneyMarket;

    address public quoteToken;
    int public leverage; // positive means long, negative means short

    Percentage.Percent public safeMarginPercent;
    uint public liquidationFee;

    struct Position {
        address owner;
        address liquidityPool;
        uint amount; // one side amount, fee included, in iToken
        uint openPrice;
        uint liquidationFee; // one side fee, in iToken
        uint closeSpread;
    }

    mapping (uint => Position) public positions;
    uint public nextPositionId;

    event OpenPosition(
        address indexed sender, address indexed liquidityPool, uint positionId, uint baseTokenAmount, uint openPrice, uint closeSpread
    );
    event ClosePosition(
        address indexed owner, address indexed liquidityPool, address indexed liquidator,
        uint positionId, uint closePrice, uint ownerAmount, uint liquidityPoolAmount
    );

    function initialize(
        address protocol,
        MoneyMarketInterface moneyMarket_,
        address quoteToken_,
        int leverage_,
        uint safeMarginPercent_,
        uint liquidationFee_
    ) public initializer {
        UpgradeOwnable.initialize(msg.sender);

        require((leverage_ >= 2 && leverage_ <= 100) || (leverage_ <= -2 && leverage_ >= -100), "Invalid leverage");
        require(safeMarginPercent_ <= Percentage.one(), "Invalid safeMarginPercent");

        moneyMarket = moneyMarket_;

        quoteToken = quoteToken_;
        leverage = leverage_;

        safeMarginPercent = Percentage.Percent(safeMarginPercent_);
        liquidationFee = liquidationFee_;

        transferOwnership(protocol);
    }

    function openPosition(
        address sender, address liquidityPool, uint baseTokenAmount, uint iTokenAmount, uint price, uint closeSpread
    ) public onlyOwner returns (uint) {
        require(baseTokenAmount > liquidationFee, "Not enough to pay for liquidation fee");

        uint positionId = nextPositionId;
        nextPositionId = nextPositionId + 1; // It is safe to have this overflow and unwrap

        uint iTokenLiquidationFee = moneyMarket.convertAmountFromBase(moneyMarket.exchangeRate(), liquidationFee);

        positions[positionId] = Position(sender, liquidityPool, iTokenAmount, price, iTokenLiquidationFee, closeSpread);

        emit OpenPosition(sender, liquidityPool, positionId, baseTokenAmount, price, closeSpread);

        return positionId;
    }

    function closePosition(address sender, uint positionId, uint price) public onlyOwner {
        Position storage position = positions[positionId];

        address owner = position.owner;
        address liquidityPool = position.liquidityPool;

        require(position.owner != address(0), "Invalid positionId");

        uint closePrice;
        if (leverage > 0) {
            // long
            closePrice = price.sub(price.mul(position.closeSpread).div(1 ether));
        } else {
            // short
            closePrice = price.add(price.mul(position.closeSpread).div(1 ether));
        }

        (bool liquidated, bool isUnsafe, Percentage.Percent memory profitPercent) = _closePositionHelper(position, closePrice);

        if (sender != owner) {
            if (sender != liquidityPool) {
                require(liquidated, "Only position owner or liquidity pool can close a open position");
            } else {
                // can't underflow because safeDiff is smaller than maxDiff because marginPercent is less than one
                // can't overflow because maxDiff * 2 can't overflow and safeDiff is smaller than maxDiff
                require(isUnsafe, "Only position owner can close a safe position");
            }
        }

        uint iTokenTotal = position.amount.sub(position.liquidationFee).mul(2);

        _closePositionSend(positionId, liquidated, position.liquidationFee, sender, owner, liquidityPool, iTokenTotal, profitPercent, closePrice);

        delete positions[positionId];
    }

    function _closePositionHelper(
        Position storage position, uint closePrice
    ) private view returns (bool liquidated, bool isUnsafe, Percentage.Percent memory profitPercent) {
        Percentage.Percent memory marginPercent = Percentage.fromFraction(1, leverageAbs());
        uint maxDiff = position.openPrice.mulPercent(marginPercent);
        uint totalMaxDiff = maxDiff * 2;   // can't overflow, maxDiff is price / X where X is >= 2
        uint safeDiff = maxDiff.mulPercent(safeMarginPercent);

        uint bottomPrice = position.openPrice.sub(maxDiff);
        uint diff;

        if (closePrice < bottomPrice) {
            diff = 0;
            liquidated = true;
        } else {
            diff = closePrice - bottomPrice; // can't underflow, checked above
            if (diff > totalMaxDiff) {
                diff = totalMaxDiff;
                liquidated = true;
            }
        }

        isUnsafe = diff < (maxDiff - safeDiff) || diff > (maxDiff + safeDiff);

        profitPercent = Percentage.fromFraction(diff, totalMaxDiff);
    }

    function _closePositionSend(
        uint positionId, bool liquidated, uint iTokenLiquidationFee, address sender, address owner, address liquidityPool,
        uint iTokenTotal, Percentage.Percent memory profitPercent, uint closePrice
    ) private {
        uint ownerAmount = iTokenTotal.mulPercent(profitPercent);
        uint liquidityPoolAmount = iTokenTotal.sub(ownerAmount);

        if (leverage < 0) {
            (liquidityPoolAmount, ownerAmount) = (ownerAmount, liquidityPoolAmount);
        }

        if (liquidated) {
            uint senderAmount = iTokenLiquidationFee * 2; // take all the liquidation fee

            if (sender == liquidityPool) {
                liquidityPoolAmount = liquidityPoolAmount.add(senderAmount);
            } else {
                moneyMarket.redeemTo(sender, senderAmount);
            }
        } else {
            ownerAmount = ownerAmount.add(iTokenLiquidationFee);
            liquidityPoolAmount = liquidityPoolAmount.add(iTokenLiquidationFee);
        }
        moneyMarket.redeemTo(owner, ownerAmount);

        moneyMarket.iToken().safeTransfer(liquidityPool, liquidityPoolAmount);

        emit ClosePosition(owner, liquidityPool, sender, positionId, closePrice, ownerAmount, liquidityPoolAmount);
    }

    function leverageAbs() private view returns (uint) {
        if (leverage > 0) {
            return uint(leverage);
        }
        return uint(-leverage);
    }
}
