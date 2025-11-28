/**
 * Impulse Lab - app.js
 *
 * A behavioral measurement game that tests impulse control
 * and reaction time through tap-based mini-tasks.
 *
 * Architecture:
 * - MODES: Config object defining available game modes
 * - DIFFICULTY_CONFIG: Settings for easy/normal/hard
 * - CAMPAIGN_CONFIG: Level progression settings
 * - COLORS/SHAPES: Visual elements
 * - state: Central state object for all game data
 * - campaign: Campaign progression state (persisted)
 */

// ===== BACKGROUND MUSIC =====

const MUSIC_TRACKS = [
  // Ambient/chill tracks (royalty-free)
  "https://cdn.pixabay.com/audio/2022/10/25/audio_570a6384f4.mp3", // Chill ambient
  "https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3", // Lo-fi chill
  "https://cdn.pixabay.com/audio/2023/07/30/audio_e4b7e93c99.mp3", // Relaxing ambient
];

let musicAudio = null;
let musicPlaying = false;
let currentTrackIndex = 0;

/**
 * Initialize background music system
 */
function initMusic() {
  musicAudio = new Audio();
  musicAudio.loop = true;
  musicAudio.volume = 0.3;

  // Load saved preference
  const savedPref = localStorage.getItem("impulseLab_music");
  if (savedPref === "on") {
    playMusic();
  }
}

/**
 * Toggle background music on/off
 */
function toggleMusic() {
  if (musicPlaying) {
    pauseMusic();
  } else {
    playMusic();
  }
}

/**
 * Start playing background music
 */
function playMusic() {
  if (!musicAudio) initMusic();

  musicAudio.src = MUSIC_TRACKS[currentTrackIndex];
  musicAudio.play().then(() => {
    musicPlaying = true;
    updateMusicUI();
    localStorage.setItem("impulseLab_music", "on");
  }).catch(e => {
    console.log("Music autoplay blocked, user interaction required");
  });
}

/**
 * Pause background music
 */
function pauseMusic() {
  if (musicAudio) {
    musicAudio.pause();
    musicPlaying = false;
    updateMusicUI();
    localStorage.setItem("impulseLab_music", "off");
  }
}

/**
 * Update music toggle button UI
 */
function updateMusicUI() {
  const toggle = document.getElementById("music-toggle");
  const icon = document.getElementById("music-icon");

  if (toggle && icon) {
    if (musicPlaying) {
      toggle.classList.add("playing");
      icon.textContent = "🎵";
    } else {
      toggle.classList.remove("playing");
      icon.textContent = "🔇";
    }
  }
}

// Music toggle event listener
document.addEventListener("DOMContentLoaded", () => {
  const musicToggle = document.getElementById("music-toggle");
  if (musicToggle) {
    musicToggle.addEventListener("click", toggleMusic);
  }

  // Try to restore music state
  const savedPref = localStorage.getItem("impulseLab_music");
  if (savedPref === "on") {
    // Will attempt to play on first user interaction due to autoplay policies
    document.addEventListener("click", function playOnFirstClick() {
      if (!musicPlaying && localStorage.getItem("impulseLab_music") === "on") {
        playMusic();
      }
      document.removeEventListener("click", playOnFirstClick);
    }, { once: true });
  }

  updateMusicUI();
});

// ===== CONFIGURATION =====

// Available colors for the symbol
const COLORS = {
  blue: "#00d4ff",
  red: "#ff4466",
  purple: "#a855f7",
  yellow: "#facc15",
  green: "#22c55e"
};

// Color keys for random selection
const COLOR_KEYS = Object.keys(COLORS);

// Available shapes for the symbol
const SHAPES = ["circle", "square", "triangle", "diamond"];

// ===== AUDIO SYSTEM =====

// Audio context (created on first user interaction)
let audioContext = null;

/**
 * Initializes the audio context (must be called after user interaction)
 */
function initAudio() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  // Resume if suspended (iOS requirement)
  if (audioContext.state === "suspended") {
    audioContext.resume();
  }
}

/**
 * Plays a synthesized sound effect
 * @param {string} type - "hit", "fail", "levelUp", "gameOver", "click"
 */
function playSound(type) {
  if (!audioContext) return;

  const now = audioContext.currentTime;

  switch (type) {
    case "hit":
      // Pleasant ascending chime for correct tap
      playTone(880, 0.1, "sine", 0.3);      // A5
      setTimeout(() => playTone(1108, 0.1, "sine", 0.25), 50);  // C#6
      setTimeout(() => playTone(1318, 0.15, "sine", 0.2), 100); // E6
      break;

    case "fail":
      // Low buzz/thud for wrong tap
      playTone(150, 0.15, "sawtooth", 0.3);
      playTone(120, 0.2, "square", 0.15);
      break;

    case "levelUp":
      // Triumphant ascending arpeggio
      playTone(523, 0.15, "sine", 0.25);    // C5
      setTimeout(() => playTone(659, 0.15, "sine", 0.25), 100);  // E5
      setTimeout(() => playTone(784, 0.15, "sine", 0.25), 200);  // G5
      setTimeout(() => playTone(1047, 0.25, "sine", 0.3), 300);  // C6
      break;

    case "gameOver":
      // Descending sad tones
      playTone(400, 0.2, "sine", 0.3);
      setTimeout(() => playTone(350, 0.2, "sine", 0.25), 150);
      setTimeout(() => playTone(300, 0.3, "sine", 0.2), 300);
      setTimeout(() => playTone(200, 0.4, "triangle", 0.15), 450);
      break;

    case "click":
      // Subtle click for UI interactions
      playTone(600, 0.05, "sine", 0.1);
      break;

    case "start":
      // Quick ready tone
      playTone(440, 0.1, "sine", 0.2);
      setTimeout(() => playTone(880, 0.15, "sine", 0.25), 100);
      break;
  }
}

/**
 * Plays a single tone
 * @param {number} frequency - Frequency in Hz
 * @param {number} duration - Duration in seconds
 * @param {string} waveType - "sine", "square", "sawtooth", "triangle"
 * @param {number} volume - Volume from 0 to 1
 */
function playTone(frequency, duration, waveType = "sine", volume = 0.2) {
  if (!audioContext) return;

  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.type = waveType;
  oscillator.frequency.value = frequency;

  // ADSR envelope for smoother sound
  const now = audioContext.currentTime;
  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(volume, now + 0.01); // Attack
  gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration); // Decay/Release

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.start(now);
  oscillator.stop(now + duration);
}

// Difficulty presets (used in free play)
const DIFFICULTY_CONFIG = {
  easy: {
    label: "Easy",
    maxTrials: 20,
    trialDuration: 1000,
    targetProbability: 0.5
  },
  normal: {
    label: "Normal",
    maxTrials: 25,
    trialDuration: 800,
    targetProbability: 0.4
  },
  hard: {
    label: "Hard",
    maxTrials: 30,
    trialDuration: 600,
    targetProbability: 0.3
  }
};

// Difficulty progression order
const DIFFICULTY_ORDER = ["easy", "normal", "hard"];

// Vigilance mode difficulty presets (longer sessions, rarer targets, variable tempo)
const VIGILANCE_DIFFICULTY_CONFIG = {
  easy: {
    label: "Easy",
    maxTrials: 40,           // ~1.5 minutes
    trialDurationMin: 1500,  // Variable tempo range
    trialDurationMax: 2500,
    targetProbability: 0.15  // ~6 targets expected
  },
  normal: {
    label: "Normal",
    maxTrials: 60,           // ~2 minutes
    trialDurationMin: 1000,  // Wider tempo range
    trialDurationMax: 3000,
    targetProbability: 0.10  // ~6 targets expected
  },
  hard: {
    label: "Hard",
    maxTrials: 80,           // ~2.5 minutes
    trialDurationMin: 600,   // Very wide tempo range (fast to slow)
    trialDurationMax: 3500,
    targetProbability: 0.08  // ~6-7 targets expected
  }
};

// Campaign level configuration
const CAMPAIGN_CONFIG = {
  maxLives: 3,
  trialsPerLevel: 20,
  // Unlocks: what gets unlocked at each level
  unlocks: {
    1: { type: "mode", id: "tapOnBlue", label: "Tap on Blue mode" },
    3: { type: "feature", id: "moving", label: "Moving Objects" },
    4: { type: "mode", id: "blueCircle", label: "Blue Circle mode" },
    5: { type: "mode", id: "multiTarget", label: "Multi-Target mode" }
  }
};

/**
 * Calculates difficulty parameters for a given level
 * Difficulty increases faster with steeper curve
 *
 * Level progression:
 * - Levels 1-2: Tap on Blue (static)
 * - Level 3: Tap on Blue with MOVING objects
 * - Level 4: Blue Circle mode (moving)
 * - Level 5+: Multi-Target mode (moving)
 *   - Level 5-6: 2 objects
 *   - Level 7-8: 3 objects
 *   - Level 9-10: 4 objects
 *   - Level 11-12: 5 objects
 *   - etc. (+1 object every 2 levels)
 */
