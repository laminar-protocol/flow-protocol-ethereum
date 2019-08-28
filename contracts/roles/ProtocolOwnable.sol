pragma solidity ^0.5.8;

import "../interfaces/FlowProtocolInterface.sol";

contract ProtocolOwnable {
    FlowProtocolInterface private _protocol;

    constructor () internal {
        _protocol = FlowProtocolInterface(msg.sender);
    }

    function protocol() public view returns (FlowProtocolInterface) {
        return _protocol;
    }

    modifier onlyProtocol() {
        require(isProtocol(), "Ownable: caller is not the owner");
        _;
    }

    function isProtocol() public view returns (bool) {
        return msg.sender == address(_protocol);
    }
}
