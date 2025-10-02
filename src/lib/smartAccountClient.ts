// src/lib/smartAccountClient.ts
import { createWalletClient, createPublicClient, custom, http, type Address, type WalletClient, type PublicClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { 
  Implementation, 
  toMetaMaskSmartAccount, 
  getDeleGatorEnvironment,
  type MetaMaskSmartAccount 
} from '@metamask/delegation-toolkit';

// Monad testnet chain config
export const monadTestnet = {
  id: 10143,
  name: 'Monad Testnet',
  nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
  rpcUrls: { default: { http: [process.env.NEXT_PUBLIC_RPC_URL!] } },
} as const;

// EOA client for Smart Account creation/management
const eoaPrivateKey = process.env.NEXT_PUBLIC_EOA_PRIVATE_KEY! as `0x${string}`;
const eoaAccount = privateKeyToAccount(eoaPrivateKey);

// Server-side wallet client (for API routes)
export const serverWalletClient = createWalletClient({
  chain: monadTestnet,
  transport: http(process.env.NEXT_PUBLIC_RPC_URL!),
  account: eoaAccount,
});

// Server-side public client
export const serverPublicClient = createPublicClient({
  chain: monadTestnet,
  transport: http(process.env.NEXT_PUBLIC_RPC_URL!),
});

// Browser public client (uses injected provider when available)
export const browserPublicClient = typeof window !== 'undefined' && (window as any).ethereum
  ? createPublicClient({
      chain: monadTestnet,
      transport: custom((window as any).ethereum),
    })
  : createPublicClient({
      chain: monadTestnet,
      transport: http(process.env.NEXT_PUBLIC_RPC_URL!),
    });

// Smart Account creation helper
export async function createSmartAccount(): Promise<{
  smartAccount: MetaMaskSmartAccount;
  address: Address;
}> {
  // Create base client for signing
  const signerClient = createWalletClient({
    chain: monadTestnet,
    transport: http(process.env.NEXT_PUBLIC_RPC_URL!),
    account: eoaAccount,
  });

  // Get delegation environment for Monad
  const environment = getDeleGatorEnvironment(monadTestnet.id);
  
  const salt = (process.env.NEXT_PUBLIC_SMART_ACCOUNT_SALT || "0x0000000000000000000000000000000000000000000000000000000000000000") as `0x${string}`;

  // Create MetaMask Smart Account
  const smartAccount = await toMetaMaskSmartAccount({
    client: serverPublicClient,
    signer: signerClient,
    implementation: Implementation.Hybrid,
    deployParams: [eoaAccount.address, [], [], []],
    deploySalt: salt,
    environment,
  });

  return {
    smartAccount,
    address: smartAccount.address,
  };
}
