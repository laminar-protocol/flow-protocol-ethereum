// solium-disable linebreak-style
pragma solidity ^0.6.3;
import "@openzeppelin/contracts/ownership/Ownable.sol";
import "@openzeppelin/contracts/access/Roles.sol";

// TODO: change Ownable to Admin to ensure always must be a valid admin
contract PriceFeederRole is Ownable {
    using Roles for Roles.Role;

    event PriceFeederAdded(address indexed account);
    event PriceFeederRemoved(address indexed account);

    Roles.Role private _priceFeederRole;

    // store all price feeders to support traverse etc
    address[] internal priceFeeders;
    // addr => index in `priceFeeders`
    mapping (address => uint) internal priceFeederIndices;

    modifier onlyPriceFeeder() {
        require(isPriceFeeder(msg.sender), "PriceFeederRole: caller does not have the PriceFeeder role");
        _;
    }

    function isPriceFeeder(address account) public view returns (bool) {
        return _priceFeederRole.has(account);
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
        // role
        _priceFeederRole.add(account);

        // push and record index
        priceFeeders.push(account);
        priceFeederIndices[account] = priceFeeders.length - 1;

        emit PriceFeederAdded(account);
    }

    function _removePriceFeeder(address account) internal {
        // role
        _priceFeederRole.remove(account);

        // if not last index, swap with last element
        uint index = priceFeederIndices[account];
        uint lastIndex = priceFeeders.length - 1;
        if (index != lastIndex) {
            priceFeeders[index] = priceFeeders[lastIndex];
        }
        // delete last element and its index
        priceFeeders.pop();
        delete priceFeederIndices[account];

        emit PriceFeederRemoved(account);
    }
}
