// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IPool.sol";

contract MockPool is IPool {
    mapping(address => mapping(address => uint256)) public supplied;
    mapping(address => mapping(address => uint256)) public borrowed;
    
    function supply(address asset, uint256 amount, address onBehalfOf, uint16) external {
        supplied[onBehalfOf][asset] += amount;
    }
    
    function withdraw(address asset, uint256 amount, address to) external returns (uint256) {
        supplied[msg.sender][asset] -= amount;
        return amount;
    }
    
    function borrow(address asset, uint256 amount, uint256, uint16, address onBehalfOf) external {
        borrowed[onBehalfOf][asset] += amount;
    }
    
    function repay(address asset, uint256 amount, uint256, address onBehalfOf) external returns (uint256) {
        if (borrowed[onBehalfOf][asset] > amount) {
            borrowed[onBehalfOf][asset] -= amount;
        } else {
            borrowed[onBehalfOf][asset] = 0;
        }
        return amount;
    }
    
    function repayWithATokens(address asset, uint256 amount, uint256) external returns (uint256) {
        // Mock implementation
        return amount;
    }
    
    function setUserUseReserveAsCollateral(address, bool) external {
        // Mock implementation
    }
    
    function getUserAccountData(address user) external view returns (
        uint256 totalCollateralBase,
        uint256 totalDebtBase,
        uint256 availableBorrowsBase,
        uint256 currentLiquidationThreshold,
        uint256 ltv,
        uint256 healthFactor
    ) {
        // Return safe defaults for testing
        return (0, 0, 0, 0, 0, type(uint256).max);
    }
}

