// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {FaradayVault} from "../src/FaradayVault.sol";
import {PositionRegistry} from "../src/PositionRegistry.sol";

contract Deploy is Script {
    // ARC Testnet addresses (chain ID 5042002)
    address constant USDC           = 0x3600000000000000000000000000000000000000;
    address constant USYC           = 0xe9185F0c5F296Ed1797AaE4238D26CCaBEadb86C;
    address constant USYC_TELLER    = 0x9fdF14c5B14173D74C08Af27AebFf39240dC105A;
    address constant GATEWAY_WALLET = 0x0077777d7EBA4688BDeF3E311b846F25870A19B9;

    function run() external {
        address deployer = vm.envAddress("DEPLOYER_ADDRESS");
        address agentWallet = vm.envAddress("AGENT_WALLET_ADDRESS");

        vm.startBroadcast(vm.envUint("PRIVATE_KEY"));

        PositionRegistry registry = new PositionRegistry(agentWallet);
        FaradayVault vault = new FaradayVault(USDC, USYC, USYC_TELLER, GATEWAY_WALLET, agentWallet);

        vm.stopBroadcast();

        console.log("PositionRegistry:", address(registry));
        console.log("FaradayVault:    ", address(vault));
        console.log("Deployer:        ", deployer);
        console.log("Agent wallet:    ", agentWallet);
    }
}
