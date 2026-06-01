import { formatEther } from "viem";
import { usePoolStats, useGamesStats } from "../hooks/useContracts";

function StatCard({ label, value, sub, accent }) {
  return (
    <div className="card" style={{ flex: 1 }}>
      <div style={{ fontSize: 11, color: "var(--muted)", letterSpacing: 1, marginBottom: 8 }}>{label}</div>
      <div style={{
        fontFamily: "var(--font-mono)",
        fontSize: 26,
        fontWeight: 600,
        color: accent || "var(--text)",
      }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const { poolBalance, maxBet, totalShares } = usePoolStats();
  const { totalBets, totalPaidOut } = useGamesStats();

  const fmtEth = (v) => v ? `${parseFloat(formatEther(v)).toFixed(4)} ETH` : "—";

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{
          fontFamily: "var(--font-head)",
          fontSize: 48,
          letterSpacing: 3,
          color: "var(--gold)",
          lineHeight: 1,
        }}>
          WELCOME TO<br/>THE CASINO
        </h1>
        <p style={{ color: "var(--muted)", marginTop: 12, maxWidth: 500 }}>
          Provably fair games on Sepolia testnet. All randomness via Chainlink VRF.
          Play against the liquidity pool — you can also <a href="/pool" style={{ color: "var(--gold)" }}>add liquidity</a> and be the house.
        </p>
      </div>

      {/* Stats row */}
      <div style={{ display: "flex", gap: 16, marginBottom: 32 }}>
        <StatCard label="POOL BALANCE" value={fmtEth(poolBalance)} sub="Total house liquidity" accent="var(--gold)" />
        <StatCard label="MAX BET" value={fmtEth(maxBet)} sub="2% of pool per bet" />
        <StatCard label="TOTAL BETS" value={totalBets?.toString() || "0"} sub="All time" />
        <StatCard label="TOTAL PAID OUT" value={fmtEth(totalPaidOut)} sub="All time winnings" accent="var(--green)" />
      </div>

      {/* Games grid */}
      <h2 style={{
        fontFamily: "var(--font-head)",
        fontSize: 22,
        letterSpacing: 2,
        marginBottom: 16,
        color: "var(--muted)",
      }}>CHOOSE A GAME</h2>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {[
          {
            path: "/coinflip", icon: "🪙", name: "Coin Flip",
            desc: "50/50 chance. Heads or tails.", edge: "2% house edge", payout: "1.96×",
            color: "#f5a623",
          },
          {
            path: "/dice", icon: "🎲", name: "Dice Roll",
            desc: "Pick your number. Roll under to win.", edge: "2% house edge", payout: "Up to 49×",
            color: "#4fc3f7",
          },
          {
            path: "/crash", icon: "📈", name: "Crash",
            desc: "Watch the multiplier climb. Cash out before it crashes.", edge: "4% house edge", payout: "Up to 1000×",
            color: "#00e676",
          },
          {
            path: "/slots", icon: "🎰", name: "Slots",
            desc: "Spin 3 reels. Match symbols to win.", edge: "5% house edge", payout: "Up to 100×",
            color: "#e040fb",
          },
        ].map(game => (
          <a key={game.path} href={game.path} style={{ textDecoration: "none" }}>
            <div className="card" style={{
              cursor: "pointer",
              transition: "all 0.2s",
              borderColor: "var(--border)",
            }}
              onMouseEnter={e => e.currentTarget.style.borderColor = game.color}
              onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 12 }}>
                <span style={{ fontSize: 36 }}>{game.icon}</span>
                <div>
                  <div style={{
                    fontFamily: "var(--font-head)",
                    fontSize: 22,
                    letterSpacing: 1,
                    color: game.color,
                  }}>{game.name}</div>
                  <div style={{ fontSize: 13, color: "var(--muted)" }}>{game.desc}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 16, fontSize: 12 }}>
                <span style={{ color: "var(--muted)" }}>{game.edge}</span>
                <span style={{ color: game.color, fontFamily: "var(--font-mono)" }}>
                  Max payout: {game.payout}
                </span>
              </div>
            </div>
          </a>
        ))}
      </div>

      {/* Testnet notice */}
      <div style={{
        marginTop: 32, padding: "16px 20px",
        background: "rgba(79,195,247,0.05)",
        border: "1px solid rgba(79,195,247,0.2)",
        borderRadius: 8,
        fontSize: 13,
        color: "var(--muted)",
      }}>
        ⚠️ <strong style={{ color: "var(--blue)" }}>Testnet only.</strong>{" "}
        This is deployed on Sepolia — all ETH is fake testnet ETH.
        Get free Sepolia ETH at <a
          href="https://cloud.google.com/application/web3/faucet/ethereum/sepolia"
          target="_blank"
          rel="noreferrer"
          style={{ color: "var(--blue)" }}
        >Google's Sepolia faucet</a> or <a
          href="https://sepoliafaucet.com"
          target="_blank"
          rel="noreferrer"
          style={{ color: "var(--blue)" }}
        >sepoliafaucet.com</a>.
      </div>
    </div>
  );
}
