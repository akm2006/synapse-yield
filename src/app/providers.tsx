'use client';

import * as React from 'react';
import {
  RainbowKitProvider,
  getDefaultConfig,darkTheme
} from '@rainbow-me/rainbowkit';
import { WagmiProvider} from 'wagmi';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { monad } from '@/lib/viemClients'; // Import our monad chain config

// Use RainbowKit's getDefaultConfig for easy setup
const config = getDefaultConfig({
  appName: 'Synapse Yield',
  projectId: '76715cbaa64922d6033dee3f8e941f3a', // Get a free projectId at https://cloud.walletconnect.com
  chains: [monad],
  ssr: true, // Enable SSR for Next.js
});

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={darkTheme()}>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}