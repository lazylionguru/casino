import { useState, useEffect, useCallback } from "react";
import { usePublicClient, useAccount } from "wagmi";
import { parseAbiItem, formatEther } from "viem";
import contractAddresses from "../config/contracts.json";

const SLOT_SYMBOLS = ["🍒", "🍋", "🍊", "🍇", "🔔", "7️⃣"];

// Targeted ABI items — getLogs is much more reliable with explicit event ABIs
const EVENTS = [
  {
    name: "Coin Flip",
    abi: parseAbiItem("event CoinflipResult(uint256 indexed requestId, address indexed player, uint256 bet, bool won, uint256 roll, uint256 payout)"),
    detail: (a) => `Landed ${a.roll === 0n ? "Heads" : "Tails"}`,
    won: (a) => a.payout > 0n,
    payout: (a) => a.payout,
  },
  {
    name: "Dice Roll",
    abi: parseAbiItem("event DiceResult(uint256 indexed requestId, address indexed player, uint256 bet, bool won, uint256 roll, uint256 target, uint256 payout)"),
    detail: (a) => `Rolled ${a.roll} (needed < ${a.target})`,
    won: (a) => a.payout > 0n,
    payout: (a) => a.payout,
  },
  {
    name: "Crash",
    abi: parseAbiItem("event CrashResult(uint256 indexed requestId, address indexed player, uint256 bet, bool won, uint256 crashPoint, uint256 cashoutAt, uint256 payout)"),
    detail: (a) => `Crashed @ ${(Number(a.crashPoint) / 100).toFixed(2)}× (target ${(Number(a.cashoutAt) / 100).toFixed(2)}×)`,
    won: (a) => a.payout > 0n,
    payout: (a) => a.payout,
  },
  {
    name: "Slots",
    abi: parseAbiItem("event SlotsResult(uint256 indexed requestId, address indexed player, uint256 bet, uint8[3] reels, uint256 payout)"),
    detail: (a) => `${a.reels.map(r => SLOT_SYMBOLS[Number(r)]).join(" ")}`,
    won: (a) => a.payout > 0n,
    payout: (a) => a.payout,
  },
];

const GAME_ICONS = { "Coin Flip": "🪙", "Dice Roll": "🎲", "Crash": "📈", "Slots": "🎰" };

export function useBetHistory() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchHistory = useCallback(async () => {
    if (!address || !publicClient) return;
    setLoading(true);

    try {
      const toBlock = await publicClient.getBlockNumber();
      const fromBlock = toBlock > 50000n ? toBlock - 50000n : 0n;
      const allBets = [];

      for (const event of EVENTS) {
        try {
          const logs = await publicClient.getLogs({
            address: contractAddresses.CasinoGames,
            event: event.abi,
            args: { player: address }, // filter by player address directly
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
              icon: GAME_ICONS[event.name],
              bet: a.bet,
              won: event.won(a),
              payout: event.payout(a),
              detail: event.detail(a),
            });
          }
        } catch (err) {
          console.warn(`Failed to fetch ${event.name} history:`, err.message);
        }
      }

      allBets.sort((a, b) => Number(b.blockNumber) - Number(a.blockNumber));
      setHistory(allBets);
    } catch (err) {
      console.error("Failed to fetch bet history:", err);
    } finally {
      setLoading(false);
    }
  }, [address, publicClient]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  return { history, loading, refetch: fetchHistory };
}