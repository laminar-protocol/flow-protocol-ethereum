pragma solidity ^0.5.8;

import "@openzeppelin/contracts/ownership/Ownable.sol";
import "@openzeppelin/contracts/access/Roles.sol";

// TODO: change Ownable to Admin to ensure always must be a valid admin
contract PriceFeederRole is Ownable {
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

    function addPriceFeeder(address account) public onlyOwner {
        _addPriceFeeder(account);
    }

    function removePriceFeeder(address account) public onlyOwner {
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
