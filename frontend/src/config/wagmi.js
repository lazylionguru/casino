import { createConfig, http } from "wagmi";
import { sepolia, hardhat } from "wagmi/chains";
import { injected } from "wagmi/connectors";

// Simple config — MetaMask only, no WalletConnect
// This eliminates all the 403 errors from WalletConnect cloud
export const wagmiConfig = createConfig({
  chains: [sepolia, hardhat],
  connectors: [injected()], // MetaMask and other injected wallets
  transports: {
    [sepolia.id]: http("https://ethereum-sepolia-rpc.publicnode.com"),
    [hardhat.id]: http("http://127.0.0.1:8545"),
  },
});

export const POOL_ABI = [
  "function addLiquidity() external payable",
  "function removeLiquidity(uint256 shareAmount) external",
  "function poolBalance() external view returns (uint256)",
  "function maxBet() external view returns (uint256)",
  "function shares(address) external view returns (uint256)",
  "function totalShares() external view returns (uint256)",
  "function shareValue(address) external view returns (uint256)",
  "event LiquidityAdded(address indexed provider, uint256 ethAmount, uint256 sharesIssued)",
  "event LiquidityRemoved(address indexed provider, uint256 ethAmount, uint256 sharesBurned)",
];

export const GAMES_ABI = [
  "function playCoinflip(uint256 choice) external payable",
  "function playDice(uint256 target) external payable",
  "function playCrash(uint256 cashoutMultiplier) external payable",
  "function playSlots() external payable",
  "function totalBets() external view returns (uint256)",
  "function totalPaidOut() external view returns (uint256)",
  "event BetPlaced(uint256 indexed requestId, address indexed player, uint8 gameType, uint256 amount, uint256 param)",
  "event CoinflipResult(uint256 indexed requestId, address indexed player, uint256 bet, bool won, uint256 roll, uint256 payout)",
  "event DiceResult(uint256 indexed requestId, address indexed player, uint256 bet, bool won, uint256 roll, uint256 target, uint256 payout)",
  "event CrashResult(uint256 indexed requestId, address indexed player, uint256 bet, bool won, uint256 crashPoint, uint256 cashoutAt, uint256 payout)",
  "event SlotsResult(uint256 indexed requestId, address indexed player, uint256 bet, uint8[3] reels, uint256 payout)",
];