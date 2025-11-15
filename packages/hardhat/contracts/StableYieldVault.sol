// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/IPool.sol";

/**
 * @title StableYieldVault
 * @notice ERC-4626 style vault that creates leveraged stablecoin yield loops on HypurrFi
 * @dev Users deposit stablecoins, vault supplies to HypurrFi, borrows USDXL, re-supplies in a loop
 */
contract StableYieldVault is ERC20, Ownable, ReentrancyGuard {
    // HypurrFi Pool contract
    IPool public immutable hypurrfiPool;

    // Deposit asset (e.g., USDC, USDT0)
    IERC20 public immutable depositAsset;

    // Borrow asset (USDXL)
    IERC20 public immutable borrowAsset;

    // Target health factor (scaled by 1e18) - aiming for 1.3
    uint256 public targetHealthFactor = 1.3e18;

    // Minimum health factor before rebalancing (scaled by 1e18) - rebalance at 1.15
    uint256 public minHealthFactor = 1.15e18;

    // Maximum health factor (scaled by 1e18) - rebalance if above 1.5 (under-leveraged)
    uint256 public maxHealthFactor = 1.5e18;

    // Target LTV for initial loops (60% = 6000)
    uint256 public targetLTV = 6000; // basis points (60%)
    uint256 public constant MAX_BPS = 10000;

    // Maximum number of loop iterations
    uint256 public maxLoopIterations = 4;

    // Interest rate mode for borrows (2 = variable)
    uint256 private constant INTEREST_RATE_MODE = 2;

    // Paused state
    bool public paused;

    // Events
    event Deposit(address indexed user, uint256 assets, uint256 shares);
    event Withdraw(address indexed user, uint256 assets, uint256 shares);
    event Rebalanced(uint256 oldHealthFactor, uint256 newHealthFactor);
    event Deleveraged(uint256 healthFactor);
    event EmergencyWithdraw(address indexed user, uint256 amount);
    event ParametersUpdated(uint256 targetHF, uint256 minHF, uint256 maxHF, uint256 targetLTV);

    /**
     * @notice Constructor
     * @param _hypurrfiPool Address of HypurrFi Pool contract
     * @param _depositAsset Address of deposit asset (USDC, USDT0, etc.)
     * @param _borrowAsset Address of borrow asset (USDXL)
     * @param _name Vault token name
     * @param _symbol Vault token symbol
     */
    constructor(
        address _hypurrfiPool,
        address _depositAsset,
        address _borrowAsset,
        string memory _name,
        string memory _symbol
    ) ERC20(_name, _symbol) Ownable(msg.sender) {
        require(_hypurrfiPool != address(0), "Invalid pool address");
        require(_depositAsset != address(0), "Invalid deposit asset");
        require(_borrowAsset != address(0), "Invalid borrow asset");

        hypurrfiPool = IPool(_hypurrfiPool);
        depositAsset = IERC20(_depositAsset);
        borrowAsset = IERC20(_borrowAsset);

        // Approve pool for max amounts
        IERC20(_depositAsset).approve(_hypurrfiPool, type(uint256).max);
        IERC20(_borrowAsset).approve(_hypurrfiPool, type(uint256).max);
    }

    /**
     * @notice Deposit stablecoins and mint vault shares
     * @param assets Amount of deposit asset to deposit
     * @return shares Amount of vault shares minted
     */
    function deposit(uint256 assets) external nonReentrant returns (uint256 shares) {
        require(!paused, "Vault is paused");
        require(assets > 0, "Cannot deposit 0");

        // Calculate shares to mint
        shares = convertToShares(assets);
        require(shares > 0, "Invalid share amount");

        // Transfer assets from user
        depositAsset.transferFrom(msg.sender, address(this), assets);

        // Execute leverage loop
        _executeLoop(assets);

        // Mint shares to user
        _mint(msg.sender, shares);

        emit Deposit(msg.sender, assets, shares);
    }

    /**
     * @notice Withdraw stablecoins by burning vault shares
     * @param shares Amount of vault shares to burn
     * @return assets Amount of assets withdrawn
     */
    function withdraw(uint256 shares) external nonReentrant returns (uint256 assets) {
        require(shares > 0, "Cannot withdraw 0");
        require(balanceOf(msg.sender) >= shares, "Insufficient shares");

        // Calculate assets to withdraw
        assets = convertToAssets(shares);
        require(assets > 0, "Invalid asset amount");

        // Burn shares from user
        _burn(msg.sender, shares);

        // Unwind position proportionally
        _unwindPosition(shares, totalSupply() + shares); // Add back burned shares for calculation

        // Transfer assets to user
        depositAsset.transfer(msg.sender, assets);

        emit Withdraw(msg.sender, assets, shares);
    }

    /**
     * @notice Execute leveraged loop strategy
     * @param initialAmount Initial amount to supply
     */
    function _executeLoop(uint256 initialAmount) private {
        // Supply initial collateral
        hypurrfiPool.supply(address(depositAsset), initialAmount, address(this), 0);

        // Execute loop iterations
        uint256 currentSupply = initialAmount;

        for (uint256 i = 0; i < maxLoopIterations; i++) {
            // Calculate borrow amount based on target LTV
            uint256 borrowAmount = (currentSupply * targetLTV) / MAX_BPS;

            if (borrowAmount == 0) break;

            // Borrow USDXL
            hypurrfiPool.borrow(address(borrowAsset), borrowAmount, INTEREST_RATE_MODE, 0, address(this));

            // Supply borrowed USDXL back
            hypurrfiPool.supply(address(borrowAsset), borrowAmount, address(this), 0);

            // Update current supply for next iteration
            currentSupply = borrowAmount;

            // Check if health factor is still safe
            (, , , , , uint256 healthFactor) = hypurrfiPool.getUserAccountData(address(this));

            // Stop if health factor is getting too low
            if (healthFactor < targetHealthFactor) {
                break;
            }
        }
    }

    /**
     * @notice Unwind position proportionally for withdrawal
     * @param sharesToBurn Shares being burned
     * @param totalSharesBefore Total shares before burn
     */
    function _unwindPosition(uint256 sharesToBurn, uint256 totalSharesBefore) private {
        uint256 proportion = (sharesToBurn * 1e18) / totalSharesBefore;

        // Get current user account data
        (uint256 totalCollateral, uint256 totalDebt, , , , ) = hypurrfiPool.getUserAccountData(address(this));

        if (totalDebt == 0) {
            // No debt, just withdraw collateral proportionally
            uint256 withdrawAmount = (totalCollateral * proportion) / 1e18;
            if (withdrawAmount > 0) {
                hypurrfiPool.withdraw(address(depositAsset), withdrawAmount, address(this));
            }
            return;
        }

        // Calculate amounts to unwind
        uint256 debtToRepay = (totalDebt * proportion) / 1e18;
        uint256 collateralToWithdraw = (totalCollateral * proportion) / 1e18;

        // Unwind in reverse: withdraw USDXL collateral, repay USDXL debt
        if (debtToRepay > 0) {
            // Withdraw enough USDXL collateral to repay debt
            uint256 usdxlToWithdraw = debtToRepay;
            hypurrfiPool.withdraw(address(borrowAsset), usdxlToWithdraw, address(this));

            // Repay USDXL debt
            hypurrfiPool.repay(address(borrowAsset), debtToRepay, INTEREST_RATE_MODE, address(this));
        }

        // Withdraw remaining deposit asset collateral
        if (collateralToWithdraw > 0) {
            hypurrfiPool.withdraw(address(depositAsset), collateralToWithdraw, address(this));
        }
    }

    /**
     * @notice Rebalance vault to maintain target health factor
     */
    function rebalance() external nonReentrant {
        require(!paused, "Vault is paused");

        (, , , , , uint256 healthFactor) = hypurrfiPool.getUserAccountData(address(this));

        if (healthFactor < minHealthFactor) {
            // Health factor too low - delever
            _deleverToTarget();
        } else if (healthFactor > maxHealthFactor) {
            // Health factor too high - increase leverage
            _leverToTarget();
        }

        // Get new health factor
        (, , , , , uint256 newHealthFactor) = hypurrfiPool.getUserAccountData(address(this));

        emit Rebalanced(healthFactor, newHealthFactor);
    }

    /**
     * @notice Reduce leverage to restore target health factor
     */
    function _deleverToTarget() private {
        (uint256 totalCollateral, uint256 totalDebt, , , , uint256 currentHF) = hypurrfiPool.getUserAccountData(address(this));

        if (currentHF >= targetHealthFactor) return;

        // Calculate how much debt to repay to reach target HF
        // Simple approach: repay a portion of debt
        uint256 debtToRepay = totalDebt / 10; // Repay 10% at a time

        if (debtToRepay > 0) {
            // Withdraw USDXL collateral to repay
            hypurrfiPool.withdraw(address(borrowAsset), debtToRepay, address(this));

            // Repay debt
            hypurrfiPool.repay(address(borrowAsset), debtToRepay, INTEREST_RATE_MODE, address(this));
        }
    }

    /**
     * @notice Increase leverage when under-leveraged
     */
    function _leverToTarget() private {
        (, , uint256 availableBorrows, , , ) = hypurrfiPool.getUserAccountData(address(this));

        if (availableBorrows == 0) return;

        // Borrow additional USDXL
        uint256 borrowAmount = availableBorrows / 4; // Borrow 25% of available

        if (borrowAmount > 0) {
            hypurrfiPool.borrow(address(borrowAsset), borrowAmount, INTEREST_RATE_MODE, 0, address(this));
            hypurrfiPool.supply(address(borrowAsset), borrowAmount, address(this), 0);
        }
    }

    /**
     * @notice Emergency delever function
     */
    function delever() external onlyOwner nonReentrant {
        (, , , , , uint256 healthFactor) = hypurrfiPool.getUserAccountData(address(this));

        _deleverToTarget();

        emit Deleveraged(healthFactor);
    }

    /**
     * @notice Emergency withdraw all positions
     */
    function emergencyWithdrawAll() external onlyOwner nonReentrant {
        paused = true;

        // Fully unwind all positions
        (uint256 totalCollateral, uint256 totalDebt, , , , ) = hypurrfiPool.getUserAccountData(address(this));

        // Repay all debt
        if (totalDebt > 0) {
            hypurrfiPool.withdraw(address(borrowAsset), type(uint256).max, address(this));
            hypurrfiPool.repay(address(borrowAsset), type(uint256).max, INTEREST_RATE_MODE, address(this));
        }

        // Withdraw all collateral
        hypurrfiPool.withdraw(address(depositAsset), type(uint256).max, address(this));
        hypurrfiPool.withdraw(address(borrowAsset), type(uint256).max, address(this));

        emit EmergencyWithdraw(msg.sender, totalCollateral);
    }

    /**
     * @notice Convert assets to shares
     * @param assets Amount of assets
     * @return shares Amount of shares
     */
    function convertToShares(uint256 assets) public view returns (uint256 shares) {
        uint256 supply = totalSupply();
        if (supply == 0) {
            return assets; // 1:1 for first deposit
        }

        uint256 totalAssets = getTotalAssets();
        if (totalAssets == 0) {
            return assets;
        }

        return (assets * supply) / totalAssets;
    }

    /**
     * @notice Convert shares to assets
     * @param shares Amount of shares
     * @return assets Amount of assets
     */
    function convertToAssets(uint256 shares) public view returns (uint256 assets) {
        uint256 supply = totalSupply();
        if (supply == 0) {
            return 0;
        }

        return (shares * getTotalAssets()) / supply;
    }

    /**
     * @notice Get total assets managed by vault (approximate)
     * @return Total assets in base currency
     */
    function getTotalAssets() public view returns (uint256) {
        (uint256 totalCollateral, uint256 totalDebt, , , , ) = hypurrfiPool.getUserAccountData(address(this));

        // Approximate: total collateral minus total debt
        if (totalCollateral > totalDebt) {
            return totalCollateral - totalDebt;
        }
        return 0;
    }

    /**
     * @notice Get current health factor
     * @return healthFactor Current health factor (scaled by 1e18)
     */
    function getHealthFactor() external view returns (uint256 healthFactor) {
        (, , , , , healthFactor) = hypurrfiPool.getUserAccountData(address(this));
    }

    /**
     * @notice Get vault position details
     * @return collateral Total collateral value
     * @return debt Total debt value
     * @return healthFactor Current health factor
     */
    function getPositionDetails() external view returns (uint256 collateral, uint256 debt, uint256 healthFactor) {
        (collateral, debt, , , , healthFactor) = hypurrfiPool.getUserAccountData(address(this));
    }

    /**
     * @notice Update vault parameters (onlyOwner)
     */
    function updateParameters(
        uint256 _targetHF,
        uint256 _minHF,
        uint256 _maxHF,
        uint256 _targetLTV
    ) external onlyOwner {
        require(_minHF < _targetHF && _targetHF < _maxHF, "Invalid health factor range");
        require(_targetLTV < MAX_BPS, "Invalid LTV");

        targetHealthFactor = _targetHF;
        minHealthFactor = _minHF;
        maxHealthFactor = _maxHF;
        targetLTV = _targetLTV;

        emit ParametersUpdated(_targetHF, _minHF, _maxHF, _targetLTV);
    }

    /**
     * @notice Pause/unpause vault
     */
    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
    }
}
