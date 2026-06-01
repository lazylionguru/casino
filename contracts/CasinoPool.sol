// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title CasinoPool
 * @notice The house liquidity pool. LP providers deposit ETH and earn from house edge.
 *         All games interact with this pool to pay out wins and collect losses.
 *
 * Flow:
 *   LP deposits ETH → gets shares
 *   Player wins     → pool pays player
 *   Player loses    → pool collects bet
 *   LP withdraws    → burns shares, gets ETH back (+/- PnL)
 */
contract CasinoPool is Ownable, ReentrancyGuard {
    // ─────────────────────────────────────────────────────────────────────────
    // State
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Total LP shares in existence
    uint256 public totalShares;

    /// @notice Shares owned by each LP
    mapping(address => uint256) public shares;

    /// @notice Only approved game contracts can call payOut / collectBet
    mapping(address => bool) public approvedGames;

    /// @notice Max single bet as a fraction of pool (100 = 1%, 1000 = 10%)
    uint256 public maxBetBps = 200; // 2% of pool by default

    /// @notice Min bet in wei (0.0001 ETH)
    uint256 public constant MIN_BET = 0.0001 ether;

    // ─────────────────────────────────────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────────────────────────────────────

    event LiquidityAdded(address indexed provider, uint256 ethAmount, uint256 sharesIssued);
    event LiquidityRemoved(address indexed provider, uint256 ethAmount, uint256 sharesBurned);
    event GameApproved(address indexed game, bool approved);
    event PayoutSent(address indexed player, uint256 amount);
    event BetCollected(address indexed player, uint256 amount);

    // ─────────────────────────────────────────────────────────────────────────
    // Constructor
    // ─────────────────────────────────────────────────────────────────────────

    constructor() Ownable(msg.sender) {}

    // ─────────────────────────────────────────────────────────────────────────
    // LP functions
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Deposit ETH into the pool and receive LP shares
    function addLiquidity() external payable nonReentrant {
        require(msg.value >= 0.001 ether, "Min deposit: 0.001 ETH");

        uint256 sharesToIssue;
        uint256 poolBalance = address(this).balance - msg.value; // balance before this deposit

        if (totalShares == 0 || poolBalance == 0) {
            // First deposit: 1 share per wei
            sharesToIssue = msg.value;
        } else {
            // Proportional shares: newShares = deposit * totalShares / poolBalance
            sharesToIssue = (msg.value * totalShares) / poolBalance;
        }

        shares[msg.sender] += sharesToIssue;
        totalShares += sharesToIssue;

        emit LiquidityAdded(msg.sender, msg.value, sharesToIssue);
    }

    /// @notice Burn LP shares and withdraw proportional ETH
    function removeLiquidity(uint256 shareAmount) external nonReentrant {
        require(shares[msg.sender] >= shareAmount, "Insufficient shares");
        require(shareAmount > 0, "Cannot remove 0 shares");

        uint256 ethAmount = (shareAmount * address(this).balance) / totalShares;
        require(ethAmount > 0, "Nothing to withdraw");
        require(address(this).balance >= ethAmount, "Pool too low");

        shares[msg.sender] -= shareAmount;
        totalShares -= shareAmount;

        (bool ok, ) = payable(msg.sender).call{value: ethAmount}("");
        require(ok, "ETH transfer failed");

        emit LiquidityRemoved(msg.sender, ethAmount, shareAmount);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Game interaction (only approved game contracts)
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Pay out a winner. Called by game contracts.
    function payOut(address player, uint256 amount) external nonReentrant {
        require(approvedGames[msg.sender], "Not an approved game");
        require(address(this).balance >= amount, "Pool insufficient funds");

        (bool ok, ) = payable(player).call{value: amount}("");
        require(ok, "Payout failed");

        emit PayoutSent(player, amount);
    }

    /// @notice Receive a lost bet into the pool. Game contracts send ETH here.
    function collectBet(address player) external payable {
        require(approvedGames[msg.sender], "Not an approved game");
        emit BetCollected(player, msg.value);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // View helpers
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Total ETH in the pool
    function poolBalance() external view returns (uint256) {
        return address(this).balance;
    }

    /// @notice Max allowed single bet
    function maxBet() external view returns (uint256) {
        return (address(this).balance * maxBetBps) / 10000;
    }

    /// @notice How much ETH an LP's shares are worth right now
    function shareValue(address lp) external view returns (uint256) {
        if (totalShares == 0) return 0;
        return (shares[lp] * address(this).balance) / totalShares;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Admin
    // ─────────────────────────────────────────────────────────────────────────

    function setGameApproved(address game, bool approved) external onlyOwner {
        approvedGames[game] = approved;
        emit GameApproved(game, approved);
    }

    function setMaxBetBps(uint256 bps) external onlyOwner {
        require(bps <= 1000, "Max 10%");
        maxBetBps = bps;
    }

    /// @notice Emergency withdrawal by owner only (leaves pool functional)
    receive() external payable {}
}
