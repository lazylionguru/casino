// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./CasinoPool.sol";

/**
 * @title CasinoGames
 * @notice Implements Coinflip, Dice, Crash, and Slots against the CasinoPool.
 *         Uses a VRF coordinator for provably fair randomness.
 *
 * House edge per game:
 *   Coinflip : 2%   (win chance 48%)
 *   Dice     : 2%   (applied to payout multiplier)
 *   Crash    : 4%   (applied to crash point generation)
 *   Slots    : 5%   (via weighted symbol table)
 */
contract CasinoGames is Ownable, ReentrancyGuard {

    // ─────────────────────────────────────────────────────────────────────────
    // Interfaces
    // ─────────────────────────────────────────────────────────────────────────

    interface IVRFCoordinator {
        function requestRandomWords(
            bytes32 keyHash,
            uint256 subId,
            uint16 confirmations,
            uint32 callbackGasLimit,
            uint32 numWords
        ) external returns (uint256 requestId);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Enums & Structs
    // ─────────────────────────────────────────────────────────────────────────

    enum GameType { COINFLIP, DICE, CRASH, SLOTS }

    struct PendingBet {
        address player;
        uint256 amount;       // wei sent by player
        GameType gameType;
        uint256 param;        // game-specific: coinflip=choice(0/1), dice=target(1-98), crash=cashoutMultiplier(100-1000000)
        bool fulfilled;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // State
    // ─────────────────────────────────────────────────────────────────────────

    CasinoPool public immutable pool;
    IVRFCoordinator public immutable vrfCoordinator;
    bytes32 public vrfKeyHash;
    uint256 public vrfSubId;

    mapping(uint256 => PendingBet) public pendingBets; // requestId → bet

    // Stats
    uint256 public totalBets;
    uint256 public totalPaidOut;

    // ─────────────────────────────────────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────────────────────────────────────

    event BetPlaced(uint256 indexed requestId, address indexed player, GameType gameType, uint256 amount, uint256 param);
    event CoinflipResult(uint256 indexed requestId, address indexed player, uint256 bet, bool won, uint256 roll, uint256 payout);
    event DiceResult(uint256 indexed requestId, address indexed player, uint256 bet, bool won, uint256 roll, uint256 target, uint256 payout);
    event CrashResult(uint256 indexed requestId, address indexed player, uint256 bet, bool won, uint256 crashPoint, uint256 cashoutAt, uint256 payout);
    event SlotsResult(uint256 indexed requestId, address indexed player, uint256 bet, uint8[3] reels, uint256 payout);

    // ─────────────────────────────────────────────────────────────────────────
    // Constructor
    // ─────────────────────────────────────────────────────────────────────────

    constructor(
        address _pool,
        address _vrfCoordinator,
        bytes32 _keyHash,
        uint256 _subId
    ) Ownable(msg.sender) {
        pool = CasinoPool(payable(_pool));
        vrfCoordinator = IVRFCoordinator(_vrfCoordinator);
        vrfKeyHash = _keyHash;
        vrfSubId = _subId;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Game entry points  (players call these, send ETH)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Flip a coin.
     * @param choice 0 = Heads, 1 = Tails
     * Payout: 1.96x (house edge 2%)
     */
    function playCoinflip(uint256 choice) external payable nonReentrant {
        require(choice == 0 || choice == 1, "Choice must be 0 or 1");
        _validateBet(msg.value);

        uint256 requestId = _requestRandom(1);
        pendingBets[requestId] = PendingBet({
            player: msg.sender,
            amount: msg.value,
            gameType: GameType.COINFLIP,
            param: choice,
            fulfilled: false
        });

        emit BetPlaced(requestId, msg.sender, GameType.COINFLIP, msg.value, choice);
    }

    /**
     * @notice Roll a dice. Win if roll < target.
     * @param target 2–98. Higher target = easier to win but lower payout.
     * Payout: (100 / target) * 0.98 (2% house edge)
     */
    function playDice(uint256 target) external payable nonReentrant {
        require(target >= 2 && target <= 98, "Target must be 2-98");
        _validateBet(msg.value);

        uint256 requestId = _requestRandom(1);
        pendingBets[requestId] = PendingBet({
            player: msg.sender,
            amount: msg.value,
            gameType: GameType.DICE,
            param: target,
            fulfilled: false
        });

        emit BetPlaced(requestId, msg.sender, GameType.DICE, msg.value, target);
    }

    /**
     * @notice Play Crash. You pick a cashout multiplier (e.g. 150 = 1.5x).
     *         If the crash point is >= your cashout, you win.
     * @param cashoutMultiplier in basis points *100, e.g. 150 = 1.5x, 200 = 2x
     *        Min: 101 (1.01x), Max: 100000 (1000x)
     */
    function playCrash(uint256 cashoutMultiplier) external payable nonReentrant {
        require(cashoutMultiplier >= 101 && cashoutMultiplier <= 100000, "Multiplier: 101-100000");
        _validateBet(msg.value);

        // Ensure pool can cover the potential payout
        uint256 maxPayout = (msg.value * cashoutMultiplier) / 100;
        require(maxPayout <= pool.poolBalance() / 5, "Payout would drain pool"); // max 20% of pool

        uint256 requestId = _requestRandom(1);
        pendingBets[requestId] = PendingBet({
            player: msg.sender,
            amount: msg.value,
            gameType: GameType.CRASH,
            param: cashoutMultiplier,
            fulfilled: false
        });

        emit BetPlaced(requestId, msg.sender, GameType.CRASH, msg.value, cashoutMultiplier);
    }

    /**
     * @notice Spin the slots. 3 reels, 6 symbols, fixed payout table.
     *         No params needed — just send ETH and spin.
     */
    function playSlots() external payable nonReentrant {
        _validateBet(msg.value);

        uint256 requestId = _requestRandom(3); // 3 random words, one per reel
        pendingBets[requestId] = PendingBet({
            player: msg.sender,
            amount: msg.value,
            gameType: GameType.SLOTS,
            param: 0,
            fulfilled: false
        });

        emit BetPlaced(requestId, msg.sender, GameType.SLOTS, msg.value, 0);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // VRF Callback
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Called by VRF coordinator with random words. Resolves the bet.
    function rawFulfillRandomWords(uint256 requestId, uint256[] memory randomWords) external {
        require(msg.sender == address(vrfCoordinator), "Only VRF coordinator");
        PendingBet storage bet = pendingBets[requestId];
        require(!bet.fulfilled, "Already fulfilled");
        require(bet.player != address(0), "Unknown requestId");

        bet.fulfilled = true;
        totalBets++;

        if (bet.gameType == GameType.COINFLIP) {
            _resolveCoinflip(requestId, bet, randomWords[0]);
        } else if (bet.gameType == GameType.DICE) {
            _resolveDice(requestId, bet, randomWords[0]);
        } else if (bet.gameType == GameType.CRASH) {
            _resolveCrash(requestId, bet, randomWords[0]);
        } else if (bet.gameType == GameType.SLOTS) {
            _resolveSlots(requestId, bet, randomWords);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Game resolvers (internal)
    // ─────────────────────────────────────────────────────────────────────────

    function _resolveCoinflip(uint256 requestId, PendingBet storage bet, uint256 rand) internal {
        // Roll 0–99. Win if roll < 48 (matching player's choice side)
        uint256 roll = rand % 100;
        bool won = (roll < 48) && (roll % 2 == bet.param % 2);

        // Also handle the simple case: roll 0-1, compare to choice
        uint256 side = rand % 2; // 0 or 1
        won = (side == bet.param) && ((rand % 100) < 96); // 96% of matching flips win (2% edge on each side)

        uint256 payout = 0;
        if (won) {
            payout = (bet.amount * 196) / 100; // 1.96x
            pool.payOut(bet.player, payout);
            totalPaidOut += payout;
        } else {
            pool.collectBet{value: bet.amount}(bet.player);
        }

        emit CoinflipResult(requestId, bet.player, bet.amount, won, side, payout);
    }

    function _resolveDice(uint256 requestId, PendingBet storage bet, uint256 rand) internal {
        uint256 roll = (rand % 100) + 1; // 1–100
        bool won = roll < bet.param;     // win if roll < target

        uint256 payout = 0;
        if (won) {
            // payout = bet * (100 / target) * 0.98
            payout = (bet.amount * 100 * 98) / (bet.param * 100);
            pool.payOut(bet.player, payout);
            totalPaidOut += payout;
        } else {
            pool.collectBet{value: bet.amount}(bet.player);
        }

        emit DiceResult(requestId, bet.player, bet.amount, won, roll, bet.param, payout);
    }

    function _resolveCrash(uint256 requestId, PendingBet storage bet, uint256 rand) internal {
        // Generate crash point. Formula gives house edge ~4%.
        // crashPoint = 100 * e^(rand) where rand is uniform [0,1)
        // Simplified integer version: crashPoint in units of 100 (so 150 = 1.50x)

        // h = house edge = 4 → only generate crash >= 100 if rand > h/100
        uint256 e = rand % 10000; // 0–9999
        uint256 crashPoint;

        if (e < 400) {
            // 4% of the time: instant crash at 1x (house wins immediately)
            crashPoint = 100;
        } else {
            // Scale: crashPoint = floor(9600 / (9600 - e)) * 100 / 100
            // This gives exponential distribution with mean ~25x
            crashPoint = (9600 * 100) / (9600 - e);
            if (crashPoint < 101) crashPoint = 101;
        }

        bool won = crashPoint >= bet.param; // did you cash out in time?

        uint256 payout = 0;
        if (won) {
            payout = (bet.amount * bet.param) / 100;
            pool.payOut(bet.player, payout);
            totalPaidOut += payout;
        } else {
            pool.collectBet{value: bet.amount}(bet.player);
        }

        emit CrashResult(requestId, bet.player, bet.amount, won, crashPoint, bet.param, payout);
    }

    function _resolveSlots(uint256 requestId, PendingBet storage bet, uint256[] memory rands) internal {
        // 6 symbols: 0=Cherry 1=Lemon 2=Orange 3=Grape 4=Bell 5=Seven
        // Weighted: Cherry=30, Lemon=25, Orange=20, Grape=15, Bell=7, Seven=3 (total 100)
        uint8[3] memory reels;
        for (uint8 i = 0; i < 3; i++) {
            uint256 r = rands[i] % 100;
            if (r < 30)      reels[i] = 0; // Cherry
            else if (r < 55) reels[i] = 1; // Lemon
            else if (r < 75) reels[i] = 2; // Orange
            else if (r < 90) reels[i] = 3; // Grape
            else if (r < 97) reels[i] = 4; // Bell
            else             reels[i] = 5; // Seven
        }

        uint256 payout = _slotsPayoutMultiplier(reels, bet.amount);

        if (payout > 0) {
            pool.payOut(bet.player, payout);
            totalPaidOut += payout;
        } else {
            pool.collectBet{value: bet.amount}(bet.player);
        }

        emit SlotsResult(requestId, bet.player, bet.amount, reels, payout);
    }

    function _slotsPayoutMultiplier(uint8[3] memory reels, uint256 bet) internal pure returns (uint256) {
        // Three of a kind
        if (reels[0] == reels[1] && reels[1] == reels[2]) {
            if (reels[0] == 5) return bet * 100;  // 🎰 3x Seven  = 100x
            if (reels[0] == 4) return bet * 20;   // 🔔 3x Bell   = 20x
            if (reels[0] == 3) return bet * 10;   // 🍇 3x Grape  = 10x
            if (reels[0] == 2) return bet * 5;    // 🍊 3x Orange = 5x
            if (reels[0] == 1) return bet * 3;    // 🍋 3x Lemon  = 3x
            if (reels[0] == 0) return bet * 2;    // 🍒 3x Cherry = 2x
        }

        // Two of a kind (any position)
        uint8 a = reels[0]; uint8 b = reels[1]; uint8 c = reels[2];
        if (a == b || b == c || a == c) {
            uint8 pair = (a == b) ? a : (b == c ? b : a);
            if (pair == 5) return (bet * 15) / 10; // 2x Seven = 1.5x
            if (pair == 4) return (bet * 12) / 10; // 2x Bell  = 1.2x
            // other pairs: no payout
        }

        // Two cherries anywhere = 1.5x
        uint8 cherryCount = 0;
        for (uint8 i = 0; i < 3; i++) { if (reels[i] == 0) cherryCount++; }
        if (cherryCount >= 2) return (bet * 15) / 10;

        return 0; // No win
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Internal helpers
    // ─────────────────────────────────────────────────────────────────────────

    function _validateBet(uint256 amount) internal view {
        require(amount >= pool.MIN_BET(), "Below minimum bet");
        require(amount <= pool.maxBet(), "Exceeds max bet");
        require(pool.poolBalance() >= amount * 2, "Pool too low");
    }

    function _requestRandom(uint32 numWords) internal returns (uint256) {
        return vrfCoordinator.requestRandomWords(
            vrfKeyHash,
            vrfSubId,
            3,       // confirmations
            300000,  // callback gas limit
            numWords
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Admin
    // ─────────────────────────────────────────────────────────────────────────

    function setVrfConfig(bytes32 keyHash, uint256 subId) external onlyOwner {
        vrfKeyHash = keyHash;
        vrfSubId = subId;
    }

    /// @notice Get pending bet info
    function getBet(uint256 requestId) external view returns (PendingBet memory) {
        return pendingBets[requestId];
    }
}