function getLevelConfig(level) {
  // Determine mode based on level
  let mode, symbolCount = 1;
  let isMoving = level >= 3; // Objects start moving at level 3

  if (level >= 5) {
    mode = "multiTarget";
    // Symbol count: starts at 2, increases by 1 every 2 levels
    // Level 5-6: 2, Level 7-8: 3, Level 9-10: 4, etc.
    symbolCount = 2 + Math.floor((level - 5) / 2);
    // Cap at reasonable maximum (6 objects)
    symbolCount = Math.min(6, symbolCount);
  } else if (level >= 4) {
    mode = "blueCircle";
  } else {
    mode = "tapOnBlue";
  }

  // Trial duration: starts at 900ms (harder), decreases by 50ms per level (faster), min 350ms
  const trialDuration = Math.max(350, 900 - (level - 1) * 50);

  // Target probability: starts at 0.45 (less targets = harder), decreases by 0.02 per level, min 0.15
  const targetProbability = Math.max(0.15, 0.45 - (level - 1) * 0.02);

  // Pass score: starts at 55 (higher bar), increases by 2 per level, max 85
  const passScore = Math.min(85, Math.round(55 + (level - 1) * 2));

  return {
    mode,
    symbolCount,
    trialDuration,
    targetProbability,
    passScore,
    isMoving
  };
}

// Level badge names
const LEVEL_BADGES = {
  1: { name: "Novice", icon: "🌱" },
  5: { name: "Apprentice", icon: "🎯" },
  10: { name: "Skilled", icon: "⚡" },
  15: { name: "Expert", icon: "🔥" },
  20: { name: "Master", icon: "👑" },
  25: { name: "Legend", icon: "💎" }
};

// Game modes configuration
const MODES = {
  tapOnBlue: {
    id: "tapOnBlue",
    label: "Tap on Blue",
    description: "Tap when the symbol is blue. Stay still for any other color.",
    hint: "Tap when it's blue. Stay still otherwise.",
    useShapes: false,
    unlockLevel: 1, // Available from start
    isTarget: (color, shape) => color === "blue",
    getTrialProps: (targetProbability) => {
      if (Math.random() < targetProbability) {
        return { color: "blue", shape: "circle" };
      }
      const nonBlueColors = COLOR_KEYS.filter(c => c !== "blue");
      return {
        color: nonBlueColors[Math.floor(Math.random() * nonBlueColors.length)],
        shape: "circle"
      };
    }
  },
  blueCircle: {
    id: "blueCircle",
    label: "Blue Circle",
    description: "Tap only when you see a blue circle. Ignore other colors and shapes.",
    hint: "Tap only on blue circles. Ignore other shapes and colors.",
    useShapes: true,
    unlockLevel: 4, // Unlocked at level 4
    isTarget: (color, shape) => color === "blue" && shape === "circle",
    getTrialProps: (targetProbability) => {
      if (Math.random() < targetProbability) {
        return { color: "blue", shape: "circle" };
      }
      const changeType = Math.random();
      if (changeType < 0.33) {
        const nonBlueColors = COLOR_KEYS.filter(c => c !== "blue");
        return {
          color: nonBlueColors[Math.floor(Math.random() * nonBlueColors.length)],
          shape: "circle"
        };
      } else if (changeType < 0.66) {
        const nonCircleShapes = SHAPES.filter(s => s !== "circle");
        return {
          color: "blue",
          shape: nonCircleShapes[Math.floor(Math.random() * nonCircleShapes.length)]
        };
      } else {
        const nonBlueColors = COLOR_KEYS.filter(c => c !== "blue");
        const nonCircleShapes = SHAPES.filter(s => s !== "circle");
        return {
          color: nonBlueColors[Math.floor(Math.random() * nonBlueColors.length)],
          shape: nonCircleShapes[Math.floor(Math.random() * nonCircleShapes.length)]
        };
      }
    }
  },
  multiTarget: {
    id: "multiTarget",
    label: "Multi-Target",
    description: "Multiple shapes appear at once. Tap only when you see a blue circle among them!",
    hint: "Find the blue circle among multiple shapes!",
    useShapes: true,
    isMulti: true, // Flag for multi-symbol mode
    unlockLevel: 5, // Unlocked at level 5
    isTarget: (color, shape) => color === "blue" && shape === "circle",
    // For multi-target, we generate an array of symbols
    getTrialProps: (targetProbability, symbolCount = 2) => {
      const symbols = [];
      const hasTarget = Math.random() < targetProbability;

      if (hasTarget) {
        // Add the target (blue circle) at a random position
        const targetIndex = Math.floor(Math.random() * symbolCount);

        for (let i = 0; i < symbolCount; i++) {
          if (i === targetIndex) {
            symbols.push({ color: "blue", shape: "circle" });
          } else {
            // Add a distractor (anything except blue circle)
            symbols.push(generateDistractor());
          }
        }
      } else {
        // No target - all distractors
        for (let i = 0; i < symbolCount; i++) {
          symbols.push(generateDistractor());
        }
      }

      return { symbols, hasTarget };
    }
  },
  // Focus Lab - standalone vigilance mode (not shown in dropdown)
  focusLab: {
    id: "focusLab",
    label: "Focus Lab",
    description: "Test your sustained attention with variable tempo over time.",
    hint: "Stay focused. Targets are rare but you must catch them all.",
    useShapes: false,
    isVigilance: true,
    isHidden: true, // Don't show in mode selector - has its own UI
    isTarget: (color, shape) => color === "blue",
    getTrialProps: (targetProbability) => {
      if (Math.random() < targetProbability) {
        return { color: "blue", shape: "circle" };
      }
      const nonBlueColors = COLOR_KEYS.filter(c => c !== "blue");
      return {
        color: nonBlueColors[Math.floor(Math.random() * nonBlueColors.length)],
        shape: "circle"
      };
    }
  }
};

/**
 * Generates a distractor (any color/shape combo except blue circle)
 */
function generateDistractor() {
  const distractorType = Math.random();

  if (distractorType < 0.4) {
    // Non-blue circle (tempting!)
    const nonBlueColors = COLOR_KEYS.filter(c => c !== "blue");
    return {
      color: nonBlueColors[Math.floor(Math.random() * nonBlueColors.length)],
      shape: "circle"
    };
  } else if (distractorType < 0.7) {
    // Blue non-circle (very tempting!)
    const nonCircleShapes = SHAPES.filter(s => s !== "circle");
    return {
      color: "blue",
      shape: nonCircleShapes[Math.floor(Math.random() * nonCircleShapes.length)]
    };
  } else {
    // Random non-blue, non-circle
    const nonBlueColors = COLOR_KEYS.filter(c => c !== "blue");
    const nonCircleShapes = SHAPES.filter(s => s !== "circle");
    return {
      color: nonBlueColors[Math.floor(Math.random() * nonBlueColors.length)],
      shape: nonCircleShapes[Math.floor(Math.random() * nonCircleShapes.length)]
    };
  }
}

// ===== STATE MANAGEMENT =====

// Campaign state (persisted to localStorage)
const campaign = {
  level: 1,
  highestLevel: 1,
  lives: CAMPAIGN_CONFIG.maxLives,
  streak: 0, // Consecutive levels passed
  totalGamesPlayed: 0,
  unlockedModes: ["tapOnBlue"] // Modes unlocked so far
};

// Session state (not persisted)
const state = {
  status: "idle",           // "idle" | "running" | "finished"
  gameMode: "freeplay",     // "freeplay" | "campaign"
  currentMode: "tapOnBlue", // Current game mode ID
  difficulty: "normal",     // "easy" | "normal" | "hard" (for freeplay)

  // Session parameters
  maxTrials: 25,
  trialDuration: 800,
  trialDurationMin: 800,    // For variable tempo (vigilance mode)
  trialDurationMax: 800,    // For variable tempo (vigilance mode)
  targetProbability: 0.4,
  passScore: 50,            // Score needed to pass (campaign)
  symbolCount: 1,           // Number of symbols to show (for multi-target)
  isMoving: false,          // Whether objects should move around

  // Trial tracking
  trialIndex: 0,

  // Performance metrics
  hits: 0,
  misses: 0,
  falseTaps: 0,
  totalTargets: 0,          // Actual number of targets shown
  reactionTimes: [],

  // Vigilance mode tracking (performance over time in quarters)
  vigilanceQuarters: [
    { hits: 0, misses: 0, falseTaps: 0, targets: 0, reactionTimes: [] },
    { hits: 0, misses: 0, falseTaps: 0, targets: 0, reactionTimes: [] },
    { hits: 0, misses: 0, falseTaps: 0, targets: 0, reactionTimes: [] },
    { hits: 0, misses: 0, falseTaps: 0, targets: 0, reactionTimes: [] }
  ],

  // Current trial state
  currentColor: "blue",
  currentShape: "circle",
  currentSymbols: [],       // Array of symbols for multi-target mode
  currentIsTarget: false,
  hasTappedThisTrial: false,
  trialStartTime: 0,
  trialTimeoutId: null,

  // Results
  lastScore: null,
  levelPassed: false,
  newUnlock: null // Stores any new unlock to display
};

