import BetHistory from "../components/BetHistory";
import { useAccount } from "wagmi";

export default function History() {
  const { isConnected } = useAccount();

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: "var(--font-head)", fontSize: 44, letterSpacing: 3, color: "var(--gold)" }}>BET HISTORY</h1>
        <p style={{ color: "var(--muted)", marginTop: 6 }}>All your bets across every game, pulled live from the blockchain.</p>
      </div>
      {!isConnected ? (
        <div style={{ padding: "48px", textAlign: "center", background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", color: "var(--muted)" }}>
          Connect your wallet to see your bet history.
        </div>
      ) : (
        <BetHistory />
      )}
    </div>
  );
}
