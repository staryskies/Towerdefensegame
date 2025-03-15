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

// Classes
class Enemy {
  constructor(type, wave) {
    this.x = scaledSpawnPoint.x;
    this.y = scaledSpawnPoint.y;
    const healthMultiplier = selectedDifficulty === "easy" ? 0.25 : selectedDifficulty === "medium" ? 0.50 : 1;
    this.health = Math.floor(type.health * healthMultiplier * (1 + ((wave - 1) * 14) / 59));
    this.maxHealth = this.health;
    this.speed = type.speed * scaleX * 70;
    this.radius = type.radius * textScale;
    this.color = type.color;
    this.pathIndex = 1;
    this.isBoss = gameState.isBossWave && !gameState.bossSpawned;
    if (this.isBoss) {
      this.health *= 5;
      this.maxHealth *= 5;
      this.radius *= 2;
      gameState.bossSpawned = true;
    }
  }

  move(dt) {
    if (this.pathIndex >= scaledPath.length) {
      gameState.playerHealth -= this.isBoss
        ? (selectedDifficulty === "easy" ? 2.5 : selectedDifficulty === "medium" ? 5 : 7.5)
        : (selectedDifficulty === "easy" ? 0.5 : selectedDifficulty === "medium" ? 1 : 1.5);
      gameState.enemies = gameState.enemies.filter(e => e !== this);
      if (gameState.playerHealth <= 0 && ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "gameOver", won: false }));
      }
      return;
    }
    const target = scaledPath[this.pathIndex];
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const moveSpeed = this.speed * gameState.gameSpeed * dt;
    if (distance < moveSpeed) {
      this.x = target.x;
      this.y = target.y;
      this.pathIndex++;
    } else {
      this.x += (dx / distance) * moveSpeed;
      this.y += (dy / distance) * moveSpeed;
    }
  }

  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.isBoss ? "darkred" : this.color;
    ctx.fill();
    ctx.fillStyle = "white";
    ctx.font = `${12 * textScale}px Arial`;
    ctx.textAlign = "center";
    ctx.fillText(`${Math.floor(this.health)}/${this.maxHealth}`, this.x, this.y - this.radius - 5 * textScale);
  }
}

