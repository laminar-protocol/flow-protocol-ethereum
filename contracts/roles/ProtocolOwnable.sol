// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.6.10;

import "@openzeppelin/contracts-ethereum-package/contracts/Initializable.sol";

contract ProtocolOwnable is Initializable {
    address private _protocol;

    function initialize(address protocol) public initializer {
        _protocol = protocol;
    }

    function protocol() public view returns (address) {
        return _protocol;
    }

    modifier onlyProtocol() {
        require(isProtocol(), "Ownable: caller is not the protocol");
        _;
    }

    function isProtocol() public view returns (bool) {
        return msg.sender == address(_protocol);
    }
}
