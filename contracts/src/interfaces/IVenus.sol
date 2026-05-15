// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IVenusComptroller {
    function getAccountLiquidity(address account)
        external
        view
        returns (uint256 err, uint256 liquidity, uint256 shortfall);
}

interface IVToken {
    function mint(uint256 mintAmount) external returns (uint256);
    function repayBorrowBehalf(address borrower, uint256 repayAmount) external returns (uint256);
    function underlying() external view returns (address);
}
