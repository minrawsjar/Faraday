// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {FaradayVault} from "../src/FaradayVault.sol";
import {PositionRegistry} from "../src/PositionRegistry.sol";

contract Deploy is Script {
    // ARC testnet addresses — update before mainnet deploy
    address constant USDC    = 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238; // placeholder
    address constant USYC    = 0x0000000000000000000000000000000000000000; // fill when live
    address constant GATEWAY = 0x0000000000000000000000000000000000000000; // fill when live

    function run() external {
        address deployer = vm.envAddress("DEPLOYER_ADDRESS");
        address agentWallet = vm.envAddress("AGENT_WALLET_ADDRESS");

        vm.startBroadcast(vm.envUint("PRIVATE_KEY"));

        PositionRegistry registry = new PositionRegistry(agentWallet);
        FaradayVault vault = new FaradayVault(USDC, USYC, GATEWAY, agentWallet);

        vm.stopBroadcast();

        console.log("PositionRegistry:", address(registry));
        console.log("FaradayVault:    ", address(vault));
        console.log("Deployer:        ", deployer);
        console.log("Agent wallet:    ", agentWallet);
    }
}
