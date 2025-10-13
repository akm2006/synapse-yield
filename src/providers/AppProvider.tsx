'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { ReactNode, useState } from 'react';
import {
  RainbowKitProvider,
  getDefaultConfig,
  darkTheme,
  Theme,
} from '@rainbow-me/rainbowkit';
import { monadTestnet } from '@/lib/smartAccountClient';
import merge from 'lodash.merge';

// Wagmi configuration for Monad testnet
const wagmiConfig = getDefaultConfig({
  appName: 'Synapse Yield',
  projectId: 'YOUR_PROJECT_ID', // Replace with your WalletConnect project ID
  chains: [monadTestnet],
  ssr: true,
});

const createQueryClient = () => new QueryClient();

// Create a deep merge of the default dark theme with our customizations
const liquidSynapseTheme: Theme = merge(darkTheme(), {
  colors: {
    accentColor: '#00B4DB',
    accentColorForeground: '#ffffff',
    modalBackground: 'rgba(13, 17, 23, 0.9)', // Dark navy with transparency
    modalBorder: 'rgba(255, 255, 255, 0.1)',
    connectButtonBackground: 'transparent',
    connectButtonInnerBackground: 'rgba(255, 255, 255, 0.05)',
    connectButtonText: '#E6F1FF',
    modalText: '#E6F1FF',
    modalTextSecondary: 'rgba(230, 241, 255, 0.6)',
  },
  radii: {
    connectButton: '9999px', // Fully rounded pill shape
    modal: '20px',
    modalMobile: '20px',
  },
  shadows: {
    connectButton: '0 2px 10px rgba(0, 180, 219, 0.2)', // Subtle blue glow
    dialog: '0 8px 32px rgba(0, 0, 0, 0.3)',
  },
  blurs: {
    modalOverlay: '12px',
  },
} as Theme);

export function AppProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => createQueryClient());

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={liquidSynapseTheme}>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export { wagmiConfig };