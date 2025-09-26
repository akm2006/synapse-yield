// Complete Protocol ABIs - Based on Kintsu documentation and ERC standards

// Kintsu StakedMonad Contract (sMON token - ERC20 + ERC4626-like)
export const kintsuAddress =
  "0xe1d2439b75fb9746E7Bc6cB777Ae10AA7f7ef9c5" as `0x${string}`;
export const kintsuAbi = [
  // === Core ERC4626-like Functions ===
  {
    inputs: [{ internalType: "uint96", name: "assets", type: "uint96" }],
    name: "convertToShares",
    outputs: [{ internalType: "uint96", name: "shares", type: "uint96" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint96", name: "shares", type: "uint96" }],
    name: "convertToAssets",
    outputs: [{ internalType: "uint96", name: "assets", type: "uint96" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint96", name: "assets", type: "uint96" }],
    name: "previewDeposit",
    outputs: [{ internalType: "uint96", name: "shares", type: "uint96" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint96", name: "shares", type: "uint96" }],
    name: "previewMint",
    outputs: [{ internalType: "uint96", name: "assets", type: "uint96" }],
    stateMutability: "view",
    type: "function",
  },

  // === Deposit/Mint Functions ===
  {
    inputs: [
      { internalType: "uint96", name: "assets", type: "uint96" },
      { internalType: "address", name: "receiver", type: "address" },
    ],
    name: "deposit",
    outputs: [{ internalType: "uint96", name: "shares", type: "uint96" }],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint96", name: "shares", type: "uint96" },
      { internalType: "address", name: "receiver", type: "address" },
    ],
    name: "mint",
    outputs: [{ internalType: "uint96", name: "assets", type: "uint96" }],
    stateMutability: "payable",
    type: "function",
  },

  // === Unlock/Redeem Functions ===
  {
    inputs: [{ internalType: "uint96", name: "shares", type: "uint96" }],
    name: "requestUnlock",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "unlockIndex", type: "uint256" },
      { internalType: "address payable", name: "receiver", type: "address" },
    ],
    name: "redeem",
    outputs: [{ internalType: "uint96", name: "assets", type: "uint96" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "unlockIndex", type: "uint256" }],
    name: "cancelUnlockRequest",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },

  // === Protocol State Functions ===
  {
    inputs: [],
    name: "totalShares",
    outputs: [{ internalType: "uint96", name: "", type: "uint96" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "mintableProtocolShares",
    outputs: [{ internalType: "uint96", name: "shares", type: "uint96" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "user", type: "address" }],
    name: "getAllUserUnlockRequests",
    outputs: [
      {
        components: [
          { internalType: "uint96", name: "shares", type: "uint96" },
          { internalType: "uint40", name: "batchId", type: "uint40" },
        ],
        internalType: "struct IStakedMonad.UnlockRequest[]",
        name: "",
        type: "tuple[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },

  // === Batch Management Functions ===
  {
    inputs: [{ internalType: "uint40[]", name: "batchIds", type: "uint40[]" }],
    name: "sendBatchUnlockRequests",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "timestamp", type: "uint256" }],
    name: "getBatchUnlockIdAtTime",
    outputs: [{ internalType: "uint40", name: "batchId", type: "uint40" }],
    stateMutability: "view",
    type: "function",
  },

  // === Protocol Operations ===
  {
    inputs: [],
    name: "compound",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "withdrawUnbonded",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },

  // === ERC20 Standard Functions ===
  {
    inputs: [{ internalType: "address", name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalSupply",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// Magma StakeManager Contract
export const magmaAddress =
  "0x2c9C959516e9AAEdB2C748224a41249202ca8BE7" as `0x${string}`;
export const magmaAbi = [
  // === TVL and Balance Functions ===
  {
    inputs: [],
    name: "calculateTVL",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalValueLocked",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "gMON",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },

  // === Staking Functions ===
  {
    inputs: [{ internalType: "address", name: "referrer", type: "address" }],
    name: "stake",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "amount", type: "uint256" }],
    name: "unstake",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },

  // === Reward Functions ===
  {
    inputs: [],
    name: "claimRewards",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "user", type: "address" }],
    name: "pendingRewards",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },

  // === User Info Functions ===
  {
    inputs: [{ internalType: "address", name: "user", type: "address" }],
    name: "getUserStake",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "user", type: "address" }],
    name: "getUserInfo",
    outputs: [
      { internalType: "uint256", name: "stake", type: "uint256" },
      { internalType: "uint256", name: "rewards", type: "uint256" },
      { internalType: "uint256", name: "lastUpdateTime", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

export const gMonAddress =
  "0xaEef2f6B429Cb59C9B2D7bB2141ADa993E8571c3" as `0x${string}`;

export const gMonAbi = [
  { inputs: [], stateMutability: "nonpayable", type: "constructor" },
  { inputs: [], name: "ContractPaused", type: "error" },
  {
    inputs: [
      { internalType: "address", name: "spender", type: "address" },
      { internalType: "uint256", name: "allowance", type: "uint256" },
      { internalType: "uint256", name: "needed", type: "uint256" },
    ],
    name: "ERC20InsufficientAllowance",
    type: "error",
  },
  {
    inputs: [
      { internalType: "address", name: "sender", type: "address" },
      { internalType: "uint256", name: "balance", type: "uint256" },
      { internalType: "uint256", name: "needed", type: "uint256" },
    ],
    name: "ERC20InsufficientBalance",
    type: "error",
  },
  {
    inputs: [{ internalType: "address", name: "approver", type: "address" }],
    name: "ERC20InvalidApprover",
    type: "error",
  },
  {
    inputs: [{ internalType: "address", name: "receiver", type: "address" }],
    name: "ERC20InvalidReceiver",
    type: "error",
  },
  {
    inputs: [{ internalType: "address", name: "sender", type: "address" }],
    name: "ERC20InvalidSender",
    type: "error",
  },
  {
    inputs: [{ internalType: "address", name: "spender", type: "address" }],
    name: "ERC20InvalidSpender",
    type: "error",
  },
  { inputs: [], name: "InvalidInitialization", type: "error" },
  { inputs: [], name: "InvalidZeroInput", type: "error" },
  { inputs: [], name: "NotGMonMinterBurner", type: "error" },
  { inputs: [], name: "NotInitializing", type: "error" },
  { inputs: [], name: "NotTokenAdmin", type: "error" },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "spender",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "value",
        type: "uint256",
      },
    ],
    name: "Approval",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint64",
        name: "version",
        type: "uint64",
      },
    ],
    name: "Initialized",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "from", type: "address" },
      { indexed: true, internalType: "address", name: "to", type: "address" },
      {
        indexed: false,
        internalType: "uint256",
        name: "value",
        type: "uint256",
      },
    ],
    name: "Transfer",
    type: "event",
  },
  {
    inputs: [
      { internalType: "address", name: "owner", type: "address" },
      { internalType: "address", name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "spender", type: "address" },
      { internalType: "uint256", name: "value", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "from", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "burn",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "contract IRoleManager",
        name: "_roleManager",
        type: "address",
      },
    ],
    name: "initialize",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "mint",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "name",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "paused",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "roleManager",
    outputs: [
      { internalType: "contract IRoleManager", name: "", type: "address" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "bool", name: "_paused", type: "bool" }],
    name: "setPaused",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalSupply",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "value", type: "uint256" },
    ],
    name: "transfer",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "from", type: "address" },
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "value", type: "uint256" },
    ],
    name: "transferFrom",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;
