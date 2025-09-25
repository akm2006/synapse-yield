// Kintsu StakedMonad (ERC-4626) ABI fragment
export const kintsuAbi = [
  {
    "inputs": [
      { "internalType": "uint256", "name": "shares", "type": "uint256" }
    ],
    "name": "convertToAssets",
    "outputs": [
      { "internalType": "uint256", "name": "assets", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

// Magma gMON (reward-bearing LST) ABI fragment
// The function name might be different (e.g., getAmountForShares),
// but the signature will be similar. We assume `convertToAssets` for now.
export const magmaAbi = [
    {
        "inputs": [
          { "internalType": "uint256", "name": "shares", "type": "uint256" }
        ],
        "name": "convertToAssets", // NOTE: Verify this function name from the ABI on the explorer
        "outputs": [
          { "internalType": "uint256", "name": "assets", "type": "uint256" }
        ],
        "stateMutability": "view",
        "type": "function"
      }
] as const;
