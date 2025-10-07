import {
  createDelegation,
  Delegation,
  MetaMaskSmartAccount,
  ExecutionMode,
} from "@metamask/delegation-toolkit";
import { Address, Hex } from "viem";
import { CONTRACTS } from "@/lib/contracts";

export function createStakingDelegation(
  delegator: MetaMaskSmartAccount,
  delegate: Address,
  maxAmount?: bigint
): Delegation {
  return createDelegation({
    from: delegator.address,
    to: delegate,
    environment: delegator.environment,
        scope: {
      type: "functionCall",
      targets: [
        CONTRACTS.MAGMA_STAKE,
        CONTRACTS.KINTSU,
        // Add other contract addresses here if needed
      ],
      selectors: [ // MAGMA staking functions
        "depositMon()",
        "depositMon(uint256)",
        "withdrawMon(uint256)",
        // KINTSU functions
        "deposit(uint96,address)",
        "requestUnlock(uint96)",
        "redeem(uint256,address)",
        "balanceOf(address)",], // "*" allows all functions of these contracts
    },
  });
}
// Example: unlimited native token transfer for testing
export function createTransferDelegation(
  delegator: MetaMaskSmartAccount,
  delegate: Address,
  maxAmount?: bigint
): Delegation {
  return createDelegation({
  from: delegator.address,
  to: delegate,
  environment: delegator.environment,
  scope: {
    type: "nativeTokenTransferAmount",
    maxAmount: 2n ** 256n - 1n, // unlimited for testing
  },
  });
}

export function saveDelegation(walletAddress: Address, delegation: Delegation) {
  localStorage.setItem(
    `delegation_${walletAddress.toLowerCase()}`,
    JSON.stringify(delegation, (_, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );
}

export function loadDelegation(walletAddress: Address): Delegation | null {
  const stored = localStorage.getItem(`delegation_${walletAddress.toLowerCase()}`);
  if (!stored) return null;

  return JSON.parse(stored, (key, value) => {
    if (key === 'maxValue') return BigInt(value);
    return value;
  });
}