// ===== DOM ELEMENTS =====
const elements = {
  // Screens
  screenHome: document.getElementById("screen-home"),
  screenGame: document.getElementById("screen-game"),
  screenResults: document.getElementById("screen-results"),

  // Buttons
  btnStart: document.getElementById("btn-start"),
  btnCampaign: document.getElementById("btn-campaign"),
  btnPlayAgain: document.getElementById("btn-play-again"),
  btnNextLevel: document.getElementById("btn-next-level"),
  btnHome: document.getElementById("btn-home"),
  btnGameBack: document.getElementById("btn-game-back"),

  // Selectors (freeplay)
  modeSelect: document.getElementById("mode-select"),
  difficultySelect: document.getElementById("difficulty-select"),
  freeplayOptions: document.getElementById("freeplay-options"),

  // Campaign display on home
  campaignStatus: document.getElementById("campaign-status"),
  campaignLevel: document.getElementById("campaign-level"),
  campaignLives: document.getElementById("campaign-lives"),
  campaignBadge: document.getElementById("campaign-badge"),
  campaignHighest: document.getElementById("campaign-highest"),

  // Game elements
  tapArea: document.getElementById("tap-area"),
  symbol: document.getElementById("symbol"),
  symbolsContainer: document.getElementById("symbols-container"),
  trialCounter: document.getElementById("trial-counter"),
  timeLeft: document.getElementById("time-left"),
  hint: document.querySelector(".hint"),
  livesDisplay: document.getElementById("lives-display"),
  levelDisplay: document.getElementById("level-display"),
  streakDisplay: document.getElementById("streak-display"),

  // Results elements
  resultsTitle: document.getElementById("results-title"),
  resultsHits: document.getElementById("results-hits"),
  resultsMisses: document.getElementById("results-misses"),
  resultsFalse: document.getElementById("results-false"),
  resultsRT: document.getElementById("results-rt"),
  resultsScore: document.getElementById("results-score"),
  resultsPassScore: document.getElementById("results-pass-score"),
  resultsComment: document.getElementById("results-comment"),
  difficultySuggestion: document.getElementById("difficulty-suggestion"),
  campaignResults: document.getElementById("campaign-results"),
  unlockNotification: document.getElementById("unlock-notification"),

  // Vigilance results elements
  vigilanceResults: document.getElementById("vigilance-results"),
  vigilanceComment: document.getElementById("vigilance-comment"),
  q1Bar: document.getElementById("q1-bar"),
  q2Bar: document.getElementById("q2-bar"),
  q3Bar: document.getElementById("q3-bar"),
  q4Bar: document.getElementById("q4-bar"),
  q1Rt: document.getElementById("q1-rt"),
  q2Rt: document.getElementById("q2-rt"),
  q3Rt: document.getElementById("q3-rt"),
  q4Rt: document.getElementById("q4-rt"),

  // Focus Lab elements
  focusLabSection: document.getElementById("focus-lab-section"),
  focusDifficulty: document.getElementById("focus-difficulty"),
  btnFocusLab: document.getElementById("btn-focus-lab"),
  focusLoginHint: document.getElementById("focus-login-hint"),
  // Auth prompt elements
  authPrompt: document.getElementById("auth-prompt"),
  btnSignIn: document.getElementById("btn-sign-in"),
  btnSignUp: document.getElementById("btn-sign-up"),

  // Auth modal elements
  authModal: document.getElementById("auth-modal"),
  authTitle: document.getElementById("auth-title"),
  authForm: document.getElementById("auth-form"),
  authEmail: document.getElementById("auth-email"),
  authPassword: document.getElementById("auth-password"),
  authError: document.getElementById("auth-error"),
  authSubmit: document.getElementById("auth-submit"),
  authClose: document.getElementById("auth-close"),
  authSwitchText: document.getElementById("auth-switch-text"),
  authSwitchBtn: document.getElementById("auth-switch-btn"),
  signupFields: document.getElementById("signup-fields"),
  authUsername: document.getElementById("auth-username"),
  authCountry: document.getElementById("auth-country"),

  // User bar elements
  userBar: document.getElementById("user-bar"),
  userEmail: document.getElementById("user-email"),
  btnHistory: document.getElementById("btn-history"),
  btnLogout: document.getElementById("btn-logout"),

  // History screen elements
  screenHistory: document.getElementById("screen-history"),
  btnHistoryClose: document.getElementById("btn-history-close"),
  btnHistoryBack: document.getElementById("btn-history-back"),
  historyChart: document.getElementById("history-chart"),
  historySessions: document.getElementById("history-sessions"),
  historyAvgScore: document.getElementById("history-avg-score"),
  historyBestTime: document.getElementById("history-best-time"),
  historyListItems: document.getElementById("history-list-items"),
  filterBtns: document.querySelectorAll(".filter-btn"),

  // Leaderboard screen elements
  screenLeaderboard: document.getElementById("screen-leaderboard"),
  btnLeaderboard: document.getElementById("btn-leaderboard"),
  btnLeaderboardClose: document.getElementById("btn-leaderboard-close"),
  btnLeaderboardBack: document.getElementById("btn-leaderboard-back"),
  leaderboardList: document.getElementById("leaderboard-list"),
  leaderboardFilterBtns: document.querySelectorAll(".leaderboard-filter-btn")
};

// ===== LOCAL STORAGE =====

const STORAGE_KEY = "impulseLab_campaign";

/**
 * Saves campaign progress to localStorage
 */
function saveCampaign() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(campaign));
  } catch (e) {
    console.warn("Could not save campaign progress:", e);
  }
}

/**
 * Loads campaign progress from localStorage
 */
function loadCampaign() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const data = JSON.parse(saved);
      campaign.level = data.level || 1;
      campaign.highestLevel = data.highestLevel || 1;
      campaign.lives = data.lives ?? CAMPAIGN_CONFIG.maxLives;
      campaign.streak = data.streak || 0;
      campaign.totalGamesPlayed = data.totalGamesPlayed || 0;
      campaign.unlockedModes = data.unlockedModes || ["tapOnBlue"];
    }
  } catch (e) {
    console.warn("Could not load campaign progress:", e);
  }
}

/**
 * Resets campaign to initial state
 */
function resetCampaign() {
  campaign.level = 1;
  campaign.lives = CAMPAIGN_CONFIG.maxLives;
  campaign.streak = 0;
  // Keep highestLevel and unlockedModes
  saveCampaign();
}

// ===== SCREEN NAVIGATION =====

/**
 * Switches between screens by adding/removing the .hidden class
 * @param {string} name - "home", "game", "results", "history", or "leaderboard"
 */
function showScreen(name) {
  elements.screenHome.classList.add("hidden");
  elements.screenGame.classList.add("hidden");
  elements.screenResults.classList.add("hidden");
  if (elements.screenHistory) elements.screenHistory.classList.add("hidden");
  if (elements.screenLeaderboard) elements.screenLeaderboard.classList.add("hidden");

  switch (name) {
    case "home":
      elements.screenHome.classList.remove("hidden");
      updateHomeScreen();
      break;
    case "game":
      elements.screenGame.classList.remove("hidden");
      break;
    case "results":
      elements.screenResults.classList.remove("hidden");
      break;
    case "history":
      if (elements.screenHistory) {
        elements.screenHistory.classList.remove("hidden");
        loadHistory();
      }
      break;
    case "leaderboard":
      if (elements.screenLeaderboard) {
        elements.screenLeaderboard.classList.remove("hidden");
        loadLeaderboard();
      }
      break;
  }
}

/**
 * Updates the home screen with current campaign status
 */
async function updateHomeScreen() {
  // Update campaign status display
  if (elements.campaignLevel) {
    elements.campaignLevel.textContent = campaign.level;
  }
  if (elements.campaignLives) {
    elements.campaignLives.innerHTML = "❤️".repeat(campaign.lives) +
      "<span class='life-empty'>♡</span>".repeat(CAMPAIGN_CONFIG.maxLives - campaign.lives);
  }
  if (elements.campaignHighest) {
    elements.campaignHighest.textContent = campaign.highestLevel;
  }
  if (elements.campaignBadge) {
    const badge = getCurrentBadge();
    elements.campaignBadge.textContent = `${badge.icon} ${badge.name}`;
  }

  // Update mode selector based on unlocks
  updateModeSelector();

  // Update auth UI
  await updateAuthUI();
}

/**
 * Gets the current badge based on highest level
 */
function getCurrentBadge() {
  let currentBadge = { name: "Novice", icon: "🌱" };
  for (const [level, badge] of Object.entries(LEVEL_BADGES)) {
    if (campaign.highestLevel >= parseInt(level)) {
      currentBadge = badge;
    }
  }
  return currentBadge;
}

// ===== INITIALIZATION =====

/**
 * Populates the mode and difficulty selectors on page load
 */
function initializeSelectors() {
  updateModeSelector();

  // Populate difficulty selector
  if (elements.difficultySelect) {
    elements.difficultySelect.innerHTML = "";
    for (const diffKey of DIFFICULTY_ORDER) {
      const diff = DIFFICULTY_CONFIG[diffKey];
      const option = document.createElement("option");
      option.value = diffKey;
      option.textContent = diff.label;
      elements.difficultySelect.appendChild(option);
    }
    elements.difficultySelect.value = state.difficulty;
  }
}

/**
 * Updates mode selector based on unlocked modes
 * Standalone modes (like Stay With It) are always available
 */
