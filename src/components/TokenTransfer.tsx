// src/components/TokenTransfer.tsx
'use client';

import { useState, useRef, Fragment } from 'react';
import type { Address } from 'viem';
import { parseUnits, encodeFunctionData, http, isAddress } from 'viem';
import { useSmartAccount } from '@/hooks/useSmartAccount';
import { CONTRACTS } from '@/lib/contracts';
import { erc20Abi } from '@/lib/abis';
import { usePublicClient } from 'wagmi';
import { createSmartAccountClient } from 'permissionless';
import { createPimlicoClient, PimlicoClient } from 'permissionless/clients/pimlico';
import { monadTestnet } from '@/lib/aaClient';
import { useBalances } from '@/providers/BalanceProvider';
import { useToasts } from '@/providers/ToastProvider';
import { useLogger } from '@/providers/LoggerProvider';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { Listbox, Transition } from '@headlessui/react';
import { CheckIcon, ChevronUpDownIcon, ExclamationTriangleIcon, PaperAirplaneIcon, PencilSquareIcon } from '@heroicons/react/20/solid';

const BUNDLER_URL = process.env.NEXT_PUBLIC_PIMLICO_BUNDLER_URL || `https://api.pimlico.io/v2/10143/rpc?apikey=${process.env.NEXT_PUBLIC_PIMLICO_API_KEY}`;

const pimlicoClient: PimlicoClient = createPimlicoClient({
  transport: http(BUNDLER_URL),
});

interface TokenTransferProps {
  smartAccountAddress: Address | null;
  balances: import('@/providers/BalanceProvider').Balances;
  disabled: boolean;
}

const tokenInfo = {
    MON: { name: 'Monad', symbol: 'MON', icon: '/mon.jpeg', balanceKey: 'native' as keyof import('@/providers/BalanceProvider').Balances, contract: '0x0000000000000000000000000000000000000000' as Address },
    WMON: { name: 'Wrapped MON', symbol: 'WMON', icon: '/mon.jpeg', balanceKey: 'wmon' as keyof import('@/providers/BalanceProvider').Balances, contract: CONTRACTS.WMON },
    sMON: { name: 'Kintsu sMON', symbol: 'sMON', icon: '/smon.jpg', balanceKey: 'kintsu' as keyof import('@/providers/BalanceProvider').Balances, contract: CONTRACTS.KINTSU },
    gMON: { name: 'Magma gMON', symbol: 'gMON', icon: '/gmon.png', balanceKey: 'magma' as keyof import('@/providers/BalanceProvider').Balances, contract: CONTRACTS.GMON },
};
type TokenKey = keyof typeof tokenInfo;
const availableTokens: TokenKey[] = ['MON', 'WMON', 'sMON', 'gMON'];

