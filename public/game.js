// Game Setup
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const scaleX = canvas.width / 1920;
const scaleY = canvas.height / 1080;
const textScale = Math.min(scaleX, scaleY);

// Map and Theme Definitions
const mapThemes = {
  map1: "grassland",
  map2: "desert",
  map3: "stone",
  map4: "forest",
  map5: "mountain",
  map6: "desert",
  map7: "river",
  map8: "canyon",
  map9: "arctic",
};
let selectedDifficulty = localStorage.getItem("selectedDifficulty") || "easy";
let selectedMap = localStorage.getItem("selectedMap") || "map1";
let mapTheme = mapThemes[selectedMap];

// Game State
const gameState = {
  enemies: [],
  towers: [],
  projectiles: [],
  playerHealth: 20,
  persistentMoney: 0,
  gameMoney: selectedDifficulty === "easy" ? 200 : selectedDifficulty === "medium" ? 400 : 600,
  score: 0,
  wave: 1,
  isPaused: false,
  gameOver: false,
  gameWon: false,
  selectedTower: null,
  selectedTowerType: null,
  isSpawning: false,
  gameSpeed: 1,
  unlockedTowers: ["basic"],
  spawnTimer: 0,
  enemiesToSpawn: 0,
  waveDelay: 0,
  isBossWave: false,
  bossSpawned: false,
  chatMessages: [],
  players: [],
  partyLeader: null,
  isPartyMode: localStorage.getItem("isPartyMode") === "true",
  partyId: localStorage.getItem("partyId") || null,
};

// Tower Definitions
const towerStats = {
  basic: { damage: 10, range: 100, fireRate: 1000, cost: 50, persistentCost: 0, color: "gray", ability: "Basic shot" },
  archer: { damage: 15, range: 120, fireRate: 2000, cost: 75, persistentCost: 225, color: "brown", ability: "Double shot" },
  cannon: { damage: 30, range: 80, fireRate: 3000, cost: 100, persistentCost: 300, color: "black", ability: "Splash damage" },
  sniper: { damage: 50, range: 150, fireRate: 4000, cost: 150, persistentCost: 350, color: "green", ability: "Critical hit" },
  freeze: { damage: 5, range: 100, fireRate: 2000, cost: 120, persistentCost: 400, color: "lightblue", ability: "Slows enemies" },
  mortar: { damage: 40, range: 120, fireRate: 5000, cost: 200, persistentCost: 450, color: "darkgray", ability: "Large splash" },
  laser: { damage: 100, range: 150, fireRate: 10000, cost: 350, persistentCost: 500, color: "red", ability: "Continuous beam" },
  tesla: { damage: 25, range: 120, fireRate: 3000, cost: 250, persistentCost: 550, color: "yellow", ability: "Chain lightning" },
  flamethrower: { damage: 20, range: 80, fireRate: 2000, cost: 180, persistentCost: 600, color: "orange", ability: "Burning damage" },
  missile: { damage: 60, range: 130, fireRate: 4000, cost: 200, persistentCost: 650, color: "silver", ability: "High damage" },
  poison: { damage: 15, range: 110, fireRate: 3000, cost: 250, persistentCost: 700, color: "limegreen", ability: "Poison splash" },
  vortex: { damage: 0, range: 150, fireRate: 5000, cost: 300, persistentCost: 750, color: "purple", ability: "Pulls enemies" },
};

