// src/components/SwapInterfaceUnique.tsx
'use client';

import { useState, useEffect, useMemo, Fragment, useRef } from 'react';
import type { Address } from 'viem';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { Listbox, Transition } from '@headlessui/react';
import {
  ArrowsRightLeftIcon,
  ChevronUpDownIcon,
  CheckIcon,
  InformationCircleIcon,
  BoltIcon,
  ExclamationTriangleIcon,
  ArrowLongRightIcon, // For route display
} from '@heroicons/react/24/outline'; // Using outline for consistency
import { useSSEStream } from '@/hooks/useSSEStream';
import type { Balances } from '@/providers/BalanceProvider';
import { CONTRACTS } from '@/lib/contracts';
import { useToasts } from '@/providers/ToastProvider';
import { useLogger } from '@/providers/LoggerProvider';
// Removed Card import

// --- Interfaces and Constants ---
interface TokenMeta {
    name: string;
    symbol: string;
    icon: string;
    balanceKey: keyof Balances;
}
interface ProtocolMeta {
    name: string;
    icon: string;
}

const TOKEN_INFO: Record<string, TokenMeta> = {
  MON: { name: 'Monad Native', symbol: 'MON', icon: '/mon.jpeg', balanceKey: 'native' },
  WMON: { name: 'Wrapped Monad', symbol: 'WMON', icon: '/mon.jpeg', balanceKey: 'wmon' },
  sMON: { name: 'Kintsu Staked MON', symbol: 'sMON', icon: '/smon.jpg', balanceKey: 'kintsu' },
  gMON: { name: 'Magma Staked MON', symbol: 'gMON', icon: '/gmon.png', balanceKey: 'magma' },
};

// Add protocol info for route display
const PROTOCOL_INFO: Record<string, ProtocolMeta> = {
    Magma: { name: 'Magma', icon: '/magma.png'},
    Kintsu: { name: 'Kintsu', icon: '/kintsu.png'},
    PancakeSwap: { name: 'PancakeSwap', icon: '/pancake.png'}, // Added PancakeSwap icon URL
    Wrap: { name: 'Wrap Contract', icon: '/mon.jpeg'}, // Representing WMON contract
    Unwrap: { name: 'Wrap Contract', icon: '/mon.jpeg'}, // Representing WMON contract
}

type TokenKey = keyof typeof TOKEN_INFO;
const availableTokens: TokenKey[] = ['MON', 'WMON', 'sMON', 'gMON'];

interface SwapPlan {
  type: 'stake-magma' | 'unstake-magma' | 'stake-kintsu' | 'unstake-kintsu' | 'direct-swap' | 'wrap-mon' | 'unwrap-wmon';
  description: string;
  isOptimal?: boolean;
  routeVia?: string[]; // Array to hold protocol names/steps
}

interface SwapInterfaceProps {
  smartAccountAddress: Address | null;
  balances: Balances;
  disabled?: boolean;
  onBalanceRefresh?: () => void;
}

