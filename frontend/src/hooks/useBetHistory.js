import { useState, useEffect, useCallback } from "react";
import { useAccount } from "wagmi";
import { createPublicClient, http, parseAbiItem } from "viem";
import { sepolia } from "wagmi/chains";
import contractAddresses from "../config/contracts.json";

const rpcClient = createPublicClient({
  chain: sepolia,
  transport: http("https://ethereum-sepolia-rpc.publicnode.com"),
});

const SLOT_SYMBOLS = ["🍒", "🍋", "🍊", "🍇", "🔔", "7️⃣"];

const EVENTS = [
  {
    name: "Coin Flip", icon: "🪙",
    abi: parseAbiItem("event CoinflipResult(uint256 indexed requestId, address indexed player, uint256 bet, bool won, uint256 roll, uint256 payout)"),
    detail: (a) => `Landed ${Number(a.roll) === 0 ? "Heads" : "Tails"}`,
    won: (a) => a.payout > 0n,
    payout: (a) => a.payout,
  },
  {
    name: "Dice Roll", icon: "🎲",
    abi: parseAbiItem("event DiceResult(uint256 indexed requestId, address indexed player, uint256 bet, bool won, uint256 roll, uint256 target, uint256 payout)"),
    detail: (a) => `Rolled ${a.roll} (needed < ${a.target})`,
    won: (a) => a.payout > 0n,
    payout: (a) => a.payout,
  },
  {
    name: "Crash", icon: "📈",
    abi: parseAbiItem("event CrashResult(uint256 indexed requestId, address indexed player, uint256 bet, bool won, uint256 crashPoint, uint256 cashoutAt, uint256 payout)"),
    detail: (a) => `Crashed @ ${(Number(a.crashPoint)/100).toFixed(2)}× (target ${(Number(a.cashoutAt)/100).toFixed(2)}×)`,
    won: (a) => a.payout > 0n,
    payout: (a) => a.payout,
  },
  {
    name: "Slots", icon: "🎰",
    abi: parseAbiItem("event SlotsResult(uint256 indexed requestId, address indexed player, uint256 bet, uint8[3] reels, uint256 payout)"),
    detail: (a) => `${Array.from(a.reels).map(r => SLOT_SYMBOLS[Number(r)]).join(" ")}`,
    won: (a) => a.payout > 0n,
    payout: (a) => a.payout,
  },
];

export function useBetHistory() {
  const { address } = useAccount();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchHistory = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    setError(null);

    try {
      const toBlock = await rpcClient.getBlockNumber();
      const fromBlock = toBlock > 10000n ? toBlock - 10000n : 0n;
      const allBets = [];

      for (const event of EVENTS) {
        try {
          const logs = await rpcClient.getLogs({
            address: contractAddresses.CasinoGames,
            event: event.abi,
            args: { player: address },
            fromBlock,
            toBlock,
          });
          for (const log of logs) {
            const a = log.args;
            allBets.push({
              id: `${log.transactionHash}-${log.logIndex}`,
              txHash: log.transactionHash,
              blockNumber: log.blockNumber,
              game: event.name,
              icon: event.icon,
              bet: a.bet,
              won: event.won(a),
              payout: event.payout(a),
              detail: event.detail(a),
            });
          }
        } catch (err) {
          console.warn(`${event.name} history error:`, err.message);
        }
      }

      allBets.sort((a, b) => Number(b.blockNumber) - Number(a.blockNumber));
      setHistory(allBets);
    } catch (err) {
      console.error("History fetch failed:", err);
      setError("Failed to load history.");
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  return { history, loading, error, refetch: fetchHistory };
}