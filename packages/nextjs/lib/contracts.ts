// Contract addresses on HyperEVM Mainnet
export const VAULT_ADDRESS = process.env.NEXT_PUBLIC_VAULT_ADDRESS || '0x...'; // Update after deployment

export const USDC_ADDRESS = '0xb88339CB7199b77E23DB6E890353E22632Ba630f';
export const USDXL_ADDRESS = '0xca79db4b49f608ef54a5cb813fbed3a6387bc645';
export const HYPURRFI_POOL = '0xceCcE0EB9DD2Ef7996e01e25DD70e461F918A14b';

// Vault ABI (simplified - add full ABI after deployment)
export const VAULT_ABI = [
  'function deposit(uint256 assets) external returns (uint256 shares)',
  'function withdraw(uint256 shares) external returns (uint256 assets)',
  'function rebalance() external',
  'function getHealthFactor() external view returns (uint256)',
  'function getPositionDetails() external view returns (uint256 collateral, uint256 debt, uint256 healthFactor)',
  'function getTotalAssets() external view returns (uint256)',
  'function convertToShares(uint256 assets) external view returns (uint256)',
  'function convertToAssets(uint256 shares) external view returns (uint256)',
  'function balanceOf(address account) external view returns (uint256)',
  'function totalSupply() external view returns (uint256)',
  'function name() external view returns (string)',
  'function symbol() external view returns (string)',
] as const;

export const ERC20_ABI = [
  'function balanceOf(address account) external view returns (uint256)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function decimals() external view returns (uint8)',
] as const;
