export const kintsuStakedMonadAbi = [
  {
    "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "shares", "type": "uint256"}],
    "name": "convertToAssets",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "uint96", "name": "amount", "type": "uint96"},
      {"internalType": "address", "name": "receiver", "type": "address"}
    ],
    "name": "deposit",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint96", "name": "shares", "type": "uint96"}],
    "name": "requestUnlock",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "uint256", "name": "unlockIndex", "type": "uint256"},
      {"internalType": "address", "name": "receiver", "type": "address"}
    ],
    "name": "redeem",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "user", "type": "address"}],
    "name": "getUserUnlockRequests",
    "outputs": [
      {
        "components": [
          {"internalType": "uint256", "name": "unlockIndex", "type": "uint256"},
          {"internalType": "uint96", "name": "shares", "type": "uint96"},
          {"internalType": "bool", "name": "claimed", "type": "bool"}
        ],
        "internalType": "struct UnlockRequest[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  // View functions
  {
    "inputs": [{"internalType":"address","name":"account","type":"address"}],
    "name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],
    "stateMutability":"view","type":"function"
  },
  // ... other existing entries ...
  {
    "inputs":[{"internalType":"uint96","name":"assets","type":"uint96"},{"internalType":"address","name":"receiver","type":"address"}],
    "name":"deposit","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],
    "stateMutability":"payable","type":"function"
  },
  {
    "inputs":[{"internalType":"uint96","name":"shares","type":"uint96"},{"internalType":"address","name":"receiver","type":"address"}],
    "name":"mint","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],
    "stateMutability":"payable","type":"function"
  },
  {
    "inputs":[{"internalType":"uint96","name":"shares","type":"uint96"}],
    "name":"requestUnlock","outputs":[],"stateMutability":"nonpayable","type":"function"
  },
  {
    "inputs":[{"internalType":"uint256","name":"unlockIndex","type":"uint256"},{"internalType":"address","name":"receiver","type":"address"}],
    "name":"redeem","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],
    "stateMutability":"nonpayable","type":"function"
  },
  {
    "inputs":[{"internalType":"uint256","name":"unlockIndex","type":"uint256"}],
    "name":"cancelUnlockRequest","outputs":[],"stateMutability":"nonpayable","type":"function"
  },

  // *NEW* ERC-20 approve
  {
    "inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],
    "name":"approve","outputs":[{"internalType":"bool","name":"","type":"bool"}],
    "stateMutability":"nonpayable","type":"function"
  },

  // Optional: balanceOf allowance if needed
  {
    "inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"address","name":"spender","type":"address"}],
    "name":"allowance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],
    "stateMutability":"view","type":"function"
  }
] as const;
