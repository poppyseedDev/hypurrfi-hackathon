import { Chain } from 'wagmi/chains';

export const hyperliquidEvmMainnet = {
  id: 999,
  name: 'HyperEVM',
  nativeCurrency: {
    decimals: 18,
    name: 'HYPE',
    symbol: 'HYPE',
  },
  rpcUrls: {
    default: { http: ['https://api.hyperliquid.xyz/evm'] },
    public: { http: ['https://api.hyperliquid.xyz/evm'] },
  },
  blockExplorers: {
    default: { name: 'Explorer', url: 'https://explorer.hyperliquid.xyz' },
  },
} as const satisfies Chain;

export const hyperliquidEvmTestnet = {
  id: 998,
  name: 'HyperEVM Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'HYPE',
    symbol: 'HYPE',
  },
  rpcUrls: {
    default: { http: ['https://api.hyperliquid-testnet.xyz/evm'] },
    public: { http: ['https://api.hyperliquid-testnet.xyz/evm'] },
  },
  blockExplorers: {
    default: { name: 'Explorer', url: 'https://explorer.hyperliquid-testnet.xyz' },
  },
} as const satisfies Chain;