// Tower Upgrade Paths (unchanged)
const towerUpgradePaths = {
  basic: {
    power: [
      { cost: 50, damage: 1.2, desc: "Damage +20%" },
      { cost: 100, damage: 1.3, desc: "Damage +30%" },
      { cost: 150, range: 1.2, desc: "Range +20%" },
      { cost: 200, fireRate: 0.9, desc: "Fire Rate +10%" },
    ],
    utility: [
      { cost: 50, range: 1.1, desc: "Range +10%" },
      { cost: 100, fireRate: 0.9, desc: "Fire Rate +10%" },
      { cost: 150, damage: 1.2, desc: "Damage +20%" },
      { cost: 200, range: 1.15, desc: "Range +15%" },
    ],
  },
  archer: {
    power: [
      { cost: 75, damage: 1.25, desc: "Damage +25%" },
      { cost: 150, damage: 1.35, desc: "Damage +35%" },
      { cost: 225, fireRate: 0.85, desc: "Fire Rate +15%" },
      { cost: 300, damage: 1.4, desc: "Damage +40%" },
    ],
    utility: [
      { cost: 75, range: 1.15, desc: "Range +15%" },
      { cost: 150, fireRate: 0.9, desc: "Fire Rate +10%" },
      { cost: 225, range: 1.2, desc: "Range +20%" },
      { cost: 300, special: "tripleShot", desc: "Triple Shot" },
    ],
  },
  cannon: {
    power: [
      { cost: 100, damage: 1.3, desc: "Damage +30%" },
      { cost: 200, damage: 1.4, desc: "Damage +40%" },
      { cost: 300, range: 1.25, desc: "Range +25%" },
      { cost: 400, damage: 1.5, desc: "Damage +50%" },
    ],
    utility: [
      { cost: 100, range: 1.2, desc: "Range +20%" },
      { cost: 200, fireRate: 0.9, desc: "Fire Rate +10%" },
      { cost: 300, special: "splash", desc: "Splash +50%" },
      { cost: 400, fireRate: 0.85, desc: "Fire Rate +15%" },
    ],
  },
  sniper: {
    power: [
      { cost: 150, damage: 1.35, desc: "Damage +35%" },
      { cost: 300, damage: 1.5, desc: "Damage +50%" },
      { cost: 450, range: 1.3, desc: "Range +30%" },
      { cost: 600, damage: 1.6, desc: "Damage +60%" },
    ],
    utility: [
      { cost: 150, range: 1.25, desc: "Range +25%" },
      { cost: 300, fireRate: 0.9, desc: "Fire Rate +10%" },
      { cost: 450, special: "crit", desc: "Crit Chance +20%" },
      { cost: 600, fireRate: 0.85, desc: "Fire Rate +15%" },
    ],
  },
  freeze: {
    power: [
      { cost: 120, damage: 1.3, desc: "Damage +30%" },
      { cost: 240, damage: 1.4, desc: "Damage +40%" },
      { cost: 360, range: 1.25, desc: "Range +25%" },
      { cost: 480, special: "slow", desc: "Slow +50%" },
    ],
    utility: [
      { cost: 120, range: 1.2, desc: "Range +20%" },
      { cost: 240, fireRate: 0.9, desc: "Fire Rate +10%" },
      { cost: 360, fireRate: 0.85, desc: "Fire Rate +15%" },
      { cost: 480, range: 1.3, desc: "Range +30%" },
    ],
  },
  mortar: {
    power: [
      { cost: 200, damage: 1.4, desc: "Damage +40%" },
      { cost: 400, damage: 1.5, desc: "Damage +50%" },
      { cost: 600, range: 1.3, desc: "Range +30%" },
      { cost: 800, damage: 1.6, desc: "Damage +60%" },
    ],
    utility: [
      { cost: 200, range: 1.25, desc: "Range +25%" },
      { cost: 400, special: "splash", desc: "Splash +50%" },
      { cost: 600, fireRate: 0.9, desc: "Fire Rate +10%" },
      { cost: 800, fireRate: 0.85, desc: "Fire Rate +15%" },
    ],
  },
  laser: {
    power: [
      { cost: 350, damage: 1.5, desc: "Damage +50%" },
      { cost: 700, damage: 1.75, desc: "Damage +75%" },
      { cost: 1050, range: 1.4, desc: "Range +40%" },
      { cost: 1400, damage: 2.0, desc: "Damage +100%" },
    ],
    utility: [
      { cost: 350, range: 1.3, desc: "Range +30%" },
      { cost: 700, fireRate: 0.8, desc: "Recharge -20%" },
      { cost: 1050, fireRate: 0.7, desc: "Recharge -30%" },
      { cost: 1400, special: "multiBeam", desc: "Multi-Target Beam" },
    ],
  },
  tesla: {
    power: [
      { cost: 250, damage: 1.4, desc: "Damage +40%" },
      { cost: 500, damage: 1.6, desc: "Damage +60%" },
      { cost: 750, range: 1.35, desc: "Range +35%" },
      { cost: 1000, damage: 1.8, desc: "Damage +80%" },
    ],
    utility: [
      { cost: 250, range: 1.25, desc: "Range +25%" },
      { cost: 500, fireRate: 0.85, desc: "Recharge -15%" },
      { cost: 750, special: "chain", desc: "Chain +2 Targets" },
      { cost: 1000, fireRate: 0.7, desc: "Recharge -30%" },
    ],
  },
  flamethrower: {
    power: [
      { cost: 180, damage: 1.35, desc: "Damage +35%" },
      { cost: 360, damage: 1.5, desc: "Damage +50%" },
      { cost: 540, range: 1.3, desc: "Range +30%" },
      { cost: 720, damage: 1.6, desc: "Damage +60%" },
    ],
    utility: [
      { cost: 180, range: 1.2, desc: "Range +20%" },
      { cost: 360, fireRate: 0.9, desc: "Fire Rate +10%" },
      { cost: 540, special: "burn", desc: "Burn +50%" },
      { cost: 720, fireRate: 0.85, desc: "Fire Rate +15%" },
    ],
  },
  missile: {
    power: [
      { cost: 200, damage: 1.4, desc: "Damage +40%" },
      { cost: 400, damage: 1.55, desc: "Damage +55%" },
      { cost: 600, range: 1.3, desc: "Range +30%" },
      { cost: 800, damage: 1.7, desc: "Damage +70%" },
    ],
    utility: [
      { cost: 200, range: 1.25, desc: "Range +25%" },
      { cost: 400, fireRate: 0.9, desc: "Fire Rate +10%" },
      { cost: 600, fireRate: 0.85, desc: "Fire Rate +15%" },
      { cost: 800, range: 1.35, desc: "Range +35%" },
    ],
  },
  poison: {
    power: [
      { cost: 250, damage: 1.4, desc: "Damage +40%" },
      { cost: 500, damage: 1.6, desc: "Damage +60%" },
      { cost: 750, range: 1.3, desc: "Range +30%" },
      { cost: 1000, damage: 1.8, desc: "Damage +80%" },
    ],
    utility: [
      { cost: 250, range: 1.25, desc: "Range +25%" },
      { cost: 500, special: "splash", desc: "Splash +50%" },
      { cost: 750, fireRate: 0.9, desc: "Fire Rate +10%" },
      { cost: 1000, fireRate: 0.85, desc: "Fire Rate +15%" },
    ],
  },
  vortex: {
    power: [
      { cost: 200, range: 1.3, desc: "Range +30%" },
      { cost: 400, special: "pull", desc: "Pull +50%" },
      { cost: 600, range: 1.4, desc: "Range +40%" },
      { cost: 800, special: "pull", desc: "Pull +100%" },
    ],
    utility: [
      { cost: 200, fireRate: 0.85, desc: "Recharge -15%" },
      { cost: 400, range: 1.25, desc: "Range +25%" },
      { cost: 600, fireRate: 0.7, desc: "Recharge -30%" },
      { cost: 800, fireRate: 0.6, desc: "Recharge -40%" },
    ],
  },
};