class Tower {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.damage = towerStats[type].damage;
    this.range = towerStats[type].range * scaleX;
    this.fireRate = towerStats[type].fireRate;
    this.lastShot = 0;
    this.radius = 20 * textScale;
    this.color = towerStats[type].color;
    this.angle = 0;
    this.powerLevel = 0;
    this.utilityLevel = 0;
    this.specials = { tripleShot: false, crit: 0.2, splash: 1, slow: 0.5, multiBeam: false, chain: 2, burn: 1, pull: 100 };
  }

  shoot() {
    const now = Date.now();
    if (now - this.lastShot < this.fireRate / gameState.gameSpeed) return;
    let target = gameState.enemies.find(enemy => Math.hypot(enemy.x - this.x, enemy.y - this.y) < this.range);
    if (target) {
      const dx = target.x - this.x;
      const dy = target.y - this.y;
      this.angle = Math.atan2(dy, dx);
      switch (this.type) {
        case "laser":
          if (now - this.lastShot >= 10000) {
            this.lastShot = now;
            let beamDuration = 5000 / gameState.gameSpeed;
            let damageInterval = setInterval(() => {
              gameState.enemies.forEach(enemy => {
                if (Math.hypot(enemy.x - this.x, enemy.y - this.y) < this.range) {
                  enemy.health -= this.damage / 10;
                  if (enemy.health <= 0) {
                    gameState.score += enemy.isBoss ? 50 : 10;
                    gameState.gameMoney += enemy.isBoss ? 100 : 20;
                    gameState.persistentMoney += enemy.isBoss ? 10 : 2;
                    updatePersistentMoney();
                    gameState.enemies = gameState.enemies.filter(e => e !== enemy);
                    if (ws && ws.readyState === WebSocket.OPEN) {
                      ws.send(JSON.stringify({ type: "moneyUpdate", gameMoney: gameState.gameMoney }));
                    }
                  }
                }
              });
              if (this.specials.multiBeam) {
                let extraTarget = gameState.enemies.find(e => e !== target && Math.hypot(e.x - this.x, e.y - this.y) < this.range);
                if (extraTarget) {
                  extraTarget.health -= this.damage / 10;
                  if (extraTarget.health <= 0) {
                    gameState.score += extraTarget.isBoss ? 50 : 10;
                    gameState.gameMoney += extraTarget.isBoss ? 100 : 20;
                    gameState.persistentMoney += extraTarget.isBoss ? 10 : 2;
                    updatePersistentMoney();
                    gameState.enemies = gameState.enemies.filter(e => e !== extraTarget);
                    if (ws && ws.readyState === WebSocket.OPEN) {
                      ws.send(JSON.stringify({ type: "moneyUpdate", gameMoney: gameState.gameMoney }));
                    }
                  }
                }
              }
            }, 500 / gameState.gameSpeed);
            setTimeout(() => clearInterval(damageInterval), beamDuration);
          }
          break;
        case "tesla":
          gameState.projectiles.push(new Projectile(this.x, this.y, target, this.damage, 5, this.type));
          let chainTargets = gameState.enemies.filter(e => e !== target && Math.hypot(e.x - this.x, e.y - this.y) < this.range * 1.5).slice(0, this.specials.chain);
          chainTargets.forEach(enemy => {
            enemy.health -= this.damage * 0.5;
            if (enemy.health <= 0) {
              gameState.score += enemy.isBoss ? 50 : 10;
              gameState.gameMoney += enemy.isBoss ? 100 : 20;
              gameState.persistentMoney += enemy.isBoss ? 10 : 2;
              updatePersistentMoney();
              gameState.enemies = gameState.enemies.filter(e => e !== enemy);
              if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: "moneyUpdate", gameMoney: gameState.gameMoney }));
              }
            }
          });
          this.lastShot = now;
          break;
        case "vortex":
          if (now - this.lastShot >= 5000) {
            gameState.enemies.forEach(enemy => {
              if (Math.hypot(enemy.x - this.x, enemy.y - this.y) < this.range) {
                const dx = this.x - enemy.x;
                const dy = this.y - enemy.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance > 20 * scaleX) {
                  const pullStrength = this.specials.pull * scaleX;
                  enemy.x += (dx / distance) * pullStrength * (gameState.gameSpeed / 60);
                  enemy.y += (dy / distance) * pullStrength * (gameState.gameSpeed / 60);
                  const nearestPoint = scaledPath.reduce((closest, point) =>
                    Math.hypot(point.x - enemy.x, point.y - enemy.y) < Math.hypot(closest.x - enemy.x, closest.y - enemy.y) ? point : closest
                  );
                  enemy.x = nearestPoint.x;
                  enemy.y = nearestPoint.y;
                }
              }
            });
            this.lastShot = now;
          }
          break;
        case "archer":
          if (this.specials.tripleShot) {
            gameState.projectiles.push(new Projectile(this.x, this.y, target, this.damage, 5, this.type));
            let extraTargets = gameState.enemies.filter(e => e !== target && Math.hypot(e.x - this.x, e.y - this.y) < this.range).slice(0, 2);
            extraTargets.forEach(t => gameState.projectiles.push(new Projectile(this.x, this.y, t, this.damage, 5, this.type)));
          } else {
            gameState.projectiles.push(new Projectile(this.x, this.y, target, this.damage, 5, this.type));
          }
          this.lastShot = now;
          break;
        default:
          gameState.projectiles.push(new Projectile(this.x, this.y, target, this.damage, 5, this.type));
          this.lastShot = now;
      }
    }
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.beginPath();

    switch (this.type) {
      case "basic":
        ctx.moveTo(-12 * textScale, -12 * textScale);
        for (let i = 0; i < 6; i++) {
          ctx.lineTo(12 * textScale * Math.cos((i * Math.PI) / 3), 12 * textScale * Math.sin((i * Math.PI) / 3));
        }
        ctx.closePath();
        ctx.fillStyle = this.color;
        ctx.fill();
        break;
      case "archer":
        ctx.arc(0, 0, 15 * textScale, Math.PI / 4, 3 * Math.PI / 4);
        ctx.lineTo(0, -15 * textScale);
        ctx.closePath();
        ctx.fillStyle = this.color;
        ctx.fill();
        break;
      case "cannon":
        ctx.arc(0, 0, 15 * textScale, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.beginPath();
        ctx.rect(0, -10 * textScale, 25 * textScale, 20 * textScale);
        ctx.fillStyle = "darkgray";
        ctx.fill();
        break;
      // Add more tower drawings as needed
    }
    ctx.restore();

    if (gameState.selectedTower === this) {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.range, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(0, 255, 0, 0.3)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.fillStyle = "white";
    ctx.font = `${12 * textScale}px Arial`;
    ctx.textAlign = "center";
    ctx.fillText(this.type.charAt(0).toUpperCase() + this.type.slice(1), this.x, this.y + 25 * textScale);
  }

  upgrade(path) {
    const upgrades = towerUpgradePaths[this.type][path];
    const level = path === "power" ? this.powerLevel : this.utilityLevel;
    if (level >= 4) {
      showNotification(`Max upgrades reached for ${path} path!`);
      return;
    }
    const upgrade = upgrades[level];
    if (gameState.gameMoney < upgrade.cost) {
      showNotification("Not enough money!");
      return;
    }
    gameState.gameMoney -= upgrade.cost;
    if (upgrade.damage) this.damage *= upgrade.damage;
    if (upgrade.range) this.range *= upgrade.range;
    if (upgrade.fireRate) this.fireRate *= upgrade.fireRate;
    if (upgrade.special) {
      switch (upgrade.special) {
        case "tripleShot": this.specials.tripleShot = true; break;
        case "crit": this.specials.crit += 0.2; break;
        case "splash": this.specials.splash *= 1.5; break;
        case "slow": this.specials.slow *= 1.5; break;
        case "multiBeam": this.specials.multiBeam = true; break;
        case "chain": this.specials.chain += 2; break;
        case "burn": this.specials.burn *= 1.5; break;
        case "pull": this.specials.pull *= 1.5; break;
      }
    }
    if (path === "power") this.powerLevel++;
    else this.utilityLevel++;
    showNotification(`${this.type} upgraded: ${upgrade.desc}`);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "moneyUpdate", gameMoney: gameState.gameMoney }));
    }
    updateTowerInfo();
  }
}

