import { formatEther } from "viem";

export default function ResultBanner({ result, onDismiss }) {
  if (!result) return null;

  const won = result.won;
  const payout = result.payout ? formatEther(result.payout) : "0";

  return (
    <div
      className={`animate-fade ${won ? "animate-win" : "animate-shake"}`}
      style={{
        padding: "20px 24px",
        borderRadius: "var(--radius)",
        background: won ? "rgba(0,230,118,0.08)" : "rgba(255,71,87,0.08)",
        border: `2px solid ${won ? "var(--green)" : "var(--red)"}`,
        textAlign: "center",
        position: "relative",
      }}
    >
      <button
        onClick={onDismiss}
        style={{
          position: "absolute", top: 10, right: 14,
          background: "none", color: "var(--muted)", fontSize: 18,
        }}
      >×</button>

      <div style={{ fontSize: 48, marginBottom: 8 }}>
        {won ? "🎉" : "💀"}
      </div>

      <div style={{
        fontFamily: "var(--font-head)",
        fontSize: 36,
        color: won ? "var(--green)" : "var(--red)",
        letterSpacing: 2,
      }}>
        {won ? "YOU WON!" : "YOU LOST"}
      </div>

      {won && (
        <div style={{
          fontFamily: "var(--font-mono)",
          fontSize: 20,
          color: "var(--gold)",
          marginTop: 6,
        }}>
          +{parseFloat(payout).toFixed(5)} ETH
        </div>
      )}

      {result.detail && (
        <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 8 }}>
          {result.detail}
        </div>
      )}
    </div>
  );
}
