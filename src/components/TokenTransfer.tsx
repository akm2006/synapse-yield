// src/components/TokenTransfer.tsx
'use client';

import { useState } from 'react';
import type { Address } from 'viem';
import { parseUnits, encodeFunctionData, http } from 'viem';
import { useSmartAccount } from '@/hooks/useSmartAccount';
import { CONTRACTS } from '@/lib/contracts';
import { erc20Abi } from '@/lib/abis';
import { usePublicClient } from 'wagmi';
import { createSmartAccountClient } from 'permissionless';
import { createPimlicoClient, PimlicoClient } from 'permissionless/clients/pimlico';
import { monadTestnet } from '@/lib/aaClient';
import { useBalances } from '@/hooks/useBalances'; // Import useBalances

const BUNDLER_URL = process.env.NEXT_PUBLIC_PIMLICO_BUNDLER_URL || `https://api.pimlico.io/v2/10143/rpc?apikey=${process.env.NEXT_PUBLIC_PIMLICO_API_KEY}`;

const pimlicoClient: PimlicoClient = createPimlicoClient({
  transport: http(BUNDLER_URL),
});

interface TokenTransferProps {
  smartAccountAddress: Address | null;
  balances: { native: string; kintsu: string; magma: string };
  onLog: (message: string) => void;
  disabled: boolean;
}

export default function TokenTransfer({
  smartAccountAddress,
  balances,
  onLog,
  disabled,
}: TokenTransferProps) {
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedToken, setSelectedToken] = useState<'MON' | 'sMON' | 'gMON'>('MON');
  const [isTransferring, setIsTransferring] = useState(false);

  // **THE FIX: Get the refreshAccount function and fetchBalances**
  const { smartAccount, refreshAccount } = useSmartAccount();
  const { fetchBalances } = useBalances(smartAccountAddress);
  const publicClient = usePublicClient();

  const getMaxBalance = () => {
    switch (selectedToken) {
      case 'MON':
        return balances.native;
      case 'sMON':
        return balances.kintsu;
      case 'gMON':
        return balances.magma;
      default:
        return '0';
    }
  };

  const handleTransfer = async () => {
    if (!smartAccount || !publicClient) {
      onLog('[ERROR] Smart Account not ready or client not available');
      return;
    }
    // ... (rest of validation)

    setIsTransferring(true);
    onLog(`[ACTION] Preparing to transfer ${amount} ${selectedToken} to ${recipient}`);

    try {
      const smartAccountClient = createSmartAccountClient({
        account: smartAccount,
        chain: monadTestnet,
        bundlerTransport: http(BUNDLER_URL),
        paymaster: pimlicoClient,
        userOperation: {
            estimateFeesPerGas: async () => (await pimlicoClient.getUserOperationGasPrice()).standard,
        }
      });

      // ... (transaction preparation logic is the same)
      const value = parseUnits(amount, 18);
      let transactionData: { to: Address; data?: `0x${string}`; value?: bigint };

      if (selectedToken === 'MON') {
        transactionData = { to: recipient as Address, value };
      } else {
        const tokenAddress = selectedToken === 'sMON' ? CONTRACTS.KINTSU : CONTRACTS.GMON;
        transactionData = {
          to: tokenAddress,
          data: encodeFunctionData({
            abi: erc20Abi,
            functionName: 'transfer',
            args: [recipient as Address, value],
          }),
        };
      }

      onLog('[ACTION] Please confirm the transaction in your wallet...');
      const userOpHash = await smartAccountClient.sendTransaction(transactionData);
      onLog(`[UO] UserOperation sent! Hash: ${userOpHash}`);

      onLog('[INFO] Waiting for transaction confirmation...');
      const receipt = await pimlicoClient.waitForUserOperationReceipt({ hash: userOpHash });
      const txHash = receipt.receipt.transactionHash;

      if (receipt.success) {
        onLog(`[SUCCESS] Transfer confirmed. Tx hash: ${txHash}`);
        
        // **THE FIX: Refresh account state and balances after success**
        onLog('[INFO] Refreshing account state and balances...');
        refreshAccount();
        fetchBalances(true); // silent refresh

      } else {
        throw new Error('Transaction failed or was reverted.');
      }

      setRecipient('');
      setAmount('');
    } catch (err: any) {
      onLog(`[ERROR] Transfer failed: ${err.message || String(err)}`);
    } finally {
      setIsTransferring(false);
    }
  };


  if (!smartAccountAddress) {
    return (
      <section className="mb-6 p-4 border border-gray-200 rounded bg-gray-50">
        <h2 className="text-xl font-semibold mb-2 text-gray-500">Token Transfer</h2>
        <p className="text-gray-500">Create Smart Account first to enable token transfers</p>
      </section>
    );
  }

  return (
    // ... (The JSX for the component remains unchanged) ...
    <section className="mb-6 p-4 border border-gray-300 rounded">
      <h2 className="text-xl font-semibold mb-3">Token Transfer</h2>
      <div className="space-y-3">
        {/* ... inputs ... */}
         <div>
          <label className="block text-sm font-medium mb-1">Token</label>
          <select
            value={selectedToken}
            onChange={(e) => setSelectedToken(e.target.value as 'MON' | 'sMON' | 'gMON')}
            className="w-full bg-gray-600 p-2 border border-gray-300 rounded"
            disabled={disabled || isTransferring}
          >
            <option value="MON">MON (Balance: {balances.native})</option>
            <option value="sMON">sMON (Balance: {balances.kintsu})</option>
            <option value="gMON">gMON (Balance: {balances.magma})</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Recipient Address</label>
          <input
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="0x..."
            className="w-full p-2 border border-gray-300 rounded font-mono text-sm"
            disabled={disabled || isTransferring}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Amount</label>
          <div className="flex space-x-2">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.0"
              step="0.001"
              min="0"
              max={getMaxBalance()}
              className="flex-1 p-2 border border-gray-300 rounded"
              disabled={disabled || isTransferring}
            />
            <button
              onClick={() => setAmount(getMaxBalance())}
              className="px-3 py-2 bg-gray-500 text-white rounded text-sm"
              disabled={disabled || isTransferring}
            >
              Max
            </button>
          </div>
        </div>
        <button
          onClick={handleTransfer}
          disabled={disabled || isTransferring || !recipient || !amount}
          className="w-full px-4 py-2 bg-orange-600 text-white rounded shadow disabled:bg-gray-400"
        >
          {isTransferring ? 'Sending...' : `Send ${selectedToken}`}
        </button>
      </div>
    </section>
  );
}