import { useState, useEffect, useCallback } from "react";
import { usePublicClient, useAccount } from "wagmi";
import { parseAbi, formatEther } from "viem";
import { GAMES_ABI } from "../config/wagmi";
import contractAddresses from "../config/contracts.json";

const GAME_EVENTS = [
  "CoinflipResult",
  "DiceResult",
  "CrashResult",
  "SlotsResult",
];

const GAME_LABELS = {
  CoinflipResult: "Coin Flip",
  DiceResult:     "Dice Roll",
  CrashResult:    "Crash",
  SlotsResult:    "Slots",
};

const SLOT_SYMBOLS = ["🍒", "🍋", "🍊", "🍇", "🔔", "7️⃣"];

function formatDetail(eventName, decoded) {
  if (eventName === "CoinflipResult") {
    return `Picked ${decoded.roll === 0n ? "Heads" : "Tails"}`;
  }
  if (eventName === "DiceResult") {
    return `Rolled ${decoded.roll} (target < ${decoded.target})`;
  }
  if (eventName === "CrashResult") {
    return `Crashed @ ${(Number(decoded.crashPoint) / 100).toFixed(2)}× (target ${(Number(decoded.cashoutAt) / 100).toFixed(2)}×)`;
  }
  if (eventName === "SlotsResult") {
    const reels = decoded.reels.map(r => SLOT_SYMBOLS[Number(r)]).join(" ");
    return `Reels: ${reels}`;
  }
  return "";
}

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
      // Look back ~50000 blocks (~7 days on Sepolia)
      const fromBlock = toBlock > 50000n ? toBlock - 50000n : 0n;

      const allBets = [];

      for (const eventName of GAME_EVENTS) {
        try {
          const logs = await publicClient.getLogs({
            address: contractAddresses.CasinoGames,
            fromBlock,
            toBlock,
          });

          for (const log of logs) {
            try {
              const decoded = publicClient.decodeEventLog({
                abi: parseAbi(GAMES_ABI),
                eventName,
                data: log.data,
                topics: log.topics,
              });

              // Only show this player's bets
              if (decoded.player?.toLowerCase() !== address.toLowerCase()) continue;

              allBets.push({
                id: `${log.transactionHash}-${log.logIndex}`,
                txHash: log.transactionHash,
                blockNumber: log.blockNumber,
                game: GAME_LABELS[eventName],
                eventName,
                bet: decoded.bet,
                won: decoded.payout > 0n,
                payout: decoded.payout,
                detail: formatDetail(eventName, decoded),
              });
            } catch {}
          }
        } catch {}
      }

      // Sort newest first
      allBets.sort((a, b) => Number(b.blockNumber) - Number(a.blockNumber));
      setHistory(allBets);
    } catch (err) {
      console.error("Failed to fetch bet history:", err);
    } finally {
      setLoading(false);
    }
  }, [address, publicClient]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return { history, loading, refetch: fetchHistory };
}