// Theme Backgrounds
const themeBackgrounds = {
  map1: "#90ee90",
  map2: "#f4a460",
  map3: "#a9a9a9",
  map4: "#6b8e23",
  map5: "#cd853f",
  map6: "#f4a460",
  map7: "#87ceeb",
  map8: "#cd5c5c",
  map9: "#e0ffff",
};

// Paths
const paths = {
  map1: [
    { x: 0, y: 540 }, { x: 300, y: 540 }, { x: 300, y: 300 }, { x: 600, y: 300 },
    { x: 600, y: 600 }, { x: 900, y: 600 }, { x: 900, y: 200 }, { x: 1200, y: 200 },
    { x: 1200, y: 700 }, { x: 1500, y: 700 }, { x: 1500, y: 400 }, { x: 1920, y: 400 },
  ],
  map2: [
    { x: 0, y: 540 }, { x: 400, y: 540 }, { x: 400, y: 200 }, { x: 800, y: 200 },
    { x: 800, y: 600 }, { x: 1200, y: 600 }, { x: 1200, y: 300 }, { x: 1920, y: 300 },
  ],
  map3: [
    { x: 0, y: 540 }, { x: 300, y: 540 }, { x: 300, y: 200 }, { x: 600, y: 200 },
    { x: 600, y: 600 }, { x: 900, y: 600 }, { x: 900, y: 300 }, { x: 1200, y: 300 },
    { x: 1200, y: 700 }, { x: 1500, y: 700 }, { x: 1500, y: 400 }, { x: 1800, y: 400 },
    { x: 1800, y: 200 }, { x: 1920, y: 200 },
  ],
  map4: [
    { x: 0, y: 540 }, { x: 500, y: 540 }, { x: 500, y: 300 }, { x: 1000, y: 300 },
    { x: 1000, y: 700 }, { x: 1500, y: 700 }, { x: 1500, y: 400 }, { x: 1920, y: 400 },
  ],
  map5: [
    { x: 0, y: 540 }, { x: 300, y: 540 }, { x: 300, y: 200 }, { x: 600, y: 200 },
    { x: 600, y: 600 }, { x: 900, y: 600 }, { x: 900, y: 400 }, { x: 1200, y: 400 },
    { x: 1200, y: 700 }, { x: 1920, y: 700 },
  ],
  map6: [
    { x: 0, y: 540 }, { x: 200, y: 540 }, { x: 200, y: 300 }, { x: 400, y: 300 },
    { x: 400, y: 600 }, { x: 600, y: 600 }, { x: 600, y: 200 }, { x: 800, y: 200 },
    { x: 800, y: 500 }, { x: 1000, y: 500 }, { x: 1000, y: 300 }, { x: 1200, y: 300 },
    { x: 1200, y: 700 }, { x: 1920, y: 700 },
  ],
  map7: [
    { x: 0, y: 540 }, { x: 400, y: 540 }, { x: 400, y: 200 }, { x: 800, y: 200 },
    { x: 800, y: 600 }, { x: 1200, y: 600 }, { x: 1200, y: 400 }, { x: 1600, y: 400 },
    { x: 1600, y: 700 }, { x: 1920, y: 700 },
  ],
  map8: [
    { x: 0, y: 540 }, { x: 300, y: 540 }, { x: 300, y: 300 }, { x: 600, y: 300 },
    { x: 600, y: 600 }, { x: 900, y: 600 }, { x: 900, y: 200 }, { x: 1200, y: 200 },
    { x: 1200, y: 500 }, { x: 1500, y: 500 }, { x: 1500, y: 700 }, { x: 1920, y: 700 },
  ],
  map9: [
    { x: 0, y: 540 }, { x: 200, y: 540 }, { x: 200, y: 200 }, { x: 400, y: 200 },
    { x: 400, y: 600 }, { x: 600, y: 600 }, { x: 600, y: 300 }, { x: 800, y: 300 },
    { x: 800, y: 700 }, { x: 1000, y: 700 }, { x: 1000, y: 400 }, { x: 1200, y: 400 },
    { x: 1200, y: 200 }, { x: 1400, y: 200 }, { x: 1400, y: 600 }, { x: 1920, y: 600 },
  ],
};

