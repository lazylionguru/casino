import { useWriteContract, usePublicClient } from "wagmi";
import { createPublicClient, http, parseAbi, parseAbiItem } from "viem";
import { sepolia } from "wagmi/chains";
import { useState, useRef } from "react";
import { GAMES_ABI } from "../config/wagmi";
import contractAddresses from "../config/contracts.json";

const rpcClient = createPublicClient({
  chain: sepolia,
  transport: http("https://ethereum-sepolia-rpc.publicnode.com"),
});

const RESULT_EVENTS = {
  CoinflipResult: parseAbiItem("event CoinflipResult(uint256 indexed requestId, address indexed player, uint256 bet, bool won, uint256 roll, uint256 payout)"),
  DiceResult:     parseAbiItem("event DiceResult(uint256 indexed requestId, address indexed player, uint256 bet, bool won, uint256 roll, uint256 target, uint256 payout)"),
  CrashResult:    parseAbiItem("event CrashResult(uint256 indexed requestId, address indexed player, uint256 bet, bool won, uint256 crashPoint, uint256 cashoutAt, uint256 payout)"),
  SlotsResult:    parseAbiItem("event SlotsResult(uint256 indexed requestId, address indexed player, uint256 bet, uint8[3] reels, uint256 payout)"),
};

/**
 * usePlayAndWatch
 *
 * Returns { loading, result, clearResult, placeBet }
 *
 * All state lives inside this hook — no callback needed.
 * This avoids stale closure issues entirely.
 */
export function usePlayAndWatch(eventName) {
  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState(null);
  const { writeContractAsync }  = useWriteContract();
  const publicClient            = usePublicClient();
  const pollRef                 = useRef(null);

  const clearResult = () => setResult(null);

  const placeBet = async ({ functionName, args, value }) => {
    // Cancel any previous poll
    if (pollRef.current) { clearTimeout(pollRef.current); pollRef.current = null; }

    setLoading(true);
    setResult(null);

    try {
      // 1. Send tx
      const hash = await writeContractAsync({
        address: contractAddresses.CasinoGames,
        abi: parseAbi(GAMES_ABI),
        functionName,
        args,
        value,
      });

      // 2. Wait for confirmation
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      // 3. Extract requestId
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

      if (!requestId) throw new Error("No requestId found");

      // 4. Poll for result — state setters are captured fresh each call
      const fromBlock = receipt.blockNumber;
      const deadline  = Date.now() + 3 * 60 * 1000;
      const eventAbi  = RESULT_EVENTS[eventName];

      const poll = async () => {
        if (Date.now() > deadline) {
          setLoading(false);
          setResult({ timeout: true, won: false, payout: 0n, detail: "VRF is taking long — check history in a minute" });
          return;
        }
        try {
          const toBlock = await rpcClient.getBlockNumber();
          const logs    = await rpcClient.getLogs({
            address: contractAddresses.CasinoGames,
            event: eventAbi,
            fromBlock,
            toBlock,
          });
          for (const log of logs) {
            if (log.args?.requestId === requestId) {
              // Found it — update state directly here, no callback needed
              setLoading(false);
              setResult({ ...log.args, hash, found: true });
              return;
            }
          }
        } catch (err) {
          console.warn("Poll:", err.message);
        }
        pollRef.current = setTimeout(poll, 5000);
      };

      poll();

    } catch (err) {
      setLoading(false);
      if (err.message?.includes("User rejected")) {
        setResult(null); // user cancelled, no error needed
      } else {
        console.error(err);
      }
    }
  };

  return { loading, result, clearResult, placeBet };
}