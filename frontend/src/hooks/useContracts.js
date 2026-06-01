import { useWriteContract, usePublicClient, useAccount } from "wagmi";
import { createPublicClient, http, parseAbi, parseAbiItem } from "viem";
import { sepolia } from "wagmi/chains";
import { POOL_ABI, GAMES_ABI } from "../config/wagmi";
import contractAddresses from "../config/contracts.json";
import { useState, useEffect, useCallback } from "react";

// Standalone public client — completely independent of wagmi/RainbowKit
// This is what we use for ALL reads and event polling
const rpcClient = createPublicClient({
  chain: sepolia,
  transport: http("https://ethereum-sepolia-rpc.publicnode.com"),
});

// ─── Pool Stats ──────────────────────────────────────────────────────────────

export function usePoolStats() {
  const { address } = useAccount();
  const [poolBalance, setPoolBalance] = useState(null);
  const [maxBet, setMaxBet]           = useState(null);
  const [myShares, setMyShares]       = useState(null);
  const [myShareValue, setMyShareValue] = useState(null);
  const [totalShares, setTotalShares] = useState(null);

  const fetch = useCallback(async () => {
    try {
      const [bal, max, total] = await Promise.all([
        rpcClient.readContract({ address: contractAddresses.CasinoPool, abi: parseAbi(POOL_ABI), functionName: "poolBalance" }),
        rpcClient.readContract({ address: contractAddresses.CasinoPool, abi: parseAbi(POOL_ABI), functionName: "maxBet" }),
        rpcClient.readContract({ address: contractAddresses.CasinoPool, abi: parseAbi(POOL_ABI), functionName: "totalShares" }),
      ]);
      setPoolBalance(bal);
      setMaxBet(max);
      setTotalShares(total);

      if (address) {
        const [sh, sv] = await Promise.all([
          rpcClient.readContract({ address: contractAddresses.CasinoPool, abi: parseAbi(POOL_ABI), functionName: "shares", args: [address] }),
          rpcClient.readContract({ address: contractAddresses.CasinoPool, abi: parseAbi(POOL_ABI), functionName: "shareValue", args: [address] }),
        ]);
        setMyShares(sh);
        setMyShareValue(sv);
      }
    } catch (err) {
      console.error("Pool stats error:", err.message);
    }
  }, [address]);

  useEffect(() => { fetch(); }, [fetch]);

  return { poolBalance, maxBet, myShares, myShareValue, totalShares, refetch: fetch };
}

// ─── Games Stats ─────────────────────────────────────────────────────────────

export function useGamesStats() {
  const [totalBets, setTotalBets]     = useState(null);
  const [totalPaidOut, setTotalPaidOut] = useState(null);

  useEffect(() => {
    rpcClient.readContract({ address: contractAddresses.CasinoGames, abi: parseAbi(GAMES_ABI), functionName: "totalBets" })
      .then(setTotalBets).catch(console.error);
    rpcClient.readContract({ address: contractAddresses.CasinoGames, abi: parseAbi(GAMES_ABI), functionName: "totalPaidOut" })
      .then(setTotalPaidOut).catch(console.error);
  }, []);

  return { totalBets, totalPaidOut };
}

// ─── Play Game ───────────────────────────────────────────────────────────────

const RESULT_EVENTS = {
  CoinflipResult: parseAbiItem("event CoinflipResult(uint256 indexed requestId, address indexed player, uint256 bet, bool won, uint256 roll, uint256 payout)"),
  DiceResult:     parseAbiItem("event DiceResult(uint256 indexed requestId, address indexed player, uint256 bet, bool won, uint256 roll, uint256 target, uint256 payout)"),
  CrashResult:    parseAbiItem("event CrashResult(uint256 indexed requestId, address indexed player, uint256 bet, bool won, uint256 crashPoint, uint256 cashoutAt, uint256 payout)"),
  SlotsResult:    parseAbiItem("event SlotsResult(uint256 indexed requestId, address indexed player, uint256 bet, uint8[3] reels, uint256 payout)"),
};

export function usePlayGame(eventName, onResult) {
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient(); // only used for tx confirmation

  const play = async ({ functionName, args, value }) => {
    // Send tx via MetaMask (needs wagmi for signing)
    const hash = await writeContractAsync({
      address: contractAddresses.CasinoGames,
      abi: parseAbi(GAMES_ABI),
      functionName,
      args,
      value,
    });

    // Wait for confirmation using MetaMask's provider
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    // Extract requestId from BetPlaced event
    let requestId = null;
    for (const log of receipt.logs) {
      try {
        const decoded = publicClient.decodeEventLog({
          abi: parseAbi(GAMES_ABI),
          eventName: "BetPlaced",
          data: log.data,
          topics: log.topics,
        });
        requestId = decoded.requestId;
        break;
      } catch {}
    }

    if (requestId === null) throw new Error("Could not find requestId");

    // Poll for VRF result using PUBLIC client — no rate limits
    const eventAbi = RESULT_EVENTS[eventName];
    const fromBlock = receipt.blockNumber;
    const deadline = Date.now() + 3 * 60 * 1000;

    return new Promise((resolve, reject) => {
      const poll = async () => {
        if (Date.now() > deadline) {
          reject(new Error("VRF timeout — check history for result"));
          return;
        }
        try {
          const toBlock = await rpcClient.getBlockNumber();
          const logs = await rpcClient.getLogs({
            address: contractAddresses.CasinoGames,
            event: eventAbi,
            fromBlock,
            toBlock,
          });
          for (const log of logs) {
            if (log.args?.requestId === requestId) {
              onResult && onResult({ ...log.args, hash });
              resolve({ hash, receipt, decoded: log.args });
              return;
            }
          }
        } catch (err) {
          console.warn("Poll error:", err.message);
        }
        setTimeout(poll, 3000);
      };
      poll();
    });
  };

  return play;
}