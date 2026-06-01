import { useReadContract, useWriteContract, usePublicClient, useAccount } from "wagmi";
import { parseAbi } from "viem";
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

/**
 * Returns a function to call any game.
 * onResult(result) called when the bet is resolved via event.
 */
export function usePlayGame(eventName, onResult) {
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  const play = async ({ functionName, args, value }) => {
    const hash = await writeContractAsync({
      address: contractAddresses.CasinoGames,
      abi: parseAbi(GAMES_ABI),
      functionName,
      args,
      value,
    });

    // Wait for tx + event
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    // Parse logs for the result event
    const abiItem = parseAbi(GAMES_ABI).find(i => i.type === "event" && i.name === eventName);
    if (!abiItem) return { hash, receipt };

    for (const log of receipt.logs) {
      try {
        const decoded = publicClient.decodeEventLog({
          abi: parseAbi(GAMES_ABI),
          eventName,
          data: log.data,
          topics: log.topics,
        });
        onResult && onResult({ ...decoded, hash });
        return { hash, receipt, decoded };
      } catch {}
    }

    return { hash, receipt };
  };

  return play;
}
