import { useReadContract, useWriteContract, usePublicClient, useAccount } from "wagmi";
import { parseAbi, parseAbiItem } from "viem";
import { POOL_ABI, GAMES_ABI } from "../config/wagmi";
import contractAddresses from "../config/contracts.json";

export function usePoolStats() {
  const { address } = useAccount();

  const { data: poolBalance, refetch: refetchBalance } = useReadContract({
    address: contractAddresses.CasinoPool,
    abi: parseAbi(POOL_ABI),
    functionName: "poolBalance",
  });

  const { data: maxBet, refetch: refetchMax } = useReadContract({
    address: contractAddresses.CasinoPool,
    abi: parseAbi(POOL_ABI),
    functionName: "maxBet",
  });

  const { data: myShares } = useReadContract({
    address: contractAddresses.CasinoPool,
    abi: parseAbi(POOL_ABI),
    functionName: "shares",
    args: [address || "0x0000000000000000000000000000000000000000"],
  });

  const { data: myShareValue } = useReadContract({
    address: contractAddresses.CasinoPool,
    abi: parseAbi(POOL_ABI),
    functionName: "shareValue",
    args: [address || "0x0000000000000000000000000000000000000000"],
  });

  const { data: totalShares } = useReadContract({
    address: contractAddresses.CasinoPool,
    abi: parseAbi(POOL_ABI),
    functionName: "totalShares",
  });

  const refetch = () => { refetchBalance(); refetchMax(); };
  return { poolBalance, maxBet, myShares, myShareValue, totalShares, refetch };
}

export function useGamesStats() {
  const { data: totalBets } = useReadContract({
    address: contractAddresses.CasinoGames,
    abi: parseAbi(GAMES_ABI),
    functionName: "totalBets",
  });

  const { data: totalPaidOut } = useReadContract({
    address: contractAddresses.CasinoGames,
    abi: parseAbi(GAMES_ABI),
    functionName: "totalPaidOut",
  });

  return { totalBets, totalPaidOut };
}

// ABI items for each result event — used for targeted log filtering
const RESULT_EVENT_ABIS = {
  CoinflipResult: parseAbiItem("event CoinflipResult(uint256 indexed requestId, address indexed player, uint256 bet, bool won, uint256 roll, uint256 payout)"),
  DiceResult:     parseAbiItem("event DiceResult(uint256 indexed requestId, address indexed player, uint256 bet, bool won, uint256 roll, uint256 target, uint256 payout)"),
  CrashResult:    parseAbiItem("event CrashResult(uint256 indexed requestId, address indexed player, uint256 bet, bool won, uint256 crashPoint, uint256 cashoutAt, uint256 payout)"),
  SlotsResult:    parseAbiItem("event SlotsResult(uint256 indexed requestId, address indexed player, uint256 bet, uint8[3] reels, uint256 payout)"),
};

/**
 * Play a game and wait for the VRF callback result event.
 *
 * VRF delivers the result in a SEPARATE transaction (~30-90s on Sepolia).
 * Flow:
 *   1. Send bet tx → get requestId from BetPlaced event
 *   2. Poll for the result event matching that requestId every 3s
 *   3. Call onResult when found (timeout: 3 min)
 */
export function usePlayGame(eventName, onResult) {
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  const play = async ({ functionName, args, value }) => {
    // Step 1: send bet tx
    const hash = await writeContractAsync({
      address: contractAddresses.CasinoGames,
      abi: parseAbi(GAMES_ABI),
      functionName,
      args,
      value,
    });

    // Step 2: wait for confirmation, extract requestId
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

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

    if (requestId === null) throw new Error("Could not find requestId in bet tx");

    // Step 3: poll for result event using targeted filter (much more reliable)
    const eventAbi = RESULT_EVENT_ABIS[eventName];
    const fromBlock = receipt.blockNumber;
    const deadline = Date.now() + 3 * 60 * 1000; // 3 min

    return new Promise((resolve, reject) => {
      const poll = async () => {
        if (Date.now() > deadline) {
          reject(new Error("VRF timeout — result may still arrive, check history"));
          return;
        }

        try {
          const toBlock = await publicClient.getBlockNumber();

          // Use targeted event filter — much faster than fetching all logs
          const logs = await publicClient.getLogs({
            address: contractAddresses.CasinoGames,
            event: eventAbi,
            fromBlock,
            toBlock,
          });

          for (const log of logs) {
            // Match on requestId (first indexed param)
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