# 🎰 CryptoCasino — Testnet Prototype

A provably fair crypto casino on Sepolia testnet with 4 games backed by a shared liquidity pool.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      Frontend (React)                    │
│  Dashboard  │  Coinflip  │  Dice  │  Crash  │  Slots    │
└──────────────────────┬──────────────────────────────────┘
                       │ wagmi + viem
┌──────────────────────▼──────────────────────────────────┐
│                   CasinoGames.sol                        │
│  playCoinflip()  playDice()  playCrash()  playSlots()   │
│               ↓ requestRandomWords()                     │
│           Chainlink VRF (Sepolia)                        │
│               ↓ rawFulfillRandomWords()                  │
│         Resolves bet → calls CasinoPool                  │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│                   CasinoPool.sol                         │
│  addLiquidity()  removeLiquidity()  payOut()  collect()  │
│         LP providers earn from house edge                │
└─────────────────────────────────────────────────────────┘
```

---

## Quick Start (Local)

### 1. Install dependencies

```bash
# Root (contracts)
npm install

# Frontend
cd frontend && npm install
```

### 2. Start local Hardhat node

```bash
npm run node
```

### 3. Deploy contracts (in another terminal)

```bash
npm run deploy:local
```

This will:
- Deploy MockVRFCoordinator (instant random, no Chainlink needed)
- Deploy CasinoPool + seed with 5 ETH
- Deploy CasinoGames + approve it
- Write contract addresses to `frontend/src/config/contracts.json`

### 4. Start frontend

```bash
cd frontend && npm run dev
```

Open http://localhost:5173

### 5. Connect MetaMask to localhost

- Network: Localhost 8545
- Chain ID: 31337
- Import a test account from Hardhat's output (it prints 20 accounts with 10,000 ETH each)

---

## Sepolia Deployment

### Prerequisites

1. **Sepolia ETH** — Get free testnet ETH:
   - https://cloud.google.com/application/web3/faucet/ethereum/sepolia (Google, fast)
   - https://sepoliafaucet.com

2. **RPC URL** — Free from Alchemy:
   - https://dashboard.alchemy.com → Create app → Ethereum → Sepolia

3. **Chainlink VRF Subscription**:
   - Go to https://vrf.chain.link/sepolia
   - Create subscription → fund with Sepolia LINK
   - (Get LINK from https://faucets.chain.link/sepolia)

### Steps

```bash
# 1. Copy and fill environment variables
cp .env.example .env
# Edit .env with your PRIVATE_KEY, SEPOLIA_RPC_URL, VRF_SUBSCRIPTION_ID

# 2. Deploy
npm run deploy:sepolia

# 3. After deploy, add the CasinoGames address as a VRF consumer
#    Go to vrf.chain.link/sepolia → Your subscription → Add Consumer

# 4. Seed the pool with liquidity
#    Use the frontend Pool page or send ETH directly

# 5. Update WalletConnect project ID in frontend/src/config/wagmi.js
#    Get free at: cloud.walletconnect.com

# 6. Build frontend
cd frontend && npm run build
```

---

## Games

| Game     | Win Chance | Payout      | House Edge |
|----------|------------|-------------|------------|
| Coinflip | 48%        | 1.96×       | 2%         |
| Dice     | Adjustable | Up to 49×   | 2%         |
| Crash    | Adjustable | Up to 1000× | 4%         |
| Slots    | ~35%       | Up to 100×  | 5%         |

### Coinflip
- Pick Heads or Tails
- 48% win chance (96% of matching flips win → 2% edge)
- Payout: 1.96×

### Dice
- Set a target number (2–98)
- Win if roll < target
- Higher target = easier win but lower multiplier
- Formula: `payout = bet × (100/target) × 0.98`

### Crash
- Pick a cashout multiplier (1.01× to 1000×)
- VRF generates the crash point
- Win if crash point ≥ your cashout
- 4% of bets crash instantly (house edge)

### Slots
- 3 reels, 6 symbols (Cherry, Lemon, Orange, Grape, Bell, 7)
- Weighted spin: Cherry most common, 7 rarest
- Best payout: 3× Seven = 100×

---

## Liquidity Pool

Anyone can be the house by depositing ETH:

```
Deposit ETH → Receive shares
Shares represent % of pool
Pool grows from house edge
Withdraw anytime (shares × pool / totalShares)
```

Risk: pool shrinks if players win more than expected. House edge ensures long-run profitability.

---

## Project Structure

```
casino/
├── contracts/
│   ├── CasinoPool.sol          # LP pool — holds all house funds
│   ├── CasinoGames.sol         # All 4 games + VRF callback
│   └── MockVRFCoordinator.sol  # Local testing only
├── scripts/
│   └── deploy.js               # Deploy + configure everything
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Layout.jsx      # Sidebar navigation
│   │   │   ├── BetPanel.jsx    # Shared bet amount UI
│   │   │   └── ResultBanner.jsx# Win/loss display
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Coinflip.jsx
│   │   │   ├── Dice.jsx
│   │   │   ├── Crash.jsx
│   │   │   ├── Slots.jsx
│   │   │   └── Pool.jsx
│   │   ├── hooks/
│   │   │   └── useContracts.js # wagmi hooks for all contracts
│   │   └── config/
│   │       ├── wagmi.js        # Chain + ABI config
│   │       └── contracts.json  # Auto-updated by deploy script
│   └── package.json
├── hardhat.config.js
├── .env.example
└── README.md
```

---

## Important Notes

- **Testnet only** — Never use real funds with this code
- **MockVRF** for local is not secure — use real Chainlink VRF on Sepolia
- **No audits** — This is a prototype, not production code
- **House edge** protects the pool mathematically over many bets

---

## Extending

To add a new game:
1. Add a `playNewGame()` function in `CasinoGames.sol`
2. Add a resolver in `_resolveNewGame()` called from `rawFulfillRandomWords`
3. Emit an event with the result
4. Add a new page in `frontend/src/pages/`
5. Use `usePlayGame("NewGameResult", onResult)` hook