class Projectile {
  constructor(x, y, target, damage, speed, type) {
    this.x = x;
    this.y = y;
    this.target = target;
    this.damage = damage;
    this.speed = speed * scaleX * 100;
    this.type = type;
    this.radius = type === "missile" ? 8 * textScale : 5 * textScale;
    this.color = towerStats[type].color || "black";
  }

  move(dt) {
    if (!this.target || !gameState.enemies.includes(this.target)) {
      gameState.projectiles = gameState.projectiles.filter(p => p !== this);
      return;
    }
    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const moveSpeed = this.speed * dt;
    if (distance < moveSpeed) {
      this.hit();
    } else {
      this.x += (dx / distance) * moveSpeed;
      this.y += (dy / distance) * moveSpeed;
    }
  }

  hit() {
    if (this.target) {
      this.target.health -= this.damage;
      if (this.target.health <= 0) {
        gameState.score += this.target.isBoss ? 50 : 10;
        gameState.gameMoney += this.target.isBoss ? 100 : 20;
        gameState.persistentMoney += this.target.isBoss ? 10 : 2;
        updatePersistentMoney();
        gameState.enemies = gameState.enemies.filter(e => e !== this.target);
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "moneyUpdate", gameMoney: gameState.gameMoney }));
        }
      }
      const tower = gameState.towers.find(t => t.type === this.type);
      switch (this.type) {
        case "cannon":
          gameState.enemies.forEach(enemy => {
            if (enemy !== this.target && Math.hypot(enemy.x - this.x, enemy.y - this.y) < 50 * scaleX * tower.specials.splash) {
              enemy.health -= this.damage * 0.5;
              if (enemy.health <= 0) {
                gameState.score += enemy.isBoss ? 50 : 10;
                gameState.gameMoney += enemy.isBoss ? 100 : 20;
                gameState.persistentMoney += enemy.isBoss ? 10 : 2;
                updatePersistentMoney();
                gameState.enemies = gameState.enemies.filter(e => e !== enemy);
                if (ws && ws.readyState === WebSocket.OPEN) {
                  ws.send(JSON.stringify({ type: "moneyUpdate", gameMoney: gameState.gameMoney }));
                }
              }
            }
          });
          break;
        case "sniper":
          if (Math.random() < tower.specials.crit) this.target.health -= this.damage;
          break;
        case "freeze":
          this.target.speed *= tower.specials.slow;
          setTimeout(() => { if (this.target) this.target.speed /= tower.specials.slow; }, 2000);
          break;
      }
      gameState.projectiles = gameState.projectiles.filter(p => p !== this);
    }
  }

  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
  }
}

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

