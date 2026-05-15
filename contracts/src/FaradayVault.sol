// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "forge-std/interfaces/IERC20.sol";
import {SafeERC20} from "./libraries/SafeERC20.sol";
import {IUSYC} from "./interfaces/IUSYC.sol";
import {IGateway} from "./interfaces/IGateway.sol";

/// @notice Holds each user's USDC protection reserve on ARC.
/// The agent is the only address authorized to trigger withdrawals/transfers.
/// Users deposit USDC which is deployed into USYC for yield when idle.
contract FaradayVault {
    using SafeERC20 for IERC20;
    // -------------------------------------------------------------------------
    // Types
    // -------------------------------------------------------------------------

    struct Reserve {
        uint256 liquidUsdc;  // USDC held directly (fast access)
        uint256 usycShares;  // USYC shares (yield-bearing)
    }

    // -------------------------------------------------------------------------
    // State
    // -------------------------------------------------------------------------

    address public immutable usdc;
    address public immutable usyc;
    address public immutable gateway;
    address public owner;
    address public agent;

    // Minimum liquid USDC kept outside USYC per user for instant access
    uint256 public constant MIN_LIQUID_BUFFER = 200e6; // 200 USDC

    mapping(address => Reserve) public reserves;

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------

    event Deposited(address indexed user, uint256 usdcAmount, uint256 usycShares);
    event Withdrawn(address indexed user, uint256 usdcAmount);
    event ProtectionExecuted(address indexed user, uint256 usdcAmount, uint32 destinationChain, address recipient);
    event AgentUpdated(address indexed newAgent);

    // -------------------------------------------------------------------------
    // Errors
    // -------------------------------------------------------------------------

    error OnlyAgent();
    error OnlyOwner();
    error InsufficientReserve();
    error ZeroAmount();

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    constructor(address _usdc, address _usyc, address _gateway, address _agent) {
        usdc = _usdc;
        usyc = _usyc;
        gateway = _gateway;
        agent = _agent;
        owner = msg.sender;
    }

    // -------------------------------------------------------------------------
    // Modifiers
    // -------------------------------------------------------------------------

    modifier onlyAgent() {
        if (msg.sender != agent) revert OnlyAgent();
        _;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    // -------------------------------------------------------------------------
    // User-facing functions
    // -------------------------------------------------------------------------

    /// @notice Deposit USDC into the protection reserve.
    /// MIN_LIQUID_BUFFER stays liquid; the rest goes into USYC for yield.
    function deposit(uint256 amount) external {
        if (amount == 0) revert ZeroAmount();

        IERC20(usdc).safeTransferFrom(msg.sender, address(this), amount);

        Reserve storage r = reserves[msg.sender];

        uint256 currentLiquid = r.liquidUsdc;

        if (currentLiquid >= MIN_LIQUID_BUFFER) {
            // Buffer already funded — deploy everything into USYC
            uint256 shares = _depositToUSYC(amount);
            r.usycShares += shares;
            emit Deposited(msg.sender, amount, shares);
        } else {
            uint256 needed = MIN_LIQUID_BUFFER - currentLiquid;
            if (amount <= needed) {
                // Top up liquid buffer only
                r.liquidUsdc += amount;
                emit Deposited(msg.sender, amount, 0);
            } else {
                // Fill buffer then deploy remainder into USYC
                r.liquidUsdc += needed;
                uint256 forUSYC = amount - needed;
                uint256 shares = _depositToUSYC(forUSYC);
                r.usycShares += shares;
                emit Deposited(msg.sender, amount, shares);
            }
        }
    }

    /// @notice Withdraw USDC from the protection reserve (user only).
    function withdraw(uint256 amount) external {
        if (amount == 0) revert ZeroAmount();
        _ensureLiquid(msg.sender, amount);

        Reserve storage r = reserves[msg.sender];
        if (r.liquidUsdc < amount) revert InsufficientReserve();

        r.liquidUsdc -= amount;
        IERC20(usdc).safeTransfer(msg.sender, amount);
        emit Withdrawn(msg.sender, amount);
    }

    // -------------------------------------------------------------------------
    // Agent-only: protection execution
    // -------------------------------------------------------------------------

    /// @notice Agent calls this to move USDC cross-chain via Gateway and protect a position.
    /// Scoped permission: can only send to pre-registered recipients via PositionRegistry.
    function executeProtection(
        address user,
        uint256 usdcAmount,
        uint32 destinationChainId,
        address recipient
    ) external onlyAgent {
        if (usdcAmount == 0) revert ZeroAmount();
        _ensureLiquid(user, usdcAmount);

        Reserve storage r = reserves[user];
        if (r.liquidUsdc < usdcAmount) revert InsufficientReserve();

        r.liquidUsdc -= usdcAmount;

        IERC20(usdc).safeApprove(gateway, usdcAmount);
        IGateway(gateway).transfer(usdc, usdcAmount, destinationChainId, recipient);

        emit ProtectionExecuted(user, usdcAmount, destinationChainId, recipient);
    }

    // -------------------------------------------------------------------------
    // Admin
    // -------------------------------------------------------------------------

    function setAgent(address _agent) external onlyOwner {
        agent = _agent;
        emit AgentUpdated(_agent);
    }

    // -------------------------------------------------------------------------
    // View
    // -------------------------------------------------------------------------

    /// @notice Total USDC value of a user's reserve (liquid + USYC redeemable).
    function totalReserve(address user) external view returns (uint256) {
        Reserve storage r = reserves[user];
        uint256 usycValue = r.usycShares > 0
            ? IUSYC(usyc).previewRedeem(r.usycShares)
            : 0;
        return r.liquidUsdc + usycValue;
    }

    // -------------------------------------------------------------------------
    // Internal
    // -------------------------------------------------------------------------

    function _depositToUSYC(uint256 amount) internal returns (uint256 shares) {
        IERC20(usdc).safeApprove(usyc, amount);
        shares = IUSYC(usyc).deposit(amount);
    }

    /// @notice Redeem USYC shares to liquid USDC if the liquid buffer is insufficient.
    function _ensureLiquid(address user, uint256 required) internal {
        Reserve storage r = reserves[user];
        if (r.liquidUsdc >= required) return;

        uint256 shortfall = required - r.liquidUsdc;
        uint256 availableUsyc = IUSYC(usyc).previewRedeem(r.usycShares);

        if (availableUsyc < shortfall) revert InsufficientReserve();

        // Redeem only what's needed
        uint256 sharesToRedeem = (r.usycShares * shortfall) / availableUsyc + 1;
        uint256 received = IUSYC(usyc).redeem(sharesToRedeem);

        r.usycShares -= sharesToRedeem;
        r.liquidUsdc += received;
    }
}
