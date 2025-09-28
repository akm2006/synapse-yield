// src/lib/abis/magma.ts
export const magmaStakeManagerAbi = [
  // View functions
  "function totalValueLocked() view returns (uint256)",
  "function calculateTVL() view returns (uint256)",
  "function maxDepositTVL() view returns (uint256)",
  "function paused() view returns (bool)",
  "function gMON() view returns (address)",
  
  // Stake/Unstake functions
  "function depositMon() payable",
  "function depositMon(uint256 _referralId) payable", 
  "function withdrawMon(uint256 amount)",
  
  // Events
  "event Deposit(address indexed depositor, uint256 indexed amount, uint256 gMonMinted, uint256 indexed referralId)",
  "event Withdraw(address indexed withdrawer, uint256 indexed amount, uint256 gMonBurned)",
] as const;

export const gMonTokenAbi = [
  // Standard ERC-20
  "function balanceOf(address account) view returns (uint256)",
  "function totalSupply() view returns (uint256)",
  "function transfer(address to, uint256 value) returns (bool)",
  "function approve(address spender, uint256 value) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function transferFrom(address from, address to, uint256 value) returns (bool)",
  
  // Metadata
  "function name() view returns (string)",
  "function symbol() view returns (string)", 
  "function decimals() view returns (uint8)",
  
  // Events
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)",
] as const;
