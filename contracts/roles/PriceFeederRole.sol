pragma solidity ^0.5.8;

import "@openzeppelin/contracts/access/Roles.sol";
import "./ProtocolOwnable.sol";

contract PriceFeederRole is ProtocolOwnable {
    using Roles for Roles.Role;

    event PriceFeederAdded(address indexed account);
    event PriceFeederRemoved(address indexed account);

    Roles.Role private _priceFeeders;

    modifier onlyPriceFeeder() {
        require(isPriceFeeder(msg.sender), "PriceFeederRole: caller does not have the PriceFeeder role");
        _;
    }

    function isPriceFeeder(address account) public view returns (bool) {
        return _priceFeeders.has(account);
    }

    function addPriceFeeder(address account) public onlyProtocol {
        _addPriceFeeder(account);
    }

    function removePriceFeeder(address account) public onlyProtocol {
        _removePriceFeeder(account);
    }

    function renouncePriceFeeder() public {
        _removePriceFeeder(msg.sender);
    }

    function _addPriceFeeder(address account) internal {
        _priceFeeders.add(account);
        emit PriceFeederAdded(account);
    }

    function _removePriceFeeder(address account) internal {
        _priceFeeders.remove(account);
        emit PriceFeederRemoved(account);
    }
}
