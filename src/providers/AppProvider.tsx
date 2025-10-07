"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createConfig, http, WagmiProvider } from "wagmi";
import { monadTestnet } from "@/lib/smartAccountClient";
import { ReactNode, useState } from "react";
import { metaMask } from "wagmi/connectors";

// Create a single QueryClient instance
const createQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});

// Wagmi configuration for Monad testnet
const wagmiConfig = createConfig({
  chains: [monadTestnet],
  connectors: [
    metaMask({
      dappMetadata: {
        name: "Synapse Yield Test - Delegation",
        url: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
        iconUrl: typeof window !== 'undefined' ? `${window.location.origin}/favicon.ico` : undefined,
      },
    }),
  ],
  transports: {
    [monadTestnet.id]: http(process.env.NEXT_PUBLIC_RPC_URL || 'https://testnet-rpc.monad.xyz'),
  },
  ssr: false, // Disable SSR for client-side only components
});

export function AppProvider({ children }: { children: ReactNode }) {
  // Create QueryClient in component state to avoid SSR issues
  const [queryClient] = useState(() => createQueryClient());

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}

// Export for use in other components if needed
export { wagmiConfig };