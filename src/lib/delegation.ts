import {
  createDelegation,
  Delegation,
  MetaMaskSmartAccount,
  ExecutionMode,
} from "@metamask/delegation-toolkit";
import { Address, Hex } from "viem";
import { CONTRACTS } from "@/lib/contracts";

// --- Start of your changes ---
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
        CONTRACTS.PERMIT2,
        CONTRACTS.PANCAKESWAP, // Universal Router
        CONTRACTS.WMON,
        CONTRACTS.GMON,
      ],
      selectors: [
        // MAGMA staking functions (matching magmaAbi)
        "depositMon()",
        "depositMon(uint256)",
        "withdrawMon(uint256)",
        
        // KINTSU functions (matching kintsuAbi) 
        "deposit(uint96,address)", // This matches your ABI
        "requestUnlock(uint96)",   // This matches your ABI
        "redeem(uint256,address)", // This matches your ABI
        "balanceOf(address)",      // This matches your ABI
        
        // ERC20 functions (matching erc20Abi)
        "balanceOf(address)",
        "approve(address,uint256)",
        "transfer(address,uint256)",
        "allowance(address,address)",
        
        // Permit2 functions (matching permit2Abi)
        "allowance(address,address,address)", // This matches your ABI
        "approve(address,address,uint160,uint48)", // This matches your ABI
        
        // Universal Router functions
        "execute(bytes,bytes[],uint256)",
        
        // WMON functions (standard WETH ABI)
        "deposit()",
        "withdraw(uint256)",
        
        // Additional ERC20 function that might be needed
        "transferFrom(address,address,uint256)",
      ],
    },
  });
}
// --- End of your changes ---

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
