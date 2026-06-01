import { formatEther } from "viem";
import { useBetHistory } from "../hooks/useBetHistory";
import { useAccount } from "wagmi";

const GAME_ICONS = {
  "Coin Flip": "🪙",
  "Dice Roll": "🎲",
  "Crash":     "📈",
  "Slots":     "🎰",
};

function shortHash(hash) {
  return hash ? `${hash.slice(0, 8)}...${hash.slice(-6)}` : "";
}

export default function BetHistory({ onNewBet }) {
  const { isConnected } = useAccount();
  const { history, loading, refetch } = useBetHistory();

  // expose refetch so parent can call after new bet
  if (onNewBet) onNewBet.current = refetch;

  if (!isConnected) return null;

  const totalWon  = history.filter(b => b.won).reduce((s, b) => s + b.payout, 0n);
  const totalBet  = history.reduce((s, b) => s + b.bet, 0n);
  const winCount  = history.filter(b => b.won).length;

  return (
    <div style={{ marginTop: 32 }}>
      <div style={{
        display: "flex", justifyContent: "space-between",
        alignItems: "center", marginBottom: 16,
      }}>
        <h2 style={{
          fontFamily: "var(--font-head)",
          fontSize: 22, letterSpacing: 2,
          color: "var(--muted)",
        }}>BET HISTORY</h2>
        <button
          onClick={refetch}
          disabled={loading}
          style={{
            padding: "6px 14px", fontSize: 12,
            background: "var(--bg3)", color: "var(--muted)",
            border: "1px solid var(--border)", borderRadius: 6,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Loading..." : "↻ Refresh"}
        </button>
      </div>

      {/* Summary stats */}
      {history.length > 0 && (
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr",
          gap: 12, marginBottom: 20,
        }}>
          {[
            { label: "TOTAL BETS",  value: history.length,                          color: "var(--text)" },
            { label: "WINS",        value: winCount,                                color: "var(--green)" },
            { label: "LOSSES",      value: history.length - winCount,               color: "var(--red)" },
            { label: "NET",         value: formatNet(totalWon, totalBet),           color: getNetColor(totalWon, totalBet) },
          ].map(({ label, value, color }) => (
            <div key={label} style={{
              background: "var(--card)", border: "1px solid var(--border)",
              borderRadius: 8, padding: "12px 14px",
            }}>
              <div style={{ fontSize: 10, color: "var(--muted)", letterSpacing: 1, marginBottom: 4 }}>{label}</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 600, color }}>{value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Bet list */}
      {loading && history.length === 0 ? (
        <div style={{
          padding: "32px", textAlign: "center",
          color: "var(--muted)", fontSize: 14,
          background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8,
        }}>
          Loading bet history...
        </div>
      ) : history.length === 0 ? (
        <div style={{
          padding: "32px", textAlign: "center",
          color: "var(--muted)", fontSize: 14,
          background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8,
        }}>
          No bets yet. Play a game to see your history here.
        </div>
      ) : (
        <div style={{
          background: "var(--card)", border: "1px solid var(--border)",
          borderRadius: 8, overflow: "hidden",
        }}>
          {/* Header */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "40px 100px 90px 90px 90px 1fr 80px",
            padding: "10px 16px",
            fontSize: 11, color: "var(--muted)", letterSpacing: 1,
            borderBottom: "1px solid var(--border)",
            background: "var(--bg2)",
          }}>
            <span></span>
            <span>GAME</span>
            <span>BET</span>
            <span>RESULT</span>
            <span>PAYOUT</span>
            <span>DETAIL</span>
            <span>TX</span>
          </div>

          {/* Rows */}
          {history.map((bet, i) => (
            <div
              key={bet.id}
              style={{
                display: "grid",
                gridTemplateColumns: "40px 100px 90px 90px 90px 1fr 80px",
                padding: "12px 16px",
                alignItems: "center",
                borderBottom: i < history.length - 1 ? "1px solid var(--border)" : "none",
                background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)",
                fontSize: 13,
                transition: "background 0.15s",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
              onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)"}
            >
              {/* Icon */}
              <span style={{ fontSize: 18 }}>{GAME_ICONS[bet.game] || "🎮"}</span>

              {/* Game */}
              <span style={{ color: "var(--text)", fontWeight: 500 }}>{bet.game}</span>

              {/* Bet amount */}
              <span style={{ fontFamily: "var(--font-mono)", color: "var(--muted)" }}>
                {parseFloat(formatEther(bet.bet)).toFixed(4)}
              </span>

              {/* Result badge */}
              <span>
                <span style={{
                  padding: "3px 10px", borderRadius: 4, fontSize: 11, fontWeight: 700,
                  background: bet.won ? "rgba(0,230,118,0.12)" : "rgba(255,71,87,0.12)",
                  color: bet.won ? "var(--green)" : "var(--red)",
                  border: `1px solid ${bet.won ? "rgba(0,230,118,0.3)" : "rgba(255,71,87,0.3)"}`,
                }}>
                  {bet.won ? "WIN" : "LOSS"}
                </span>
              </span>

              {/* Payout */}
              <span style={{
                fontFamily: "var(--font-mono)",
                color: bet.won ? "var(--green)" : "var(--red)",
                fontWeight: bet.won ? 600 : 400,
              }}>
                {bet.won
                  ? `+${parseFloat(formatEther(bet.payout)).toFixed(4)}`
                  : `-${parseFloat(formatEther(bet.bet)).toFixed(4)}`}
              </span>

              {/* Detail */}
              <span style={{ color: "var(--muted)", fontSize: 12 }}>{bet.detail}</span>

              {/* TX link */}
              <a
                href={`https://sepolia.etherscan.io/tx/${bet.txHash}`}
                target="_blank"
                rel="noreferrer"
                style={{ color: "var(--blue)", fontSize: 11, fontFamily: "var(--font-mono)" }}
              >
                {shortHash(bet.txHash)}
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatNet(totalWon, totalBet) {
  const net = totalWon - totalBet;
  const ethVal = parseFloat(formatEther(net < 0n ? -net : net)).toFixed(4);
  return `${net >= 0n ? "+" : "-"}${ethVal} ETH`;
}

function getNetColor(totalWon, totalBet) {
  return totalWon >= totalBet ? "var(--green)" : "var(--red)";
}
