const { ethers, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

// ─── Chainlink VRF Config per network ────────────────────────────────────────
const VRF_CONFIG = {
  localhost: {
    // Uses MockVRFCoordinator — deployed by this script
    coordinator: null, // set after mock deploy
    keyHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
    subId: 1n,
  },
  sepolia: {
    coordinator: "0x9DdfaCa8183c41ad55329BdeeD9F6A8d53168B1",
    keyHash: "0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae",
    subId: BigInt(process.env.VRF_SUBSCRIPTION_ID || "0"),
  },
};

async function main() {
  const [deployer] = await ethers.getSigners();
  const net = network.name;

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`  🎰  Casino Deploy — ${net}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`  Deployer : ${deployer.address}`);
  console.log(`  Balance  : ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  const cfg = VRF_CONFIG[net] || VRF_CONFIG.localhost;

  // ── 1. Deploy Mock VRF Coordinator (local only) ───────────────────────────
  let vrfAddress = cfg.coordinator;
  if (net === "localhost" || net === "hardhat") {
    console.log("📦 Deploying MockVRFCoordinator...");
    const Mock = await ethers.getContractFactory("MockVRFCoordinator");
    const mock = await Mock.deploy();
    await mock.waitForDeployment();
    vrfAddress = await mock.getAddress();
    console.log(`   ✅ MockVRFCoordinator: ${vrfAddress}\n`);
  }

  // ── 2. Deploy CasinoPool ──────────────────────────────────────────────────
  console.log("📦 Deploying CasinoPool...");
  const Pool = await ethers.getContractFactory("CasinoPool");
  const pool = await Pool.deploy();
  await pool.waitForDeployment();
  const poolAddress = await pool.getAddress();
  console.log(`   ✅ CasinoPool: ${poolAddress}\n`);

  // ── 3. Deploy CasinoGames ─────────────────────────────────────────────────
  console.log("📦 Deploying CasinoGames...");
  const Games = await ethers.getContractFactory("CasinoGames");
  const games = await Games.deploy(
    poolAddress,
    vrfAddress,
    cfg.keyHash,
    cfg.subId
  );
  await games.waitForDeployment();
  const gamesAddress = await games.getAddress();
  console.log(`   ✅ CasinoGames: ${gamesAddress}\n`);

  // ── 4. Approve CasinoGames in pool ───────────────────────────────────────
  console.log("🔗 Approving CasinoGames in CasinoPool...");
  const tx = await pool.setGameApproved(gamesAddress, true);
  await tx.wait();
  console.log("   ✅ Done\n");

  // ── 5. Seed pool with initial liquidity (local only) ─────────────────────
  if (net === "localhost" || net === "hardhat") {
    console.log("💧 Seeding pool with 5 ETH initial liquidity...");
    const seedTx = await pool.addLiquidity({ value: ethers.parseEther("5") });
    await seedTx.wait();
    console.log("   ✅ Pool seeded\n");
  }

  // ── 6. Save addresses to frontend ────────────────────────────────────────
  const addresses = {
    network: net,
    chainId: (await ethers.provider.getNetwork()).chainId.toString(),
    CasinoPool: poolAddress,
    CasinoGames: gamesAddress,
    VRFCoordinator: vrfAddress,
    deployedAt: new Date().toISOString(),
  };

  // Write to contracts dir
  fs.writeFileSync(
    path.join(__dirname, "../deployments.json"),
    JSON.stringify(addresses, null, 2)
  );

  // Also write to frontend config
  const frontendCfg = path.join(__dirname, "../frontend/src/config/contracts.json");
  fs.mkdirSync(path.dirname(frontendCfg), { recursive: true });
  fs.writeFileSync(frontendCfg, JSON.stringify(addresses, null, 2));

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  🎉  Deployment Complete!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`  CasinoPool  : ${poolAddress}`);
  console.log(`  CasinoGames : ${gamesAddress}`);
  console.log(`  VRF         : ${vrfAddress}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  if (net === "sepolia") {
    console.log("\n📋 Next steps for Sepolia:");
    console.log("  1. Go to https://vrf.chain.link/sepolia");
    console.log("  2. Create a subscription and fund it with LINK");
    console.log(`  3. Add ${gamesAddress} as a consumer`);
    console.log("  4. Update VRF_SUBSCRIPTION_ID in .env");
    console.log("  5. Deposit liquidity via the frontend Pool page\n");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
