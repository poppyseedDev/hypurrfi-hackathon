import { ethers } from "hardhat";

async function main() {
  console.log("Deploying StableYieldVault to HyperEVM...\n");

  // HypurrFi HyperEVM Mainnet addresses
  const HYPURRFI_POOL = "0xceCcE0EB9DD2Ef7996e01e25DD70e461F918A14b";
  const USDC = "0xb88339CB7199b77E23DB6E890353E22632Ba630f";
  const USDXL = "0xca79db4b49f608ef54a5cb813fbed3a6387bc645";

  // Alternative: USDT0 instead of USDC
  // const USDT0 = "0xb8ce59fc3717ada4c02eadf9682a9e934f625ebb";

  console.log("Contract addresses:");
  console.log("- HypurrFi Pool:", HYPURRFI_POOL);
  console.log("- Deposit Asset (USDC):", USDC);
  console.log("- Borrow Asset (USDXL):", USDXL);
  console.log("");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH\n");

  // Deploy StableYieldVault
  const VaultFactory = await ethers.getContractFactory("StableYieldVault");

  console.log("Deploying StableYieldVault...");

  const vault = await VaultFactory.deploy(
    HYPURRFI_POOL,
    USDC,
    USDXL,
    "HypurrFi Stable Yield Vault",
    "hySTABLE"
  );

  await vault.waitForDeployment();

  const vaultAddress = await vault.getAddress();

  console.log("✅ StableYieldVault deployed to:", vaultAddress);
  console.log("");

  // Display vault parameters
  console.log("Vault Configuration:");
  console.log("- Name:", await vault.name());
  console.log("- Symbol:", await vault.symbol());
  console.log("- Target Health Factor:", ethers.formatEther(await vault.targetHealthFactor()));
  console.log("- Min Health Factor:", ethers.formatEther(await vault.minHealthFactor()));
  console.log("- Max Health Factor:", ethers.formatEther(await vault.maxHealthFactor()));
  console.log("- Target LTV:", (await vault.targetLTV()).toString(), "bps (60%)");
  console.log("- Max Loop Iterations:", (await vault.maxLoopIterations()).toString());
  console.log("");

  console.log("🎉 Deployment complete!");
  console.log("");
  console.log("Next steps:");
  console.log("1. Verify contract on block explorer (if available)");
  console.log("2. Test deposit with small amount");
  console.log("3. Monitor health factor and positions");
  console.log("4. Set up frontend with contract address");
  console.log("");
  console.log("Contract Address for Frontend:");
  console.log(vaultAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