// Enemy Themes
const enemyThemes = {
  grassland: {
    easy: [{ health: 50, speed: 1, radius: 10, color: "red" }],
    medium: [{ health: 75, speed: 1.2, radius: 12, color: "darkred" }],
    hard: [{ health: 100, speed: 1.5, radius: 15, color: "crimson" }],
  },
  desert: {
    easy: [{ health: 60, speed: 0.9, radius: 11, color: "sandybrown" }],
    medium: [{ health: 90, speed: 1.1, radius: 13, color: "peru" }],
    hard: [{ health: 120, speed: 1.4, radius: 16, color: "sienna" }],
  },
  stone: {
    easy: [{ health: 70, speed: 0.8, radius: 12, color: "gray" }],
    medium: [{ health: 105, speed: 1.0, radius: 14, color: "darkgray" }],
    hard: [{ health: 140, speed: 1.3, radius: 17, color: "slategray" }],
  },
  forest: {
    easy: [{ health: 55, speed: 1.1, radius: 10, color: "forestgreen" }],
    medium: [{ health: 80, speed: 1.3, radius: 12, color: "darkgreen" }],
    hard: [{ health: 110, speed: 1.6, radius: 15, color: "olive" }],
  },
  mountain: {
    easy: [{ health: 80, speed: 0.7, radius: 13, color: "brown" }],
    medium: [{ health: 120, speed: 0.9, radius: 15, color: "saddlebrown" }],
    hard: [{ health: 160, speed: 1.2, radius: 18, color: "maroon" }],
  },
  river: {
    easy: [{ health: 50, speed: 1.2, radius: 10, color: "dodgerblue" }],
    medium: [{ health: 75, speed: 1.4, radius: 12, color: "royalblue" }],
    hard: [{ health: 100, speed: 1.7, radius: 15, color: "navy" }],
  },
  canyon: {
    easy: [{ health: 65, speed: 1.0, radius: 11, color: "chocolate" }],
    medium: [{ health: 95, speed: 1.2, radius: 13, color: "darkorange" }],
    hard: [{ health: 130, speed: 1.5, radius: 16, color: "firebrick" }],
  },
  arctic: {
    easy: [{ health: 60, speed: 0.9, radius: 12, color: "lightcyan" }],
    medium: [{ health: 90, speed: 1.1, radius: 14, color: "cyan" }],
    hard: [{ health: 120, speed: 1.4, radius: 17, color: "deepskyblue" }],
  },
};

