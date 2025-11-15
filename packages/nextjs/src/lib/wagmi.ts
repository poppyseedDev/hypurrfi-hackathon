import { http, createConfig } from 'wagmi';
import { hyperliquidEvmMainnet } from './chains';
import { injected, walletConnect } from 'wagmi/connectors';

// WalletConnect project ID (replace with your own)
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID';

export const config = createConfig({
  chains: [hyperliquidEvmMainnet],
  connectors: [
    injected(),
    walletConnect({ projectId }),
  ],
  transports: {
    [hyperliquidEvmMainnet.id]: http(),
  },
});

declare module 'wagmi' {
  interface Register {
    config: typeof config;
  }
}
