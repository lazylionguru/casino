import { useState, useEffect, useRef } from "react";
import { usePoolStats } from "../hooks/useContracts";
import { usePlayAndWatch } from "../hooks/usePlayAndWatch";
import BetPanel from "../components/BetPanel";
import ResultBanner from "../components/ResultBanner";
import BetHistory from "../components/BetHistory";

const SYMBOLS = ["🍒", "🍋", "🍊", "🍇", "🔔", "7️⃣"];
const PAYOUTS = [
  { match: "3× Seven", mult: "100×", color: "#f5a623" },
  { match: "3× Bell",  mult: "20×",  color: "#ffd166" },
  { match: "3× Grape", mult: "10×",  color: "#e040fb" },
  { match: "3× Orange",mult: "5×",   color: "#ff9800" },
  { match: "3× Lemon", mult: "3×",   color: "#cddc39" },
  { match: "3× Cherry",mult: "2×",   color: "#ff4081" },
  { match: "2× Seven", mult: "1.5×", color: "var(--muted)" },
  { match: "2× Bell",  mult: "1.2×", color: "var(--muted)" },
  { match: "2× Cherry",mult: "1.5×", color: "var(--muted)" },
];

function Reel({ symbol, spinning }) {
  const [spinSymbol, setSpinSymbol] = useState(symbol);
  const intervalRef = useRef(null);
  useEffect(() => {
    if (spinning) {
      intervalRef.current = setInterval(() => setSpinSymbol(SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]), 80);
    } else {
      clearInterval(intervalRef.current);
      setSpinSymbol(symbol);
    }
    return () => clearInterval(intervalRef.current);
  }, [spinning, symbol]);
  return (
    <div style={{ width: 110, height: 110, background: "var(--bg3)", border: "2px solid var(--border)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 56 }}>
      {spinSymbol}
    </div>
  );
}

export default function Slots() {
  const historyRefetch = useRef(null);
  const { maxBet, refetch: refetchPool } = usePoolStats();
  const { loading, result, clearResult, placeBet } = usePlayAndWatch("SlotsResult");

  const reels = result?.found ? Array.from(result.reels).map(Number) : [0, 1, 2];

  if (result?.found) {
    refetchPool();
    if (historyRefetch.current) historyRefetch.current();
  }

  const banner = result?.found ? {
    won: result.payout > 0n,
    payout: result.payout,
    detail: `${reels.map(i => SYMBOLS[i]).join(" ")}`,
  } : result?.timeout ? { won: false, payout: 0n, detail: result.detail } : null;

  const handleBet = async (betWei) => {
    await placeBet({ functionName: "playSlots", args: [], value: betWei });
  };

  return (
    <div style={{ maxWidth: 700 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: "var(--font-head)", fontSize: 44, letterSpacing: 3, color: "#e040fb" }}>SLOTS</h1>
        <p style={{ color: "var(--muted)", marginTop: 6 }}>Spin 3 reels. Match symbols for big payouts.</p>
      </div>
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "32px", marginBottom: 24, textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", gap: 16, marginBottom: 24 }}>
          {[0, 1, 2].map(i => <Reel key={i} symbol={SYMBOLS[reels[i]]} spinning={loading} />)}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px 16px", maxWidth: 360, margin: "0 auto" }}>
          {PAYOUTS.map(({ match, mult, color }) => (
            <div key={match} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "3px 0", borderBottom: "1px solid var(--border)" }}>
              <span style={{ color: "var(--muted)" }}>{match}</span>
              <span style={{ color, fontFamily: "var(--font-mono)" }}>{mult}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="card">
        <BetPanel onBet={handleBet} maxBet={maxBet} loading={loading} buttonLabel="🎰  SPIN" />
      </div>
      {banner && <div style={{ marginTop: 20 }}><ResultBanner result={banner} onDismiss={clearResult} /></div>}
      <BetHistory onNewBet={historyRefetch} />
    </div>
  );
}