// src/lib/signedDelegation.ts
// Placeholder for a signed delegation compatible with DelegationManager.redeemDelegations.
// Replace these fields with a real, user-signed delegation during Phase 3.5 persistence.

import type { Address, Hex } from 'viem';
import type { Delegation } from '@metamask/delegation-toolkit';

// Optional helper type if you want to craft caveats locally before signing.
export type Caveat = {
  enforcer: Address;
  terms: Hex;
  // Some enforcers/toolkit versions include args; leave as optional for forward-compat.
  args?: Hex;
};

// Zero constants for clear placeholders.
const ZERO_ADDR = '0x0000000000000000000000000000000000000000' as Address;
const ZERO32 = ('0x' + '0'.repeat(64)) as Hex;
const ZERO_SIG = '0x' as Hex;

// IMPORTANT:
// - delegator must be the owner creating the delegation (the user).
// - delegate must be the agent smart account that will redeem it.
// - authority is the keccak256 hash of the encoded caveats array used to constrain execution.
// - caveats should include AllowedTargets / AllowedMethods enforcers (or your custom set).
// - salt can be ZERO32 for deterministic demos, but should be unique in production.
// - signature is the EIP-712 signature over the Delegation typed data produced by the delegator wallet.

export const signedDelegation: Delegation = {
  "delegate": "0xFE5AB50d48cf989616A4173083aF646d613fc857",
  "delegator": "0x4a402f781Cd83Ff77F4658C827d91FEc552619E2",
  "authority": "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
  "caveats": [
    {
      "enforcer": "0x7F20f61b1f09b08D970938F6fa563634d65c4EeB",
      "terms": "0xe1d2439b75fb9746E7Bc6cB777Ae10AA7f7ef9c52c9C959516e9AAEdB2C748224a41249202ca8BE7aEef2f6B429Cb59C9B2D7bB2141ADa993E8571c3",
      "args": "0x"
    },
    {
      "enforcer": "0x2c21fD0Cb9DC8445CB3fb0DC5E7Bb0Aca01842B5",
      "terms": "0x1c3477dde676755bb17033b67bde82f21610247bd5575982fef0b6fc6fed1ea7a9059cbb095ea7b323b872dd",
      "args": "0x"
    }
  ],
  "salt": "0x",
  "signature": "0x8044e3a2bf16a2892dfd6009b7767abdc291068e19b6f2d945a96c5aa5d9cba408e9fecb6e556c679a66207c97ab15c07b5a2737950466d4958e212c25890dd11b"
};

// If you want to export a type-guard or a quick validity check, you can add:
// export function isPlaceholderDelegation(d: Delegation): boolean {
//   return d.delegator === ZERO_ADDR || d.delegate === ZERO_ADDR || d.signature === ZERO_SIG;
// }
