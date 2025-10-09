// src/lib/aaClient.ts — ENHANCED SECURE VERSION
import type { Address, Chain } from 'viem';
import { createPublicClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { entryPoint07Address } from 'viem/account-abstraction';
import { createSmartAccountClient } from 'permissionless';
import { createPimlicoClient } from 'permissionless/clients/pimlico';
import { Implementation, toMetaMaskSmartAccount } from '@metamask/delegation-toolkit';

// === ENVIRONMENT ===
const RPC = process.env.NEXT_PUBLIC_RPC_URL!;
const BUNDLER =
  process.env.NEXT_PUBLIC_PIMLICO_BUNDLER_URL ||
  `https://api.pimlico.io/v2/10143/rpc?apikey=${process.env.PIMLICO_API_KEY}`;
const ENTRYPOINT = (process.env.NEXT_PUBLIC_ENTRYPOINT_ADDRESS || entryPoint07Address) as Address;

// === 1) CHAIN CONFIG ===
export const monadTestnet: Chain = {
  id: 10143,
  name: 'Monad Testnet',
  nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
  rpcUrls: { default: { http: [RPC] } },
};

// === 2) PUBLIC CLIENT ===
export const aaPublic = createPublicClient({
  chain: monadTestnet,
  transport: http(RPC),
});

// === 3) BUNDLER / PAYMASTER CLIENT ===
export const pimlico = createPimlicoClient({
  transport: http(BUNDLER),
  entryPoint: { address: ENTRYPOINT, version: '0.7' },
});

// === 4) SERVER-ONLY OWNER SIGNER ===
function getServerOwner() {
  if (typeof window !== 'undefined') {
    throw new Error('❌ SECURITY: Private key access attempted on client side!');
  }

  const privateKey = process.env.DELEGATE_PRIVATE_KEY as `0x${string}`;
  if (!privateKey) {
    throw new Error('DELEGATE_PRIVATE_KEY environment variable is required');
  }

  return privateKeyToAccount(privateKey);
}

// === 5) SERVER-ONLY METAMASK SMART ACCOUNT ===
export async function getMetaMaskSmartAccount() {
  const owner = getServerOwner();

  const sa = await toMetaMaskSmartAccount({
    client: aaPublic,
    implementation: Implementation.Hybrid,
    deployParams: [owner.address, [], [], []],
    deploySalt: '0x',
    signer: { account: owner },
  });

  return sa;
}

// === 6) SMART ACCOUNT CLIENT CREATION ===
export async function getAAClient() {
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
      estimateFeesPerGas: async () =>
        (await pimlico.getUserOperationGasPrice()).fast,
    },
  });

  return { account, client };
}

// === 7) SETTLE USER OPERATION (Enhanced) ===
export async function settleUserOperation(uoHash: `0x${string}`) {
  let uoReceipt: any = null;

  try {
    // Try official Pimlico wait first
    // @ts-ignore
    uoReceipt = await pimlico.waitForUserOperationReceipt({ hash: uoHash });
  } catch {
    // Poll fallback up to 120 seconds
    const start = Date.now();
    while (Date.now() - start < 120_000) {
      try {
        // @ts-ignore
        const got = await pimlico.getUserOperationReceipt({ hash: uoHash });
        if (got) {
          uoReceipt = got;
          break;
        }
      } catch {}
      await new Promise((r) => setTimeout(r, 1500));
    }
  }

  // If still no receipt after timeout
  if (!uoReceipt) {
    return {
      ok: false,
      message: 'UserOperation not mined within timeout window (120s)',
      userOpHash: uoHash,
      transactionHash: null,
      blockNumber: null,
      status: null,
      explorerUrl: null,
    };
  }

  // Normalize transaction hash
  const txHash: `0x${string}` | undefined =
    uoReceipt?.receipt?.transactionHash ??
    uoReceipt?.transactionHash ??
    uoReceipt?.receipts?.[0]?.transactionHash;

  if (!txHash) {
    return {
      ok: false,
      message: 'UserOperation receipt did not include transaction hash',
      userOpHash: uoHash,
      transactionHash: null,
      blockNumber: null,
      status: null,
      explorerUrl: null,
    };
  }

  // Get actual transaction receipt
  const txReceipt = await aaPublic.getTransactionReceipt({ hash: txHash });

  const success = txReceipt.status === 'success';
  const blockNumber = txReceipt.blockNumber;

  return {
    ok: success,
    message: success ? 'Transaction confirmed' : 'Transaction reverted',
    userOpHash: uoHash,
    transactionHash: txHash,
    blockNumber,
    status: success ? 'success' : 'reverted',
    explorerUrl: `https://testnet.monadexplorer.com/tx/${txHash}`,
  };
}

// === 8) PUBLIC UTILS (safe for frontend) ===
export const publicUtils = {
  chain: monadTestnet,
  publicClient: aaPublic,

  formatAddress: (address: string) =>
    `${address.slice(0, 6)}...${address.slice(-4)}`,

  getExplorerUrl: (txHash: string) =>
    `https://testnet.monadexplorer.com/tx/${txHash}`,
};
