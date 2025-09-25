'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import {
  createWalletClient,
  custom,
  Address,
  walletActions,
  Account,
  keccak256,
  encodeAbiParameters,
  getAddress,
  slice,
  Hex,
  toHex,
} from 'viem';
import {
  getDeleGatorEnvironment,
  toMetaMaskSmartAccount,
  Implementation,
} from '@metamask/delegation-toolkit';
import { publicClient, monad } from '@/lib/viemClients';

// --- Enforcer Contract Addresses (Monad Testnet, checksummed) ---
const ALLOWED_TARGETS_ENFORCER: Address = getAddress(
  '0x7f20f61b1f09b08d970938f6fa563634d65c4eeb'
);
const ALLOWED_METHODS_ENFORCER: Address = getAddress(
  '0x2c21fD0Cb9DC8445CB3fb0DC5E7Bb0Aca0184285'
);

export default function DelegateManager({
  smartAccountAddress,
  agentAddress,
  adapterAddress,
}: {
  smartAccountAddress: Address;
  agentAddress: Address;
  adapterAddress: Address;
}) {
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
      // Signer client
      const baseClient = createWalletClient({
        chain: monad,
        transport: custom(window.ethereum),
      }).extend(walletActions);

      const customAccount = {
        address: eoa,
        type: 'json-rpc',
        async signMessage({ message }: { message: any }) {
          return await baseClient.signMessage({ message, account: eoa });
        },
        async signTypedData(typedData: any) {
          return await baseClient.signTypedData({ ...typedData, account: eoa });
        },
        async signTransaction(transaction: any) {
          return await baseClient.signTransaction({ ...transaction, account: eoa });
        },
      } as unknown as Account;

      const signerClient = createWalletClient({
        account: customAccount,
        chain: monad,
        transport: custom(window.ethereum),
      });

      const environment = getDeleGatorEnvironment(monad.id);

      // Create smart account instance
      const smartAccount = await toMetaMaskSmartAccount({
        client: publicClient,
        implementation: Implementation.Hybrid,
        signer: signerClient,
        environment,
        deployParams: [eoa, [], [], []],
        deploySalt: '0x',
      });

      // rebalance(string,string,uint256) selector
      const rebalanceSignature = 'rebalance(string,string,uint256)';
      const rebalanceSelector = slice(keccak256(toHex(rebalanceSignature)), 0, 4);

      // AllowedTargetsEnforcer terms = address[]
      const targetTerms = encodeAbiParameters(
        [{ type: 'address[]' }],
        [[adapterAddress]]
      );

      // AllowedMethodsEnforcer terms = (address, bytes4[])[]
      const methodsTerms = encodeAbiParameters(
        [
          {
            type: 'tuple[]',
            components: [
              { name: 'target', type: 'address' },
              { name: 'selectors', type: 'bytes4[]' },
            ],
          },
        ],
        [[{ target: adapterAddress, selectors: [rebalanceSelector] }]]
      );

      const caveats = [
        { enforcer: ALLOWED_TARGETS_ENFORCER, terms: targetTerms },
        { enforcer: ALLOWED_METHODS_ENFORCER, terms: methodsTerms },
      ];

      const encodedCaveats = encodeAbiParameters(
        [
          {
            type: 'tuple[]',
            name: 'caveats',
            components: [
              { name: 'enforcer', type: 'address' },
              { name: 'terms', type: 'bytes' },
            ],
          },
        ],
        [caveats]
      );
      const authority = keccak256(encodedCaveats);

      const ZERO_SALT: Hex =
        '0x0000000000000000000000000000000000000000000000000000000000000000';

      const delegation = {
        delegate: agentAddress,
        authority,
        caveats,
        salt: ZERO_SALT,
      };

      const signature = await smartAccount.signTypedData({
        domain: {
          name: 'DelegationManager',
          version: '1',
          chainId: monad.id,
          verifyingContract: environment.DelegationManager,
        },
        types: {
          Delegation: [
            { name: 'delegate', type: 'address' },
            { name: 'authority', type: 'bytes32' },
            { name: 'caveats', type: 'Caveat[]' },
            { name: 'salt', type: 'bytes32' },
          ],
          Caveat: [
            { name: 'enforcer', type: 'address' },
            { name: 'terms', type: 'bytes' },
          ],
        },
        primaryType: 'Delegation',
        message: delegation,
      });

      const signedDelegation = { ...delegation, signature };
      setDelegationId(delegation.authority);

      console.log('✅ Signed Delegation:', signedDelegation);
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
          <p className="text-xs break-all mt-1">
            Delegation Authority Hash: {delegationId}
          </p>
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
