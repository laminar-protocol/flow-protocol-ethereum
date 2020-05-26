pragma solidity ^0.6.4;

import "@chainlink/contracts/src/v0.6/interfaces/AggregatorInterface.sol";
import "@chainlink/contracts/src/v0.6/ChainlinkClient.sol";
import "@openzeppelin/upgrades/contracts/Initializable.sol";
import "@openzeppelin/upgrades/contracts/Initializable.sol";

import "../../interfaces/PriceOracleInterface.sol";
import "../../libs/upgrades/UpgradeOwnable.sol";

contract ChainLinkOracle is ChainlinkClient, PriceOracleInterface, Initializable, UpgradeOwnable {
    mapping (address => AggregatorInterface) private aggregators;

    function initialize(
        address _link,
        address _eurRef,
        address _jpyRef,
        address _xauRef,
        address _aaplRef,
        address _eurToken,
        address _jpyToken,
        address _xauToken,
        address _aaplToken
    ) public initializer {
        UpgradeOwnable.initialize(msg.sender);

        if(_link == address(0)) {
            setPublicChainlinkToken();
        } else {
            setChainlinkToken(_link);
        }

        aggregators[_eurToken] = AggregatorInterface(_eurRef);
        aggregators[_jpyToken] = AggregatorInterface(_jpyRef);
        aggregators[_xauToken] = AggregatorInterface(_xauRef);
        aggregators[_aaplToken] = AggregatorInterface(_aaplRef);
    }

    function setOracleAddress(address _token, address _aggregator) public onlyOwner {
        aggregators[_token] = AggregatorInterface(_aggregator);
    }

    function getPrice(address _key) public override returns (uint256) {
        int256 price = aggregators[_key].latestAnswer();
        require(price > 0, "no price available");

        return uint256(price).mul(1e10);
    }

    function isPriceOracle() external pure override returns (bool) {
        return true;
    }
}