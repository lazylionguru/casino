import { useState } from "react";
import { formatEther, parseEther } from "viem";
import { useWriteContract, usePublicClient } from "wagmi";
import { parseAbi } from "viem";
import { usePoolStats } from "../hooks/useContracts";
import { POOL_ABI } from "../config/wagmi";
import contractAddresses from "../config/contracts.json";

export default function Pool() {
  const [tab, setTab] = useState("add");
  const [amount, setAmount] = useState("0.1");
  const [shareAmount, setShareAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [txMsg, setTxMsg] = useState(null);

  const { poolBalance, myShares, myShareValue, totalShares, refetch } = usePoolStats();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  const fmtEth = v => v ? `${parseFloat(formatEther(v)).toFixed(5)} ETH` : "—";
  const fmtNum = v => v ? Number(v).toLocaleString() : "0";

  const poolShare = myShares && totalShares && totalShares > 0n
    ? ((Number(myShares) / Number(totalShares)) * 100).toFixed(2)
    : "0.00";

  const handleAdd = async () => {
    try {
      setLoading(true);
      setTxMsg(null);
      const hash = await writeContractAsync({
        address: contractAddresses.CasinoPool,
        abi: parseAbi(POOL_ABI),
        functionName: "addLiquidity",
        value: parseEther(amount || "0"),
      });
      await publicClient.waitForTransactionReceipt({ hash });
      setTxMsg({ ok: true, msg: `Added ${amount} ETH to pool!` });
      refetch();
    } catch (err) {
      setTxMsg({ ok: false, msg: err.shortMessage || err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async () => {
    try {
      setLoading(true);
      setTxMsg(null);
      const hash = await writeContractAsync({
        address: contractAddresses.CasinoPool,
        abi: parseAbi(POOL_ABI),
        functionName: "removeLiquidity",
        args: [BigInt(shareAmount || "0")],
      });
      await publicClient.waitForTransactionReceipt({ hash });
      setTxMsg({ ok: true, msg: "Liquidity removed!" });
      refetch();
    } catch (err) {
      setTxMsg({ ok: false, msg: err.shortMessage || err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 600 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{
          fontFamily: "var(--font-head)",
          fontSize: 44,
          letterSpacing: 3,
          color: "var(--blue)",
        }}>LIQUIDITY POOL</h1>
        <p style={{ color: "var(--muted)", marginTop: 6 }}>
          Deposit ETH to be the house. Earn from house edge across all games.
          Your share grows as players lose — and shrinks when they win.
        </p>
      </div>

      {/* Pool Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 24 }}>
        {[
          { label: "POOL BALANCE", value: fmtEth(poolBalance), color: "var(--gold)" },
          { label: "YOUR DEPOSIT VALUE", value: fmtEth(myShareValue), color: "var(--green)" },
          { label: "YOUR POOL SHARE", value: `${poolShare}%`, color: "var(--blue)" },
        ].map(({ label, value, color }) => (
          <div key={label} className="card" style={{ padding: 16 }}>
            <div style={{ fontSize: 10, color: "var(--muted)", letterSpacing: 1, marginBottom: 6 }}>{label}</div>
            <div className="mono" style={{ fontSize: 20, fontWeight: 600, color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Tab */}
      <div style={{
        display: "flex", gap: 0, marginBottom: 20,
        border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden",
      }}>
        {["add", "remove"].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1, padding: "12px",
              background: tab === t ? "rgba(79,195,247,0.1)" : "transparent",
              color: tab === t ? "var(--blue)" : "var(--muted)",
              borderRight: t === "add" ? "1px solid var(--border)" : "none",
              fontWeight: 600, fontSize: 14, textTransform: "capitalize",
            }}
          >
            {t === "add" ? "➕ Add Liquidity" : "➖ Remove Liquidity"}
          </button>
        ))}
      </div>

      <div className="card">
        {tab === "add" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>AMOUNT TO DEPOSIT (ETH)</div>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                min="0.001"
                step="0.01"
              />
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>Minimum deposit: 0.001 ETH</div>
            </div>

            <div style={{
              padding: "14px", background: "var(--bg3)",
              borderRadius: 8, fontSize: 13, color: "var(--muted)",
              lineHeight: 1.8,
            }}>
              <div>You deposit: <span className="mono gold">{amount || "0"} ETH</span></div>
              <div>You'll receive LP shares proportional to your deposit.</div>
              <div>Shares appreciate as the house edge accrues to the pool.</div>
            </div>

            <button
              onClick={handleAdd}
              disabled={loading || !amount || parseFloat(amount) < 0.001}
              style={{
                padding: "14px",
                background: loading ? "var(--bg3)" : "var(--blue)",
                color: loading ? "var(--muted)" : "#000",
                borderRadius: 8, fontWeight: 700, fontSize: 15,
                opacity: loading ? 0.6 : 1,
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Confirming..." : "Add Liquidity"}
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{
              padding: "14px", background: "var(--bg3)",
              borderRadius: 8, fontSize: 13,
            }}>
              <div style={{ color: "var(--muted)", marginBottom: 4 }}>YOUR SHARES</div>
              <div className="mono" style={{ fontSize: 20, color: "var(--blue)" }}>
                {fmtNum(myShares)}
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
                Worth approximately <span className="mono gold">{fmtEth(myShareValue)}</span>
              </div>
            </div>

            <div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>SHARES TO BURN</div>
              <input
                type="number"
                value={shareAmount}
                onChange={e => setShareAmount(e.target.value)}
                min="1"
                placeholder="Enter number of shares"
              />
              <button
                onClick={() => setShareAmount(myShares?.toString() || "0")}
                style={{
                  marginTop: 8, padding: "6px 14px",
                  background: "var(--bg3)", color: "var(--muted)",
                  border: "1px solid var(--border)", borderRadius: 6, fontSize: 12,
                }}
              >
                Max
              </button>
            </div>

            <button
              onClick={handleRemove}
              disabled={loading || !shareAmount || shareAmount === "0"}
              style={{
                padding: "14px",
                background: loading ? "var(--bg3)" : "var(--red)",
                color: "#fff",
                borderRadius: 8, fontWeight: 700, fontSize: 15,
                opacity: loading ? 0.6 : 1,
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Confirming..." : "Remove Liquidity"}
            </button>
          </div>
        )}

        {txMsg && (
          <div style={{
            marginTop: 16, padding: "12px 16px",
            background: txMsg.ok ? "rgba(0,230,118,0.08)" : "rgba(255,71,87,0.08)",
            border: `1px solid ${txMsg.ok ? "var(--green)" : "var(--red)"}`,
            borderRadius: 8, fontSize: 14,
            color: txMsg.ok ? "var(--green)" : "var(--red)",
          }}>
            {txMsg.ok ? "✅" : "❌"} {txMsg.msg}
          </div>
        )}
      </div>

      {/* How it works */}
      <div style={{
        marginTop: 24, padding: "20px",
        background: "var(--card)", border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
      }}>
        <div style={{
          fontFamily: "var(--font-head)",
          fontSize: 16, letterSpacing: 1,
          color: "var(--muted)", marginBottom: 12,
        }}>HOW IT WORKS</div>
        {[
          ["Deposit ETH", "You receive LP shares proportional to your deposit vs total pool."],
          ["Players bet", "All bets are placed against the pool. Losses go in, winnings come out."],
          ["House edge accrues", "2–5% edge on every game adds to the pool over time."],
          ["Withdraw anytime", "Burn your shares to get back ETH + your share of profit (or loss)."],
        ].map(([title, desc]) => (
          <div key={title} style={{ display: "flex", gap: 12, marginBottom: 10 }}>
            <div style={{
              width: 6, minWidth: 6, height: 6,
              background: "var(--blue)", borderRadius: "50%",
              marginTop: 8,
            }} />
            <div>
              <span style={{ color: "var(--blue)", fontWeight: 600 }}>{title}: </span>
              <span style={{ color: "var(--muted)", fontSize: 13 }}>{desc}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
