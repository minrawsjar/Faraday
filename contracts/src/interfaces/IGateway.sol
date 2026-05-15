// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IGateway {
    function transfer(
        address token,
        uint256 amount,
        uint32 destinationChainId,
        address recipient
    ) external returns (bytes32 transferId);

    function transferWithPayload(
        address token,
        uint256 amount,
        uint32 destinationChainId,
        address recipient,
        bytes calldata payload
    ) external returns (bytes32 transferId);
}
