// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IAaveLendingPool {
    struct UserAccountData {
        uint256 totalCollateralBase;
        uint256 totalDebtBase;
        uint256 availableBorrowsBase;
        uint256 currentLiquidationThreshold;
        uint256 ltv;
        uint256 healthFactor;
    }

    function getUserAccountData(address user)
        external
        view
        returns (UserAccountData memory);

    function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode)
        external;

    function repay(address asset, uint256 amount, uint256 interestRateMode, address onBehalfOf)
        external
        returns (uint256);
}
