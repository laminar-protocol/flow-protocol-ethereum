pragma solidity ^0.6.3;

import "@openzeppelin/upgrades/contracts/Initializable.sol";

import "../libs/upgrades/UpgradeAccessControl.sol";
import "../libs/upgrades/UpgradeOwnable.sol";

// TODO: change Ownable to Admin to ensure always must be a valid admin
contract PriceFeederRole is Initializable, UpgradeOwnable, AccessControl {
    event PriceFeederAdded(address indexed _account);
    event PriceFeederRemoved(address indexed _account);

    bytes32 public constant PRICE_FEEDER_ROLE = keccak256("PRICE_FEEDER_ROLE");

    // store all price feeders to support traverse etc
    address[] internal priceFeeders;
    // addr => index in `priceFeeders`
    mapping (address => uint) internal priceFeederIndices;

    modifier onlyPriceFeeder() {
        require(isPriceFeeder(msg.sender), "PriceFeederRole: caller does not have the PriceFeeder role");
        _;
    }

    function initialize() public virtual initializer {
        UpgradeOwnable.initialize(msg.sender);
        _grantRole(PRICE_FEEDER_ROLE, msg.sender);
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
        _grantRole(PRICE_FEEDER_ROLE, _account);

        // push and record index
        priceFeeders.push(_account);
        priceFeederIndices[_account] = priceFeeders.length - 1;

        emit PriceFeederAdded(_account);
    }

    function _removePriceFeeder(address _account) internal {
        // role
        _revokeRole(PRICE_FEEDER_ROLE, _account);

        // if not last index, swap with last element
        uint index = priceFeederIndices[_account];
        uint lastIndex = priceFeeders.length - 1;
        if (index != lastIndex) {
            priceFeeders[index] = priceFeeders[lastIndex];
        }
        // delete last element and its index
        priceFeeders.pop();
        delete priceFeederIndices[_account];

        emit PriceFeederRemoved(_account);
    }
}
