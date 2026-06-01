import { useReadContract, useWriteContract, usePublicClient, useAccount } from "wagmi";
import { createPublicClient, http, parseAbi, parseAbiItem } from "viem";
import { sepolia } from "wagmi/chains";
import { POOL_ABI, GAMES_ABI, PUBLIC_RPC } from "../config/wagmi";
import contractAddresses from "../config/contracts.json";

// Separate public client for event polling — avoids Alchemy rate limits
const publicLogClient = createPublicClient({
  chain: sepolia,
  transport: http(PUBLIC_RPC),
});

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

const RESULT_EVENT_ABIS = {
  CoinflipResult: parseAbiItem("event CoinflipResult(uint256 indexed requestId, address indexed player, uint256 bet, bool won, uint256 roll, uint256 payout)"),
  DiceResult:     parseAbiItem("event DiceResult(uint256 indexed requestId, address indexed player, uint256 bet, bool won, uint256 roll, uint256 target, uint256 payout)"),
  CrashResult:    parseAbiItem("event CrashResult(uint256 indexed requestId, address indexed player, uint256 bet, bool won, uint256 crashPoint, uint256 cashoutAt, uint256 payout)"),
  SlotsResult:    parseAbiItem("event SlotsResult(uint256 indexed requestId, address indexed player, uint256 bet, uint8[3] reels, uint256 payout)"),
};

export function usePlayGame(eventName, onResult) {
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  const play = async ({ functionName, args, value }) => {
    // Send bet tx via MetaMask
    const hash = await writeContractAsync({
      address: contractAddresses.CasinoGames,
      abi: parseAbi(GAMES_ABI),
      functionName,
      args,
      value,
    });

    // Wait for bet tx confirmation
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

    if (requestId === null) throw new Error("Could not find requestId in bet tx");

    // Poll for result event using PUBLIC RPC (no rate limits)
    const eventAbi = RESULT_EVENT_ABIS[eventName];
    const fromBlock = receipt.blockNumber;
    const deadline = Date.now() + 3 * 60 * 1000;

    return new Promise((resolve, reject) => {
      const poll = async () => {
        if (Date.now() > deadline) {
          reject(new Error("VRF timeout — result may still arrive, check history"));
          return;
        }

        try {
          const toBlock = await publicLogClient.getBlockNumber();
          const logs = await publicLogClient.getLogs({
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