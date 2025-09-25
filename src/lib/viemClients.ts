// src/lib/viemClients.ts
import { createPublicClient, http, defineChain } from 'viem';
import { createBundlerClient } from 'viem/account-abstraction';

// Define the Monad Testnet chain configuration
export const monad = defineChain({
  id: 10143, // Monad Testnet Chain ID
  name: 'Monad Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'MON',
    symbol: 'MON',
  },
  rpcUrls: {
    default: { http: ['https://testnet-rpc.monad.xyz'] },
    public: { http: ['https://testnet-rpc.monad.xyz'] },
  },
  blockExplorers: {
    default: { name: 'Monad Explorer', url: 'https://testnet.monadscan.com' },
  },
});

// 1. Set up the Public Client
export const publicClient = createPublicClient({
  chain: monad,
  transport: http(),
});

// 2. Set up the Bundler Client
// IMPORTANT: You need a bundler RPC URL. Using a public one for now.
export const BUNDLER_RPC_URL = `https://api.pimlico.io/v2/10143/rpc?apikey=pim_WxsBS3r8tV19tcBHJmaJ3o`; // Replace with your key

export const bundlerClient = createBundlerClient({
  chain: monad,
  transport: http(BUNDLER_RPC_URL),
});