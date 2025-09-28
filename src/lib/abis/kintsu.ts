// src/lib/abis/kintsu.ts
export const kintsuStakedMonadAbi = [
  // View functions
  "function balanceOf(address account) view returns (uint256)",
  "function totalSupply() view returns (uint256)", 
  "function convertToAssets(uint256 shares) view returns (uint256)",
  "function convertToShares(uint256 assets) view returns (uint256)",
  "function previewDeposit(uint256 assets) view returns (uint256)",
  "function previewRedeem(uint256 shares) view returns (uint256)",
  
  // Deposit functions
  "function deposit(uint96 amount, address receiver) payable returns (uint256)",
  "function mint(uint96 shares, address receiver) payable returns (uint256)",
  
  // Unlock/Redeem functions (async)
  "function requestUnlock(uint96 shares) returns (uint256)", 
  "function redeem(uint256 unlockIndex, address receiver) returns (uint256)",
  "function cancelUnlockRequest(uint256 unlockIndex)",
  
  // Unlock info
  "function getUserUnlockRequests(address user) view returns (tuple(uint256 unlockIndex, uint96 shares, bool claimed)[])",
  "function getUnlockRequest(uint256 unlockIndex) view returns (uint96 shares, bool ready, address owner)",
] as const;