function updateModeSelector() {
  if (!elements.modeSelect) return;

  elements.modeSelect.innerHTML = "";

  // First add campaign-related modes
  for (const modeId in MODES) {
    const mode = MODES[modeId];
    if (mode.isStandalone || mode.isHidden) continue; // Skip standalone and hidden modes

    const isUnlocked = campaign.unlockedModes.includes(modeId);

    const option = document.createElement("option");
    option.value = modeId;
    option.textContent = isUnlocked ? mode.label : `${mode.label} 🔒 (Lvl ${mode.unlockLevel})`;
    option.disabled = !isUnlocked;
    elements.modeSelect.appendChild(option);
  }

  // Add separator and standalone modes (but not hidden ones like Focus Lab)
  let hasStandalone = false;
  for (const modeId in MODES) {
    const mode = MODES[modeId];
    if (!mode.isStandalone || mode.isHidden) continue;

    // Add separator before first standalone mode
    if (!hasStandalone) {
      const separator = document.createElement("option");
      separator.disabled = true;
      separator.textContent = "──────────";
      elements.modeSelect.appendChild(separator);
      hasStandalone = true;
    }

    const option = document.createElement("option");
    option.value = modeId;
    option.textContent = mode.label;
    elements.modeSelect.appendChild(option);
  }

  // Select first unlocked mode
  const firstUnlocked = campaign.unlockedModes[0] || "tapOnBlue";
  elements.modeSelect.value = firstUnlocked;
  state.currentMode = firstUnlocked;
}

// ===== CAMPAIGN LOGIC =====

/**
 * Checks and grants any unlocks for reaching a level
 */
function checkUnlocks(level) {
  const unlock = CAMPAIGN_CONFIG.unlocks[level];
  if (unlock && unlock.type === "mode" && !campaign.unlockedModes.includes(unlock.id)) {
    campaign.unlockedModes.push(unlock.id);
    saveCampaign();
    return unlock;
  }
  return null;
}

/**
 * Starts a campaign session
 */
function startCampaign() {
  state.gameMode = "campaign";

  // Get level settings (calculated dynamically based on level)
  const levelConfig = getLevelConfig(campaign.level);

  // Configure state based on level
  state.currentMode = levelConfig.mode;
  state.maxTrials = CAMPAIGN_CONFIG.trialsPerLevel;
  state.trialDuration = levelConfig.trialDuration;
  state.targetProbability = levelConfig.targetProbability;
  state.passScore = levelConfig.passScore;
  state.symbolCount = levelConfig.symbolCount;
  state.isMoving = levelConfig.isMoving;

  // Check for new unlock at this level
  state.newUnlock = checkUnlocks(campaign.level);

  // Start the session
  startSessionInternal();
}

/**
 * Handles campaign results after a round
 */
function handleCampaignResult(score) {
  state.levelPassed = score >= state.passScore;

  if (state.levelPassed) {
    // Level passed!
    campaign.streak++;
    campaign.level++;
    if (campaign.level > campaign.highestLevel) {
      campaign.highestLevel = campaign.level;
    }
    // Check for new unlock at new level
    state.newUnlock = checkUnlocks(campaign.level);
  } else {
    // Level failed
    campaign.lives--;
    campaign.streak = 0;

    if (campaign.lives <= 0) {
      // Game over - reset to level 1
      campaign.level = 1;
      campaign.lives = CAMPAIGN_CONFIG.maxLives;
    }
  }

  campaign.totalGamesPlayed++;
  saveCampaign();
}

// ===== STATE MANAGEMENT FUNCTIONS =====

/**
 * Resets the state object to initial values for a new session
 */
function resetState() {
  if (state.trialTimeoutId) {
    clearTimeout(state.trialTimeoutId);
    state.trialTimeoutId = null;
  }

  state.status = "idle";
  state.trialIndex = 0;
  state.hits = 0;
  state.misses = 0;
  state.falseTaps = 0;
  state.totalTargets = 0;
  state.reactionTimes = [];
  state.currentColor = "blue";
  state.currentShape = "circle";
  state.currentSymbols = [];
  state.currentIsTarget = false;
  state.hasTappedThisTrial = false;
  state.trialStartTime = 0;
  state.levelPassed = false;
  state.isMoving = false;
  state.newUnlock = null;

  // Reset vigilance quarters
  state.vigilanceQuarters = [
    { hits: 0, misses: 0, falseTaps: 0, targets: 0, reactionTimes: [] },
    { hits: 0, misses: 0, falseTaps: 0, targets: 0, reactionTimes: [] },
    { hits: 0, misses: 0, falseTaps: 0, targets: 0, reactionTimes: [] },
    { hits: 0, misses: 0, falseTaps: 0, targets: 0, reactionTimes: [] }
  ];

  // Reset symbol appearance
  elements.symbol.className = "symbol";
  elements.symbol.style.backgroundColor = "";
  elements.symbol.style.borderLeftColor = "";
  elements.symbol.style.borderBottomColor = "";

  // Clear multi-symbol container
  if (elements.symbolsContainer) {
    elements.symbolsContainer.innerHTML = "";
  }
}

/**
 * Applies difficulty settings to state (for freeplay)
 */
function applyDifficulty(difficulty) {
  const config = DIFFICULTY_CONFIG[difficulty];
  if (!config) {
    state.difficulty = "normal";
    return applyDifficulty("normal");
  }

  state.difficulty = difficulty;
  state.maxTrials = config.maxTrials;
  state.trialDuration = config.trialDuration;
  state.targetProbability = config.targetProbability;
}

// ===== GAME FLOW FUNCTIONS =====

/**
 * Starts a freeplay session
 */
function startFreeplay() {
  state.gameMode = "freeplay";

  // Get mode and difficulty from selectors
  const selectedMode = elements.modeSelect ? elements.modeSelect.value : "tapOnBlue";
  const selectedDifficulty = elements.difficultySelect ? elements.difficultySelect.value : "normal";

  const mode = MODES[selectedMode];

  // Check if mode is unlocked (standalone modes are always available)
  if (!mode.isStandalone && !campaign.unlockedModes.includes(selectedMode)) {
    alert(`This mode is locked! Reach level ${mode.unlockLevel} in Campaign to unlock.`);
    return;
  }

  state.currentMode = selectedMode;

  // Use vigilance difficulty config for Stay With It mode
  if (MODES[selectedMode].isVigilance) {
    applyVigilanceDifficulty(selectedDifficulty);
  } else {
    applyDifficulty(selectedDifficulty);
  }

  // Set symbol count for multi-target mode in freeplay
  if (MODES[selectedMode].isMulti) {
    // Default to 2 symbols for easy, 3 for normal, 4 for hard
    const symbolCounts = { easy: 2, normal: 3, hard: 4 };
    state.symbolCount = symbolCounts[selectedDifficulty] || 3;
  } else {
    state.symbolCount = 1;
  }

  startSessionInternal();
}

/**
 * Applies vigilance difficulty settings to state
 */
function applyVigilanceDifficulty(difficulty) {
  const config = VIGILANCE_DIFFICULTY_CONFIG[difficulty];
  if (!config) {
    state.difficulty = "normal";
    return applyVigilanceDifficulty("normal");
  }

  state.difficulty = difficulty;
  state.maxTrials = config.maxTrials;
  state.trialDurationMin = config.trialDurationMin;
  state.trialDurationMax = config.trialDurationMax;
  // Set initial trialDuration to average for time estimate display
  state.trialDuration = Math.round((config.trialDurationMin + config.trialDurationMax) / 2);
  state.targetProbability = config.targetProbability;
}

/**
 * Gets a random trial duration within the configured range
 * Used for vigilance mode to create unpredictable tempo
 */
