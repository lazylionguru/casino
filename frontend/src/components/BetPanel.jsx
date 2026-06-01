import { useState } from "react";
import { useAccount } from "wagmi";
import { parseEther, formatEther } from "viem";

const QUICK_BETS = ["0.001", "0.005", "0.01", "0.05"];

/**
 * BetPanel — shared bet amount UI for all games
 * Props:
 *   onBet(amountWei) — called when user confirms
 *   maxBet — bigint, max allowed
 *   loading — bool
 *   disabled — bool
 *   children — game-specific controls rendered below bet amount
 */
export default function BetPanel({ onBet, maxBet, loading, disabled, children, buttonLabel = "Place Bet" }) {
  const { isConnected } = useAccount();
  const [betStr, setBetStr] = useState("0.001");

  const betWei = (() => {
    try { return parseEther(betStr || "0"); } catch { return 0n; }
  })();

  const maxBetEth = maxBet ? parseFloat(formatEther(maxBet)).toFixed(4) : "...";
  const overMax = maxBet && betWei > maxBet;
  const tooLow = betWei < parseEther("0.0001");

  const isDisabled = !isConnected || loading || disabled || overMax || tooLow || betWei === 0n;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Bet amount */}
      <div>
        <div style={{
          display: "flex", justifyContent: "space-between",
          marginBottom: 8, fontSize: 12, color: "var(--muted)"
        }}>
          <span>BET AMOUNT (ETH)</span>
          <span>MAX: <span className="mono gold">{maxBetEth} ETH</span></span>
        </div>
        <input
          type="number"
          value={betStr}
          onChange={e => setBetStr(e.target.value)}
          min="0.0001"
          step="0.001"
          style={{ borderColor: overMax ? "var(--red)" : undefined }}
        />
        {overMax && <div style={{ fontSize: 12, color: "var(--red)", marginTop: 4 }}>Exceeds max bet</div>}
        {tooLow && betStr && <div style={{ fontSize: 12, color: "var(--red)", marginTop: 4 }}>Min bet: 0.0001 ETH</div>}

        {/* Quick bet buttons */}
        <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
          {QUICK_BETS.map(v => (
            <button
              key={v}
              onClick={() => setBetStr(v)}
              style={{
                flex: 1, padding: "6px 0", fontSize: 12,
                background: betStr === v ? "rgba(245,166,35,0.15)" : "var(--bg3)",
                color: betStr === v ? "var(--gold)" : "var(--muted)",
                border: `1px solid ${betStr === v ? "rgba(245,166,35,0.4)" : "var(--border)"}`,
                borderRadius: 6, fontFamily: "var(--font-mono)",
              }}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Game-specific controls */}
      {children}

      {/* Place bet button */}
      {!isConnected ? (
        <div style={{
          padding: "14px", textAlign: "center", background: "var(--bg3)",
          borderRadius: 8, color: "var(--muted)", fontSize: 14,
          border: "1px solid var(--border)",
        }}>
          Connect wallet to play
        </div>
      ) : (
        <button
          onClick={() => !isDisabled && onBet(betWei)}
          disabled={isDisabled}
          style={{
            padding: "14px",
            background: isDisabled ? "var(--bg3)" : "var(--gold)",
            color: isDisabled ? "var(--muted)" : "#000",
            borderRadius: 8,
            fontWeight: 700,
            fontSize: 16,
            fontFamily: "var(--font-head)",
            letterSpacing: 1,
            opacity: isDisabled ? 0.6 : 1,
            cursor: isDisabled ? "not-allowed" : "pointer",
            position: "relative",
          }}
        >
          {loading ? (
            <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <span className="animate-spin" style={{
                width: 16, height: 16, border: "2px solid #00000040",
                borderTopColor: "#000", borderRadius: "50%", display: "inline-block"
              }} />
              Waiting for result...
            </span>
          ) : buttonLabel}
        </button>
      )}
    </div>
  );
}
