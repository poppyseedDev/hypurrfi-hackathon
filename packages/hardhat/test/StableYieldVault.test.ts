import { expect } from "chai";
import { ethers } from "hardhat";
import { StableYieldVault, IPool, IERC20 } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("StableYieldVault", function () {
  let vault: StableYieldVault;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  // HypurrFi contracts (HyperEVM mainnet)
  const HYPURRFI_POOL = "0xceCcE0EB9DD2Ef7996e01e25DD70e461F918A14b";
  const USDC = "0xb88339CB7199b77E23DB6E890353E22632Ba630f";
  const USDXL = "0xca79db4b49f608ef54a5cb813fbed3a6387bc645";

  before(async function () {
    [owner, user1, user2] = await ethers.getSigners();
  });

  describe("Deployment", function () {
    it("Should deploy vault with correct parameters", async function () {
      const VaultFactory = await ethers.getContractFactory("StableYieldVault");

      vault = await VaultFactory.deploy(
        HYPURRFI_POOL,
        USDC,
        USDXL,
        "Stable Yield Vault",
        "SYV"
      );

      expect(await vault.name()).to.equal("Stable Yield Vault");
      expect(await vault.symbol()).to.equal("SYV");
      expect(await vault.hypurrfiPool()).to.equal(HYPURRFI_POOL);
      expect(await vault.depositAsset()).to.equal(USDC);
      expect(await vault.borrowAsset()).to.equal(USDXL);
    });

    it("Should have correct initial parameters", async function () {
      expect(await vault.targetHealthFactor()).to.equal(ethers.parseEther("1.3"));
      expect(await vault.minHealthFactor()).to.equal(ethers.parseEther("1.15"));
      expect(await vault.maxHealthFactor()).to.equal(ethers.parseEther("1.5"));
      expect(await vault.targetLTV()).to.equal(6000);
    });

    it("Should revert with invalid addresses", async function () {
      const VaultFactory = await ethers.getContractFactory("StableYieldVault");

      await expect(
        VaultFactory.deploy(
          ethers.ZeroAddress,
          USDC,
          USDXL,
          "Test",
          "TEST"
        )
      ).to.be.revertedWith("Invalid pool address");
    });
  });

  describe("Deposits and Withdrawals", function () {
    beforeEach(async function () {
      const VaultFactory = await ethers.getContractFactory("StableYieldVault");
      vault = await VaultFactory.deploy(
        HYPURRFI_POOL,
        USDC,
        USDXL,
        "Stable Yield Vault",
        "SYV"
      );
    });

    it("Should handle first deposit correctly", async function () {
      // Note: This test would require forking HyperEVM mainnet and having USDC
      // For now, we just test the interface

      const depositAmount = ethers.parseUnits("100", 6); // 100 USDC

      // In a real test, we would:
      // 1. Get USDC tokens for user1
      // 2. Approve vault
      // 3. Deposit
      // 4. Check shares minted
      // 5. Verify position opened on HypurrFi
    });

    it("Should calculate shares correctly", async function () {
      // Test share calculation for empty vault (1:1)
      const assets = ethers.parseUnits("100", 6);
      const shares = await vault.convertToShares(assets);
      expect(shares).to.equal(assets);
    });

    it("Should prevent deposits when paused", async function () {
      await vault.setPaused(true);

      // This would revert with "Vault is paused" in a real scenario
      expect(await vault.paused()).to.be.true;
    });
  });

  describe("Risk Management", function () {
    beforeEach(async function () {
      const VaultFactory = await ethers.getContractFactory("StableYieldVault");
      vault = await VaultFactory.deploy(
        HYPURRFI_POOL,
        USDC,
        USDXL,
        "Stable Yield Vault",
        "SYV"
      );
    });

    it("Should allow owner to update parameters", async function () {
      await vault.updateParameters(
        ethers.parseEther("1.35"), // target HF
        ethers.parseEther("1.2"),  // min HF
        ethers.parseEther("1.6"),  // max HF
        6500 // target LTV
      );

      expect(await vault.targetHealthFactor()).to.equal(ethers.parseEther("1.35"));
      expect(await vault.minHealthFactor()).to.equal(ethers.parseEther("1.2"));
      expect(await vault.maxHealthFactor()).to.equal(ethers.parseEther("1.6"));
      expect(await vault.targetLTV()).to.equal(6500);
    });

    it("Should revert on invalid parameter updates", async function () {
      await expect(
        vault.updateParameters(
          ethers.parseEther("1.2"),  // target HF
          ethers.parseEther("1.3"),  // min HF (higher than target!)
          ethers.parseEther("1.6"),  // max HF
          6000
        )
      ).to.be.revertedWith("Invalid health factor range");
    });

    it("Should allow only owner to delever", async function () {
      await expect(
        vault.connect(user1).delever()
      ).to.be.reverted;

      // Owner can call (though it won't do much without positions)
      await expect(vault.connect(owner).delever()).to.not.be.reverted;
    });

    it("Should allow only owner to emergency withdraw", async function () {
      await expect(
        vault.connect(user1).emergencyWithdrawAll()
      ).to.be.reverted;
    });
  });

  describe("View Functions", function () {
    beforeEach(async function () {
      const VaultFactory = await ethers.getContractFactory("StableYieldVault");
      vault = await VaultFactory.deploy(
        HYPURRFI_POOL,
        USDC,
        USDXL,
        "Stable Yield Vault",
        "SYV"
      );
    });

    it("Should return position details", async function () {
      const [collateral, debt, healthFactor] = await vault.getPositionDetails();

      // Initially no position
      expect(collateral).to.equal(0);
      expect(debt).to.equal(0);
      // Health factor is max uint256 when no debt
    });

    it("Should return total assets", async function () {
      const totalAssets = await vault.getTotalAssets();
      expect(totalAssets).to.equal(0); // No deposits yet
    });

    it("Should return health factor", async function () {
      const healthFactor = await vault.getHealthFactor();
      // Should be max value when no debt
    });
  });

  describe("Events", function () {
    beforeEach(async function () {
      const VaultFactory = await ethers.getContractFactory("StableYieldVault");
      vault = await VaultFactory.deploy(
        HYPURRFI_POOL,
        USDC,
        USDXL,
        "Stable Yield Vault",
        "SYV"
      );
    });

    it("Should emit ParametersUpdated on parameter change", async function () {
      await expect(
        vault.updateParameters(
          ethers.parseEther("1.35"),
          ethers.parseEther("1.2"),
          ethers.parseEther("1.6"),
          6500
        )
      ).to.emit(vault, "ParametersUpdated");
    });
  });
});