function getRandomTrialDuration() {
  const min = state.trialDurationMin;
  const max = state.trialDurationMax;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Internal function to start any session (campaign or freeplay)
 */
function startSessionInternal() {
  // Initialize audio on first user interaction
  initAudio();

  resetState();
  state.status = "running";

  // Update hint text based on mode
  const mode = MODES[state.currentMode];
  if (elements.hint && mode.hint) {
    elements.hint.textContent = mode.hint;
  }

  // Update game screen UI for campaign
  updateGameUI();

  showScreen("game");

  // Play start sound and begin after delay
  playSound("start");
  setTimeout(() => {
    runNextTrial();
  }, 500);
}

/**
 * Updates the game screen UI (lives, level, streak)
 */
function updateGameUI() {
  if (state.gameMode === "campaign") {
    // Show campaign UI elements
    if (elements.livesDisplay) {
      elements.livesDisplay.innerHTML = "❤️".repeat(campaign.lives);
      elements.livesDisplay.classList.remove("hidden");
    }
    if (elements.levelDisplay) {
      elements.levelDisplay.textContent = `Level ${campaign.level}`;
      elements.levelDisplay.classList.remove("hidden");
    }
    if (elements.streakDisplay) {
      if (campaign.streak > 0) {
        elements.streakDisplay.textContent = `🔥 ${campaign.streak}`;
        elements.streakDisplay.classList.remove("hidden");
      } else {
        elements.streakDisplay.classList.add("hidden");
      }
    }
  } else {
    // Hide campaign UI elements in freeplay
    if (elements.livesDisplay) elements.livesDisplay.classList.add("hidden");
    if (elements.levelDisplay) elements.levelDisplay.classList.add("hidden");
    if (elements.streakDisplay) elements.streakDisplay.classList.add("hidden");
  }
}

/**
 * Legacy function for backward compatibility
 */
function startSession(modeId, difficulty) {
  startFreeplay();
}

function startGame() {
  startFreeplay();
}

/**
 * Gets the current quarter index (0-3) based on trial progress
 */
function getCurrentQuarter() {
  const progress = state.trialIndex / state.maxTrials;
  return Math.min(3, Math.floor(progress * 4));
}

/**
 * Runs the next trial or ends the game if all trials are complete
 */
function runNextTrial() {
  if (state.trialIndex >= state.maxTrials) {
    endGame();
    return;
  }

  state.trialIndex++;

  const mode = MODES[state.currentMode];

  // Handle multi-target mode differently
  if (mode.isMulti) {
    const trialProps = mode.getTrialProps(state.targetProbability, state.symbolCount);
    state.currentSymbols = trialProps.symbols;
    state.currentIsTarget = trialProps.hasTarget;
  } else {
    // Single symbol mode
    const trialProps = mode.getTrialProps(state.targetProbability);
    state.currentColor = trialProps.color;
    state.currentShape = trialProps.shape;
    state.currentSymbols = [{ color: trialProps.color, shape: trialProps.shape }];
    state.currentIsTarget = mode.isTarget(state.currentColor, state.currentShape);
  }

  // Track actual targets shown
  if (state.currentIsTarget) {
    state.totalTargets++;
    // Track targets per quarter for vigilance mode
    if (mode.isVigilance) {
      const quarter = getCurrentQuarter();
      state.vigilanceQuarters[quarter].targets++;
    }
  }

  state.hasTappedThisTrial = false;
  state.trialStartTime = performance.now();

  updateSymbol();
  updateGameInfo();

  // Use variable tempo for vigilance mode, fixed duration otherwise
  const currentTrialDuration = mode.isVigilance
    ? getRandomTrialDuration()
    : state.trialDuration;

  state.trialTimeoutId = setTimeout(() => {
    if (state.currentIsTarget && !state.hasTappedThisTrial) {
      state.misses++;
      // Track misses per quarter for vigilance mode
      if (mode.isVigilance) {
        const quarter = getCurrentQuarter();
        state.vigilanceQuarters[quarter].misses++;
      }
    }
    runNextTrial();
  }, currentTrialDuration);
}

/**
 * Updates the symbol appearance based on current trial
 */
function updateSymbol() {
  const mode = MODES[state.currentMode];

  // Check if we're in multi-symbol mode
  if (mode.isMulti && state.symbolCount > 1) {
    // Hide single symbol, show multi container
    elements.symbol.classList.add("hidden");
    if (elements.symbolsContainer) {
      elements.symbolsContainer.classList.remove("hidden");
      renderMultipleSymbols();
    }
  } else {
    // Show single symbol, hide multi container
    elements.symbol.classList.remove("hidden");
    if (elements.symbolsContainer) {
      elements.symbolsContainer.classList.add("hidden");
    }
    renderSingleSymbol();
  }
}

/**
 * Renders a single symbol (classic mode)
 */
function renderSingleSymbol() {
  const color = COLORS[state.currentColor];

  elements.symbol.className = "symbol";
  elements.symbol.classList.add(`shape-${state.currentShape}`);

  if (state.currentShape === "triangle") {
    elements.symbol.style.backgroundColor = "transparent";
    elements.symbol.style.borderBottomColor = color;
  } else {
    elements.symbol.style.backgroundColor = color;
    elements.symbol.style.borderBottomColor = "";
  }

  if (state.currentIsTarget) {
    elements.symbol.classList.add("target");
  }

  // Add moving animation if enabled
  if (state.isMoving) {
    elements.symbol.classList.add("moving");
  }
}

/**
 * Pre-defined positions for multi-symbol layout
 * Each position is [top%, left%] - spread across the container
 */
const SYMBOL_POSITIONS = {
  2: [
    [15, 10],   // Top left
    [65, 70]    // Bottom right
  ],
  3: [
    [10, 50],   // Top center
    [60, 10],   // Bottom left
    [60, 70]    // Bottom right
  ],
  4: [
    [10, 10],   // Top left
    [10, 70],   // Top right
    [60, 10],   // Bottom left
    [60, 70]    // Bottom right
  ],
  5: [
    [5, 40],    // Top center
    [35, 5],    // Middle left
    [35, 75],   // Middle right
    [70, 15],   // Bottom left
    [70, 65]    // Bottom right
  ],
  6: [
    [5, 15],    // Top left
    [5, 65],    // Top right
    [40, 5],    // Middle left
    [40, 75],   // Middle right
    [75, 15],   // Bottom left
    [75, 65]    // Bottom right
  ]
};

/**
 * Get positions array for a given symbol count
 * Falls back to generating positions if count exceeds predefined
 */
function getPositionsForCount(count) {
  if (SYMBOL_POSITIONS[count]) {
    return SYMBOL_POSITIONS[count];
  }
  // Generate grid positions for larger counts
  const positions = [];
  const cols = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / cols);
  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const top = 10 + (row * 70 / Math.max(1, rows - 1));
    const left = 10 + (col * 70 / Math.max(1, cols - 1));
    positions.push([top, left]);
  }
  return positions;
}

/**
 * Shuffles an array using Fisher-Yates algorithm
 */
function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Renders multiple symbols for multi-target mode
 */
function renderMultipleSymbols() {
  if (!elements.symbolsContainer) return;

  elements.symbolsContainer.innerHTML = "";

  // Get positions for this symbol count and randomize them
  const positions = getPositionsForCount(state.symbolCount);
  const shuffledPositions = shuffleArray(positions);

  state.currentSymbols.forEach((sym, index) => {
    const symbolEl = document.createElement("div");
    symbolEl.className = `symbol symbol-multi shape-${sym.shape}`;
    symbolEl.dataset.index = index;

    const color = COLORS[sym.color];

    if (sym.shape === "triangle") {
      symbolEl.style.backgroundColor = "transparent";
      symbolEl.style.borderBottomColor = color;
    } else {
      symbolEl.style.backgroundColor = color;
    }

    // Add glow to the target (blue circle) if present
    if (sym.color === "blue" && sym.shape === "circle") {
      symbolEl.classList.add("target");
    }

    // Add moving animation if enabled
    if (state.isMoving) {
      symbolEl.classList.add("moving");
      // Stagger animation start for each symbol
      symbolEl.style.animationDelay = `${index * 0.2}s`;
    }

    // Position the symbol using absolute positioning
    const [top, left] = shuffledPositions[index];
    symbolEl.style.top = `${top}%`;
    symbolEl.style.left = `${left}%`;

    elements.symbolsContainer.appendChild(symbolEl);
  });
}

/**
 * Updates the game info display
 */
function updateGameInfo() {
  elements.trialCounter.textContent = `Trial ${state.trialIndex} / ${state.maxTrials}`;

  const remainingTrials = state.maxTrials - state.trialIndex + 1;
  const remainingMs = remainingTrials * state.trialDuration;
  const remainingSec = Math.round(remainingMs / 1000);
  elements.timeLeft.textContent = `~${remainingSec}s left`;
}

/**
 * Handles user taps during the game
 */
function handleTap() {
  if (state.status !== "running") return;
  if (state.hasTappedThisTrial) return;

  state.hasTappedThisTrial = true;
  const reactionTime = performance.now() - state.trialStartTime;
  const mode = MODES[state.currentMode];
  const quarter = getCurrentQuarter();

  if (state.currentIsTarget) {
    state.hits++;
    state.reactionTimes.push(reactionTime);
    // Track per-quarter for vigilance mode
    if (mode.isVigilance) {
      state.vigilanceQuarters[quarter].hits++;
      state.vigilanceQuarters[quarter].reactionTimes.push(reactionTime);
    }
    triggerAnimation("hit");
    playSound("hit");
  } else {
    state.falseTaps++;
    // Track per-quarter for vigilance mode
    if (mode.isVigilance) {
      state.vigilanceQuarters[quarter].falseTaps++;
    }
    triggerAnimation("fail");
    playSound("fail");
  }
}

/**
 * Triggers visual feedback animation on the symbol(s)
 */
function triggerAnimation(type) {
  const mode = MODES[state.currentMode];

  if (mode.isMulti && state.symbolCount > 1 && elements.symbolsContainer) {
    // Animate all symbols in multi-mode
    const symbols = elements.symbolsContainer.querySelectorAll(".symbol-multi");
    symbols.forEach(sym => {
      sym.classList.remove("hit", "fail");
      void sym.offsetWidth;
      sym.classList.add(type);
    });
  } else {
    // Single symbol animation
    elements.symbol.classList.remove("hit", "fail");
    void elements.symbol.offsetWidth;
    elements.symbol.classList.add(type);
  }
}

/**
 * Ends the current game session and shows results
 */
function endGame() {
  state.status = "finished";

  if (state.trialTimeoutId) {
    clearTimeout(state.trialTimeoutId);
    state.trialTimeoutId = null;
  }

  // Calculate metrics
  let avgRT = 0;
  if (state.reactionTimes.length > 0) {
    const sum = state.reactionTimes.reduce((a, b) => a + b, 0);
    avgRT = Math.round(sum / state.reactionTimes.length);
  }

  const score = calculateScore();
  state.lastScore = score;

  // Handle campaign logic
  if (state.gameMode === "campaign") {
    handleCampaignResult(score);
  }

  // Update results display
  updateResultsScreen(score, avgRT);

  // Save results to database if user is logged in
  saveGameResultsIfLoggedIn();

  showScreen("results");
}

