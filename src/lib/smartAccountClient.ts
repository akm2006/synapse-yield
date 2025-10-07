// src/lib/smartAccountClient.ts
import {
  createWalletClient,
  createPublicClient,
  custom,
  http,
  type Address,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  Implementation,
  toMetaMaskSmartAccount,
  getDeleGatorEnvironment,
  type MetaMaskSmartAccount,
} from "@metamask/delegation-toolkit";

// -------------------------------
// Monad Testnet Chain Configuration
// -------------------------------
export const monadTestnet = {
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: { default: { http: [process.env.NEXT_PUBLIC_RPC_URL!] } },
} as const;

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
// Wallet Clients
// -------------------------------

// Server-side wallet client factory
export const getServerWalletClient = () => {
  const account = getServerEOAAccount();
  return createWalletClient({
    chain: monadTestnet,
    transport: http(process.env.NEXT_PUBLIC_RPC_URL!),
    account,
  });
};

// Server-side public client
export const serverPublicClient = createPublicClient({
  chain: monadTestnet,
  transport: http(process.env.NEXT_PUBLIC_RPC_URL!),
});

// Browser public client (uses injected provider when available)
export const browserPublicClient =
  typeof window !== "undefined" && (window as any).ethereum
    ? createPublicClient({
        chain: monadTestnet,
        transport: custom((window as any).ethereum),
      })
    : createPublicClient({
        chain: monadTestnet,
        transport: http(process.env.NEXT_PUBLIC_RPC_URL!),
      });

// -------------------------------
// Smart Account Creation Helper (Server-side Only)
// -------------------------------
export async function createServerSmartAccount(): Promise<{
  smartAccount: MetaMaskSmartAccount;
  address: Address;
}> {
  const eoaAccount = getServerEOAAccount();

  // Base signer client (delegate account)
  const signerClient = createWalletClient({
    chain: monadTestnet,
    transport: http(process.env.NEXT_PUBLIC_RPC_URL!),
    account: eoaAccount,
  });

  // Get Delegator environment for Monad
  const environment = getDeleGatorEnvironment(monadTestnet.id);

  // Optional salt for deterministic deployment
  const salt = (process.env.NEXT_PUBLIC_SMART_ACCOUNT_SALT ||
    "0x0000000000000000000000000000000000000000000000000000000000000000") as `0x${string}`;

  // Create MetaMask Smart Account using delegation-ready implementation
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