let scaledPath = paths[selectedMap].map(point => ({ x: point.x * scaleX, y: point.y * scaleY }));
let scaledSpawnPoint = scaledPath[0];

// WebSocket for Chat and Multiplayer
let ws;
function initWebSocket() {
  const token = localStorage.getItem("token");
  if (!token) {
    console.warn("No token found for WebSocket connection");
    showNotification("Please log in to join the game chat.");
    return;
  }

  ws = new WebSocket(`wss://mathematically.onrender.com/ws?token=${token}`);

  ws.onopen = () => {
    console.log("WebSocket connected");
    showNotification("Connected to game chat!");
    if (gameState.isPartyMode && gameState.partyId) {
      ws.send(JSON.stringify({ type: "joinParty", partyId: gameState.partyId }));
    } else {
      ws.send(JSON.stringify({ type: "join", map: selectedMap, difficulty: selectedDifficulty }));
    }
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    switch (data.type) {
      case "chat":
        gameState.chatMessages.push({ sender: data.sender, message: data.message, timestamp: Date.now() });
        updateChat();
        break;
      case "playerList":
        gameState.players = data.players;
        gameState.partyLeader = data.leader || gameState.players[0];
        updatePlayerList();
        updateStats();
        break;
      case "placeTower":
        if (data.tower) {
          gameState.towers.push(new Tower(data.tower.x, data.tower.y, data.tower.type));
          gameState.gameMoney = data.gameMoney;
        }
        break;
      case "wave":
        if (data.wave > gameState.wave) {
          gameState.wave = data.wave;
          spawnWave();
        }
        break;
      case "gameOver":
        endGame(data.won);
        break;
      case "partyJoined":
        gameState.partyId = data.partyId;
        gameState.isPartyMode = true;
        gameState.gameMoney = data.gameMoney;
        selectedMap = data.map;
        selectedDifficulty = data.difficulty;
        mapTheme = mapThemes[selectedMap];
        scaledPath = paths[selectedMap].map(point => ({ x: point.x * scaleX, y: point.y * scaleY }));
        scaledSpawnPoint = scaledPath[0];
        if (data.started && window.location.pathname !== '/game.html') {
          window.location.href = '/game.html';
        }
        showNotification(`Joined party ${gameState.partyId}`);
        updateStats();
        break;
      case "startGame":
        if (window.location.pathname !== '/game.html') {
          localStorage.setItem("selectedMap", data.map);
          localStorage.setItem("selectedDifficulty", data.difficulty);
          window.location.href = '/game.html';
        } else {
          selectedMap = data.map;
          selectedDifficulty = data.difficulty;
          gameState.gameMoney = data.gameMoney;
          mapTheme = mapThemes[selectedMap];
          scaledPath = paths[selectedMap].map(point => ({ x: point.x * scaleX, y: point.y * scaleY }));
          scaledSpawnPoint = scaledPath[0];
          resetGame();
          spawnWave();
          showNotification('Game started!');
        }
        break;
      case "moneyUpdate":
        gameState.gameMoney = data.gameMoney;
        break;
      case "mapSelected":
        if (gameState.partyLeader !== localStorage.getItem("username")) {
          selectedMap = data.map;
          selectedDifficulty = data.difficulty;
          mapTheme = mapThemes[selectedMap];
          scaledPath = paths[selectedMap].map(point => ({ x: point.x * scaleX, y: point.y * scaleY }));
          scaledSpawnPoint = scaledPath[0];
          resetGame();
          showNotification(`Party leader selected ${selectedMap} (${selectedDifficulty})`);
        }
        break;
      case "partyRestart":
        gameState.gameMoney = data.gameMoney;
        resetGame();
        showNotification('Party game restarted!');
        break;
    }
  };

  ws.onerror = (error) => {
    console.error("WebSocket error:", error);
    showNotification("WebSocket connection failed.");
  };

  ws.onclose = () => {
    console.log("WebSocket disconnected");
    showNotification("Disconnected from game chat.");
  };
}