export default function TokenTransfer({
  smartAccountAddress,
  balances,
  disabled,
}: TokenTransferProps) {
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedToken, setSelectedToken] = useState<TokenKey>('MON');
  const [isTransferring, setIsTransferring] = useState(false);
  const [showSigningHint, setShowSigningHint] = useState(false);
  const toastIdRef = useRef<number | null>(null);

  const [recipientError, setRecipientError] = useState<string | null>(null);
  const [amountError, setAmountError] = useState<string | null>(null);

  const { smartAccount, refreshAccount } = useSmartAccount();
  const { fetchBalances } = useBalances();
  const publicClient = usePublicClient();
  const { addToast, removeToast } = useToasts();
  const { addLog } = useLogger();

  const currentMaxBalance = balances ? (balances[tokenInfo[selectedToken].balanceKey] || '0') : '0';
  const currentMaxBalanceNum = parseFloat(currentMaxBalance);

  // --- Validation Logic ---
  const validateRecipient = (address: string) => {
    if (!address) { setRecipientError(null); return true; }
    if (!isAddress(address)) { setRecipientError('Invalid address format.'); return false; }
    setRecipientError(null); return true;
  };
  const validateAmount = (inputAmount: string) => {
    const numAmount = parseFloat(inputAmount);
    if (!inputAmount) { setAmountError(null); return true; }
    if (isNaN(numAmount) || numAmount <= 0) { setAmountError('Enter a positive amount.'); return false; }
    if (numAmount > currentMaxBalanceNum) { setAmountError('Insufficient balance.'); return false; }
    setAmountError(null); return true;
  };
  const handleRecipientChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value; setRecipient(value); validateRecipient(value);
  };
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value; setAmount(value); validateAmount(value);
  };

  // --- Transfer Logic ---
  const handleTransfer = async () => {
    // Re-validate before sending
    const isRecipientValid = validateRecipient(recipient);
    const isAmountValid = validateAmount(amount);

    if (!isRecipientValid || !isAmountValid || !smartAccount || !publicClient) {
      addToast({ message: 'Please fix errors or wait for account.', type: 'error' });
      addLog('[ERROR] Transfer prerequisites not met.');
      return;
    }

    setIsTransferring(true);
    setShowSigningHint(false);
    addLog(`[ACTION] Preparing to transfer ${amount} ${selectedToken} to ${recipient}`);
    if (toastIdRef.current !== null) { try { removeToast(toastIdRef.current); } catch {} }
    toastIdRef.current = addToast({ message: `Preparing transaction...`, type: 'loading', duration: 180000 });
    let userOpHash: `0x${string}` | undefined = undefined;

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

        const value = parseUnits(amount, 18);
        let transactionData: { to: Address; data?: `0x${string}`; value?: bigint };

        if (selectedToken === 'MON') {
            transactionData = { to: recipient as Address, value };
        } else {
            const tokenAddress = tokenInfo[selectedToken].contract;
             if (!tokenAddress || tokenAddress === '0x0000000000000000000000000000000000000000') {
                 throw new Error(`Contract address not found for ${selectedToken}`);
             }
            transactionData = {
                to: tokenAddress,
                data: encodeFunctionData({
                    abi: erc20Abi,
                    functionName: 'transfer',
                    args: [recipient as Address, value],
                }),
                value: 0n,
            };
        }

        // --- Signing Prompt ---
        addLog('[ACTION] Please confirm the transaction in your wallet...');
        if (toastIdRef.current !== null) removeToast(toastIdRef.current);
        toastIdRef.current = addToast({ message: 'Please confirm transaction in wallet...', type: 'info', duration: 30000 });
        setShowSigningHint(true);
        // --- End Signing Prompt ---

        userOpHash = await smartAccountClient.sendTransaction(transactionData);
        setShowSigningHint(false);
        addLog(`[UO] UserOperation sent! Hash: ${userOpHash}`);
        addLog(`[INFO] Explorer: https://testnet.monadexplorer.com/tx/${userOpHash}`);

        // Update toast to "Processing..."
        if (toastIdRef.current !== null) removeToast(toastIdRef.current);
        toastIdRef.current = addToast({ 
            message: 'Processing transaction...', 
            type: 'loading', 
            txHash: userOpHash, 
            duration: 180000 
        });
        addLog('[INFO] Waiting for transaction confirmation (this may take up to 2 minutes)...');

        // --- Custom Direct RPC Polling Logic ---
        let txHash: `0x${string}` | null = null;
        let txReceipt = null;
        const pollStart = Date.now();
        const maxPollTime = 90000; // 90 seconds
        const pollInterval = 2000; // 2 seconds

        addLog('[INFO] Starting direct RPC polling for transaction receipt...');

        while (Date.now() - pollStart < maxPollTime) {
            try {
                // Try to get the transaction by the userOp hash
                const tx = await publicClient.getTransaction({ hash: userOpHash }).catch(() => null);
                
                if (tx) {
                    addLog(`[INFO] Found transaction in mempool/chain`);
                    txHash = userOpHash;
                    
                    // Now get the receipt
                    txReceipt = await publicClient.getTransactionReceipt({ hash: txHash }).catch(() => null);
                    
                    if (txReceipt) {
                        addLog(`[INFO] Transaction receipt found! Status: ${txReceipt.status}`);
                        break;
                    }
                }
                
                const elapsed = Math.round((Date.now() - pollStart) / 1000);
                if (elapsed % 10 === 0) { // Log every 10 seconds to reduce noise
                    addLog(`[INFO] Polling... (${elapsed}s elapsed)`);
                }
            } catch (err: any) {
                addLog(`[DEBUG] Poll attempt failed: ${err.message}`);
            }
            
            await new Promise(resolve => setTimeout(resolve, pollInterval));
        }

        // Remove the "Processing..." toast
        if (toastIdRef.current !== null) {
            removeToast(toastIdRef.current);
            toastIdRef.current = null;
        }

        // Check results
        if (!txReceipt) {
            addLog(`[ERROR] Transaction not confirmed within ${maxPollTime/1000}s`);
            throw new Error('Transaction confirmation timeout. Please check the explorer link.');
        }

        const success = txReceipt.status === 'success';
        const finalTxHash = txHash || userOpHash;

        if (success) {
            addLog(`[SUCCESS] Transfer confirmed. Tx hash: ${finalTxHash}`);
            addLog(`[INFO] Block number: ${txReceipt.blockNumber}`);
            
            // Show SUCCESS toast with the correct txHash
            addToast({ 
                message: 'Transfer successful!', 
                type: 'success', 
                txHash: finalTxHash 
            });

            addLog('[INFO] Refreshing account state and balances...');
            refreshAccount();
            fetchBalances(true);
            setRecipient('');
            setAmount('');
            setRecipientError(null);
            setAmountError(null);
        } else {
            addLog(`[ERROR] Transaction reverted. Tx hash: ${finalTxHash}`);
            throw new Error('Transaction was reverted on chain');
        }
        // --- End Custom Direct RPC Polling Logic ---

    } catch (err: any) {
        setShowSigningHint(false);
        if (toastIdRef.current !== null) { try { removeToast(toastIdRef.current); } catch {} }
        toastIdRef.current = null;
        const errorMessage = err.message?.includes('User rejected the request')
             ? 'Transaction rejected by user.'
             : err.message || String(err);
        addLog(`[ERROR] Transfer failed: ${errorMessage}`);
        addToast({ message: `Transfer failed: ${errorMessage}`, type: 'error', txHash: userOpHash });
    } finally {
        setIsTransferring(false);
    }
  };


  if (!smartAccountAddress) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p>Smart Account not available.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Token Selection */}
      <Listbox
        value={selectedToken}
        onChange={(value) => {
            setSelectedToken(value);
            setAmount('');
            setAmountError(null);
        }}
        disabled={disabled || isTransferring}
      >
        {({ open }) => (
          <div className="relative">
             <Listbox.Label className="block text-sm font-medium text-gray-400 mb-1.5">Select Token</Listbox.Label>
            <Listbox.Button
              className={`relative w-full cursor-pointer rounded-xl py-3 pl-4 pr-10 text-left bg-slate-800/60 border-2 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 ${
                  disabled || isTransferring ? 'border-slate-700 opacity-70 cursor-not-allowed' : 'border-slate-600 hover:border-slate-500 shadow-sm'
              }`}
            >
              <span className="flex items-center gap-3">
                <Image src={tokenInfo[selectedToken].icon} alt="" width={24} height={24} className="rounded-full flex-shrink-0 ring-1 ring-slate-700" />
                <span className="block truncate font-semibold text-white">{tokenInfo[selectedToken].symbol}</span>
                <span className="ml-auto text-xs text-gray-400">
                    Balance: {parseFloat(currentMaxBalance).toFixed(4)}
                </span>
              </span>
              <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                <ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
              </span>
            </Listbox.Button>
            <Transition
              show={open}
              as={Fragment}
              leave="transition ease-in duration-100"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-xl bg-slate-800/95 backdrop-blur-md py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm border border-slate-700">
                {availableTokens.map((tokenKey) => (
                  <Listbox.Option
                    key={tokenKey}
                    className={({ active }) =>
                      `relative cursor-pointer select-none py-2.5 pl-10 pr-4 ${
                        active ? 'bg-blue-900/60 text-blue-100' : 'text-gray-300'
                      }`
                    }
                    value={tokenKey}
                  >
                    {({ selected, active }) => (
                      <>
                        <span className={`flex items-center gap-3 truncate ${selected ? 'font-semibold text-white' : 'font-normal'}`}>
                          <Image src={tokenInfo[tokenKey].icon} alt="" width={20} height={20} className="rounded-full flex-shrink-0 ring-1 ring-slate-700" />
                          {tokenInfo[tokenKey].symbol}
                          <span className={`ml-auto text-xs ${selected ? 'text-gray-400' : 'text-gray-500'}`}>
                              {parseFloat(balances ? (balances[tokenInfo[tokenKey].balanceKey] || '0') : '0').toFixed(4)}
                          </span>
                        </span>
                        {selected ? (
                          <span className={`absolute inset-y-0 left-0 flex items-center pl-3 ${active ? 'text-blue-300' : 'text-blue-500'}`}>
                            <CheckIcon className="h-5 w-5" aria-hidden="true" />
                          </span>
                        ) : null}
                      </>
                    )}
                  </Listbox.Option>
                ))}
              </Listbox.Options>
            </Transition>
          </div>
        )}
      </Listbox>

      {/* Recipient Address */}
      <div>
        <label htmlFor="recipient-address" className="block text-sm font-medium text-gray-400 mb-1.5">Recipient Address</label>
        <input
          id="recipient-address"
          type="text"
          value={recipient}
          onChange={handleRecipientChange}
          placeholder="0x..."
          className={`w-full p-3 bg-slate-800/60 border-2 rounded-xl font-mono text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500/50 transition-colors duration-300 disabled:opacity-70 ${
            recipientError ? 'border-red-500/70 focus:border-red-500/70' : 'border-slate-600 hover:border-slate-500 focus:border-blue-500'
          }`}
          disabled={disabled || isTransferring}
          aria-invalid={!!recipientError}
          aria-describedby="recipient-error"
        />
        {recipientError && (
            <p id="recipient-error" className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
                <ExclamationTriangleIcon className="h-4 w-4"/> {recipientError}
            </p>
        )}
      </div>

      {/* Amount Input */}
      <div>
         <div className="flex justify-between items-baseline mb-1.5">
            <label htmlFor="transfer-amount" className="block text-sm font-medium text-gray-400">Amount</label>
            <button
                onClick={() => { setAmount(currentMaxBalance); validateAmount(currentMaxBalance); }}
                className="text-xs text-blue-400 hover:text-blue-300 disabled:text-gray-600 disabled:cursor-not-allowed font-medium transition-colors"
                disabled={disabled || isTransferring || currentMaxBalanceNum <= 0}
            >
                Max Available
            </button>
         </div>
        <div className="relative">
            <input
              id="transfer-amount"
              type="number"
              value={amount}
              onChange={handleAmountChange}
              placeholder="0.0"
              step="any"
              min="0"
              max={currentMaxBalanceNum}
              className={`w-full pl-4 pr-20 py-3 bg-slate-800/60 border-2 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500/50 transition-colors duration-300 disabled:opacity-70 ${
                amountError ? 'border-red-500/70 focus:border-red-500/70' : 'border-slate-600 hover:border-slate-500 focus:border-blue-500'
              }`}
              disabled={disabled || isTransferring}
              aria-invalid={!!amountError}
              aria-describedby="amount-error"
            />
             <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-semibold pointer-events-none">
                {selectedToken}
             </span>
        </div>
         {amountError && (
            <p id="amount-error" className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
                <ExclamationTriangleIcon className="h-4 w-4"/> {amountError}
            </p>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-slate-700/60 pt-6">
          {/* Send Button */}
          <motion.button
            onClick={handleTransfer}
            disabled={disabled || isTransferring || !recipient || !amount || parseFloat(amount) <= 0 || !!recipientError || !!amountError}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 font-semibold py-3 px-6 rounded-xl transition-all duration-300 flex items-center justify-center text-white shadow-lg hover:shadow-blue-500/40 disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-none"
             whileHover={{ scale: (disabled || isTransferring || !recipient || !amount || parseFloat(amount) <= 0 || !!recipientError || !!amountError) ? 1 : 1.03 }}
             whileTap={{ scale: (disabled || isTransferring || !recipient || !amount || parseFloat(amount) <= 0 || !!recipientError || !!amountError) ? 1 : 0.97 }}
          >
            <span className="relative z-10 flex items-center justify-center">
                {isTransferring ? (
                    <>
                    <motion.span
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="inline-block w-5 h-5 border-2 border-white/80 border-t-transparent rounded-full mr-3"
                    />
                    Processing...
                    </>
                ) : (
                    <>
                        <PaperAirplaneIcon className="h-5 w-5 mr-2 -ml-1 transform -rotate-45" />
                        Send {selectedToken}
                    </>
                )}
            </span>
          </motion.button>
          {/* Signing Hint */}
          {showSigningHint && (
               <p className="mt-3 text-xs text-cyan-400 text-center flex items-center justify-center gap-1.5 animate-pulse">
                   <PencilSquareIcon className="h-4 w-4"/> Check your wallet to approve the transaction.
               </p>
           )}
      </div>
    </div>
  );
}