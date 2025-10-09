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
  
  // Single status for the combined operation
  const [approvalStatus, setApprovalStatus] = useState<'idle'|'pending'|'success'|'error'>('idle');
  const [approvalError, setApprovalError] = useState<string>('');

  const amountWei = parseUnits(amount || '0', 18).toString();

  // Fetch allowances
  const fetchAllowances = async () => {
    if (!publicClient || !userAddress) return;

    try {
      // Read ERC-20 allowance
      const erc20Result = await publicClient.readContract({
        address: token,
        abi: erc20Abi,
        functionName: 'allowance',
        args: [userAddress, CONTRACTS.PERMIT2],
      });
      setErc20Allowance((erc20Result as bigint).toString());

      // Read Permit2 allowance
      const permit2Result = await publicClient.readContract({
        address: CONTRACTS.PERMIT2,
        abi: permit2Abi,
        functionName: 'allowance',
        args: [userAddress, token, spender],
      });
      setPermit2Allowance((permit2Result as readonly [bigint, number, number])[0].toString());
    } catch (error) {
      console.error('Failed to fetch allowances:', error);
    }
  };

  useEffect(() => {
    fetchAllowances();
  }, [publicClient, userAddress, token, spender]);

  // Single approval function that handles both steps
  const handleApproval = async () => {
    if (!publicClient) {
      setApprovalError('Client not ready');
      return;
    }
    setApprovalStatus('pending');
    setApprovalError('');

    try {
      const res = await fetch('/api/delegate/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAddress,
          operation: 'permit2-approve',
          token,
          spender,
          amount: amountWei,
          delegation
        }),
      });
      
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Unknown error');
      
      setApprovalStatus('success');

      // Refresh both allowances after successful approval
      setTimeout(() => {
        fetchAllowances();
      }, 1500);
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : 'Approval failed';
      setApprovalError(errorMessage);
      setApprovalStatus('error');
    }
  };

  // Check if approvals are already sufficient
  const isErc20Approved = BigInt(erc20Allowance) >= BigInt(amountWei);
  const isPermit2Approved = BigInt(permit2Allowance) >= BigInt(amountWei);
  const isFullyApproved = isErc20Approved && isPermit2Approved;

  return (
    <div className="p-4 bg-gray-800 rounded-lg space-y-4">
      <h3 className="text-white font-semibold">Permit2 Approval</h3>
      
      <div className="text-sm text-gray-300 space-y-2">
        <div className="flex items-center justify-between">
          <span>ERC20→Permit2:</span>
          <span className={isErc20Approved ? 'text-green-400' : 'text-yellow-400'}>
            {(Number(erc20Allowance) / 1e18).toFixed(4)}
            {isErc20Approved && ' ✓'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span>Permit2→Router:</span>
          <span className={isPermit2Approved ? 'text-green-400' : 'text-yellow-400'}>
            {(Number(permit2Allowance) / 1e18).toFixed(4)}
            {isPermit2Approved && ' ✓'}
          </span>
        </div>
        <div className="pt-2 border-t border-gray-700">
          <span className="text-xs text-gray-400">Required Amount: {amount}</span>
        </div>
      </div>

      {/* Single approval button */}
      <button
        onClick={handleApproval}
        disabled={approvalStatus === 'pending' || isFullyApproved}
        className={`px-4 py-2 text-white rounded w-full font-medium transition-colors ${
          isFullyApproved
            ? 'bg-green-600 cursor-not-allowed'
            : approvalStatus === 'pending'
            ? 'bg-blue-500 cursor-wait'
            : 'bg-blue-600 hover:bg-blue-700'
        }`}
      >
        {approvalStatus === 'idle' && (isFullyApproved ? 'Fully Approved ✓' : 'Approve Token Access')}
        {approvalStatus === 'pending' && 'Processing Approvals...'}
        {approvalStatus === 'success' && 'Approval Complete ✓'}
        {approvalStatus === 'error' && 'Retry Approval'}
      </button>
      
      {approvalError && (
        <div className="text-red-400 text-sm bg-red-900/20 p-2 rounded">
          {approvalError}
        </div>
      )}

      {approvalStatus === 'success' && (
        <div className="text-green-400 text-sm bg-green-900/20 p-2 rounded">
          Token approvals successful! You can now proceed with your transaction.
        </div>
      )}

      {!isFullyApproved && approvalStatus === 'idle' && (
        <div className="text-xs text-gray-400 bg-gray-900/50 p-2 rounded">
          This will approve both ERC20→Permit2 and Permit2→Router in a single transaction.
        </div>
      )}
    </div>
  );
}