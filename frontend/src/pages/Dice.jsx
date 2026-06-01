import { useState, useRef } from "react";
import { usePoolStats, usePlayGame } from "../hooks/useContracts";
import BetPanel from "../components/BetPanel";
import ResultBanner from "../components/ResultBanner";
import BetHistory from "../components/BetHistory";

function calcMultiplier(target) { return ((100 / target) * 0.98).toFixed(4); }

export default function Dice() {
  const [target, setTarget] = useState(50);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [lastRoll, setLastRoll] = useState(null);
  const historyRefetch = useRef(null);

  const { maxBet, refetch } = usePoolStats();

  const play = usePlayGame("DiceResult", (decoded) => {
    setLastRoll(Number(decoded.roll));
    setResult({
      won: decoded.payout > 0n,
      payout: decoded.payout,
      detail: `Rolled ${decoded.roll} — needed under ${decoded.target}`,
    });
    setLoading(false);
    refetch();
    if (historyRefetch.current) historyRefetch.current();
  });

  const handleBet = async (betWei) => {
    try {
      setLoading(true);
      setResult(null);
      setLastRoll(null);
      await play({ functionName: "playDice", args: [BigInt(target)], value: betWei });
    } catch (err) {
      console.error(err);
      setLoading(false);
      if (err.message?.includes("timeout")) setResult({ won: false, payout: 0n, detail: "VRF timeout — check history in a minute" });
    }
  };

  return (
    <div style={{ maxWidth: 700 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: "var(--font-head)", fontSize: 44, letterSpacing: 3, color: "var(--blue)" }}>DICE ROLL</h1>
        <p style={{ color: "var(--muted)", marginTop: 6 }}>Set a target. Win if the dice rolls under it.</p>
      </div>

      <div style={{ display: "flex", justifyContent: "center", marginBottom: 32, gap: 24, alignItems: "center" }}>
        <div style={{
          width: 100, height: 100, background: "var(--card)", border: "2px solid var(--border)",
          borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "var(--font-mono)", fontSize: 40, fontWeight: 700,
          color: lastRoll !== null ? (lastRoll < target ? "var(--green)" : "var(--red)") : "var(--muted)",
          animation: loading ? "spin 0.6s linear infinite" : "none",
        }}>
          {lastRoll !== null ? lastRoll : "?"}
        </div>
        <div style={{ color: "var(--muted)", fontSize: 24 }}>{"<"}</div>
        <div style={{
          width: 100, height: 100, background: "rgba(79,195,247,0.08)", border: "2px solid var(--blue)",
          borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "var(--font-mono)", fontSize: 40, fontWeight: 700, color: "var(--blue)",
        }}>
          {target}
        </div>
      </div>

      <div className="card">
        <BetPanel onBet={handleBet} maxBet={maxBet} loading={loading}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--muted)", marginBottom: 10 }}>
              <span>TARGET NUMBER (roll under this)</span>
              <span className="mono" style={{ color: "var(--blue)" }}>{target}</span>
            </div>
            <input type="range" min={2} max={98} value={target} onChange={e => setTarget(Number(e.target.value))} disabled={loading} style={{ accentColor: "var(--blue)" }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, padding: "14px", background: "var(--bg3)", borderRadius: 8, textAlign: "center" }}>
            <div><div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>WIN CHANCE</div><div className="mono" style={{ fontSize: 18, color: "var(--blue)" }}>{target - 1}%</div></div>
            <div><div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>MULTIPLIER</div><div className="mono" style={{ fontSize: 18, color: "var(--green)" }}>{calcMultiplier(target)}×</div></div>
            <div><div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>HOUSE EDGE</div><div className="mono" style={{ fontSize: 18, color: "var(--muted)" }}>2%</div></div>
          </div>
        </BetPanel>
      </div>

      {result && <div style={{ marginTop: 20 }}><ResultBanner result={result} onDismiss={() => setResult(null)} /></div>}
      <BetHistory onNewBet={historyRefetch} />
    </div>
  );
}
