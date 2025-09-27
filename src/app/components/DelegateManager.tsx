"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import {
  Address,
  Account,
  createWalletClient,
  custom,
  walletActions,
  keccak256,
  toHex,
  slice,
} from "viem";
import { monad } from "@/lib/viemClients";

import {
  Implementation,
  toMetaMaskSmartAccount,
  createDelegation,
} from "@metamask/delegation-toolkit";

type Props = {
  agentAddress: Address;
};

export default function DelegateManager({ agentAddress }: Props) {
  const { address: eoa } = useAccount();
  const [smartAccountAddress, setSmartAccountAddress] = useState<Address | null>(null);
  const [signedDelegationJson, setSignedDelegationJson] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Official verified contract addresses on Monad testnet
  const KINTSU_STAKED_MONAD = "0xe1d2439b75fb9746E7Bc6cB777Ae10AA7f7ef9c5"; // Kintsu StakedMonad contract
  const MAGMA_STAKE_MANAGER = "0x2c9C959516e9AAEdB2C748224a41249202ca8BE7";  // Magma StakeManager contract
  const MAGMA_GMON_TOKEN = "0xaEef2f6B429Cb59C9B2D7bB2141ADa993E8571c3";    // gMON token contract

  const authorizeAgent = async () => {
    if (!eoa || !window.ethereum) {
      setErr("Wallet not connected");
      return;
    }
    setIsLoading(true);
    setErr(null);

    try {
      // 1) Browser wallet client
      const baseClient = createWalletClient({
        chain: monad,
        transport: custom(window.ethereum),
      }).extend(walletActions);

      // 2) Wrap EOA as Viem Account
      const browserAccount = {
        address: eoa,
        type: "json-rpc",
        async signMessage({ message }: { message: any }) {
          return baseClient.signMessage({ message, account: eoa });
        },
        async signTypedData(typedData: any) {
          return baseClient.signTypedData({ ...typedData, account: eoa });
        },
        async signTransaction(tx: any) {
          return baseClient.signTransaction({ ...tx, account: eoa });
        },
      } as unknown as Account;

      // 3) Create MetaMask Smart Account
      const { publicClient } = await import("@/lib/viemClients");
      const delegatorSmartAccount = await toMetaMaskSmartAccount({
        client: publicClient,
        implementation: Implementation.Hybrid,
        deployParams: [eoa, [], [], []],
        deploySalt: "0x",
        signer: { account: browserAccount },
      });
      setSmartAccountAddress(delegatorSmartAccount.address as Address);

      // 4) Define Kintsu StakedMonad functions (from previous verification)
      const kintsuSelectors = [
        slice(keccak256(toHex("deposit(uint96,address)")), 0, 4),           // Stake MON → sMON (payable)
        slice(keccak256(toHex("mint(uint96,address)")), 0, 4),              // Mint specific sMON amount (payable)
        slice(keccak256(toHex("requestUnlock(uint96)")), 0, 4),             // Step 1: Request unlock (async)
        slice(keccak256(toHex("redeem(uint256,address)")), 0, 4),           // Step 2: Redeem after batch completion
        slice(keccak256(toHex("cancelUnlockRequest(uint256)")), 0, 4),      // Cancel unlock request
      ];

      // 5) Define Magma StakeManager functions (from official ABI)
      const magmaStakeManagerSelectors = [
        slice(keccak256(toHex("depositMon()")), 0, 4),                      // Deposit MON → get gMON (payable, no params)
        slice(keccak256(toHex("depositMon(uint256)")), 0, 4),               // Deposit MON with referral ID (payable)
        slice(keccak256(toHex("withdrawMon(uint256)")), 0, 4),              // Withdraw MON by burning gMON
      ];

      // 6) Define gMON Token functions (from official ABI - standard ERC-20)
      const gMonTokenSelectors = [
        slice(keccak256(toHex("transfer(address,uint256)")), 0, 4),         // Transfer gMON tokens
        slice(keccak256(toHex("approve(address,uint256)")), 0, 4),          // Approve gMON spending
        slice(keccak256(toHex("transferFrom(address,address,uint256)")), 0, 4), // TransferFrom for complex operations
        // Note: mint/burn are restricted to authorized addresses only
      ];

      // 7) Create comprehensive scope for all three contracts
      const scope = {
        type: "functionCall" as const,
        targets: [
          KINTSU_STAKED_MONAD as Address,
          MAGMA_STAKE_MANAGER as Address,
          MAGMA_GMON_TOKEN as Address,
        ],
        selectors: [
          ...kintsuSelectors,
          ...magmaStakeManagerSelectors,
          ...gMonTokenSelectors,
        ],
      };

      // 8) Create and sign delegation
      const delegation = createDelegation({
        from: delegatorSmartAccount.address,
        to: agentAddress,
        environment: delegatorSmartAccount.environment,
        scope,
      });

      const signature = await delegatorSmartAccount.signDelegation({ delegation });
      const signedDelegation = { ...delegation, signature };

      setSignedDelegationJson(JSON.stringify(signedDelegation, null, 2));
      console.log("✅ Smart Account:", delegatorSmartAccount.address);
      console.log("✅ Official ABI-Based Delegation:", signedDelegation);

    } catch (e: any) {
      setErr(e?.message ?? String(e));
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      <div className="mb-3 text-sm">
        {smartAccountAddress ? (
          <div className="p-3 rounded border border-green-400 bg-green-50 text-green-700">
            <strong>Smart Account:</strong> {smartAccountAddress}
          </div>
        ) : null}
      </div>

      {!signedDelegationJson ? (
        <button
          onClick={authorizeAgent}
          disabled={isLoading}
          className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded hover:bg-indigo-700 disabled:bg-gray-400 w-full"
        >
          {isLoading ? "Authorizing..." : "Step 3: Authorize Agent (Official ABI Functions)"}
        </button>
      ) : (
        <div className="p-3 bg-blue-100 border border-blue-400 text-blue-700 rounded">
          <p className="font-semibold">✅ Agent Authorized with Official Contract Functions</p>
          <div className="text-sm mt-2 space-y-2">
            <div>
              <p className="font-medium">✅ Kintsu StakedMonad:</p>
              <code className="text-xs bg-white px-1 rounded">{KINTSU_STAKED_MONAD}</code>
              <ul className="text-xs ml-4 list-disc mt-1">
                <li><code>deposit(uint96,address)</code> - Stake MON → sMON</li>
                <li><code>requestUnlock(uint96)</code> → <code>redeem(uint256,address)</code> - Async exit</li>
              </ul>
            </div>
            
            <div>
              <p className="font-medium">✅ Magma StakeManager:</p>
              <code className="text-xs bg-white px-1 rounded">{MAGMA_STAKE_MANAGER}</code>
              <ul className="text-xs ml-4 list-disc mt-1">
                <li><code>depositMon()</code> - Stake MON → gMON (payable)</li>
                <li><code>withdrawMon(uint256)</code> - Burn gMON → get MON</li>
              </ul>
            </div>

            <div>
              <p className="font-medium">✅ gMON Token (ERC-20):</p>
              <code className="text-xs bg-white px-1 rounded">{MAGMA_GMON_TOKEN}</code>
              <ul className="text-xs ml-4 list-disc mt-1">
                <li><code>transfer()</code>, <code>approve()</code> - Standard ERC-20</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-3 p-2 bg-green-50 rounded border border-green-300">
            <p className="text-sm font-medium text-green-800">🎯 Verified Rebalance Flows:</p>
            <ul className="text-xs text-green-700 mt-1 space-y-1">
              <li><strong>Kintsu → Magma:</strong> <code>requestUnlock(shares)</code> → wait → <code>redeem()</code> → <code>depositMon()</code></li>
              <li><strong>Magma → Kintsu:</strong> <code>withdrawMon(amount)</code> → <code>deposit(amount, receiver)</code></li>
            </ul>
          </div>

          <details className="mt-3">
            <summary className="cursor-pointer text-sm font-medium">View Complete Delegation</summary>
            <pre className="text-xs whitespace-pre-wrap break-all mt-2 bg-white p-2 rounded border max-h-64 overflow-y-auto">
              {signedDelegationJson}
            </pre>
          </details>
        </div>
      )}

      {err && (
        <div className="mt-3 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {err}
        </div>
      )}
    </div>
  );
}
