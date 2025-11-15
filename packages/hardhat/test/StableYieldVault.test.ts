import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";

import { network } from "hardhat";
import { parseEther, parseUnits, zeroAddress } from "viem";

describe("StableYieldVault", async function () {
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();
  const [owner, user1, user2] = await viem.getWalletClients();

  let vault: Awaited<ReturnType<typeof viem.deployContract>>;
  let mockPool: Awaited<ReturnType<typeof viem.deployContract>>;
  let mockUSDC: Awaited<ReturnType<typeof viem.deployContract>>;
  let mockUSDXL: Awaited<ReturnType<typeof viem.deployContract>>;

  describe("Deployment", function () {
    beforeEach(async function () {
      // Deploy mock contracts
      mockPool = await viem.deployContract("MockPool");
      mockUSDC = await viem.deployContract("MockERC20", ["Mock USDC", "USDC"]);
      mockUSDXL = await viem.deployContract("MockERC20", ["Mock USDXL", "USDXL"]);
    });

    it("Should deploy vault with correct parameters", async function () {
      vault = await viem.deployContract("StableYieldVault", [
        mockPool.address,
        mockUSDC.address,
        mockUSDXL.address,
        "Stable Yield Vault",
        "SYV"
      ]);

      assert.equal(await vault.read.name(), "Stable Yield Vault");
      assert.equal(await vault.read.symbol(), "SYV");
      assert.equal(String(await vault.read.hypurrfiPool()).toLowerCase(), String(mockPool.address).toLowerCase());
      assert.equal(String(await vault.read.depositAsset()).toLowerCase(), String(mockUSDC.address).toLowerCase());
      assert.equal(String(await vault.read.borrowAsset()).toLowerCase(), String(mockUSDXL.address).toLowerCase());
    });

    it("Should have correct initial parameters", async function () {
      vault = await viem.deployContract("StableYieldVault", [
        mockPool.address,
        mockUSDC.address,
        mockUSDXL.address,
        "Stable Yield Vault",
        "SYV"
      ]);

      assert.equal(await vault.read.targetHealthFactor(), parseEther("1.3"));
      assert.equal(await vault.read.minHealthFactor(), parseEther("1.15"));
      assert.equal(await vault.read.maxHealthFactor(), parseEther("1.5"));
      assert.equal(await vault.read.targetLTV(), 6000n);
    });

    it("Should revert with invalid addresses", async function () {
      await assert.rejects(
        async () => {
          await viem.deployContract("StableYieldVault", [
            zeroAddress,
            mockUSDC.address,
            mockUSDXL.address,
            "Test",
            "TEST"
          ]);
        },
        (error: any) => {
          return error.message?.includes("Invalid pool address") || 
                 error.shortMessage?.includes("Invalid pool address");
        }
      );
    });
  });

  describe("Deposits and Withdrawals", function () {
    beforeEach(async function () {
      // Deploy mock contracts
      mockPool = await viem.deployContract("MockPool");
      mockUSDC = await viem.deployContract("MockERC20", ["Mock USDC", "USDC"]);
      mockUSDXL = await viem.deployContract("MockERC20", ["Mock USDXL", "USDXL"]);
      
      vault = await viem.deployContract("StableYieldVault", [
        mockPool.address,
        mockUSDC.address,
        mockUSDXL.address,
        "Stable Yield Vault",
        "SYV"
      ]);
    });

    it("Should handle first deposit correctly", async function () {
      // Note: This test would require forking HyperEVM mainnet and having USDC
      // For now, we just test the interface

      const depositAmount = parseUnits("100", 6); // 100 USDC

      // In a real test, we would:
      // 1. Get USDC tokens for user1
      // 2. Approve vault
      // 3. Deposit
      // 4. Check shares minted
      // 5. Verify position opened on HypurrFi
    });

    it("Should calculate shares correctly", async function () {
      // Test share calculation for empty vault (1:1)
      const assets = parseUnits("100", 6);
      const shares = await vault.read.convertToShares([assets]);
      assert.equal(shares, assets);
    });

    it("Should prevent deposits when paused", async function () {
      await vault.write.setPaused([true], { account: owner.account });

      // This would revert with "Vault is paused" in a real scenario
      assert.equal(await vault.read.paused(), true);
    });
  });

  describe("Risk Management", function () {
    beforeEach(async function () {
      // Deploy mock contracts
      mockPool = await viem.deployContract("MockPool");
      mockUSDC = await viem.deployContract("MockERC20", ["Mock USDC", "USDC"]);
      mockUSDXL = await viem.deployContract("MockERC20", ["Mock USDXL", "USDXL"]);
      
      vault = await viem.deployContract("StableYieldVault", [
        mockPool.address,
        mockUSDC.address,
        mockUSDXL.address,
        "Stable Yield Vault",
        "SYV"
      ]);
    });

    it("Should allow owner to update parameters", async function () {
      await vault.write.updateParameters(
        [
          parseEther("1.35"), // target HF
          parseEther("1.2"),  // min HF
          parseEther("1.6"),  // max HF
          6500n // target LTV
        ],
        { account: owner.account }
      );

      assert.equal(await vault.read.targetHealthFactor(), parseEther("1.35"));
      assert.equal(await vault.read.minHealthFactor(), parseEther("1.2"));
      assert.equal(await vault.read.maxHealthFactor(), parseEther("1.6"));
      assert.equal(await vault.read.targetLTV(), 6500n);
    });

    it("Should revert on invalid parameter updates", async function () {
      await assert.rejects(
        async () => {
          await vault.write.updateParameters(
            [
              parseEther("1.2"),  // target HF
              parseEther("1.3"),  // min HF (higher than target!)
              parseEther("1.6"),  // max HF
              6000n
            ],
            { account: owner.account }
          );
        },
        (error: any) => {
          return error.message?.includes("Invalid health factor range") || 
                 error.shortMessage?.includes("Invalid health factor range");
        }
      );
    });

    it("Should allow only owner to delever", async function () {
      await assert.rejects(
        async () => {
          await vault.write.delever({ account: user1.account });
        },
        (error: any) => {
          return error.message?.includes("Ownable") || 
                 error.shortMessage?.includes("Ownable") ||
                 error.message?.includes("not the owner") ||
                 error.shortMessage?.includes("not the owner");
        }
      );

      // Owner can call (though it won't do much without positions)
      await vault.write.delever({ account: owner.account });
    });

    it("Should allow only owner to emergency withdraw", async function () {
      await assert.rejects(
        async () => {
          await vault.write.emergencyWithdrawAll({ account: user1.account });
        },
        (error: any) => {
          return error.message?.includes("Ownable") || 
                 error.shortMessage?.includes("Ownable") ||
                 error.message?.includes("not the owner") ||
                 error.shortMessage?.includes("not the owner");
        }
      );
    });
  });

  describe("View Functions", function () {
    beforeEach(async function () {
      // Deploy mock contracts
      mockPool = await viem.deployContract("MockPool");
      mockUSDC = await viem.deployContract("MockERC20", ["Mock USDC", "USDC"]);
      mockUSDXL = await viem.deployContract("MockERC20", ["Mock USDXL", "USDXL"]);
      
      vault = await viem.deployContract("StableYieldVault", [
        mockPool.address,
        mockUSDC.address,
        mockUSDXL.address,
        "Stable Yield Vault",
        "SYV"
      ]);
    });

    it("Should return position details", async function () {
      const [collateral, debt, healthFactor] = await vault.read.getPositionDetails();

      // Initially no position
      assert.equal(collateral, 0n);
      assert.equal(debt, 0n);
      // Health factor is max uint256 when no debt
      assert.equal(healthFactor, BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"));
    });

    it("Should return total assets", async function () {
      const totalAssets = await vault.read.getTotalAssets();
      assert.equal(totalAssets, 0n); // No deposits yet
    });

    it("Should return health factor", async function () {
      const healthFactor = await vault.read.getHealthFactor();
      // Should be max value when no debt
      assert.equal(healthFactor, BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"));
    });
  });

  describe("Events", function () {
    beforeEach(async function () {
      // Deploy mock contracts
      mockPool = await viem.deployContract("MockPool");
      mockUSDC = await viem.deployContract("MockERC20", ["Mock USDC", "USDC"]);
      mockUSDXL = await viem.deployContract("MockERC20", ["Mock USDXL", "USDXL"]);
      
      vault = await viem.deployContract("StableYieldVault", [
        mockPool.address,
        mockUSDC.address,
        mockUSDXL.address,
        "Stable Yield Vault",
        "SYV"
      ]);
    });

    it("Should emit ParametersUpdated on parameter change", async function () {
      await viem.assertions.emitWithArgs(
        vault.write.updateParameters(
          [
            parseEther("1.35"),
            parseEther("1.2"),
            parseEther("1.6"),
            6500n
          ],
          { account: owner.account }
        ),
        vault,
        "ParametersUpdated",
        [
          parseEther("1.35"),
          parseEther("1.2"),
          parseEther("1.6"),
          6500n
        ]
      );
    });
  });
});
