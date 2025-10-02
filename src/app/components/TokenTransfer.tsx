// src/app/components/TokenTransfer.tsx
'use client';

import { useState } from 'react';
import type { Address } from 'viem';

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

  function generateOpId() {
    return (crypto as any)?.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  function openSSE(opId: string) {
    const es = new EventSource(`/api/logs/stream?id=${opId}`);
    es.addEventListener('log', (ev: MessageEvent) => {
      try {
        const { msg } = JSON.parse(ev.data as string);
        onLog(`[STREAM] ${msg}`);
      } catch {
        onLog('[STREAM] <malformed log event>');
      }
    });
    es.addEventListener('done', () => {
      onLog('[STREAM] stream closed');
      es.close();
    });
    es.onerror = () => {
      onLog('[STREAM] stream error');
      es.close();
    };
  }

  const handleTransfer = async () => {
    if (!smartAccountAddress) {
      onLog('[ERROR] Smart Account not ready');
      return;
    }
    if (!recipient || !amount) {
      onLog('[ERROR] Please enter recipient address and amount');
      return;
    }
    if (!recipient.startsWith('0x') || recipient.length !== 42) {
      onLog('[ERROR] Invalid recipient address');
      return;
    }
    if (parseFloat(amount) <= 0) {
      onLog('[ERROR] Amount must be greater than 0');
      return;
    }
    if (parseFloat(amount) > parseFloat(getMaxBalance())) {
      onLog('[ERROR] Insufficient balance');
      return;
    }

    setIsTransferring(true);
    onLog(`[ACTION] Transferring ${amount} ${selectedToken} to ${recipient}`);

    const opId = generateOpId();
    openSSE(opId);

    try {
      const response = await fetch('/api/tx/transfer', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        cache: 'no-store',
        next: { revalidate: 0 },
        body: JSON.stringify({
          to: recipient,
          amount,
          token: selectedToken,
          opId,
        }),
      });

      const json = await response.json();

      if (!json.ok) {
        onLog(`[ERROR] Transfer failed: ${json.error}`);
        return;
      }

      if (json.userOpHash) onLog(`[UO] userOpHash: ${json.userOpHash}`);
      if (json.transactionHash) onLog(`[TX] transactionHash: ${json.transactionHash}`);
      if (json.blockNumber) onLog(`[TX] Transfer confirmed at block: ${json.blockNumber}`);
      onLog(`[SUCCESS] ${amount} ${selectedToken} sent to ${recipient}`);

      // Reset form
      setRecipient('');
      setAmount('');
    } catch (err: any) {
      onLog(`[ERROR] Transfer error: ${err.message || err}`);
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
    <section className="mb-6 p-4 border border-gray-300 rounded">
      <h2 className="text-xl font-semibold mb-3">Token Transfer</h2>

      <div className="space-y-3">
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
          {isTransferring ? 'Transferring...' : `Send ${selectedToken}`}
        </button>
      </div>
    </section>
  );
}
