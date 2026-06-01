import { useState, useEffect, useRef } from "react";
import { usePoolStats, usePlayGame } from "../hooks/useContracts";
import BetPanel from "../components/BetPanel";
import ResultBanner from "../components/ResultBanner";

export default function Crash() {
  const [cashoutAt, setCashoutAt] = useState(200); // 2.00x
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [animMult, setAnimMult] = useState(100); // shown multiplier during animation
  const [crashed, setCrashed] = useState(false);
  const animRef = useRef(null);

  const { maxBet, refetch } = usePoolStats();

  const play = usePlayGame("CrashResult", (decoded) => {
    const crashPoint = Number(decoded.crashPoint);
    setCrashed(true);
    setAnimMult(crashPoint);
    clearInterval(animRef.current);
    setResult({
      won: decoded.won,
      payout: decoded.payout,
      detail: `Crashed at ${(crashPoint / 100).toFixed(2)}× — you cashed out at ${(cashoutAt / 100).toFixed(2)}×`,
    });
    setLoading(false);
    refetch();
  });

  const handleBet = async (betWei) => {
    try {
      setLoading(true);
      setResult(null);
      setCrashed(false);
      setAnimMult(100);

      // Animate multiplier climbing while waiting for VRF
      let mult = 100;
      animRef.current = setInterval(() => {
        mult += Math.floor(mult * 0.05) + 1;
        setAnimMult(Math.min(mult, cashoutAt + 500));
      }, 100);

      await play({
        functionName: "playCrash",
        args: [BigInt(cashoutAt)],
        value: betWei,
      });
    } catch (err) {
      console.error(err);
      clearInterval(animRef.current);
      setLoading(false);
    }
  };

  useEffect(() => () => clearInterval(animRef.current), []);

  const displayMult = (animMult / 100).toFixed(2);
  const multColor = crashed
    ? "var(--red)"
    : loading
    ? "var(--green)"
    : "var(--text)";

  const QUICK_MULT = [
    { label: "1.5×", val: 150 },
    { label: "2×",   val: 200 },
    { label: "5×",   val: 500 },
    { label: "10×",  val: 1000 },
  ];

  // Win probability = (cashoutAt - 4% house edge)
  const winProb = ((9600 / (cashoutAt - 100 + 9600)) * 100).toFixed(1);

  return (
    <div style={{ maxWidth: 600 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{
          fontFamily: "var(--font-head)",
          fontSize: 44,
          letterSpacing: 3,
          color: "var(--green)",
        }}>CRASH</h1>
        <p style={{ color: "var(--muted)", marginTop: 6 }}>
          Set your cashout target. If the crash point is above it, you win. House edge: 4%.
        </p>
      </div>

      {/* Multiplier display */}
      <div style={{
        display: "flex", justifyContent: "center", alignItems: "center",
        height: 160,
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        marginBottom: 24,
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Background graph lines */}
        {[...Array(5)].map((_, i) => (
          <div key={i} style={{
            position: "absolute",
            bottom: `${20 + i * 20}%`, left: 0, right: 0,
            height: 1, background: "rgba(255,255,255,0.04)",
          }} />
        ))}

        <div>
          <div style={{
            fontFamily: "var(--font-head)",
            fontSize: 72,
            letterSpacing: 4,
            color: multColor,
            textAlign: "center",
            lineHeight: 1,
            transition: "color 0.3s",
            textShadow: loading && !crashed ? `0 0 40px var(--green)` : "none",
          }}>
            {loading ? displayMult : (crashed ? displayMult : "—")}
            <span style={{ fontSize: 32 }}>×</span>
          </div>
          {loading && !crashed && (
            <div style={{
              textAlign: "center", fontSize: 12,
              color: "var(--green)", marginTop: 4,
              fontFamily: "var(--font-mono)",
            }}>
              ⚡ CLIMBING...
            </div>
          )}
          {crashed && (
            <div style={{
              textAlign: "center", fontSize: 14,
              color: "var(--red)", fontFamily: "var(--font-head)",
              letterSpacing: 2,
            }}>
              💥 CRASHED
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <BetPanel onBet={handleBet} maxBet={maxBet} loading={loading}>
          {/* Cashout target */}
          <div>
            <div style={{
              display: "flex", justifyContent: "space-between",
              fontSize: 12, color: "var(--muted)", marginBottom: 10,
            }}>
              <span>CASH OUT AT</span>
              <span className="mono" style={{ color: "var(--green)" }}>
                {(cashoutAt / 100).toFixed(2)}×
              </span>
            </div>

            {/* Quick pick */}
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              {QUICK_MULT.map(({ label, val }) => (
                <button
                  key={val}
                  onClick={() => !loading && setCashoutAt(val)}
                  style={{
                    flex: 1, padding: "8px 0", fontSize: 13,
                    background: cashoutAt === val ? "rgba(0,230,118,0.12)" : "var(--bg3)",
                    color: cashoutAt === val ? "var(--green)" : "var(--muted)",
                    border: `1px solid ${cashoutAt === val ? "var(--green)" : "var(--border)"}`,
                    borderRadius: 6, fontFamily: "var(--font-mono)",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            <input
              type="range"
              min={101} max={10000}
              value={cashoutAt}
              onChange={e => setCashoutAt(Number(e.target.value))}
              disabled={loading}
              style={{ accentColor: "var(--green)" }}
            />
          </div>

          {/* Stats */}
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr",
            gap: 12, padding: "14px", background: "var(--bg3)",
            borderRadius: 8, textAlign: "center",
          }}>
            <div>
              <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>WIN PROBABILITY</div>
              <div className="mono" style={{ fontSize: 18, color: "var(--blue)" }}>{winProb}%</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>PAYOUT MULTIPLIER</div>
              <div className="mono" style={{ fontSize: 18, color: "var(--green)" }}>
                {(cashoutAt / 100).toFixed(2)}×
              </div>
            </div>
          </div>
        </BetPanel>
      </div>

      {result && (
        <div style={{ marginTop: 20 }}>
          <ResultBanner result={result} onDismiss={() => { setResult(null); setCrashed(false); setAnimMult(100); }} />
        </div>
      )}
    </div>
  );
}
