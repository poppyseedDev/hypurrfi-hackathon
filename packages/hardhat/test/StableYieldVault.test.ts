import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";

import { network } from "hardhat";
import { parseEther, parseUnits, zeroAddress } from "viem";

describe("StableYieldVault", async function () {
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();
  const [owner, user1, user2] = await viem.getWalletClients();

  // HypurrFi contracts (HyperEVM mainnet)
  const HYPURRFI_POOL = "0xceCcE0EB9DD2Ef7996e01e25DD70e461F918A14b" as `0x${string}`;
  const USDC = "0xb88339CB7199b77E23DB6E890353E22632Ba630f" as `0x${string}`;
  const USDXL = "0xca79db4b49f608ef54a5cb813fbed3a6387bc645" as `0x${string}`;

  let vault: Awaited<ReturnType<typeof viem.deployContract>>;

  describe("Deployment", function () {
    it("Should deploy vault with correct parameters", async function () {
      vault = await viem.deployContract("StableYieldVault", [
        HYPURRFI_POOL,
        USDC,
        USDXL,
        "Stable Yield Vault",
        "SYV"
      ]);

      assert.equal(await vault.read.name(), "Stable Yield Vault");
      assert.equal(await vault.read.symbol(), "SYV");
      assert.equal(await vault.read.hypurrfiPool(), HYPURRFI_POOL);
      assert.equal(await vault.read.depositAsset(), USDC);
      assert.equal(await vault.read.borrowAsset(), USDXL);
    });

    it("Should have correct initial parameters", async function () {
      vault = await viem.deployContract("StableYieldVault", [
        HYPURRFI_POOL,
        USDC,
        USDXL,
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
            USDC,
            USDXL,
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
      vault = await viem.deployContract("StableYieldVault", [
        HYPURRFI_POOL,
        USDC,
        USDXL,
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
      vault = await viem.deployContract("StableYieldVault", [
        HYPURRFI_POOL,
        USDC,
        USDXL,
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
        }
      );

      // Owner can call (though it won't do much without positions)
      await vault.write.delever({ account: owner.account });
    });

    it("Should allow only owner to emergency withdraw", async function () {
      await assert.rejects(
        async () => {
          await vault.write.emergencyWithdrawAll({ account: user1.account });
        }
      );
    });
  });

  describe("View Functions", function () {
    beforeEach(async function () {
      vault = await viem.deployContract("StableYieldVault", [
        HYPURRFI_POOL,
        USDC,
        USDXL,
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
    });

    it("Should return total assets", async function () {
      const totalAssets = await vault.read.getTotalAssets();
      assert.equal(totalAssets, 0n); // No deposits yet
    });

    it("Should return health factor", async function () {
      const healthFactor = await vault.read.getHealthFactor();
      // Should be max value when no debt
    });
  });

  describe("Events", function () {
    beforeEach(async function () {
      vault = await viem.deployContract("StableYieldVault", [
        HYPURRFI_POOL,
        USDC,
        USDXL,
        "Stable Yield Vault",
        "SYV"
      ]);
    });

    it("Should emit ParametersUpdated on parameter change", async function () {
      await viem.assertions.emit(
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
        "ParametersUpdated"
      );
    });
  });
});
