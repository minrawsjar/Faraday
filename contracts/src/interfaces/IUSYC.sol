// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// Interface for the USYC Teller contract on ARC Testnet
// Teller: 0x9fdF14c5B14173D74C08Af27AebFf39240dC105A
// USYC token: 0xe9185F0c5F296Ed1797AaE4238D26CCaBEadb86C
interface IUSYCTeller {
    // Approve Teller to spend USDC first, then call deposit
    function deposit(uint256 assets, address receiver) external returns (uint256 shares);

    // _account is the address holding USYC shares (usually address(this))
    function redeem(uint256 shares, address receiver, address account) external returns (uint256 assets);

    // EIP-4626 preview — returns USDC value of given shares
    function previewRedeem(uint256 shares) external view returns (uint256 assets);
}

interface IUSYCToken {
    function balanceOf(address account) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
}