// --- Main Component ---
export default function SwapInterfaceUnique({
  smartAccountAddress,
  balances,
  disabled = false,
  onBalanceRefresh,
}: SwapInterfaceProps) {
  // Hooks and State (Remain the same)
  const { addToast, removeToast } = useToasts();
  const { addLog } = useLogger();
  const [fromToken, setFromToken] = useState<TokenKey>('MON');
  const [toToken, setToToken] = useState<TokenKey>('sMON');
  const [amount, setAmount] = useState('');
  const [swapPlan, setSwapPlan] = useState<SwapPlan | null>(null);
  const [isSwapping, setIsSwapping] = useState(false);
  const [amountError, setAmountError] = useState<string | null>(null);
  const toastIdRef = useRef<number | null>(null);
  const { generateOpId, openStream } = useSSEStream();

  const TOKEN_ADDRESSES: Record<TokenKey, Address> = {
    MON: '0x0000000000000000000000000000000000000000' as Address,
    WMON: CONTRACTS.WMON,
    sMON: CONTRACTS.KINTSU,
    gMON: CONTRACTS.GMON,
  };

  // --- Logic Functions (analyzeSwap updated) ---
  const getOptimalFee = (from: TokenKey, to: TokenKey): number => {
     if ((from === 'sMON' && to === 'gMON') || (from === 'gMON' && to === 'sMON')) return 500;
     if ((from === 'sMON' && to === 'WMON') || (from === 'WMON' && to === 'sMON')) return 2500;
     if ((from === 'gMON' && to === 'WMON') || (from === 'WMON' && to === 'gMON')) return 2500;
    return 2500;
  };

  const getMaxBalance = (): string => {
      const key = TOKEN_INFO[fromToken]?.balanceKey;
      return key ? (balances[key] || '0') : '0';
  };
  const currentMaxBalance = getMaxBalance();
  const currentMaxBalanceNum = parseFloat(currentMaxBalance);

    const validateAmount = (inputAmount: string) => {
        const numAmount = parseFloat(inputAmount);
        if (!inputAmount) { setAmountError(null); return true; }
        if (isNaN(numAmount) || numAmount <= 0) { setAmountError('Please enter a positive amount.'); return false; }
        if (numAmount > currentMaxBalanceNum) { setAmountError('Amount exceeds available balance.'); return false; }
        setAmountError(null); return true;
    };

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value; setAmount(value); validateAmount(value);
    };

    const handleSetMax = () => {
        setAmount(currentMaxBalance);
        validateAmount(currentMaxBalance);
    }

  // **Updated analyzeSwap to include detailed routes**
  const analyzeSwap = (): SwapPlan | null => {
      if (fromToken === toToken) return null;
      if (fromToken === 'MON' && toToken === 'gMON') return {type:'stake-magma', description:'Stake into Magma', isOptimal:true, routeVia: ['Magma']};
      if (fromToken === 'gMON' && toToken === 'MON') return {type:'unstake-magma', description:'Unstake from Magma', isOptimal:true, routeVia: ['Magma']};
      if (fromToken === 'MON' && toToken === 'sMON') return {type:'stake-kintsu', description:'Stake into Kintsu', isOptimal:true, routeVia: ['Kintsu']};
      if (fromToken === 'sMON' && toToken === 'MON') return {type:'unstake-kintsu', description:'Instant Unstake via Swap', isOptimal:true, routeVia: ['PancakeSwap', 'Unwrap']}; // sMON -> WMON -> MON
      if (fromToken === 'MON' && toToken === 'WMON') return {type:'wrap-mon', description:'Wrap MON', isOptimal:true, routeVia: ['Wrap']};
      if (fromToken === 'WMON' && toToken === 'MON') return {type:'unwrap-wmon', description:'Unwrap WMON', isOptimal:true, routeVia: ['Unwrap']};

      // Default to direct swap for other pairs, specify PancakeSwap
      const isOptimalRoute = ((fromToken==='sMON'&&toToken==='gMON')||(fromToken==='gMON'&&toToken==='sMON')); // Example optimal check
      return {type:'direct-swap', description:`Swap ${fromToken} for ${toToken}`, isOptimal: isOptimalRoute, routeVia: ['PancakeSwap']};
  };

  // executeSwap remains the same logic
  const executeSwap = async () => {
    const isAmountValid = validateAmount(amount);
    if (!swapPlan || !amount || !isAmountValid || !smartAccountAddress) {
        return addToast({ message: 'Invalid swap details.', type: 'error' });
    }
    // ... (rest of executeSwap logic is unchanged from previous version) ...
     setIsSwapping(true);
        const opId = generateOpId();
        openStream(opId, addLog);

        if (toastIdRef.current !== null) { try { removeToast(toastIdRef.current); } catch {} }
        toastIdRef.current = addToast({ message: `Processing: ${swapPlan.description}...`, type: 'loading', duration: 180000 });


        try {
            addLog(`[ACTION] ${swapPlan.description}`);
            let body: any = { userAddress: smartAccountAddress, amount, opId };

            switch (swapPlan.type) {
                 case 'stake-magma':
                 case 'unstake-magma':
                 case 'stake-kintsu':
                 case 'wrap-mon':
                 case 'unwrap-wmon':
                    body.operation = swapPlan.type;
                    if (swapPlan.type === 'stake-kintsu') body.receiver = smartAccountAddress;
                    break;
                case 'unstake-kintsu': {
                    const inWei = BigInt(Math.floor(+amount * 1e18)).toString();
                    body = { ...body, operation: 'kintsu-instant-unstake', amountIn: inWei, minOut: (BigInt(inWei) * 98n / 100n).toString(), fee: getOptimalFee('sMON', 'WMON'), recipient: smartAccountAddress, unwrap: true };
                    break;
                }
                case 'direct-swap': {
                    const fromAddr = TOKEN_ADDRESSES[fromToken];
                    const toAddr = TOKEN_ADDRESSES[toToken];
                    const inWei = BigInt(Math.floor(+amount * 1e18)).toString();
                    body = { ...body, operation: 'direct-swap', fromToken: fromAddr, toToken: toAddr, amountIn: inWei, minOut: (BigInt(inWei) * 97n / 100n).toString(), fee: getOptimalFee(fromToken, toToken), recipient: smartAccountAddress, deadline: Math.floor(Date.now() / 1000) + 1800 };
                    break;
                }
                default: throw new Error(`Unknown swap plan type: ${swapPlan.type}`);
            }

            const result = await fetch('/api/delegate/execute', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(res => res.json());

            if (toastIdRef.current !== null) { try { removeToast(toastIdRef.current); } catch {} }
            if (!result.success) { throw new Error(result.error || 'Swap operation failed'); }

            const ops = result.operations ?? [];
            ops.forEach((op: any, i: number) => { addLog(`[OP-${i + 1}] TX: ${op.txHash || op.userOpHash}`); });
            const lastOp = ops[ops.length - 1];
            addToast({ message: `Swap complete!`, type: 'success', txHash: lastOp?.txHash || lastOp?.userOpHash });
            addLog(`[SUCCESS] ${swapPlan.description} complete!`);
            setAmount('');
            setAmountError(null);
            setTimeout(() => onBalanceRefresh?.(), 3000);

        } catch (e: any) {
            if (toastIdRef.current !== null) { try { removeToast(toastIdRef.current); } catch {} }
            addLog(`[ERROR] Swap failed: ${e.message}`);
            addToast({ message: `Swap failed: ${e.message}`, type: 'error'});
        } finally {
            setIsSwapping(false);
            toastIdRef.current = null;
        }
  };


  useEffect(()=>{ setSwapPlan(analyzeSwap()) }, [fromToken, toToken]);

  const handleTokenSwap = () => {
    const temp = fromToken;
    setFromToken(toToken);
    setToToken(temp);
    setAmount('');
    setAmountError(null);
  }

  const isButtonDisabled = disabled || isSwapping || !swapPlan || !amount || parseFloat(amount) <= 0 || !!amountError;


  return (
    // **NEW**: Unique Card Styling
    <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        // Added subtle gradient border and background texture
        className="relative w-full bg-gradient-to-br from-slate-900/80 to-slate-950/80 backdrop-blur-xl border border-slate-700/40 rounded-2xl p-6 shadow-xl shadow-black/40 overflow-hidden"
    >
        {/* Unique Background Element: Subtle diagonal lines */}
        <div className="absolute inset-0 z-[-1] opacity-[0.03]" style={{
            backgroundImage: `repeating-linear-gradient(-45deg, rgba(255,255,255,0.5), rgba(255,255,255,0.5) 1px, transparent 1px, transparent 10px)`
        }}></div>
        {/* Subtle top edge glow */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-blue-500/30 to-transparent blur-sm"></div>

        {/* Header - Consistent Professional Style */}
        <div className="flex items-center gap-4 mb-6 pb-4 border-b border-slate-700/50">
            <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-lg bg-slate-800 ring-1 ring-slate-700">
                <ArrowsRightLeftIcon className="h-6 w-6 text-purple-400" />
            </div>
            <div>
                <h2 className="text-lg font-semibold text-white">Token Exchange</h2>
                <p className="text-sm text-gray-500">Execute swaps via your Smart Account</p>
            </div>
        </div>

        {/* Main Swap Interface Content */}
        <div className="space-y-5">
            {/* From Token */}
            <TokenSelector
                label="Sell"
                selectedToken={fromToken}
                onSelectToken={(token) => { setFromToken(token); setAmount(''); setAmountError(null); }}
                balance={currentMaxBalance}
                allBalances={balances}
                disabled={isSwapping}
            />

            {/* Swap Direction Button */}
            <div className="flex justify-center py-1">
                <motion.button
                    type="button"
                    onClick={handleTokenSwap}
                    disabled={disabled || isSwapping}
                    className="p-2 rounded-full bg-slate-800/60 hover:bg-slate-700/70 border border-slate-700 transition-colors duration-200 disabled:opacity-50 group"
                    whileTap={{ scale: 0.95 }}
                    aria-label="Swap tokens"
                >
                    <ArrowsRightLeftIcon className="w-5 h-5 text-gray-400 transition-transform duration-300 group-hover:text-purple-400" />
                </motion.button>
            </div>

            {/* To Token */}
            <TokenSelector
                label="Buy"
                selectedToken={toToken}
                onSelectToken={(token) => { setToToken(token); setAmount(''); setAmountError(null); }}
                balance={balances[TOKEN_INFO[toToken].balanceKey] || '0'}
                allBalances={balances}
                disabled={isSwapping}
            />

            {/* Amount Input */}
            <div>
               <div className="flex justify-between items-center mb-1.5">
                  <label htmlFor="swap-amount" className="block text-sm font-medium text-gray-400">Amount to Sell</label>
                  <button
                      onClick={handleSetMax}
                      className="px-2 py-0.5 bg-slate-700/60 text-blue-400 hover:text-blue-300 text-xs font-medium rounded hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={disabled || isSwapping || currentMaxBalanceNum <= 0}
                  >
                      MAX
                  </button>
               </div>
              <div className="relative">
                  <input
                    id="swap-amount"
                    type="number"
                    value={amount}
                    onChange={handleAmountChange}
                    placeholder="0.0"
                    step="any"
                    min="0"
                    className={`w-full pl-4 pr-24 py-3 bg-slate-800/60 border-2 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-600/50 focus:border-blue-600 transition-all duration-200 disabled:opacity-60 ${
                      amountError ? 'border-red-600/70 focus:ring-red-600/50 focus:border-red-600' : 'border-slate-700 hover:border-slate-600'
                    }`}
                    disabled={disabled || isSwapping}
                    aria-invalid={!!amountError}
                    aria-describedby="amount-error"
                  />
                   <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none bg-slate-700/50 px-2 py-1 rounded-md">
                       <Image src={TOKEN_INFO[fromToken].icon} alt={TOKEN_INFO[fromToken].symbol} width={16} height={16} className="rounded-full opacity-90"/>
                       <span className="text-gray-300 text-sm font-medium">
                            {TOKEN_INFO[fromToken].symbol}
                       </span>
                   </div>
              </div>
               {amountError && (
                  <p id="amount-error" className="mt-2 text-xs text-red-500 flex items-center gap-1.5">
                      <ExclamationTriangleIcon className="h-4 w-4"/> {amountError}
                  </p>
              )}
            </div>

            {/* **NEW**: Enhanced Route Info Display */}
            {swapPlan && amount && +amount > 0 && !amountError && (
                <div className="mt-3 p-3 rounded-lg bg-slate-800/40 border border-slate-700/60 text-gray-400 text-xs space-y-2">
                    <div className="flex justify-between items-center">
                        <span className="font-medium">Route</span>
                        {swapPlan.isOptimal ? (
                             <span className="text-green-400 font-medium text-[11px] bg-green-900/40 px-2 py-0.5 rounded">Optimal</span>
                        ): (
                            <span className="text-yellow-400 font-medium text-[11px] bg-yellow-900/40 px-2 py-0.5 rounded">Standard</span>
                        )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="flex items-center gap-1.5">
                            <Image src={TOKEN_INFO[fromToken].icon} alt={fromToken} width={14} height={14} className="rounded-full"/>
                            {fromToken}
                        </span>
                        {(swapPlan.routeVia || []).map((protocolName, index) => (
                             <Fragment key={index}>
                                <ArrowLongRightIcon className="h-4 w-4 text-gray-500"/>
                                <span className="flex items-center gap-1.5 bg-slate-700/50 px-2 py-0.5 rounded text-gray-300">
                                    {PROTOCOL_INFO[protocolName]?.icon && (
                                        <Image src={PROTOCOL_INFO[protocolName].icon} alt={protocolName} width={14} height={14} className="rounded-full"/>
                                    )}
                                    {PROTOCOL_INFO[protocolName]?.name || protocolName}
                                </span>
                            </Fragment>
                        ))}
                        <ArrowLongRightIcon className="h-4 w-4 text-gray-500"/>
                        <span className="flex items-center gap-1.5">
                             <Image src={TOKEN_INFO[toToken].icon} alt={toToken} width={14} height={14} className="rounded-full"/>
                             {toToken}
                         </span>
                    </div>
                </div>
            )}

             {/* Execute Swap Button */}
             <div className="pt-5 border-t border-slate-700/50">
                <motion.button
                    onClick={executeSwap}
                    disabled={isButtonDisabled}
                    className="group relative w-full bg-gradient-to-r from-blue-700 to-purple-700 font-semibold py-3 px-6 rounded-xl transition-all duration-300 flex items-center justify-center overflow-hidden text-white shadow-md hover:shadow-lg hover:shadow-purple-700/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                    whileHover={{ scale: isButtonDisabled ? 1 : 1.015 }}
                    whileTap={{ scale: isButtonDisabled ? 1 : 0.98 }}
                >
                    <span className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <span className="relative z-10 flex items-center justify-center text-base font-medium">
                    {isSwapping ? (
                        <>
                        <motion.span
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            className="inline-block w-5 h-5 border-2 border-white/60 border-t-transparent rounded-full mr-2.5"
                        />
                        Processing...
                        </>
                    ) : (
                        <>
                        <BoltIcon className="h-5 w-5 mr-2 opacity-80" />
                        {swapPlan?.description.startsWith('Swap') ? 'Confirm Swap' : swapPlan?.description || 'Swap'}
                        </>
                    )}
                    </span>
                </motion.button>
             </div>
        </div>
    </motion.div>
  );
}

// --- TokenSelector Component (Remains the same as previous) ---
const TokenSelector = ({ label, selectedToken, onSelectToken, balance, allBalances, disabled }: {
    label: string;
    selectedToken: TokenKey;
    onSelectToken: (token: TokenKey) => void;
    balance: string;
    allBalances: Balances;
    disabled?: boolean;
}) => {
     return (
        <div>
            <Listbox value={selectedToken} onChange={onSelectToken} disabled={disabled}>
                {({ open }) => (
                <div className="relative">
                    <Listbox.Label className="block text-sm font-medium text-gray-400 mb-1.5">{label}</Listbox.Label>
                    <Listbox.Button
                        className={`relative w-full cursor-pointer rounded-xl py-3 pl-4 pr-10 text-left bg-slate-800/50 border-2 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/50 focus-visible:border-blue-600 ${
                            disabled ? 'border-slate-700/60 opacity-60 cursor-not-allowed' : 'border-slate-700 hover:border-slate-600'
                        }`}
                    >
                    <span className="flex items-center gap-3">
                        <Image src={TOKEN_INFO[selectedToken].icon} alt="" width={24} height={24} className="rounded-full flex-shrink-0 ring-1 ring-slate-700/50" />
                        <span className="block truncate font-semibold text-base text-white">{TOKEN_INFO[selectedToken].symbol}</span>
                        <span className="ml-auto text-sm text-gray-500">
                             Balance: {parseFloat(balance || '0').toFixed(4)}
                        </span>
                    </span>
                    <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                        <ChevronUpDownIcon className="h-5 w-5 text-gray-500" aria-hidden="true" />
                    </span>
                    </Listbox.Button>
                    <Transition
                        show={open}
                        as={Fragment}
                        leave="transition ease-in duration-100"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                    <Listbox.Options className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-lg bg-slate-800 py-1.5 text-base shadow-lg ring-1 ring-black/10 focus:outline-none sm:text-sm border border-slate-700">
                        {availableTokens.map((tokenKey) => {
                            const optionBalanceKey = TOKEN_INFO[tokenKey].balanceKey;
                            const optionBalance = allBalances[optionBalanceKey] || '0';
                            return (
                                <Listbox.Option
                                    key={tokenKey}
                                    className={({ active }) =>
                                    `relative cursor-pointer select-none py-2 pl-10 pr-4 transition-colors ${
                                        active ? 'bg-blue-900/60 text-blue-100' : 'text-gray-300 hover:bg-slate-700/40'
                                    }`
                                    }
                                    value={tokenKey}
                                >
                                    {({ selected }) => (
                                    <>
                                        <div className="flex items-center justify-between">
                                            <div className={`flex items-center gap-3 truncate ${selected ? 'font-medium text-white' : 'font-normal'}`}>
                                                <Image src={TOKEN_INFO[tokenKey].icon} alt="" width={20} height={20} className="rounded-full flex-shrink-0 ring-1 ring-slate-700/50" />
                                                {TOKEN_INFO[tokenKey].symbol}
                                                <span className={`ml-1 text-xs ${selected ? 'text-gray-400' : 'text-gray-500'}`}>({TOKEN_INFO[tokenKey].name})</span>
                                            </div>
                                            <span className={`text-xs font-mono ${selected ? 'text-gray-300' : 'text-gray-500'}`}>
                                                {parseFloat(optionBalance).toFixed(4)}
                                            </span>
                                        </div>
                                        {selected ? (
                                        <span className={`absolute inset-y-0 left-0 flex items-center pl-3 text-blue-500`}>
                                            <CheckIcon className="h-5 w-5" aria-hidden="true" />
                                        </span>
                                        ) : null}
                                    </>
                                    )}
                                </Listbox.Option>
                            )
                        })}
                    </Listbox.Options>
                    </Transition>
                </div>
                )}
            </Listbox>
        </div>
    );
};