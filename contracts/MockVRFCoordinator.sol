// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MockVRFCoordinator
 * @notice Simulates Chainlink VRF locally. In production on Sepolia,
 *         replace with the real VRFCoordinatorV2_5 at:
 *         0x9DdfaCa8183c41ad55329BdeeD9F6A8d53168B1
 *
 *         For testnet: this mock auto-fulfills with pseudo-random numbers.
 *         NOT secure for production — use real Chainlink VRF on mainnet.
 */
contract MockVRFCoordinator {
    uint256 private _requestIdCounter;
    mapping(uint256 => address) public requestToConsumer;

    event RandomWordsRequested(uint256 requestId, address consumer);
    event RandomWordsFulfilled(uint256 requestId, uint256[] randomWords);

    /// @notice Simulates requesting randomness. Auto-fulfills immediately (local only).
    function requestRandomWords(
        bytes32, /* keyHash */
        uint256, /* subId */
        uint16, /* confirmations */
        uint32, /* callbackGasLimit */
        uint32 numWords
    ) external returns (uint256 requestId) {
        _requestIdCounter++;
        requestId = _requestIdCounter;
        requestToConsumer[requestId] = msg.sender;

        emit RandomWordsRequested(requestId, msg.sender);

        // Auto-fulfill with pseudo-random words (local dev only)
        uint256[] memory randomWords = new uint256[](numWords);
        for (uint32 i = 0; i < numWords; i++) {
            randomWords[i] = uint256(
                keccak256(abi.encodePacked(block.timestamp, block.prevrandao, msg.sender, requestId, i))
            );
        }

        // Callback to consumer
        IVRFConsumer(msg.sender).rawFulfillRandomWords(requestId, randomWords);
        emit RandomWordsFulfilled(requestId, randomWords);

        return requestId;
    }
}

interface IVRFConsumer {
    function rawFulfillRandomWords(uint256 requestId, uint256[] memory randomWords) external;
}
