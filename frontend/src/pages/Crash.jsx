import { useState, useEffect, useRef } from "react";
import { usePoolStats, usePlayGame } from "../hooks/useContracts";
import BetPanel from "../components/BetPanel";
import ResultBanner from "../components/ResultBanner";
import BetHistory from "../components/BetHistory";

export default function Crash() {
  const [cashoutAt, setCashoutAt] = useState(200);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [animMult, setAnimMult] = useState(100);
  const [crashed, setCrashed] = useState(false);
  const animRef = useRef(null);
  const historyRefetch = useRef(null);

  const { maxBet, refetch } = usePoolStats();

  const play = usePlayGame("CrashResult", (decoded) => {
    const crashPoint = Number(decoded.crashPoint);
    setCrashed(true);
    setAnimMult(crashPoint);
    clearInterval(animRef.current);
    setResult({
      won: decoded.payout > 0n,
      payout: decoded.payout,
      detail: `Crashed @ ${(crashPoint / 100).toFixed(2)}× — cashed out @ ${(cashoutAt / 100).toFixed(2)}×`,
    });
    setLoading(false);
    refetch();
    if (historyRefetch.current) historyRefetch.current();
  });

  const handleBet = async (betWei) => {
    try {
      setLoading(true);
      setResult(null);
      setCrashed(false);
      setAnimMult(100);
      let mult = 100;
      animRef.current = setInterval(() => {
        mult += Math.floor(mult * 0.05) + 1;
        setAnimMult(Math.min(mult, cashoutAt + 500));
      }, 100);
      await play({ functionName: "playCrash", args: [BigInt(cashoutAt)], value: betWei });
    } catch (err) {
      console.error(err);
      clearInterval(animRef.current);
      setLoading(false);
      if (err.message?.includes("timeout")) setResult({ won: false, payout: 0n, detail: "VRF timeout — check history in a minute" });
    }
  };

  useEffect(() => () => clearInterval(animRef.current), []);

  const QUICK_MULT = [{ label: "1.5×", val: 150 }, { label: "2×", val: 200 }, { label: "5×", val: 500 }, { label: "10×", val: 1000 }];

  return (
    <div style={{ maxWidth: 700 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: "var(--font-head)", fontSize: 44, letterSpacing: 3, color: "var(--green)" }}>CRASH</h1>
        <p style={{ color: "var(--muted)", marginTop: 6 }}>Set your cashout target. Win if crash point is above it.</p>
      </div>

      <div style={{
        display: "flex", justifyContent: "center", alignItems: "center", height: 160,
        background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)",
        marginBottom: 24, position: "relative", overflow: "hidden",
      }}>
        <div>
          <div style={{
            fontFamily: "var(--font-head)", fontSize: 72, letterSpacing: 4, lineHeight: 1, textAlign: "center",
            color: crashed ? "var(--red)" : loading ? "var(--green)" : "var(--text)",
            textShadow: loading && !crashed ? "0 0 40px var(--green)" : "none",
          }}>
            {loading ? (animMult / 100).toFixed(2) : crashed ? (animMult / 100).toFixed(2) : "—"}
            <span style={{ fontSize: 32 }}>×</span>
          </div>
          {crashed && <div style={{ textAlign: "center", fontSize: 14, color: "var(--red)", fontFamily: "var(--font-head)", letterSpacing: 2 }}>💥 CRASHED</div>}
        </div>
      </div>

      <div className="card">
        <BetPanel onBet={handleBet} maxBet={maxBet} loading={loading}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--muted)", marginBottom: 10 }}>
              <span>CASH OUT AT</span><span className="mono" style={{ color: "var(--green)" }}>{(cashoutAt / 100).toFixed(2)}×</span>
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              {QUICK_MULT.map(({ label, val }) => (
                <button key={val} onClick={() => !loading && setCashoutAt(val)} style={{
                  flex: 1, padding: "8px 0", fontSize: 13,
                  background: cashoutAt === val ? "rgba(0,230,118,0.12)" : "var(--bg3)",
                  color: cashoutAt === val ? "var(--green)" : "var(--muted)",
                  border: `1px solid ${cashoutAt === val ? "var(--green)" : "var(--border)"}`,
                  borderRadius: 6, fontFamily: "var(--font-mono)",
                }}>{label}</button>
              ))}
            </div>
            <input type="range" min={101} max={10000} value={cashoutAt} onChange={e => setCashoutAt(Number(e.target.value))} disabled={loading} style={{ accentColor: "var(--green)" }} />
          </div>
        </BetPanel>
      </div>

      {result && <div style={{ marginTop: 20 }}><ResultBanner result={result} onDismiss={() => { setResult(null); setCrashed(false); setAnimMult(100); }} /></div>}
      <BetHistory onNewBet={historyRefetch} />
    </div>
  );
}
