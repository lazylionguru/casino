import { NavLink } from "react-router-dom";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useBalance } from "wagmi";

const NAV = [
  { path: "/",         label: "Dashboard",  icon: "⬡" },
  { path: "/coinflip", label: "Coin Flip",  icon: "🪙" },
  { path: "/dice",     label: "Dice Roll",  icon: "🎲" },
  { path: "/crash",    label: "Crash",      icon: "📈" },
  { path: "/slots",    label: "Slots",      icon: "🎰" },
  { path: "/pool",     label: "Liquidity",  icon: "💧" },
];

export default function Layout({ children }) {
  const { address } = useAccount();
  const { data: balance } = useBalance({ address });

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      {/* Sidebar */}
      <aside style={{
        width: 220,
        minWidth: 220,
        background: "var(--bg2)",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        padding: "0",
      }}>
        {/* Logo */}
        <div style={{
          padding: "28px 24px 20px",
          borderBottom: "1px solid var(--border)",
        }}>
          <div style={{
            fontFamily: "var(--font-head)",
            fontSize: 28,
            letterSpacing: 2,
            color: "var(--gold)",
            lineHeight: 1,
          }}>CRYPTO<br/>CASINO</div>
          <div style={{
            fontSize: 10,
            color: "var(--muted)",
            marginTop: 4,
            fontFamily: "var(--font-mono)",
            letterSpacing: 1,
          }}>SEPOLIA TESTNET</div>
        </div>

        {/* Nav */}
        <nav style={{ padding: "12px 12px", flex: 1 }}>
          {NAV.map(({ path, label, icon }) => (
            <NavLink
              key={path}
              to={path}
              end={path === "/"}
              style={({ isActive }) => ({
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 14px",
                borderRadius: 8,
                marginBottom: 4,
                color: isActive ? "var(--gold)" : "var(--muted)",
                background: isActive ? "rgba(245,166,35,0.08)" : "transparent",
                textDecoration: "none",
                fontSize: 14,
                fontWeight: 500,
                border: isActive ? "1px solid rgba(245,166,35,0.2)" : "1px solid transparent",
                transition: "all 0.15s",
              })}
            >
              <span style={{ fontSize: 18 }}>{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Balance */}
        {address && balance && (
          <div style={{
            margin: "0 12px 12px",
            padding: "12px 14px",
            background: "var(--bg3)",
            borderRadius: 8,
            border: "1px solid var(--border)",
          }}>
            <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>YOUR BALANCE</div>
            <div style={{
              fontFamily: "var(--font-mono)",
              fontSize: 16,
              color: "var(--gold)",
              fontWeight: 600,
            }}>
              {parseFloat(balance.formatted).toFixed(4)} ETH
            </div>
          </div>
        )}

        {/* Wallet */}
        <div style={{ padding: "12px", borderTop: "1px solid var(--border)" }}>
          <ConnectButton
            showBalance={false}
            chainStatus="icon"
            accountStatus="avatar"
          />
        </div>
      </aside>

      {/* Main content */}
      <main style={{
        flex: 1,
        overflow: "auto",
        background: "var(--bg)",
        padding: "32px",
      }}>
        {children}
      </main>
    </div>
  );
}
