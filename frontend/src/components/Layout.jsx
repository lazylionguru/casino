import { NavLink } from "react-router-dom";
import { useAccount, useBalance, useConnect, useDisconnect } from "wagmi";

const NAV = [
  { path: "/",         label: "Dashboard",  icon: "⬡" },
  { path: "/coinflip", label: "Coin Flip",  icon: "🪙" },
  { path: "/dice",     label: "Dice Roll",  icon: "🎲" },
  { path: "/crash",    label: "Crash",      icon: "📈" },
  { path: "/slots",    label: "Slots",      icon: "🎰" },
  { path: "/history",  label: "My History", icon: "📋" },
  { path: "/pool",     label: "Liquidity",  icon: "💧" },
];

function WalletButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { data: balance } = useBalance({ address });

  if (isConnected) {
    return (
      <div>
        {balance && (
          <div style={{ margin: "0 0 8px", padding: "10px 14px", background: "var(--bg3)", borderRadius: 8, border: "1px solid var(--border)" }}>
            <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>YOUR BALANCE</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 16, color: "var(--gold)", fontWeight: 600 }}>
              {parseFloat(balance.formatted).toFixed(4)} ETH
            </div>
          </div>
        )}
        <button
          onClick={() => disconnect()}
          style={{
            width: "100%", padding: "10px",
            background: "var(--bg3)", color: "var(--muted)",
            border: "1px solid var(--border)", borderRadius: 8,
            fontSize: 12, fontFamily: "var(--font-mono)", cursor: "pointer",
            textAlign: "left",
          }}
        >
          {address.slice(0, 6)}...{address.slice(-4)} ✕
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => connect({ connector: connectors[0] })}
      style={{
        width: "100%", padding: "12px",
        background: "var(--gold)", color: "#000",
        border: "none", borderRadius: 8,
        fontSize: 14, fontWeight: 700,
        fontFamily: "var(--font-head)", letterSpacing: 1,
        cursor: "pointer",
      }}
    >
      Connect Wallet
    </button>
  );
}

export default function Layout({ children }) {
  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <aside style={{ width: 220, minWidth: 220, background: "var(--bg2)", borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "28px 24px 20px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ fontFamily: "var(--font-head)", fontSize: 28, letterSpacing: 2, color: "var(--gold)", lineHeight: 1 }}>CRYPTO<br/>CASINO</div>
          <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 4, fontFamily: "var(--font-mono)", letterSpacing: 1 }}>SEPOLIA TESTNET</div>
        </div>

        <nav style={{ padding: "12px", flex: 1 }}>
          {NAV.map(({ path, label, icon }) => (
            <NavLink key={path} to={path} end={path === "/"} style={({ isActive }) => ({
              display: "flex", alignItems: "center", gap: 12,
              padding: "10px 14px", borderRadius: 8, marginBottom: 4,
              color: isActive ? "var(--gold)" : "var(--muted)",
              background: isActive ? "rgba(245,166,35,0.08)" : "transparent",
              textDecoration: "none", fontSize: 14, fontWeight: 500,
              border: isActive ? "1px solid rgba(245,166,35,0.2)" : "1px solid transparent",
              transition: "all 0.15s",
            })}>
              <span style={{ fontSize: 18 }}>{icon}</span>{label}
            </NavLink>
          ))}
        </nav>

        <div style={{ padding: "12px", borderTop: "1px solid var(--border)" }}>
          <WalletButton />
        </div>
      </aside>

      <main style={{ flex: 1, overflow: "auto", background: "var(--bg)", padding: "32px" }}>
        {children}
      </main>
    </div>
  );
}