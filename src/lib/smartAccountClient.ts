// src/lib/smartAccountClient.ts
import {
  createWalletClient,
  createPublicClient,
  custom,
  http,
  type Address,
  defineChain, // Import defineChain
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  Implementation,
  toMetaMaskSmartAccount,
  getDeleGatorEnvironment,
  type MetaMaskSmartAccount,
} from "@metamask/delegation-toolkit";

// --- MODIFIED CHAIN CONFIGURATION ---
export const monadTestnet = defineChain({
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: {
    default: { http: [process.env.NEXT_PUBLIC_RPC_URL!] },
  },
  contracts: {
    multicall3: {
      address: '0xcA11bde05977b3631167028862bE2a173976CA11',
      // Note: The blockCreated number is not critical for this to work,
      // but you would typically find this on the block explorer.
      // We'll use a placeholder or a known value from another testnet.
      blockCreated: 14353601,
    },
  },
});
// --- END OF MODIFICATION ---

// -------------------------------
// Secure Server-side Delegate Account
// -------------------------------
const getServerEOAAccount = () => {
  if (typeof window !== "undefined") {
    throw new Error("Private key access attempted on client side");
  }

  const privateKey = process.env.DELEGATE_PRIVATE_KEY as `0x${string}`;
  if (!privateKey) {
    throw new Error("DELEGATE_PRIVATE_KEY environment variable is required");
  }

  return privateKeyToAccount(privateKey);
};

// -------------------------------
// Client Factories (Functions instead of constants)
// -------------------------------

// Server-side wallet client factory
export const getServerWalletClient = () => {
  const account = getServerEOAAccount();
  if (!process.env.NEXT_PUBLIC_RPC_URL) {
      throw new Error("NEXT_PUBLIC_RPC_URL is not defined");
  }
  return createWalletClient({
    chain: monadTestnet,
    transport: http(process.env.NEXT_PUBLIC_RPC_URL),
    account,
  });
};

// Server-side public client factory
export const getServerPublicClient = () => {
    if (!process.env.NEXT_PUBLIC_RPC_URL) {
        throw new Error("NEXT_PUBLIC_RPC_URL is not defined");
    }
    return createPublicClient({
        chain: monadTestnet,
        transport: http(process.env.NEXT_PUBLIC_RPC_URL),
    });
};

// Browser public client factory
export const getBrowserPublicClient = () => {
    if (typeof window !== "undefined" && (window as any).ethereum) {
        return createPublicClient({
            chain: monadTestnet,
            transport: custom((window as any).ethereum),
        });
    }
    if (!process.env.NEXT_PUBLIC_RPC_URL) {
        throw new Error("NEXT_PUBLIC_RPC_URL is not defined");
    }
    return createPublicClient({
        chain: monadTestnet,
        transport: http(process.env.NEXT_PUBLIC_RPC_URL),
    });
};


// -------------------------------
// Smart Account Creation Helper (Server-side Only)
// -------------------------------
export async function createServerSmartAccount(): Promise<{
  smartAccount: MetaMaskSmartAccount;
  address: Address;
}> {
  const eoaAccount = getServerEOAAccount();
  const signerClient = getServerWalletClient();
  const publicClient = getServerPublicClient();

  const environment = getDeleGatorEnvironment(monadTestnet.id);

  const salt = (process.env.NEXT_PUBLIC_SMART_ACCOUNT_SALT ||
    "0x0000000000000000000000000000000000000000000000000000000000000000") as `0x${string}`;

  const smartAccount = await toMetaMaskSmartAccount({
    client: publicClient,
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