/**
 * Calculates the final score based on actual performance
 *
 * Score formula:
 * - Start with accuracy component (hits vs total targets)
 * - Penalize for false taps (tapping when no target)
 * - Penalize for misses (not tapping when target)
 *
 * Perfect play (all hits, no misses, no false taps) = 100
 */
function calculateScore() {
  const totalTrials = state.maxTrials;
  const actualTargets = state.totalTargets;
  const nonTargets = totalTrials - actualTargets;

  // If no targets were shown (very rare), give full score if no false taps
  if (actualTargets === 0) {
    return state.falseTaps === 0 ? 100 : Math.max(0, 100 - state.falseTaps * 20);
  }

  // Hit rate: what percentage of targets did you hit? (0-100)
  const hitRate = (state.hits / actualTargets) * 100;

  // False tap penalty: percentage of non-targets you incorrectly tapped
  // Each false tap is a bigger deal when there are fewer non-targets
  const falseTapPenalty = nonTargets > 0
    ? (state.falseTaps / nonTargets) * 50  // Max 50 point penalty for tapping every non-target
    : state.falseTaps * 10;                 // Fallback if somehow no non-targets

  // Miss penalty: already reflected in hitRate, but add small extra penalty
  // to differentiate between someone who saw 10 targets and hit 8 vs saw 2 and hit 2
  const missPenalty = state.misses * 2;

  // Final score
  const score = Math.round(hitRate - falseTapPenalty - missPenalty);

  return Math.max(0, Math.min(100, score));
}

/**
 * Updates the results screen with game data
 */
function updateResultsScreen(score, avgRT) {
  // Update stats
  elements.resultsHits.textContent = state.hits;
  elements.resultsMisses.textContent = state.misses;
  elements.resultsFalse.textContent = state.falseTaps;
  elements.resultsRT.textContent = avgRT > 0 ? `${avgRT} ms` : "—";
  elements.resultsScore.textContent = score;

  if (state.gameMode === "campaign") {
    // Campaign results
    if (elements.resultsTitle) {
      if (campaign.lives <= 0 && !state.levelPassed) {
        elements.resultsTitle.textContent = "Game Over";
        elements.resultsTitle.className = "title title-fail";
        playSound("gameOver");
      } else if (state.levelPassed) {
        elements.resultsTitle.textContent = "Level Complete!";
        elements.resultsTitle.className = "title title-success";
        playSound("levelUp");
      } else {
        elements.resultsTitle.textContent = "Level Failed";
        elements.resultsTitle.className = "title title-fail";
        playSound("fail");
      }
    }

    // Show pass score requirement
    if (elements.resultsPassScore) {
      elements.resultsPassScore.textContent = `Need ${state.passScore} to pass`;
      elements.resultsPassScore.classList.remove("hidden");
    }

    // Show campaign-specific results
    if (elements.campaignResults) {
      let html = "";
      if (state.levelPassed) {
        html = `<div class="campaign-result-item success">
          <span>Level ${campaign.level - 1} cleared!</span>
          ${campaign.streak > 1 ? `<span class="streak-bonus">🔥 ${campaign.streak} streak!</span>` : ""}
        </div>`;
      } else {
        html = `<div class="campaign-result-item fail">
          <span>Lives remaining: ${"❤️".repeat(campaign.lives)}${"♡".repeat(CAMPAIGN_CONFIG.maxLives - campaign.lives)}</span>
        </div>`;
        if (campaign.lives <= 0) {
          html += `<div class="campaign-result-item gameover">
            <span>Highest level reached: ${campaign.highestLevel}</span>
          </div>`;
        }
      }
      elements.campaignResults.innerHTML = html;
      elements.campaignResults.classList.remove("hidden");
    }

    // Show unlock notification
    if (elements.unlockNotification && state.newUnlock) {
      elements.unlockNotification.innerHTML = `
        <div class="unlock-box">
          <span class="unlock-icon">🎉</span>
          <span class="unlock-text">Unlocked: ${state.newUnlock.label}!</span>
        </div>`;
      elements.unlockNotification.classList.remove("hidden");
    } else if (elements.unlockNotification) {
      elements.unlockNotification.classList.add("hidden");
    }

    // Show/hide appropriate buttons
    if (elements.btnNextLevel) {
      if (state.levelPassed) {
        elements.btnNextLevel.textContent = `Next Level (${campaign.level})`;
        elements.btnNextLevel.classList.remove("hidden");
      } else if (campaign.lives > 0) {
        elements.btnNextLevel.textContent = "Try Again";
        elements.btnNextLevel.classList.remove("hidden");
      } else {
        elements.btnNextLevel.textContent = "Start Over";
        elements.btnNextLevel.classList.remove("hidden");
      }
    }
    if (elements.btnPlayAgain) elements.btnPlayAgain.classList.add("hidden");
    if (elements.difficultySuggestion) elements.difficultySuggestion.classList.add("hidden");

  } else {
    // Freeplay results
    if (elements.resultsTitle) {
      elements.resultsTitle.textContent = "Results";
      elements.resultsTitle.className = "title";
    }
    if (elements.resultsPassScore) elements.resultsPassScore.classList.add("hidden");
    if (elements.campaignResults) elements.campaignResults.classList.add("hidden");
    if (elements.unlockNotification) elements.unlockNotification.classList.add("hidden");
    if (elements.btnNextLevel) elements.btnNextLevel.classList.add("hidden");
    if (elements.btnPlayAgain) elements.btnPlayAgain.classList.remove("hidden");

    // Generate comment and suggestion for freeplay
    const comment = generateComment(score);
    elements.resultsComment.textContent = comment;

    const suggestion = generateDifficultySuggestion(score);
    if (elements.difficultySuggestion) {
      elements.difficultySuggestion.textContent = suggestion;
      elements.difficultySuggestion.classList.toggle("hidden", !suggestion);
    }
  }

  // Show vigilance results if in vigilance mode
  const mode = MODES[state.currentMode];
  if (mode.isVigilance && elements.vigilanceResults) {
    updateVigilanceResults();
    elements.vigilanceResults.classList.remove("hidden");
  } else if (elements.vigilanceResults) {
    elements.vigilanceResults.classList.add("hidden");
  }
}

/**
 * Updates the vigilance results display showing attention drift over time
 */
function updateVigilanceResults() {
  const bars = [elements.q1Bar, elements.q2Bar, elements.q3Bar, elements.q4Bar];
  const rts = [elements.q1Rt, elements.q2Rt, elements.q3Rt, elements.q4Rt];
  const quarterScores = [];

  state.vigilanceQuarters.forEach((q, i) => {
    // Calculate hit rate for this quarter
    let hitRate = 0;
    if (q.targets > 0) {
      hitRate = (q.hits / q.targets) * 100;
    } else {
      // No targets in this quarter - full score if no false taps
      hitRate = q.falseTaps === 0 ? 100 : Math.max(0, 100 - q.falseTaps * 20);
    }
    quarterScores.push(hitRate);

    // Update bar height
    if (bars[i]) {
      bars[i].style.height = `${hitRate}%`;
      bars[i].className = "quarter-fill";
      if (hitRate >= 80) {
        bars[i].classList.add("good");
      } else if (hitRate >= 50) {
        bars[i].classList.add("warning");
      } else {
        bars[i].classList.add("bad");
      }
    }

    // Update reaction time
    if (rts[i]) {
      if (q.reactionTimes.length > 0) {
        const avgRt = Math.round(q.reactionTimes.reduce((a, b) => a + b, 0) / q.reactionTimes.length);
        rts[i].textContent = `${avgRt}ms`;
      } else {
        rts[i].textContent = "—";
      }
    }
  });

  // Generate vigilance-specific comment about attention drift
  if (elements.vigilanceComment) {
    const vigilanceComment = generateVigilanceComment(quarterScores);
    elements.vigilanceComment.textContent = vigilanceComment;
  }
}

/**
 * Generates a comment about attention drift over time
 */
function generateVigilanceComment(quarterScores) {
  const firstHalf = (quarterScores[0] + quarterScores[1]) / 2;
  const secondHalf = (quarterScores[2] + quarterScores[3]) / 2;
  const drift = firstHalf - secondHalf;

  // Check for attention decay
  if (drift > 20) {
    return "Attention faded in the second half. Try to stay engaged longer!";
  } else if (drift > 10) {
    return "Slight attention drop toward the end. Keep focusing!";
  } else if (drift < -20) {
    return "Strong finish! You warmed up and got sharper over time.";
  } else if (drift < -10) {
    return "Good momentum — you improved as you went.";
  }

  // Check overall performance
  const avgScore = quarterScores.reduce((a, b) => a + b, 0) / 4;
  if (avgScore >= 90) {
    return "Excellent sustained attention throughout!";
  } else if (avgScore >= 70) {
    return "Consistent focus — well maintained!";
  } else if (avgScore >= 50) {
    return "Room for improvement. Try shorter focused bursts.";
  }
  return "Attention wandered. Practice staying present.";
}

/**
 * Generates a comment based on the score
 */