// Server Communication
async function fetchUserData() {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("No token found");
  const response = await fetch("/user", {
    headers: { "Authorization": `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(`Failed to fetch user data: ${response.statusText}`);
  const data = await response.json();
  gameState.persistentMoney = data.money;
}

async function loadUnlockedTowers() {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("No token found");
  const response = await fetch("/towers", {
    headers: { "Authorization": `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(`Failed to load towers: ${response.statusText}`);
  const data = await response.json();
  gameState.unlockedTowers = data.towers.length > 0 ? data.towers : ["basic"];
}

async function updatePersistentMoney() {
  const token = localStorage.getItem("token");
  if (!token) return;
  const response = await fetch("/update-money", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ money: gameState.persistentMoney }),
  });
  if (!response.ok) console.error("Failed to update money:", await response.text());
}

// Classes (unchanged Enemy, Tower, Projectile definitions omitted for brevity)
// Assume they remain as in your original code.

// Game Logic
function spawnWave() {
  const maxWaves = selectedMap === "map9" ? 60 : 30;
  if (gameState.wave > maxWaves) {
    gameState.gameWon = true;
    endGame(true);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "gameOver", won: true }));
    }
    return;
  }
  gameState.isSpawning = true;
  const enemiesPerWave = Math.min(5 + gameState.wave * 2, 50);
  gameState.enemiesToSpawn = enemiesPerWave;
  gameState.spawnTimer = 0;
  gameState.waveDelay = 0;
  gameState.isBossWave = gameState.wave % 5 === 0 && gameState.wave > 0;
  gameState.bossSpawned = false;
  console.log(`Starting wave ${gameState.wave} with ${enemiesPerWave} enemies${gameState.isBossWave ? " (Boss Wave)" : ""}`);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: "wave", wave: gameState.wave }));
  }
}

function updateSpawning(dt) {
  if (gameState.waveDelay > 0) {
    gameState.waveDelay -= dt * gameState.gameSpeed;
    if (gameState.waveDelay <= 0) {
      spawnWave();
    }
    return;
  }

  if (gameState.isSpawning && gameState.enemiesToSpawn > 0) {
    gameState.spawnTimer += dt * gameState.gameSpeed;
    const spawnInterval = 1;
    if (gameState.spawnTimer >= spawnInterval) {
      try {
        const enemyType = enemyThemes[mapTheme][selectedDifficulty][0];
        if (!enemyType) throw new Error(`No enemy type defined for ${mapTheme}/${selectedDifficulty}`);
        gameState.enemies.push(new Enemy(enemyType, gameState.wave));
        gameState.enemiesToSpawn--;
        gameState.spawnTimer -= spawnInterval;
        if (gameState.enemiesToSpawn <= 0) {
          gameState.isSpawning = false;
        }
      } catch (error) {
        console.error("Error spawning enemy:", error);
        showNotification("Error spawning enemies!");
        gameState.isSpawning = false;
      }
    }
    return;
  }

  if (!gameState.isSpawning && gameState.enemies.length === 0 && gameState.playerHealth > 0) {
    gameState.waveDelay = 2;
    gameState.wave++;
  }
}

// UI Functions (unchanged showNotification, updateStats, updateTowerInfo, updateChat, updatePlayerList, endGame omitted for brevity)
// Assume they remain as in your original code.

