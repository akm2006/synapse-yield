'use client';

import { useState, useEffect } from 'react';
import type { Address } from 'viem';
import { parseUnits } from 'viem';
import { usePublicClient } from 'wagmi';
import { erc20Abi, permit2Abi } from '@/lib/abis';
import { CONTRACTS } from '@/lib/contracts';

interface Props {
  token: Address;
  spender: Address; // Usually CONTRACTS.PANCAKESWAP
  amount: string;    // Decimal amount to permit
  userAddress: Address;
  delegation: any;   // Your signed delegation object
}

export default function Permit2Manager({
  token,
  spender,
  amount,
  userAddress,
  delegation
}: Props) {
  const publicClient = usePublicClient();
  const [erc20Allowance, setErc20Allowance] = useState<string>('0');
  const [permit2Allowance, setPermit2Allowance] = useState<string>('0');
  
  // Status per approval step
  const [erc20Status, setErc20Status] = useState<'idle'|'pending'|'success'|'error'>('idle');
  const [permit2Status, setPermit2Status] = useState<'idle'|'pending'|'success'|'error'>('idle');
  
  const [erc20Error, setErc20Error] = useState<string>('');
  const [permit2Error, setPermit2Error] = useState<string>('');

  const amountWei = parseUnits(amount || '0', 18).toString();

  useEffect(() => {
    if (!publicClient || !userAddress) return;

    // Read ERC-20 allowance
    publicClient
      .readContract({
        address: token,
        abi: erc20Abi,
        functionName: 'allowance',
        args: [userAddress, CONTRACTS.PERMIT2],
      })
      .then((res: bigint) => setErc20Allowance(res.toString()))
      .catch(console.error);

    // Read Permit2 allowance
    publicClient
      .readContract({
        address: CONTRACTS.PERMIT2,
        abi: permit2Abi,
        functionName: 'allowance',
        args: [userAddress, token, spender],
      })
      .then((res: readonly [bigint, number, number]) => {
        setPermit2Allowance(res[0].toString());
      })
      .catch(console.error);
  }, [publicClient, userAddress, token, spender]);

  // Approve ERC-20 to Permit2
  const approveErc20 = async () => {
    if (!publicClient) {
      setErc20Error('Client not ready');
      return;
    }
    setErc20Status('pending');
    setErc20Error('');

    try {
      const res = await fetch('/api/delegate/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAddress,
          operation: 'permit2-approve-step1',  // New operation for ERC20 approve only
          token,
          spender: CONTRACTS.PERMIT2,
          amount: amountWei,
          delegation
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Unknown error');
      setErc20Status('success');

      // Refresh ERC-20 allowance
      setTimeout(() => {
        publicClient
          .readContract({
            address: token,
            abi: erc20Abi,
            functionName: 'allowance',
            args: [userAddress, CONTRACTS.PERMIT2],
          })
          .then((r: bigint) => setErc20Allowance(r.toString()))
          .catch(console.error);
      }, 1000);
    } catch (e: any) {
      setErc20Error(e.message || 'ERC20 approval failed');
      setErc20Status('error');
    }
  };

  // Approve Permit2 to Router
  const approvePermit2 = async () => {
    if (!publicClient) {
      setPermit2Error('Client not ready');
      return;
    }
    setPermit2Status('pending');
    setPermit2Error('');

    try {
      const res = await fetch('/api/delegate/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAddress,
          operation: 'permit2-approve-step2',  // New operation for Permit2 approve only
          token,
          spender,
          amount: amountWei,
          delegation
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Unknown error');
      setPermit2Status('success');

      // Refresh Permit2 allowance
      setTimeout(() => {
        publicClient
          .readContract({
            address: CONTRACTS.PERMIT2,
            abi: permit2Abi,
            functionName: 'allowance',
            args: [userAddress, token, spender],
          })
          .then((r: readonly [bigint, number, number]) => setPermit2Allowance(r[0].toString()))
          .catch(console.error);
      }, 1000);
    } catch (e: any) {
      setPermit2Error(e.message || 'Permit2 approval failed');
      setPermit2Status('error');
    }
  };

  return (
    <div className="p-4 bg-gray-800 rounded-lg space-y-4">
      <h3 className="text-white font-semibold">Permit2 Delegation</h3>
      <div className="text-sm text-gray-300 space-y-2">
        <div>ERC20→Permit2: {Number(erc20Allowance) / 1e18}</div>
        <div>Permit2→Router: {Number(permit2Allowance) / 1e18}</div>
      </div>

      {/* ERC20 -> Permit2 */}
      <button
        onClick={approveErc20}
        disabled={erc20Status === 'pending' || erc20Status === 'success'}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded w-full"
      >
        {erc20Status === 'idle' && 'Approve ERC20 to Permit2'}
        {erc20Status === 'pending' && 'Approving...'}
        {erc20Status === 'success' && 'ERC20 Approval Success'}
        {erc20Status === 'error' && 'Retry ERC20 Approval'}
      </button>
      {erc20Error && <div className="text-red-400 text-sm">{erc20Error}</div>}

      {/* Permit2 -> Router */}
      <button
        onClick={approvePermit2}
        disabled={permit2Status === 'pending' || permit2Status === 'success'}
        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded w-full"
      >
        {permit2Status === 'idle' && 'Approve Permit2 to Router'}
        {permit2Status === 'pending' && 'Approving...'}
        {permit2Status === 'success' && 'Permit2 Approval Success'}
        {permit2Status === 'error' && 'Retry Permit2 Approval'}
      </button>
      {permit2Error && <div className="text-red-400 text-sm">{permit2Error}</div>}
    </div>
  );
}
