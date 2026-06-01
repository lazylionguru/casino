import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { sepolia, hardhat } from "wagmi/chains";

export const wagmiConfig = getDefaultConfig({
  appName: "CryptoCasino Testnet",
  projectId: "2f539a7b7145a3e379a58dc2a9ba8b21", // public demo key - fine for testnet
  chains: [sepolia, hardhat],
  ssr: false,
});

// Contract ABIs
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

// Use public Sepolia RPC for getLogs — avoids Alchemy rate limits
export const PUBLIC_RPC = "https://ethereum-sepolia-rpc.publicnode.com";