function generateComment(score) {
  if (score >= 90) return "Sharp & controlled — excellent impulse control!";
  if (score >= 75) return "Well done — focused and responsive.";
  if (score >= 60) return "Good effort — a few slips, but solid overall.";
  if (score >= 40) return "Mixed signals — try to slow down a bit.";
  if (score >= 20) return "Jumpy reactions — practice patience.";
  return "Needs work — take a breath and try again!";
}

/**
 * Generates a difficulty suggestion based on score
 */
function generateDifficultySuggestion(score) {
  const currentIndex = DIFFICULTY_ORDER.indexOf(state.difficulty);

  if (score >= 80 && currentIndex < DIFFICULTY_ORDER.length - 1) {
    const nextDifficulty = DIFFICULTY_CONFIG[DIFFICULTY_ORDER[currentIndex + 1]].label;
    return `Great score! Ready for ${nextDifficulty} mode?`;
  } else if (score < 30 && currentIndex > 0) {
    const prevDifficulty = DIFFICULTY_CONFIG[DIFFICULTY_ORDER[currentIndex - 1]].label;
    return `Try ${prevDifficulty} mode to build confidence.`;
  }

  return "";
}

/**
 * Returns to home screen and resets state
 */
function goHome() {
  resetState();
  showScreen("home");
}

/**
 * Continues campaign (next level or retry)
 */
function continueCampaign() {
  startCampaign();
}

// ===== EVENT LISTENERS =====

// Start freeplay button
if (elements.btnStart) {
  elements.btnStart.addEventListener("click", startFreeplay);
}

// Start campaign button
if (elements.btnCampaign) {
  elements.btnCampaign.addEventListener("click", startCampaign);
}

// Play again button (freeplay)
if (elements.btnPlayAgain) {
  elements.btnPlayAgain.addEventListener("click", startFreeplay);
}

// Next level / retry button (campaign)
if (elements.btnNextLevel) {
  elements.btnNextLevel.addEventListener("click", continueCampaign);
}

// Home button
if (elements.btnHome) {
  elements.btnHome.addEventListener("click", goHome);
}

// Game back button (exit mid-game)
if (elements.btnGameBack) {
  elements.btnGameBack.addEventListener("click", () => {
    // Stop any running game
    if (state.trialTimeoutId) {
      clearTimeout(state.trialTimeoutId);
      state.trialTimeoutId = null;
    }
    state.status = "idle";
    goHome();
  });
}

// Tap area
if (elements.tapArea) {
  elements.tapArea.addEventListener("click", handleTap);
  elements.tapArea.addEventListener("touchstart", (e) => {
    e.preventDefault();
    handleTap();
  }, { passive: false });
}

// ===== FOCUS LAB =====

/**
 * Starts a Focus Lab session
 */
function startFocusLab() {
  state.gameMode = "focusLab";
  state.currentMode = "focusLab";

  // Get difficulty from Focus Lab selector
  const selectedDifficulty = elements.focusDifficulty ? elements.focusDifficulty.value : "normal";

  // Apply vigilance difficulty settings
  applyVigilanceDifficulty(selectedDifficulty);
  state.symbolCount = 1;

  // Initialize audio
  initAudio();

  resetState();
  state.status = "running";

  // Update hint from mode config
  const mode = MODES[state.currentMode];
  if (elements.hint && mode && mode.hint) {
    elements.hint.textContent = mode.hint;
  }

  // Hide campaign UI elements
  if (elements.livesDisplay) elements.livesDisplay.classList.add("hidden");
  if (elements.levelDisplay) elements.levelDisplay.classList.add("hidden");
  if (elements.streakDisplay) elements.streakDisplay.classList.add("hidden");

  showScreen("game");

  // Play start sound and begin
  playSound("start");
  setTimeout(() => {
    runNextTrial();
  }, 500);
}

// Focus Lab button
if (elements.btnFocusLab) {
  elements.btnFocusLab.addEventListener("click", startFocusLab);
}

// Auth prompt buttons
if (elements.btnSignIn) {
  elements.btnSignIn.addEventListener("click", () => showAuthModal("signin"));
}
if (elements.btnSignUp) {
  elements.btnSignUp.addEventListener("click", () => showAuthModal("signup"));
}

// ===== AUTHENTICATION UI =====

let authMode = "signin"; // "signin" or "signup"

/**
 * Updates the auth-related UI based on login state
 */
async function updateAuthUI() {
  if (!isSupabaseConfigured()) {
    // Supabase not configured - hide auth UI
    if (elements.authPrompt) elements.authPrompt.classList.add("hidden");
    if (elements.userBar) elements.userBar.classList.add("hidden");
    return;
  }

  const user = await getCurrentUser();

  if (user) {
    // User is logged in - show user bar, hide auth prompt
    if (elements.authPrompt) elements.authPrompt.classList.add("hidden");
    if (elements.userBar) {
      elements.userBar.classList.remove("hidden");
      if (elements.userEmail) {
        elements.userEmail.textContent = user.email;
      }
    }
  } else {
    // User is not logged in - show auth prompt, hide user bar
    if (elements.authPrompt) elements.authPrompt.classList.remove("hidden");
    if (elements.userBar) elements.userBar.classList.add("hidden");
  }
}

/**
 * Shows the auth modal
 * @param {string} mode - "signin" or "signup"
 */
function showAuthModal(mode = "signin") {
  authMode = mode;

  if (elements.authModal) {
    elements.authModal.classList.remove("hidden");
  }

  // Update modal text based on mode
  if (elements.authTitle) {
    elements.authTitle.textContent = mode === "signin" ? "Sign In" : "Sign Up";
  }
  if (elements.authSubmit) {
    elements.authSubmit.textContent = mode === "signin" ? "Sign In" : "Sign Up";
  }
  if (elements.authSwitchText) {
    elements.authSwitchText.textContent = mode === "signin"
      ? "Don't have an account?"
      : "Already have an account?";
  }
  if (elements.authSwitchBtn) {
    elements.authSwitchBtn.textContent = mode === "signin" ? "Sign Up" : "Sign In";
  }

  // Show/hide signup-specific fields (username, country)
  if (elements.signupFields) {
    if (mode === "signup") {
      elements.signupFields.classList.remove("hidden");
    } else {
      elements.signupFields.classList.add("hidden");
    }
  }

  // Clear error and inputs
  if (elements.authError) elements.authError.classList.add("hidden");
  if (elements.authEmail) elements.authEmail.value = "";
  if (elements.authPassword) elements.authPassword.value = "";
  if (elements.authUsername) elements.authUsername.value = "";
  if (elements.authCountry) elements.authCountry.value = "";
}

/**
 * Hides the auth modal
 */
function hideAuthModal() {
  if (elements.authModal) {
    elements.authModal.classList.add("hidden");
  }
}

/**
 * Handles auth form submission
 */
async function handleAuthSubmit(e) {
  e.preventDefault();

  const email = elements.authEmail ? elements.authEmail.value : "";
  const password = elements.authPassword ? elements.authPassword.value : "";

  if (!email || !password) return;

  // For signup, get username and country
  let username = "";
  let country = "";
  if (authMode === "signup") {
    username = elements.authUsername ? elements.authUsername.value.trim() : "";
    country = elements.authCountry ? elements.authCountry.value : "";

    // Validate username for signup
    if (!username || username.length < 3) {
      if (elements.authError) {
        elements.authError.textContent = "Username must be at least 3 characters";
        elements.authError.classList.remove("hidden");
      }
      return;
    }
    if (!country) {
      if (elements.authError) {
        elements.authError.textContent = "Please select your country";
        elements.authError.classList.remove("hidden");
      }
      return;
    }
  }

  // Disable button during request
  if (elements.authSubmit) elements.authSubmit.disabled = true;

  let result;
  if (authMode === "signin") {
    result = await signIn(email, password);
  } else {
    result = await signUp(email, password, username, country);
  }

  if (elements.authSubmit) elements.authSubmit.disabled = false;

  if (result.error) {
    // Show error
    if (elements.authError) {
      elements.authError.textContent = result.error;
      elements.authError.classList.remove("hidden");
    }
  } else {
    // Success - close modal and update UI
    hideAuthModal();
    await updateAuthUI();

    // If signup, show message about email confirmation
    if (authMode === "signup") {
      alert("Account created! You can now sign in.");
    }
  }
}

/**
 * Handles user logout
 */
async function handleLogout() {
  await signOut();
  await updateAuthUI();
}

// Auth modal close button
if (elements.authClose) {
  elements.authClose.addEventListener("click", hideAuthModal);
}

// Auth modal backdrop click
if (elements.authModal) {
  elements.authModal.addEventListener("click", (e) => {
    if (e.target === elements.authModal) {
      hideAuthModal();
    }
  });
}

// Auth form submit
if (elements.authForm) {
  elements.authForm.addEventListener("submit", handleAuthSubmit);
}

// Auth mode switch button
if (elements.authSwitchBtn) {
  elements.authSwitchBtn.addEventListener("click", () => {
    showAuthModal(authMode === "signin" ? "signup" : "signin");
  });
}

// Logout button
if (elements.btnLogout) {
  elements.btnLogout.addEventListener("click", handleLogout);
}

// History button
if (elements.btnHistory) {
  elements.btnHistory.addEventListener("click", () => showScreen("history"));
}

// ===== HISTORY SCREEN =====

let historyChart = null;
let currentHistoryRange = "today";

/**
 * Loads and displays the history screen
 */
