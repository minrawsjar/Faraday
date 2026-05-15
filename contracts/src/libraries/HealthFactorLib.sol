// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

library HealthFactorLib {
    // Aave represents HF with 18 decimals (1e18 = HF of 1.0)
    uint256 constant WAD = 1e18;

    function isAtRisk(uint256 healthFactor, uint256 threshold) internal pure returns (bool) {
        return healthFactor < threshold;
    }

    // How much USDC (6 decimals) is needed to restore HF from current to target.
    // Derived from: newHF = (collateral + injection) * liqThreshold / debt
    // => injection = (targetHF * debt / liqThreshold) - collateral
    // All base values are in USD with 8 decimals (Aave oracle standard).
    function calculateDeficit(
        uint256 totalCollateralBase, // 8 decimals
        uint256 totalDebtBase,       // 8 decimals
        uint256 liquidationThreshold, // bps, e.g. 8000 = 80%
        uint256 targetHF              // 18 decimals, e.g. 1.5e18
    ) internal pure returns (uint256 usdcAmount) {
        if (totalDebtBase == 0) return 0;

        // requiredCollateral = targetHF * totalDebtBase / liquidationThreshold (in bps)
        // liquidationThreshold is in bps (10000 = 100%)
        uint256 requiredCollateralBase = (targetHF * totalDebtBase) / (liquidationThreshold * WAD / 10000);

        if (requiredCollateralBase <= totalCollateralBase) return 0;

        uint256 deficitBase = requiredCollateralBase - totalCollateralBase; // 8 decimals

        // Convert from 8-decimal USD base to 6-decimal USDC
        // USDC is assumed ~$1, so deficitBase / 100 = USDC amount (6 decimals)
        usdcAmount = deficitBase / 100;
    }

    function toWad(uint256 value, uint256 decimals) internal pure returns (uint256) {
        if (decimals < 18) return value * 10 ** (18 - decimals);
        if (decimals > 18) return value / 10 ** (decimals - 18);
        return value;
    }
}