// UI Functions
function showNotification(message) {
  const notification = document.getElementById("notification-box");
  notification.textContent = message;
  notification.classList.add("show");
  setTimeout(() => notification.classList.remove("show"), 2000);
}

function updateStats() {
  document.getElementById("score").textContent = `Score: ${gameState.score}`;
  document.getElementById("money").textContent = `Money: $${gameState.gameMoney}`;
  document.getElementById("health").textContent = `Health: ${gameState.playerHealth}`;
  document.getElementById("wave").textContent = `Wave: ${gameState.wave}`;
  document.getElementById("speed").textContent = `Speed: ${gameState.gameSpeed}x`;
  if (gameState.isPartyMode && gameState.partyId) {
    document.getElementById("speed").textContent += ` | Party: ${gameState.partyId}`;
  }
}

function updateTowerInfo() {
  const panel = document.getElementById("tower-info-panel");
  const powerButton = document.getElementById("upgrade-power-button");
  const utilityButton = document.getElementById("upgrade-utility-button");
  if (gameState.selectedTower) {
    panel.style.display = "block";
    document.getElementById("tower-type").textContent = `Type: ${gameState.selectedTower.type}`;
    document.getElementById("tower-damage").textContent = `Damage: ${gameState.selectedTower.damage.toFixed(1)}`;
    document.getElementById("tower-range").textContent = `Range: ${Math.round(gameState.selectedTower.range / scaleX)}`;
    document.getElementById("tower-level").textContent = `Power: ${gameState.selectedTower.powerLevel}/4 | Utility: ${gameState.selectedTower.utilityLevel}/4`;
    document.getElementById("tower-ability").textContent = `Ability: ${towerStats[gameState.selectedTower.type].ability}`;

    const powerUpgrades = towerUpgradePaths[gameState.selectedTower.type].power;
    const utilityUpgrades = towerUpgradePaths[gameState.selectedTower.type].utility;
    const nextPowerLevel = gameState.selectedTower.powerLevel;
    const nextUtilityLevel = gameState.selectedTower.utilityLevel;
    const powerCost = nextPowerLevel < 4 ? powerUpgrades[nextPowerLevel].cost : "Max";
    const utilityCost = nextUtilityLevel < 4 ? utilityUpgrades[nextUtilityLevel].cost : "Max";

    powerButton.textContent = `Upgrade Power ($${powerCost})`;
    utilityButton.textContent = `Upgrade Utility ($${utilityCost})`;
    
    powerButton.disabled = nextPowerLevel >= 4 || (typeof powerCost === "number" && gameState.gameMoney < powerCost);
    utilityButton.disabled = nextUtilityLevel >= 4 || (typeof utilityCost === "number" && gameState.gameMoney < utilityCost);
  } else {
    panel.style.display = "none";
    powerButton.disabled = true;
    utilityButton.disabled = true;
  }
}

function updateChat() {
  const chatBox = document.getElementById("chat-messages");
  chatBox.innerHTML = "";
  gameState.chatMessages.slice(-10).forEach(msg => {
    const div = document.createElement("div");
    div.textContent = `${msg.sender}: ${msg.message}`;
    div.style.color = msg.sender === "You" ? "#00b894" : "#2d3436";
    chatBox.appendChild(div);
  });
  chatBox.scrollTop = chatBox.scrollHeight;
}

function updatePlayerList() {
  const playerList = document.getElementById("player-list");
  playerList.innerHTML = "Players:<br>";
  gameState.players.forEach(player => {
    const div = document.createElement("div");
    div.textContent = player + (player === gameState.partyLeader ? " (Leader)" : "");
    playerList.appendChild(div);
  });
}