// Reset Game State
function resetGame() {
  gameState.enemies = [];
  gameState.towers = [];
  gameState.projectiles = [];
  gameState.playerHealth = 20;
  gameState.gameMoney = selectedDifficulty === "easy" ? 200 : selectedDifficulty === "medium" ? 400 : 600;
  gameState.score = 0;
  gameState.wave = 1;
  gameState.isPaused = false;
  gameState.gameOver = false;
  gameState.gameWon = false;
  gameState.selectedTower = null;
  gameState.selectedTowerType = null;
  gameState.isSpawning = false;
  gameState.gameSpeed = 1;
  gameState.isBossWave = false;
  gameState.bossSpawned = false;
  gameState.chatMessages = [];
  if (!gameState.isPartyMode) gameState.players = [];
}

// Sidebar Initialization
function initSidebar() {
  const sidebar = document.getElementById("sidebar");
  sidebar.innerHTML = "";
  gameState.unlockedTowers.forEach(type => {
    const div = document.createElement("div");
    div.className = "tower-option";
    div.textContent = `${type.charAt(0).toUpperCase() + type.slice(1)} ($${towerStats[type].cost})`;
    div.addEventListener("click", () => {
      gameState.selectedTowerType = type;
      document.querySelectorAll(".tower-option").forEach(el => el.classList.remove("selected"));
      div.classList.add("selected");
    });
    sidebar.appendChild(div);
  });
  if (gameState.isPartyMode && localStorage.getItem("username") === gameState.partyLeader) {
    const startButton = document.createElement("button");
    startButton.textContent = "Start Game";
    startButton.addEventListener("click", () => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "startGame", partyId: gameState.partyId }));
      }
    });
    sidebar.appendChild(startButton);
  }
}

// Mouse Handling (unchanged canvas event listeners omitted for brevity)
// Assume they remain as in your original code.

// Game Loop
const FPS = 30;
const FRAME_TIME = 1000 / FPS;
let lastTime = 0;
let accumulatedTime = 0;

function update(timestamp) {
  if (!lastTime) lastTime = timestamp;
  const elapsed = timestamp - lastTime;
  lastTime = timestamp;
  accumulatedTime += elapsed;

  ctx.fillStyle = themeBackgrounds[selectedMap];
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.beginPath();
  ctx.moveTo(scaledPath[0].x, scaledPath[0].y);
  for (let i = 1; i < scaledPath.length; i++) {
    ctx.lineTo(scaledPath[i].x, scaledPath[i].y);
  }
  ctx.strokeStyle = "brown";
  ctx.lineWidth = 40 * textScale;
  ctx.stroke();

  gameState.towers.forEach(tower => tower.draw());
  gameState.enemies.forEach(enemy => enemy.draw());
  gameState.projectiles.forEach(projectile => projectile.draw());

  if (gameState.selectedTowerType && lastMousePos) {
    ctx.beginPath();
    ctx.arc(lastMousePos.x, lastMousePos.y, 20 * textScale, 0, Math.PI * 2);
    ctx.fillStyle = towerStats[gameState.selectedTowerType].color;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(lastMousePos.x, lastMousePos.y, towerStats[gameState.selectedTowerType].range * scaleX, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  while (accumulatedTime >= FRAME_TIME) {
    if (!gameState.isPaused && !gameState.gameOver && !gameState.gameWon) {
      const dt = FRAME_TIME / 1000;
      updateSpawning(dt);
      gameState.enemies.forEach(enemy => enemy.move(dt));
      gameState.towers.forEach(tower => tower.shoot());
      gameState.projectiles.forEach(projectile => projectile.move(dt));
    }
    accumulatedTime -= FRAME_TIME;
  }

  updateStats();
  requestAnimationFrame(update);
}

// Event Listeners (unchanged button event listeners omitted for brevity)
// Assume they remain as in your original code.

// Initialization
async function init() {
  try {
    await fetchUserData();
    await loadUnlockedTowers();
    initSidebar();
    initWebSocket();
    resetGame();
    updateStats();
    if (!gameState.isPartyMode) {
      spawnWave();
    }
    requestAnimationFrame(update);
  } catch (error) {
    console.error("Initialization error:", error);
    showNotification("Failed to initialize game. Please try again.");
    setTimeout(() => window.location.href = "/", 2000);
  }
}

init();