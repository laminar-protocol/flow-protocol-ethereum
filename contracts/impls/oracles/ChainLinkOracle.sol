// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.6.10;

import "@chainlink/contracts/src/v0.6/interfaces/AggregatorInterface.sol";
import "@chainlink/contracts/src/v0.6/ChainlinkClient.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/Initializable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/access/Ownable.sol";

import "../../interfaces/PriceOracleInterface.sol";

contract ChainLinkOracle is ChainlinkClient, PriceOracleInterface, Initializable, OwnableUpgradeSafe {
    mapping(address => AggregatorInterface) public aggregators;
    address public usdToken;

    function initialize(
        address _link,
        address _usdToken,
        address[] memory _currencyReferences,
        address[] memory _tokenReferences
    ) public initializer {
        OwnableUpgradeSafe.__Ownable_init();

        require(_currencyReferences.length == _tokenReferences.length, "Token count must match oracle count");

        if (_link == address(0)) {
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
        return _getPrice(_key);
    }

    function readPrice(address _key) public override view returns (uint256) {
        return _getPrice(_key);
    }

    function isPriceOracle() external override pure returns (bool) {
        return true;
    }

    function _getPrice(address _key) private view returns (uint256) {
        if (_key == usdToken) {
            return 1e18;
        }

        require(address(aggregators[_key]) != address(0), "Invalid token address for oracle");

        int256 price = aggregators[_key].latestAnswer();
        require(price > 0, "no price available");

        return uint256(price).mul(1e10);
    }
}