async function loadHistory(range = currentHistoryRange) {
  currentHistoryRange = range;

  // Update filter button states
  if (elements.filterBtns) {
    elements.filterBtns.forEach(btn => {
      btn.classList.toggle("active", btn.dataset.range === range);
    });
  }

  // Get data from Supabase (all game modes)
  const { data, error } = await getGameResults(range);
  const stats = await getGameStats(range);

  // Update stats
  if (elements.historySessions) {
    elements.historySessions.textContent = stats.sessions;
  }
  if (elements.historyAvgScore) {
    elements.historyAvgScore.textContent = stats.avgScore !== null ? stats.avgScore : "—";
  }
  if (elements.historyBestTime) {
    elements.historyBestTime.textContent = stats.bestTimeOfDay || "—";
  }

  // Update chart
  updateHistoryChart(data);

  // Update list
  updateHistoryList(data);
}

/**
 * Updates the history chart with data
 */
function updateHistoryChart(data) {
  if (!elements.historyChart) return;

  const ctx = elements.historyChart.getContext("2d");

  // Prepare data for chart - group by hour of day
  const hourData = {};
  for (let i = 0; i < 24; i++) {
    hourData[i] = [];
  }

  data.forEach(result => {
    const hour = new Date(result.created_at).getHours();
    hourData[hour].push(result.score);
  });

  // Calculate averages per hour
  const labels = [];
  const scores = [];
  for (let i = 0; i < 24; i++) {
    const hour12 = i % 12 || 12;
    const ampm = i >= 12 ? "PM" : "AM";
    labels.push(`${hour12}${ampm}`);

    if (hourData[i].length > 0) {
      const avg = hourData[i].reduce((a, b) => a + b, 0) / hourData[i].length;
      scores.push(Math.round(avg));
    } else {
      scores.push(null);
    }
  }

  // Destroy existing chart
  if (historyChart) {
    historyChart.destroy();
  }

  // Create new chart
  historyChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Score",
        data: scores,
        borderColor: "#00d4ff",
        backgroundColor: "rgba(0, 212, 255, 0.1)",
        fill: true,
        tension: 0.3,
        spanGaps: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          min: 0,
          max: 100,
          ticks: {
            color: "rgba(255, 255, 255, 0.5)"
          },
          grid: {
            color: "rgba(255, 255, 255, 0.1)"
          }
        },
        x: {
          ticks: {
            color: "rgba(255, 255, 255, 0.5)",
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: 8
          },
          grid: {
            display: false
          }
        }
      }
    }
  });
}

/**
 * Updates the history list with recent sessions
 */
function updateHistoryList(data) {
  if (!elements.historyListItems) return;

  if (data.length === 0) {
    elements.historyListItems.innerHTML = `
      <p class="history-empty">No sessions yet. Play a game to start tracking!</p>
    `;
    return;
  }

  // Show only last 10 sessions
  const recent = data.slice(0, 10);

  elements.historyListItems.innerHTML = recent.map(result => {
    const date = new Date(result.created_at);
    const timeStr = date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    const dateStr = date.toLocaleDateString([], { month: "short", day: "numeric" });

    // Format game mode label
    let modeLabel = "";
    if (result.game_mode === "campaign") {
      modeLabel = `Campaign L${result.level || "?"}`;
    } else if (result.game_mode === "focusLab") {
      modeLabel = "Focus Lab";
    } else {
      modeLabel = "Free Play";
    }

    return `
      <div class="history-item">
        <div class="history-item-info">
          <span class="history-item-time">${dateStr} ${timeStr}</span>
          <span class="history-item-mode">${modeLabel}</span>
          <span class="history-item-difficulty">${result.difficulty}</span>
        </div>
        <span class="history-item-score">${result.score}</span>
      </div>
    `;
  }).join("");
}

// History filter buttons
if (elements.filterBtns) {
  elements.filterBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      loadHistory(btn.dataset.range);
    });
  });
}

// History close/back buttons
if (elements.btnHistoryClose) {
  elements.btnHistoryClose.addEventListener("click", () => showScreen("home"));
}
if (elements.btnHistoryBack) {
  elements.btnHistoryBack.addEventListener("click", () => showScreen("home"));
}

// ===== SAVE GAME RESULTS =====

/**
 * Saves game results to Supabase (called from endGame)
 */
async function saveGameResultsIfLoggedIn() {
  if (!isSupabaseConfigured()) return;

  const user = await getCurrentUser();
  if (!user) return;

  // Calculate average RT
  let avgRT = null;
  if (state.reactionTimes.length > 0) {
    avgRT = Math.round(state.reactionTimes.reduce((a, b) => a + b, 0) / state.reactionTimes.length);
  }

  // Build result object
  const result = {
    gameMode: state.gameMode,
    mode: state.currentMode,
    difficulty: state.difficulty,
    level: state.gameMode === "campaign" ? campaign.level : null,
    score: state.lastScore,
    hits: state.hits,
    misses: state.misses,
    falseTaps: state.falseTaps,
    avgReactionTime: avgRT,
    totalTargets: state.totalTargets,
    quarterScores: null,
    quarterRts: null
  };

  // Add vigilance-specific data for Focus Lab
  if (state.gameMode === "focusLab" && state.vigilanceQuarters) {
    result.quarterScores = state.vigilanceQuarters.map(q => {
      if (q.targets > 0) {
        return Math.round((q.hits / q.targets) * 100);
      }
      return q.falseTaps === 0 ? 100 : Math.max(0, 100 - q.falseTaps * 20);
    });

    result.quarterRts = state.vigilanceQuarters.map(q => {
      if (q.reactionTimes.length > 0) {
        return Math.round(q.reactionTimes.reduce((a, b) => a + b, 0) / q.reactionTimes.length);
      }
      return null;
    });
  }

  await saveGameResult(result);
}

// ===== LEADERBOARD =====

let currentLeaderboardMode = "all";

/**
 * Loads and displays the leaderboard
 */
async function loadLeaderboard(mode = currentLeaderboardMode) {
  currentLeaderboardMode = mode;

  // Update filter button states
  if (elements.leaderboardFilterBtns) {
    elements.leaderboardFilterBtns.forEach(btn => {
      btn.classList.toggle("active", btn.dataset.mode === mode);
    });
  }

  // Show loading
  if (elements.leaderboardList) {
    elements.leaderboardList.innerHTML = '<div class="leaderboard-loading">Loading...</div>';
  }

  // Fetch data based on mode
  let result;
  if (mode === "campaign") {
    result = await getCampaignLeaderboard(50);
  } else if (mode === "focusLab") {
    result = await getFocusLabLeaderboard(50);
  } else {
    result = await getLeaderboard(null, 50);
  }

  // Display results
  updateLeaderboardDisplay(result.data, mode);
}

/**
 * Updates the leaderboard display with data
 */
function updateLeaderboardDisplay(data, mode) {
  if (!elements.leaderboardList) return;

  if (!data || data.length === 0) {
    elements.leaderboardList.innerHTML = `
      <div class="leaderboard-empty">
        <p>No scores yet!</p>
        <p>Be the first to make the leaderboard.</p>
      </div>
    `;
    return;
  }

  const isCampaignMode = mode === "campaign";

  elements.leaderboardList.innerHTML = data.map((entry, index) => {
    const isTop3 = entry.rank <= 3;

    // Format mode/difficulty for display
    let detailsText = "";
    if (isCampaignMode) {
      detailsText = `Level ${entry.level}`;
    } else {
      const modeLabel = entry.gameMode === "focusLab" ? "Focus Lab" :
                        entry.gameMode === "campaign" ? "Campaign" : "Free Play";
      detailsText = `${modeLabel} • ${entry.difficulty || ""}`;
    }

    return `
      <div class="leaderboard-item ${isTop3 ? "top-3" : ""}">
        <div class="leaderboard-rank">${entry.rank}</div>
        <div class="leaderboard-info">
          <div class="leaderboard-username">
            <span class="leaderboard-country">${entry.countryFlag}</span>
            ${escapeHtml(entry.username)}
          </div>
          <div class="leaderboard-details">${detailsText}</div>
        </div>
        ${isCampaignMode
          ? `<div class="leaderboard-level">Lvl ${entry.level}</div>`
          : `<div class="leaderboard-score">${entry.score}</div>`
        }
      </div>
    `;
  }).join("");
}

/**
 * Escapes HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Leaderboard filter buttons
if (elements.leaderboardFilterBtns) {
  elements.leaderboardFilterBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      loadLeaderboard(btn.dataset.mode);
    });
  });
}

// Leaderboard button in user bar
if (elements.btnLeaderboard) {
  elements.btnLeaderboard.addEventListener("click", () => showScreen("leaderboard"));
}

// Leaderboard close/back buttons
if (elements.btnLeaderboardClose) {
  elements.btnLeaderboardClose.addEventListener("click", () => showScreen("home"));
}
if (elements.btnLeaderboardBack) {
  elements.btnLeaderboardBack.addEventListener("click", () => showScreen("home"));
}

// ===== INITIALIZATION =====

// Initialize Supabase
initSupabase();

// Listen for auth state changes
if (isSupabaseConfigured()) {
  onAuthStateChange((event, session) => {
    updateAuthUI();
  });
}

loadCampaign();
initializeSelectors();
showScreen("home");
