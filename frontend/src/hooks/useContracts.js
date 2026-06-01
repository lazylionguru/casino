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
 * Play a game and wait for VRF callback.
 *
 * VRF delivers the result in a SEPARATE transaction from the bet tx.
 * So we:
 *   1. Send the bet tx and get the requestId from the BetPlaced event
 *   2. Poll contract logs every 3s until we see the result event matching that requestId
 *   3. Call onResult with the decoded event
 *
 * Timeout: 3 minutes (VRF on Sepolia is usually 30-90 seconds)
 */
export function usePlayGame(eventName, onResult) {
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  const play = async ({ functionName, args, value }) => {
    // Step 1: send bet transaction
    const hash = await writeContractAsync({
      address: contractAddresses.CasinoGames,
      abi: parseAbi(GAMES_ABI),
      functionName,
      args,
      value,
    });

    // Step 2: wait for bet tx to confirm and extract requestId
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

    if (!requestId) {
      throw new Error("Could not find requestId in bet transaction");
    }

    // Step 3: poll for the result event matching this requestId
    // VRF callback comes in a separate tx, so we watch contract logs
    const fromBlock = receipt.blockNumber;
    const deadline = Date.now() + 3 * 60 * 1000; // 3 min timeout

    return new Promise((resolve, reject) => {
      const poll = async () => {
        if (Date.now() > deadline) {
          reject(new Error("VRF timeout — result may still arrive, refresh to check history"));
          return;
        }

        try {
          const toBlock = await publicClient.getBlockNumber();
          const logs = await publicClient.getLogs({
            address: contractAddresses.CasinoGames,
            fromBlock: fromBlock,
            toBlock: toBlock,
          });

          for (const log of logs) {
            try {
              const decoded = publicClient.decodeEventLog({
                abi: parseAbi(GAMES_ABI),
                eventName,
                data: log.data,
                topics: log.topics,
              });
              // Match on requestId
              if (decoded.requestId === requestId) {
                onResult && onResult({ ...decoded, hash });
                resolve({ hash, receipt, decoded });
                return;
              }
            } catch {}
          }
        } catch {}

        // Not found yet, poll again in 3s
        setTimeout(poll, 3000);
      };

      poll();
    });
  };

  return play;
}
