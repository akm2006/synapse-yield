// src/lib/aaClient.ts
import type { Address, Chain } from 'viem';
import { createPublicClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { entryPoint07Address } from 'viem/account-abstraction';
import { createSmartAccountClient } from 'permissionless';
import { createPimlicoClient } from 'permissionless/clients/pimlico';
import { Implementation, toMetaMaskSmartAccount } from '@metamask/delegation-toolkit';

const RPC = process.env.NEXT_PUBLIC_RPC_URL!;
const BUNDLER = process.env.NEXT_PUBLIC_PIMLICO_BUNDLER_URL!;
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

// 4) Owner signer (server EOA)
const owner = privateKeyToAccount(process.env.NEXT_PUBLIC_EOA_PRIVATE_KEY as `0x${string}`);

// 5) Create a MetaMask Smart Account (delegator)
export async function getMetaMaskSmartAccount() {
  const sa = await toMetaMaskSmartAccount({
    client: aaPublic,
    implementation: Implementation.Hybrid,
    deployParams: [owner.address, [], [], []],
    deploySalt: '0x',
    signer: { account: owner },
  });
  return sa;
}

// 6) SmartAccountClient with chain, bundler, paymaster
export async function getAAClient() {
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

// 7) Resolve UserOperation -> Transaction & Block
export async function settleUserOperation(uoHash: `0x${string}`) {
  // Try vendor helper (SDKs differ in surface)
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
