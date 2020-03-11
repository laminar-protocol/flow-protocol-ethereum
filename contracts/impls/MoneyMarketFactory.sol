pragma solidity ^0.6.3;

import "@openzeppelin/contracts/ownership/Ownable.sol";
import "./LaminarStorage.sol";
import "./LaminarUpgrade.sol";
import "./MoneyMarket.sol";

contract MoneyMarketFactory is Ownable {
    using SafeMath for uint256;

    LaminarStorage public laminarStorage;
    LaminarUpgrade public laminarUpgrade;
    address[] public moneyMarkets;

    constructor(LaminarStorage _laminarStorage, LaminarUpgrade _laminarUpgrade) public {
        laminarStorage = _laminarStorage;
        laminarUpgrade = _laminarUpgrade;
        moneyMarkets = new address[](0);
    }

    function deployMoneyMarket(
        CErc20Interface _cToken,
        uint _minLiquidity,
        string memory _iTokenName,
        string memory _iTokenSymbol
    ) public onlyOwner {
        uint256 moneyMarketCount = laminarStorage.getUint256(keccak256("money_market_count"));
        uint256 newMoneyMarketCount = moneyMarketCount.add(1);

        MoneyMarket moneyMarket = new MoneyMarket(
            laminarStorage,
            _cToken,
            _iTokenName,
            _iTokenSymbol
        );

        address moneyMarketAddress = address(moneyMarket);

        moneyMarkets.push(moneyMarketAddress);
        laminarStorage.setUint256(keccak256("money_market_count"), newMoneyMarketCount);

        string memory moneyMarketName = _appendUintToString("MoneyMarket", newMoneyMarketCount);

        laminarUpgrade.addContract(moneyMarketName, moneyMarketAddress);
        moneyMarket.setMinLiquidity(_minLiquidity);
        moneyMarket.transferOwnership(msg.sender);
    }

    function _appendUintToString(string memory inStr, uint v) private pure returns (string memory str) {
        uint maxlength = 100;
        bytes memory reversed = new bytes(maxlength);
        uint i = 0;
        while (v != 0) {
            uint remainder = v % 10;
            v = v / 10;
            reversed[i++] = byte(uint8(48 + remainder));
        }
        bytes memory inStrb = bytes(inStr);
        bytes memory s = new bytes(inStrb.length + i);
        uint j;
        for (j = 0; j < inStrb.length; j++) {
            s[j] = inStrb[j];
        }
        for (j = 0; j < i; j++) {
            s[j + inStrb.length] = reversed[i - 1 - j];
        }
        str = string(s);
    }
}