// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {HealthFactorLib} from "./libraries/HealthFactorLib.sol";

/// @notice Stores user configurations for which DeFi positions Faraday monitors
/// and the thresholds that trigger an intervention.
contract PositionRegistry {
    using HealthFactorLib for uint256;

    // -------------------------------------------------------------------------
    // Types
    // -------------------------------------------------------------------------

    enum Protocol { AAVE, VENUS, GMX }

    struct Position {
        address user;           // wallet address on the destination chain
        Protocol protocol;
        uint32 chainId;         // destination chain (e.g. 1 = Ethereum)
        uint256 triggerHF;      // HF below which agent intervenes (18 decimals)
        uint256 targetHF;       // HF the agent restores to (18 decimals)
        bool active;
    }

    // -------------------------------------------------------------------------
    // State
    // -------------------------------------------------------------------------

    address public owner;
    address public agent;

    uint256 private _nextId;
    mapping(uint256 => Position) public positions;
    mapping(address => uint256[]) public userPositionIds;

    // Minimum sane values to prevent misconfiguration
    uint256 public constant MIN_TRIGGER_HF = 1.05e18;  // 1.05
    uint256 public constant MAX_TRIGGER_HF = 1.8e18;   // 1.80
    uint256 public constant MIN_TARGET_HF  = 1.1e18;   // 1.10

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------

    event PositionRegistered(uint256 indexed id, address indexed user, Protocol protocol, uint32 chainId);
    event PositionUpdated(uint256 indexed id, uint256 triggerHF, uint256 targetHF);
    event PositionDeactivated(uint256 indexed id);
    event InterventionLogged(uint256 indexed id, uint256 usdcAmount, uint256 timestamp);

    // -------------------------------------------------------------------------
    // Errors
    // -------------------------------------------------------------------------

    error OnlyOwner();
    error OnlyAgent();
    error OnlyPositionOwner();
    error InvalidThreshold();
    error PositionNotActive();

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    constructor(address _agent) {
        owner = msg.sender;
        agent = _agent;
    }

    // -------------------------------------------------------------------------
    // Modifiers
    // -------------------------------------------------------------------------

    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    modifier onlyAgent() {
        if (msg.sender != agent) revert OnlyAgent();
        _;
    }

    // -------------------------------------------------------------------------
    // User-facing
    // -------------------------------------------------------------------------

    /// @notice Register a DeFi position for Faraday to monitor.
    /// @param user     The wallet address that holds the position on the destination chain.
    /// @param protocol Lending protocol (AAVE / VENUS / GMX).
    /// @param chainId  Chain where the position lives.
    /// @param triggerHF HF at which the agent fires (e.g. 1.3e18).
    /// @param targetHF  HF the agent restores to (e.g. 1.5e18).
    function register(
        address user,
        Protocol protocol,
        uint32 chainId,
        uint256 triggerHF,
        uint256 targetHF
    ) external returns (uint256 id) {
        if (
            triggerHF < MIN_TRIGGER_HF ||
            triggerHF > MAX_TRIGGER_HF ||
            targetHF <= triggerHF ||
            targetHF < MIN_TARGET_HF
        ) revert InvalidThreshold();

        id = _nextId++;
        positions[id] = Position({
            user: user,
            protocol: protocol,
            chainId: chainId,
            triggerHF: triggerHF,
            targetHF: targetHF,
            active: true
        });
        userPositionIds[msg.sender].push(id);

        emit PositionRegistered(id, user, protocol, chainId);
    }

    function updateThresholds(uint256 id, uint256 triggerHF, uint256 targetHF) external {
        Position storage p = positions[id];
        if (p.user != msg.sender) revert OnlyPositionOwner();
        if (!p.active) revert PositionNotActive();
        if (
            triggerHF < MIN_TRIGGER_HF ||
            triggerHF > MAX_TRIGGER_HF ||
            targetHF <= triggerHF
        ) revert InvalidThreshold();

        p.triggerHF = triggerHF;
        p.targetHF = targetHF;
        emit PositionUpdated(id, triggerHF, targetHF);
    }

    function deactivate(uint256 id) external {
        Position storage p = positions[id];
        if (p.user != msg.sender) revert OnlyPositionOwner();
        p.active = false;
        emit PositionDeactivated(id);
    }

    // -------------------------------------------------------------------------
    // Agent-only
    // -------------------------------------------------------------------------

    /// @notice Log that the agent executed a protection intervention.
    function logIntervention(uint256 id, uint256 usdcAmount) external onlyAgent {
        if (!positions[id].active) revert PositionNotActive();
        emit InterventionLogged(id, usdcAmount, block.timestamp);
    }

    // -------------------------------------------------------------------------
    // View
    // -------------------------------------------------------------------------

    function getPosition(uint256 id) external view returns (Position memory) {
        return positions[id];
    }

    function getUserPositions(address user) external view returns (uint256[] memory) {
        return userPositionIds[user];
    }

    function totalPositions() external view returns (uint256) {
        return _nextId;
    }
}
