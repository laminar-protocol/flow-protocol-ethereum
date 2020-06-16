// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.6.10;

import "@openzeppelin/contracts-ethereum-package/contracts/Initializable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/access/Ownable.sol";

// TODO: change Ownable to Admin to ensure always must be a valid admin
contract PriceFeederRole is Initializable, OwnableUpgradeSafe, AccessControlUpgradeSafe {
    event PriceFeederAdded(address indexed _account);
    event PriceFeederRemoved(address indexed _account);

    bytes32 public constant PRICE_FEEDER_ROLE = keccak256("PRICE_FEEDER_ROLE");

    // store all price feeders to support traverse etc
    address[] internal priceFeeders;
    // addr => index in `priceFeeders`
    mapping(address => uint256) internal priceFeederIndices;

    modifier onlyPriceFeeder() {
        require(isPriceFeeder(msg.sender), "Caller doesnt have the PriceFeeder role");
        _;
    }

    function initialize() public virtual initializer {
        OwnableUpgradeSafe.__Ownable_init();
        AccessControlUpgradeSafe.__AccessControl_init();
    }

    function isPriceFeeder(address _account) public view returns (bool) {
        return hasRole(PRICE_FEEDER_ROLE, _account);
    }

    function addPriceFeeder(address _account) public onlyOwner {
        _addPriceFeeder(_account);
    }

    function removePriceFeeder(address _account) public onlyOwner {
        _removePriceFeeder(_account);
    }

    function renouncePriceFeeder() public {
        _removePriceFeeder(msg.sender);
    }

    function _addPriceFeeder(address _account) internal {
        // role
        grantRole(PRICE_FEEDER_ROLE, _account);

        // push and record index
        priceFeeders.push(_account);
        priceFeederIndices[_account] = priceFeeders.length - 1;

        emit PriceFeederAdded(_account);
    }

    function _removePriceFeeder(address _account) internal {
        // role
        revokeRole(PRICE_FEEDER_ROLE, _account);

        // if not last index, swap with last element
        uint256 index = priceFeederIndices[_account];
        uint256 lastIndex = priceFeeders.length - 1;
        if (index != lastIndex) {
            priceFeeders[index] = priceFeeders[lastIndex];
        }
        // delete last element and its index
        priceFeeders.pop();
        delete priceFeederIndices[_account];

        emit PriceFeederRemoved(_account);
    }
}
