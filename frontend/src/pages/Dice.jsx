import { useState } from "react";
import { usePoolStats, usePlayGame } from "../hooks/useContracts";
import BetPanel from "../components/BetPanel";
import ResultBanner from "../components/ResultBanner";

function calcMultiplier(target) {
  // payout = (100 / target) * 0.98
  return ((100 / target) * 0.98).toFixed(4);
}

function calcWinChance(target) {
  return (target - 1).toFixed(0);
}

export default function Dice() {
  const [target, setTarget] = useState(50);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [lastRoll, setLastRoll] = useState(null);

  const { maxBet, refetch } = usePoolStats();

  const play = usePlayGame("DiceResult", (decoded) => {
    const roll = Number(decoded.roll);
    setLastRoll(roll);
    setResult({
      won: decoded.won,
      payout: decoded.payout,
      detail: `Rolled ${roll} — needed under ${target}`,
    });
    setLoading(false);
    refetch();
  });

  const handleBet = async (betWei) => {
    try {
      setLoading(true);
      setResult(null);
      setLastRoll(null);
      await play({
        functionName: "playDice",
        args: [BigInt(target)],
        value: betWei,
      });
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const multiplier = calcMultiplier(target);
  const winChance = calcWinChance(target);

  return (
    <div style={{ maxWidth: 560 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{
          fontFamily: "var(--font-head)",
          fontSize: 44,
          letterSpacing: 3,
          color: "var(--blue)",
        }}>DICE ROLL</h1>
        <p style={{ color: "var(--muted)", marginTop: 6 }}>
          Set a target. Win if the dice rolls under it. Lower target = bigger payout.
        </p>
      </div>

      {/* Dice display */}
      <div style={{
        display: "flex", justifyContent: "center",
        marginBottom: 32, gap: 24, alignItems: "center",
      }}>
        <div style={{
          width: 100, height: 100,
          background: "var(--card)",
          border: "2px solid var(--border)",
          borderRadius: 16,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "var(--font-mono)",
          fontSize: 40, fontWeight: 700,
          color: lastRoll !== null
            ? (lastRoll < target ? "var(--green)" : "var(--red)")
            : "var(--muted)",
          transition: "color 0.3s",
          animation: loading ? "spin 0.6s linear infinite" : "none",
        }}>
          {lastRoll !== null ? lastRoll : "?"}
        </div>

        <div style={{ color: "var(--muted)", fontSize: 24 }}>{"<"}</div>

        <div style={{
          width: 100, height: 100,
          background: "rgba(79,195,247,0.08)",
          border: "2px solid var(--blue)",
          borderRadius: 16,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "var(--font-mono)",
          fontSize: 40, fontWeight: 700,
          color: "var(--blue)",
        }}>
          {target}
        </div>
      </div>

      <div className="card">
        <BetPanel onBet={handleBet} maxBet={maxBet} loading={loading}>
          {/* Target slider */}
          <div>
            <div style={{
              display: "flex", justifyContent: "space-between",
              fontSize: 12, color: "var(--muted)", marginBottom: 10,
            }}>
              <span>TARGET NUMBER (roll under this)</span>
              <span className="mono" style={{ color: "var(--blue)" }}>{target}</span>
            </div>
            <input
              type="range"
              min={2} max={98}
              value={target}
              onChange={e => setTarget(Number(e.target.value))}
              disabled={loading}
              style={{ accentColor: "var(--blue)" }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
              <span>2 (riskier, bigger payout)</span>
              <span>98 (safer, smaller payout)</span>
            </div>
          </div>

          {/* Stats */}
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
            gap: 12, padding: "14px", background: "var(--bg3)",
            borderRadius: 8, textAlign: "center",
          }}>
            <div>
              <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>WIN CHANCE</div>
              <div className="mono" style={{ fontSize: 18, color: "var(--blue)" }}>{winChance}%</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>MULTIPLIER</div>
              <div className="mono" style={{ fontSize: 18, color: "var(--green)" }}>{multiplier}×</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>HOUSE EDGE</div>
              <div className="mono" style={{ fontSize: 18, color: "var(--muted)" }}>2%</div>
            </div>
          </div>
        </BetPanel>
      </div>

      {result && (
        <div style={{ marginTop: 20 }}>
          <ResultBanner result={result} onDismiss={() => setResult(null)} />
        </div>
      )}
    </div>
  );
}
