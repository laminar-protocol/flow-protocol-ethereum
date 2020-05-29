pragma solidity ^0.6.4;

import "@chainlink/contracts/src/v0.6/interfaces/AggregatorInterface.sol";
import "@chainlink/contracts/src/v0.6/ChainlinkClient.sol";
import "@openzeppelin/upgrades/contracts/Initializable.sol";
import "@openzeppelin/upgrades/contracts/Initializable.sol";

import "../../interfaces/PriceOracleInterface.sol";
import "../../libs/upgrades/UpgradeOwnable.sol";

contract ChainLinkOracle is ChainlinkClient, PriceOracleInterface, Initializable, UpgradeOwnable {
    mapping (address => AggregatorInterface) public aggregators;
    address public usdToken;

    function initialize(
        address _link,
        address _usdToken,
        address[] memory _currencyReferences,
        address[] memory _tokenReferences
    ) public initializer {
        UpgradeOwnable.initialize(msg.sender);

        require(_currencyReferences.length == _tokenReferences.length, "Token count must match oracle count");

        if(_link == address(0)) {
            setPublicChainlinkToken();
        } else {
            setChainlinkToken(_link);
        }

        usdToken = _usdToken;

        for (uint256 i = 0; i < _currencyReferences.length; i++) {
            aggregators[_tokenReferences[i]] = AggregatorInterface(_currencyReferences[i]);
        }
    }

    function setOracleAddress(address _token, address _aggregator) public onlyOwner {
        aggregators[_token] = AggregatorInterface(_aggregator);
    }

    function getPrice(address _key) public override returns (uint256) {
        if (_key == usdToken) {
            return 1e18;
        }

        require(address(aggregators[_key]) != address(0), "Invalid token address for oracle");

        int256 price = aggregators[_key].latestAnswer();
        require(price > 0, "no price available");

        return uint256(price).mul(1e10);
    }

    function isPriceOracle() external pure override returns (bool) {
        return true;
    }
}