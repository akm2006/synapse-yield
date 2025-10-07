
// src/lib/aaClient.ts - SECURE VERSION (Server-side only AA client)
import type { Address, Chain } from 'viem';
import { createPublicClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { entryPoint07Address } from 'viem/account-abstraction';
import { createSmartAccountClient } from 'permissionless';
import { createPimlicoClient } from 'permissionless/clients/pimlico';
import { Implementation, toMetaMaskSmartAccount } from '@metamask/delegation-toolkit';

const RPC = process.env.NEXT_PUBLIC_RPC_URL!;
const BUNDLER = process.env.NEXT_PUBLIC_PIMLICO_BUNDLER_URL || `https://api.pimlico.io/v2/10143/rpc?apikey=${process.env.PIMLICO_API_KEY}`;
const ENTRYPOINT = (process.env.NEXT_PUBLIC_ENTRYPOINT_ADDRESS || entryPoint07Address) as Address;

// 1) Chain (Monad Testnet)
export const monadTestnet: Chain = {
  id: 10143,
  name: 'Monad Testnet',
  nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
  rpcUrls: { default: { http: [RPC] } },
};

// 2) Public client WITH chain
export const aaPublic = createPublicClient({
  chain: monadTestnet,
  transport: http(RPC),
});

// 3) Bundler/Paymaster client (Pimlico), EntryPoint v0.7
export const pimlico = createPimlicoClient({
  transport: http(BUNDLER),
  entryPoint: { address: ENTRYPOINT, version: '0.7' },
});

// 4) SECURE: Server-only function to get owner signer
function getServerOwner() {
  // ✅ SECURITY CHECK: Only allow server-side access
  if (typeof window !== 'undefined') {
    throw new Error('❌ SECURITY: Private key access attempted on client side!');
  }
  
  const privateKey = process.env.DELEGATE_PRIVATE_KEY as `0x${string}`;
  if (!privateKey) {
    throw new Error('DELEGATE_PRIVATE_KEY environment variable is required');
  }
  
  return privateKeyToAccount(privateKey);
}

// 5) SECURE: Server-only function to create MetaMask Smart Account
export async function getMetaMaskSmartAccount() {
  const owner = getServerOwner(); // This will throw on client-side
  
  const sa = await toMetaMaskSmartAccount({
    client: aaPublic,
    implementation: Implementation.Hybrid,
    deployParams: [owner.address, [], [], []],
    deploySalt: '0x',
    signer: { account: owner },
  });
  
  return sa;
}

// 6) SECURE: Server-only SmartAccountClient creation
export async function getAAClient() {
  // ✅ Double-check server-side execution
  if (typeof window !== 'undefined') {
    throw new Error('❌ SECURITY: AA client creation attempted on client side!');
  }
  
  const account = await getMetaMaskSmartAccount();
  
  const client = createSmartAccountClient({
    account,
    chain: monadTestnet,
    bundlerTransport: http(BUNDLER),
    paymaster: pimlico,
    userOperation: {
      estimateFeesPerGas: async () => (await pimlico.getUserOperationGasPrice()).fast,
    },
  });
  
  return { account, client };
}

// 7) Resolve UserOperation → Transaction & Block (unchanged)
export async function settleUserOperation(uoHash: `0x${string}`) {
  let uoReceipt: any = null;
  
  try {
    // @ts-ignore – available on recent permissionless clients
    uoReceipt = await pimlico.waitForUserOperationReceipt({ hash: uoHash });
  } catch {
    // Poll fallback (<= 120s)
    const start = Date.now();
    while (Date.now() - start < 120_000) {
      try {
        // @ts-ignore – available on recent permissionless clients
        const got = await pimlico.getUserOperationReceipt({ hash: uoHash });
        if (got) { uoReceipt = got; break; }
      } catch {}
      await new Promise((r) => setTimeout(r, 1500));
    }
  }
  
  if (!uoReceipt) {
    return {
      userOpHash: uoHash,
      transactionHash: null as `0x${string}` | null,
      blockNumber: null as bigint | null,
    };
  }
  
  // Different SDKs return different shapes – normalize
  const txHash: `0x${string}` | undefined =
    uoReceipt?.receipt?.transactionHash ??
    uoReceipt?.transactionHash ??
    uoReceipt?.receipts?.[0]?.transactionHash;
    
  if (!txHash) {
    return {
      userOpHash: uoHash,
      transactionHash: null,
      blockNumber: null,
    };
  }
  
  const txReceipt = await aaPublic.getTransactionReceipt({ hash: txHash });
  
  return {
    userOpHash: uoHash,
    transactionHash: txHash,
    blockNumber: txReceipt.blockNumber,
  };
}

// 8) NEW: Client-safe public utilities (can be used on frontend)
export const publicUtils = {
  chain: monadTestnet,
  publicClient: aaPublic,
  
  // Helper to format addresses
  formatAddress: (address: string) => 
    `${address.slice(0, 6)}...${address.slice(-4)}`,
    
  // Helper to get explorer URL
  getExplorerUrl: (txHash: string) => 
    `https://testnet.monadexplorer.com/tx/${txHash}`,
};
