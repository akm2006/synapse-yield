'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { 
  createWalletClient, 
  custom, 
  Address, 
  walletActions, 
  Account
} from 'viem';
import { 
  createDelegation,
  getDeleGatorEnvironment,
  toMetaMaskSmartAccount,
  Implementation
} from '@metamask/delegation-toolkit';
import { publicClient, monad } from '@/lib/viemClients';

// --- PASTE YOUR AGENT'S PUBLIC ADDRESS HERE ---
const AGENT_ADDRESS = '0x8F6B970B9F25B19f13115Bdc7A34514D0f6971d1' as Address;
// --- PASTE YOUR DEPLOYED CONTRACT ADDRESS HERE ---
const ADAPTER_CONTRACT_ADDRESS = '0x3ed79496b6b5f2aed1e2b8203df783bbe39e9002' as Address;

export default function DelegateManager({ smartAccountAddress }: { smartAccountAddress: Address }) {
  const { address: eoa } = useAccount();
  const [delegationId, setDelegationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const authorizeAgent = async () => {
    if (!eoa || !window.ethereum) {
      setError('Wallet not connected.');
      return;
    }
    setIsLoading(true);
    setError(null);
    
    try {
      // Create the signer client using the proven "Custom Account Bridge" pattern
      const baseClient = createWalletClient({ chain: monad, transport: custom(window.ethereum) }).extend(walletActions);
      const customAccount = {
        address: eoa, type: 'json-rpc',
        async signMessage({ message }: { message: any }) { return await baseClient.signMessage({ message, account: eoa }); },
        async signTypedData(typedData: any) { return await baseClient.signTypedData({ ...typedData, account: eoa }); },
        async signTransaction(transaction: any) { return await baseClient.signTransaction({ ...transaction, account: eoa }); },
      } as unknown as Account;
      const signerClient = createWalletClient({ account: customAccount, chain: monad, transport: custom(window.ethereum) });

      const environment = getDeleGatorEnvironment(monad.id);

      // 1. Create a local instance of the smart account to get access to its signing method
      const smartAccount = await toMetaMaskSmartAccount({
        client: publicClient,
        implementation: Implementation.Hybrid,
        address: smartAccountAddress,
        signer: signerClient,
        environment
      });

      // --- THE DEFINITIVE SOLUTION ---
      // 2. Define the function's full ABI and use `as const` for strict typing.
      // This is the most robust way to ensure the toolkit's parser understands the permission.
      const rebalanceFunctionAbi = {
        name: 'rebalance',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
          { name: '_fromProtocol', type: 'string' },
          { name: '_toProtocol', type: 'string' },
          { name: '_minAmountOut', type: 'uint256' },
        ],
        outputs: [],
      } as const;

      // 3. Create the scope using this strictly-typed ABI object.
      const scope = {
        type: 'functionCall' as const,
        targets: [ADAPTER_CONTRACT_ADDRESS],
        selectors: [rebalanceFunctionAbi],
      };

      // 4. Use the high-level `createDelegation` function. It will correctly
      // parse the robust `scope` object and build a valid `authority` payload internally.
      const delegation = createDelegation({
        from: smartAccountAddress,
        to: AGENT_ADDRESS,
        environment: environment,
        scope: scope,
      });
      
      // 5. Sign the delegation using the smart account's built-in, high-level method.
      // This abstracts away the complexity of the EIP-712 signature.
      const signature = await smartAccount.signDelegation({ 
        delegation,
        chainId: monad.id 
      });
      
      const signedDelegation = { ...delegation, signature };

      // 6. Use the `delegation.authority` hash as the unique ID. It is guaranteed to be correct now.
      const uniqueId = delegation.authority;
      setDelegationId(uniqueId);

      console.log('Signed Delegation Created:', signedDelegation);

    } catch (err: any) {
      setError(`Delegation failed: ${err.message}`);
      console.error('Delegation error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="text-center w-full mt-4">
      {delegationId ? (
        <div className="p-3 bg-blue-100 border border-blue-400 text-blue-700 rounded-lg">
          <p className="font-bold">Agent Authorized!</p>
          <p className="text-xs break-all mt-1">Delegation Authority Hash: {delegationId}</p>
        </div>
      ) : (
        <button
          onClick={authorizeAgent}
          disabled={isLoading}
          className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed w-full"
        >
          {isLoading ? 'Authorizing...' : 'Step 3: Authorize Agent'}
        </button>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg w-full">
          <p className="text-sm">{error}</p>
        </div>
      )}
    </div>
  );
}

