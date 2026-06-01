import { useState, useRef } from "react";
import { usePoolStats } from "../hooks/useContracts";
import { usePlayAndWatch } from "../hooks/usePlayAndWatch";
import BetPanel from "../components/BetPanel";
import ResultBanner from "../components/ResultBanner";
import BetHistory from "../components/BetHistory";

export default function Coinflip() {
  const [choice, setChoice] = useState(0);
  const [flipping, setFlipping] = useState(false);
  const historyRefetch = useRef(null);
  const { maxBet, refetch: refetchPool } = usePoolStats();
  const { loading, result, clearResult, placeBet } = usePlayAndWatch("CoinflipResult");

  // When result arrives, stop animation and refresh
  if (result?.found && flipping) {
    setFlipping(false);
    refetchPool();
    if (historyRefetch.current) historyRefetch.current();
  }

  const banner = result?.found ? {
    won: result.payout > 0n,
    payout: result.payout,
    detail: `Coin landed: ${Number(result.roll) === 0 ? "Heads" : "Tails"}`,
  } : result?.timeout ? {
    won: false, payout: 0n, detail: result.detail,
  } : null;

  const handleBet = async (betWei) => {
    setFlipping(true);
    await placeBet({ functionName: "playCoinflip", args: [BigInt(choice)], value: betWei });
    setFlipping(false);
  };

  return (
    <div style={{ maxWidth: 700 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: "var(--font-head)", fontSize: 44, letterSpacing: 3, color: "var(--gold)" }}>COIN FLIP</h1>
        <p style={{ color: "var(--muted)", marginTop: 6 }}>Heads or tails — 1.96× payout on a win. House edge: 2%.</p>
      </div>

      <div style={{ display: "flex", justifyContent: "center", marginBottom: 32 }}>
        <div style={{
          width: 140, height: 140, borderRadius: "50%",
          background: "radial-gradient(circle at 35% 35%, var(--gold2), var(--gold), #b8760a)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 56, boxShadow: "0 8px 32px rgba(245,166,35,0.3)",
          animation: flipping ? "spin 0.4s linear infinite" : "none",
        }}>
          {choice === 0 ? "H" : "T"}
        </div>
      </div>

      <div className="card">
        <BetPanel onBet={handleBet} maxBet={maxBet} loading={loading}>
          <div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 10 }}>YOUR PICK</div>
            <div style={{ display: "flex", gap: 12 }}>
              {[{ label: "🪙 Heads", val: 0 }, { label: "🔄 Tails", val: 1 }].map(({ label, val }) => (
                <button key={val} onClick={() => !loading && setChoice(val)} style={{
                  flex: 1, padding: "14px",
                  background: choice === val ? "rgba(245,166,35,0.12)" : "var(--bg3)",
                  color: choice === val ? "var(--gold)" : "var(--muted)",
                  border: `2px solid ${choice === val ? "var(--gold)" : "var(--border)"}`,
                  borderRadius: 8, fontSize: 15, fontWeight: 600,
                }}>{label}</button>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 16px", background: "var(--bg3)", borderRadius: 8, fontSize: 13, color: "var(--muted)" }}>
            <span>Win chance</span><span className="mono" style={{ color: "var(--blue)" }}>48%</span>
            <span>Payout</span><span className="mono" style={{ color: "var(--green)" }}>1.96×</span>
          </div>
        </BetPanel>
      </div>

      {banner && <div style={{ marginTop: 20 }}><ResultBanner result={banner} onDismiss={clearResult} /></div>}
      <BetHistory onNewBet={historyRefetch} />
    </div>
  );
}