function endGame(won) {
  gameState.gameOver = !won;
  gameState.gameWon = won;
  const endScreen = document.getElementById("end-screen");
  const persistentMoneyEarned = Math.floor(gameState.score / 10);
  gameState.persistentMoney += persistentMoneyEarned;
  updatePersistentMoney();

  document.getElementById("end-message").textContent = won ? "Victory!" : "Game Over";
  document.getElementById("waves-survived").textContent = `Waves Survived: ${gameState.wave - 1}`;
  document.getElementById("persistent-money-earned").textContent = `Persistent Money Earned: $${persistentMoneyEarned}`;
  document.getElementById("persistent-money-total").textContent = `Total Persistent Money: $${gameState.persistentMoney}`;
  endScreen.style.display = "block";

  const restartButton = document.getElementById("restart-button");
  const mainMenuButton = document.getElementById("main-menu-button");

  restartButton.onclick = async () => {
    endScreen.style.display = "none";
    resetGame();
    if (gameState.isPartyMode && ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "partyRestart", partyId: gameState.partyId }));
    }
    await init();
  };

  mainMenuButton.onclick = () => {
    endScreen.style.display = "none";
    resetGame();
    if (gameState.isPartyMode && ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "leaveParty", partyId: gameState.partyId }));
      gameState.isPartyMode = false;
      gameState.partyId = null;
      gameState.partyLeader = null;
      localStorage.setItem("isPartyMode", "false");
      localStorage.removeItem("partyId");
    }
    if (ws) ws.close();
    window.location.href = "/";
  };
}

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

// Mouse Handling
let lastMousePos = null;

canvas.addEventListener("mousemove", (event) => {
  const rect = canvas.getBoundingClientRect();
  lastMousePos = { x: event.clientX - rect.left, y: event.clientY - rect.top };
});

canvas.addEventListener("click", (event) => {
  const rect = canvas.getBoundingClientRect();
  const clickX = event.clientX - rect.left;
  const clickY = event.clientY - rect.top;

  if (gameState.selectedTowerType && gameState.gameMoney >= towerStats[gameState.selectedTowerType].cost) {
    const tooCloseToPath = scaledPath.some(point => Math.hypot(point.x - clickX, point.y - clickY) < 50 * textScale);
    if (!tooCloseToPath) {
      const newTower = new Tower(clickX, clickY, gameState.selectedTowerType);
      gameState.towers.push(newTower);
      gameState.gameMoney -= towerStats[gameState.selectedTowerType].cost;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: "placeTower",
          tower: { x: clickX, y: clickY, type: gameState.selectedTowerType },
          gameMoney: gameState.gameMoney,
          partyId: gameState.isPartyMode ? gameState.partyId : null,
        }));
      }
      gameState.selectedTowerType = null;
      document.querySelectorAll(".tower-option").forEach(el => el.classList.remove("selected"));
      updateStats();
    } else {
      showNotification("Cannot place tower too close to the path!");
    }
  } else {
    let towerSelected = false;
    gameState.towers.forEach(tower => {
      if (Math.hypot(tower.x - clickX, tower.y - clickY) < tower.radius) {
        gameState.selectedTower = tower;
        towerSelected = true;
      }
    });
    if (!towerSelected) {
      gameState.selectedTower = null;
    }
    updateTowerInfo();
  }
});

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
}

// Event Listeners
document.getElementById("pause-button").addEventListener("click", () => {
  gameState.isPaused = !gameState.isPaused;
  document.getElementById("pause-button").textContent = gameState.isPaused ? "Resume" : "Pause";
});

document.getElementById("speed-button").addEventListener("click", () => {
  gameState.gameSpeed = gameState.gameSpeed === 1 ? 2 : gameState.gameSpeed === 2 ? 4 : 1;
  updateStats();
});

document.getElementById("chat-input").addEventListener("keypress", (e) => {
  if (e.key === "Enter" && ws && ws.readyState === WebSocket.OPEN) {
    const message = e.target.value.trim();
    if (message) {
      ws.send(JSON.stringify({ type: "chat", message }));
      e.target.value = "";
    }
  }
});

document.getElementById("upgrade-power-button").addEventListener("click", () => {
  if (gameState.selectedTower) {
    gameState.selectedTower.upgrade("power");
  }
});

document.getElementById("upgrade-utility-button").addEventListener("click", () => {
  if (gameState.selectedTower) {
    gameState.selectedTower.upgrade("utility");
  }
});

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