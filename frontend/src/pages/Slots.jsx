import { useState, useEffect, useRef } from "react";
import { usePoolStats, usePlayGame } from "../hooks/useContracts";
import BetPanel from "../components/BetPanel";
import ResultBanner from "../components/ResultBanner";

const SYMBOLS = ["🍒", "🍋", "🍊", "🍇", "🔔", "7️⃣"];
const SYMBOL_NAMES = ["Cherry", "Lemon", "Orange", "Grape", "Bell", "Seven"];

const PAYOUTS = [
  { match: "3× Seven",  mult: "100×", color: "#f5a623" },
  { match: "3× Bell",   mult: "20×",  color: "#ffd166" },
  { match: "3× Grape",  mult: "10×",  color: "#e040fb" },
  { match: "3× Orange", mult: "5×",   color: "#ff9800" },
  { match: "3× Lemon",  mult: "3×",   color: "#cddc39" },
  { match: "3× Cherry", mult: "2×",   color: "#ff4081" },
  { match: "2× Seven",  mult: "1.5×", color: "var(--muted)" },
  { match: "2× Bell",   mult: "1.2×", color: "var(--muted)" },
  { match: "2× Cherry", mult: "1.5×", color: "var(--muted)" },
];

function Reel({ symbol, spinning }) {
  const [spinSymbol, setSpinSymbol] = useState(symbol);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (spinning) {
      intervalRef.current = setInterval(() => {
        setSpinSymbol(SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]);
      }, 80);
    } else {
      clearInterval(intervalRef.current);
      setSpinSymbol(symbol);
    }
    return () => clearInterval(intervalRef.current);
  }, [spinning, symbol]);

  return (
    <div style={{
      width: 110, height: 110,
      background: "var(--bg3)",
      border: "2px solid var(--border)",
      borderRadius: 12,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 56,
      transition: spinning ? "none" : "all 0.3s",
      boxShadow: spinning ? "0 0 20px rgba(245,166,35,0.2)" : "none",
    }}>
      {spinSymbol}
    </div>
  );
}

export default function Slots() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [reels, setReels] = useState([0, 1, 2]);
  const [spinning, setSpinning] = useState(false);

  const { maxBet, refetch } = usePoolStats();

  const play = usePlayGame("SlotsResult", (decoded) => {
    const r = decoded.reels.map(Number);
    setReels(r);
    setSpinning(false);
    const payout = decoded.payout;
    const won = payout > 0n;
    const reelStr = r.map(i => SYMBOLS[i]).join(" ");
    setResult({
      won,
      payout,
      detail: `${reelStr} — ${won ? PAYOUTS.find(p => p.match.includes(SYMBOL_NAMES[r[0]])) ? "Match!" : "Win!" : "No match"}`,
    });
    setLoading(false);
    refetch();
  });

  const handleBet = async (betWei) => {
    try {
      setLoading(true);
      setResult(null);
      setSpinning(true);
      await play({
        functionName: "playSlots",
        args: [],
        value: betWei,
      });
    } catch (err) {
      console.error(err);
      setSpinning(false);
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 600 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{
          fontFamily: "var(--font-head)",
          fontSize: 44,
          letterSpacing: 3,
          color: "#e040fb",
        }}>SLOTS</h1>
        <p style={{ color: "var(--muted)", marginTop: 6 }}>
          Spin 3 reels. Match symbols for big payouts. House edge: 5%.
        </p>
      </div>

      {/* Slot machine */}
      <div style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: "32px",
        marginBottom: 24,
        textAlign: "center",
      }}>
        {/* Reels */}
        <div style={{ display: "flex", justifyContent: "center", gap: 16, marginBottom: 24 }}>
          {[0, 1, 2].map(i => (
            <Reel key={i} symbol={SYMBOLS[reels[i]]} spinning={spinning} />
          ))}
        </div>

        {/* Win line indicator */}
        <div style={{
          height: 2,
          background: spinning
            ? "linear-gradient(90deg, transparent, var(--gold), transparent)"
            : "var(--border)",
          margin: "-28px 0 24px",
          transition: "background 0.3s",
        }} />

        {/* Payout table */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: "6px 16px",
          maxWidth: 360,
          margin: "0 auto",
        }}>
          {PAYOUTS.map(({ match, mult, color }) => (
            <div key={match} style={{
              display: "flex", justifyContent: "space-between",
              fontSize: 12, padding: "3px 0",
              borderBottom: "1px solid var(--border)",
            }}>
              <span style={{ color: "var(--muted)" }}>{match}</span>
              <span style={{ color, fontFamily: "var(--font-mono)" }}>{mult}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <BetPanel
          onBet={handleBet}
          maxBet={maxBet}
          loading={loading}
          buttonLabel="🎰  SPIN"
        />
      </div>

      {result && (
        <div style={{ marginTop: 20 }}>
          <ResultBanner result={result} onDismiss={() => setResult(null)} />
        </div>
      )}
    </div>
  );
}
