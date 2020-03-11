pragma solidity ^0.6.3;

import "@openzeppelin/contracts/ownership/Ownable.sol";

contract LaminarStorage is Ownable {

    mapping(bytes32 => uint256)    private uIntStorage;
    mapping(bytes32 => string)     private stringStorage;
    mapping(bytes32 => address)    private addressStorage;
    mapping(bytes32 => bytes)      private bytesStorage;
    mapping(bytes32 => bool)       private boolStorage;
    mapping(bytes32 => int256)     private intStorage;

    modifier onlyLatestLaminarNetworkContract() {
        if (msg.sender == owner()) {
            // owner may add contracts upon deployment once, but has no further access
            require(boolStorage[keccak256("contract.storage.initialised")] == false);
        } else {
            require(
                addressStorage[keccak256(abi.encodePacked("contract.address", msg.sender))] != address(0),
                'Only registered contracts are allowed to change data!'
            );
        }

        _;
    }

    function getAddress(bytes32 _key) external view returns (address) {
        return addressStorage[_key];
    }

    function getUint256(bytes32 _key) external view returns (uint) {
        return uIntStorage[_key];
    }

    function getString(bytes32 _key) external view returns (string memory) {
        return stringStorage[_key];
    }

    function getBytes(bytes32 _key) external view returns (bytes memory) {
        return bytesStorage[_key];
    }

    function getBool(bytes32 _key) external view returns (bool) {
        return boolStorage[_key];
    }

    function getInt(bytes32 _key) external view returns (int) {
        return intStorage[_key];
    }

    function setAddress(bytes32 _key, address _value) onlyLatestLaminarNetworkContract external {
        addressStorage[_key] = _value;
    }

    function setUint256(bytes32 _key, uint _value) onlyLatestLaminarNetworkContract external {
        uIntStorage[_key] = _value;
    }

    function setString(bytes32 _key, string calldata _value) onlyLatestLaminarNetworkContract external {
        stringStorage[_key] = _value;
    }

    function setBytes(bytes32 _key, bytes calldata _value) onlyLatestLaminarNetworkContract external {
        bytesStorage[_key] = _value;
    }
    
    function setBool(bytes32 _key, bool _value) onlyLatestLaminarNetworkContract external {
        boolStorage[_key] = _value;
    }
    
    function setInt(bytes32 _key, int _value) onlyLatestLaminarNetworkContract external {
        intStorage[_key] = _value;
    }
    
    function deleteAddress(bytes32 _key) onlyLatestLaminarNetworkContract external {
        delete addressStorage[_key];
    }

    function deleteUint(bytes32 _key) onlyLatestLaminarNetworkContract external {
        delete uIntStorage[_key];
    }

    function deleteString(bytes32 _key) onlyLatestLaminarNetworkContract external {
        delete stringStorage[_key];
    }

    function deleteBytes(bytes32 _key) onlyLatestLaminarNetworkContract external {
        delete bytesStorage[_key];
    }
    
    function deleteBool(bytes32 _key) onlyLatestLaminarNetworkContract external {
        delete boolStorage[_key];
    }
    
    function deleteInt(bytes32 _key) onlyLatestLaminarNetworkContract external {
        delete intStorage[_key];
    }
}