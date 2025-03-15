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
  map1: "grassland", map2: "desert", map3: "stone", map4: "forest", map5: "mountain",
  map6: "desert", map7: "river", map8: "canyon", map9: "arctic",
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
  username: localStorage.getItem("username") || "Guest", // Default to "Guest" if no username
};

// Tower Definitions (unchanged)
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

// Tower Upgrade Paths, Theme Backgrounds, Paths, Enemy Themes (unchanged, omitted for brevity)
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
};

const themeBackgrounds = {
  map1: "#90ee90", map2: "#f4a460", map3: "#a9a9a9", map4: "#6b8e23", map5: "#cd853f",
  map6: "#f4a460", map7: "#87ceeb", map8: "#cd5c5c", map9: "#e0ffff",
};

const paths = {
  map1: [
    { x: 0, y: 540 }, { x: 300, y: 540 }, { x: 300, y: 300 }, { x: 600, y: 300 },
    { x: 600, y: 600 }, { x: 900, y: 600 }, { x: 900, y: 200 }, { x: 1200, y: 200 },
    { x: 1200, y: 700 }, { x: 1500, y: 700 }, { x: 1500, y: 400 }, { x: 1920, y: 400 },
  ],
};

const enemyThemes = {
  grassland: {
    easy: [{ health: 50, speed: 1, radius: 10, color: "red" }],
    medium: [{ health: 75, speed: 1.2, radius: 12, color: "darkred" }],
    hard: [{ health: 100, speed: 1.5, radius: 15, color: "crimson" }],
  },
};

let scaledPath = paths[selectedMap].map(point => ({ x: point.x * scaleX, y: point.y * scaleY }));
let scaledSpawnPoint = scaledPath[0];

// WebSocket for Chat and Multiplayer (No Token)
let ws;
function initWebSocket() {
  console.log("Attempting WebSocket connection...");
  ws = new WebSocket("wss://mathematically.onrender.com/ws"); // No token required

  ws.onopen = () => {
    console.log("WebSocket connected successfully");
    showNotification("Connected to game chat!");
    // Send initial join message with username
    const joinData = {
      type: gameState.isPartyMode && gameState.partyId ? "joinParty" : "join",
      username: gameState.username,
      ...(gameState.isPartyMode && gameState.partyId ? { partyId: gameState.partyId } : { map: selectedMap, difficulty: selectedDifficulty })
    };
    ws.send(JSON.stringify(joinData));
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log("Received WebSocket message:", data);
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
          updateStats();
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
      case "startGame":
        selectedMap = data.map;
        selectedDifficulty = data.difficulty;
        gameState.gameMoney = data.gameMoney;
        mapTheme = mapThemes[selectedMap];
        scaledPath = paths[selectedMap].map(point => ({ x: point.x * scaleX, y: point.y * scaleY }));
        scaledSpawnPoint = scaledPath[0];
        resetGame();
        spawnWave();
        showNotification("Game started!");
        break;
      case "moneyUpdate":
        gameState.gameMoney = data.gameMoney;
        updateStats();
        break;
      case "partyRestart":
        gameState.gameMoney = data.gameMoney;
        resetGame();
        spawnWave();
        showNotification("Party game restarted!");
        break;
      default:
        console.warn("Unhandled message type:", data.type);
    }
  };

  ws.onerror = (error) => {
    console.error("WebSocket error:", error);
    showNotification("WebSocket connection failed.");
  };

  ws.onclose = (event) => {
    console.log(`WebSocket disconnected. Code: ${event.code}, Reason: ${event.reason || "No reason provided"}`);
    showNotification("Disconnected from game chat. Reconnecting...");
    setTimeout(() => {
      console.log("Reattempting WebSocket connection...");
      initWebSocket();
    }, 2000);
  };
}

// Server Communication (No Token)
async function fetchUserData() {
  const response = await fetch("/user", { method: "GET" }); // Assume no auth needed
  if (response.ok) {
    const data = await response.json();
    gameState.persistentMoney = data.money || 0;
    gameState.username = data.username || gameState.username;
  }
}

async function loadUnlockedTowers() {
  const response = await fetch("/towers", { method: "GET" });
  if (response.ok) {
    const data = await response.json();
    gameState.unlockedTowers = data.towers.length > 0 ? data.towers : ["basic"];
  }
}

async function updatePersistentMoney() {
  await fetch("/update-money", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ money: gameState.persistentMoney, username: gameState.username }),
  });
}

// Classes (unchanged except for username in chat)
class Enemy {
  constructor(type, wave) {
    this.x = scaledSpawnPoint.x;
    this.y = scaledSpawnPoint.y;
    const healthMultiplier = selectedDifficulty === "easy" ? 0.25 : selectedDifficulty === "medium" ? 0.5 : 1;
    this.health = Math.floor(type.health * healthMultiplier * (1 + (wave - 1) * 0.25));
    this.maxHealth = this.health;
    this.speed = type.speed * scaleX;
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
      gameState.playerHealth -= this.isBoss ? 5 : 1;
      gameState.enemies = gameState.enemies.filter(e => e !== this);
      if (gameState.playerHealth <= 0) endGame(false);
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
    ctx.fillText(`${Math.floor(this.health)}`, this.x, this.y - this.radius - 5 * textScale);
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
      gameState.projectiles.push(new Projectile(this.x, this.y, target, this.damage, 5, this.type));
      this.lastShot = now;
    }
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
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
    this.speed = speed * scaleX;
    this.type = type;
    this.radius = 5 * textScale;
    this.color = towerStats[type].color;
  }

  move(dt) {
    if (!this.target || !gameState.enemies.includes(this.target)) {
      gameState.projectiles = gameState.projectiles.filter(p => p !== this);
      return;
    }
    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const moveSpeed = this.speed * gameState.gameSpeed * dt;
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
        gameState.gameMoney += this.target.isBoss ? 20 : 5;
        gameState.persistentMoney += this.target.isBoss ? 5 : 1;
        updatePersistentMoney();
        gameState.enemies = gameState.enemies.filter(e => e !== this.target);
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
  if (ws && ws.readyState === WebSocket.OPEN && gameState.isPartyMode) {
    ws.send(JSON.stringify({ type: "wave", wave: gameState.wave }));
  }
}

function updateSpawning(dt) {
  if (gameState.waveDelay > 0) {
    gameState.waveDelay -= dt * gameState.gameSpeed;
    if (gameState.waveDelay <= 0) spawnWave();
    return;
  }
  if (gameState.isSpawning && gameState.enemiesToSpawn > 0) {
    gameState.spawnTimer += dt * gameState.gameSpeed;
    const spawnInterval = 1;
    if (gameState.spawnTimer >= spawnInterval) {
      const enemyType = enemyThemes[mapTheme][selectedDifficulty][0];
      gameState.enemies.push(new Enemy(enemyType, gameState.wave));
      gameState.enemiesToSpawn--;
      gameState.spawnTimer -= spawnInterval;
      if (gameState.enemiesToSpawn <= 0) gameState.isSpawning = false;
    }
  } else if (!gameState.isSpawning && gameState.enemies.length === 0 && gameState.playerHealth > 0) {
    gameState.waveDelay = 2;
    gameState.wave++;
  }
}

// UI Functions
function showNotification(message) {
  const notification = document.getElementById("notification-box");
  if (notification) {
    notification.textContent = message;
    notification.classList.add("show");
    setTimeout(() => notification.classList.remove("show"), 2000);
  }
}

function updateStats() {
  const score = document.getElementById("score");
  const money = document.getElementById("money");
  const health = document.getElementById("health");
  const wave = document.getElementById("wave");
  const speed = document.getElementById("speed");
  if (score) score.textContent = `Score: ${gameState.score}`;
  if (money) money.textContent = `Money: $${gameState.gameMoney}`;
  if (health) money.textContent = `Health: ${gameState.playerHealth}`;
  if (wave) wave.textContent = `Wave: ${gameState.wave}`;
  if (speed) speed.textContent = `Speed: ${gameState.gameSpeed}x${gameState.isPaused ? " (Paused)" : ""}${gameState.isPartyMode && gameState.partyId ? ` | Party: ${gameState.partyId}` : ""}${gameState.username ? ` | ${gameState.username}` : ""}`;
}

function updateTowerInfo() {
  const panel = document.getElementById("tower-info-panel");
  const powerButton = document.getElementById("upgrade-power-button");
  const utilityButton = document.getElementById("upgrade-utility-button");
  if (gameState.selectedTower && panel) {
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

    if (powerButton) {
      powerButton.textContent = `Upgrade Power ($${powerCost})`;
      powerButton.disabled = nextPowerLevel >= 4 || (typeof powerCost === "number" && gameState.gameMoney < powerCost);
    }
    if (utilityButton) {
      utilityButton.textContent = `Upgrade Utility ($${utilityCost})`;
      utilityButton.disabled = nextUtilityLevel >= 4 || (typeof utilityCost === "number" && gameState.gameMoney < utilityCost);
    }
  } else if (panel) {
    panel.style.display = "none";
    if (powerButton) powerButton.disabled = true;
    if (utilityButton) utilityButton.disabled = true;
  }
}

function updateChat() {
  const chatBox = document.getElementById("chat-messages");
  if (chatBox) {
    chatBox.innerHTML = "";
    gameState.chatMessages.slice(-10).forEach(msg => {
      const div = document.createElement("div");
      div.textContent = `${msg.sender}: ${msg.message}`;
      div.style.color = msg.sender === gameState.username ? "#00b894" : "#2d3436";
      chatBox.appendChild(div);
    });
    chatBox.scrollTop = chatBox.scrollHeight;
  }
}

function updatePlayerList() {
  const playerList = document.getElementById("player-list");
  if (playerList) {
    playerList.innerHTML = "Players:<br>";
    gameState.players.forEach(player => {
      const div = document.createElement("div");
      div.textContent = player + (player === gameState.partyLeader ? " (Leader)" : "");
      playerList.appendChild(div);
    });
  }
}

function endGame(won) {
  gameState.gameOver = !won;
  gameState.gameWon = won;
  const endScreen = document.getElementById("end-screen");
  if (endScreen) {
    const persistentMoneyEarned = Math.floor(gameState.score / 10);
    gameState.persistentMoney += persistentMoneyEarned;
    updatePersistentMoney();

    document.getElementById("end-message").textContent = won ? "Victory!" : "Game Over";
    document.getElementById("waves-survived").textContent = `Waves Survived: ${gameState.wave - 1}`;
    document.getElementById("persistent-money-earned").textContent = `Persistent Money Earned: $${persistentMoneyEarned}`;
    document.getElementById("persistent-money-total").textContent = `Total Persistent Money: $${gameState.persistentMoney}`;
    endScreen.style.display = "block";
  }
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
  if (sidebar) {
    sidebar.innerHTML = ""; // Clear existing content
    gameState.unlockedTowers.forEach(type => {
      const div = document.createElement("div");
      div.className = "tower-option";
      div.textContent = `${type.charAt(0).toUpperCase() + type.slice(1)} ($${towerStats[type].cost})`;
      div.addEventListener("click", () => {
        gameState.selectedTowerType = type;
        document.querySelectorAll(".tower-option").forEach(el => el.classList.remove("selected"));
        div.classList.add("selected");
        console.log(`Selected tower type: ${type}`);
      });
      sidebar.appendChild(div);
    });
    const pauseButton = document.createElement("button");
    pauseButton.id = "pause-button";
    pauseButton.textContent = "Pause";
    sidebar.appendChild(pauseButton);
    const speedButton = document.createElement("button");
    speedButton.id = "speed-button";
    speedButton.textContent = "Speed";
    sidebar.appendChild(speedButton);
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
    if (!towerSelected) gameState.selectedTower = null;
    updateTowerInfo();
  }
});

// Game Loop
let lastTime = 0;
function update(timestamp) {
  if (!lastTime) lastTime = timestamp;
  const dt = (timestamp - lastTime) / 1000;
  lastTime = timestamp;

  ctx.fillStyle = themeBackgrounds[selectedMap];
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.beginPath();
  ctx.moveTo(scaledPath[0].x, scaledPath[0].y);
  scaledPath.slice(1).forEach(point => ctx.lineTo(point.x, point.y));
  ctx.strokeStyle = "brown";
  ctx.lineWidth = 40 * textScale;
  ctx.stroke();

  updateSpawning(dt);

  if (!gameState.isPaused && !gameState.gameOver && !gameState.gameWon) {
    gameState.enemies.forEach(enemy => enemy.move(dt));
    gameState.towers.forEach(tower => tower.shoot());
    gameState.projectiles.forEach(projectile => projectile.move(dt));
  }

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

  updateStats();
  requestAnimationFrame(update);
}

// Event Listeners
document.addEventListener("DOMContentLoaded", () => {
  const pauseButton = document.getElementById("pause-button");
  const speedButton = document.getElementById("speed-button");
  const chatInput = document.getElementById("chat-input");
  const upgradePowerButton = document.getElementById("upgrade-power-button");
  const upgradeUtilityButton = document.getElementById("upgrade-utility-button");
  const restartButton = document.getElementById("restart-button");
  const mainMenuButton = document.getElementById("main-menu-button");

  if (pauseButton) {
    pauseButton.addEventListener("click", () => {
      gameState.isPaused = !gameState.isPaused;
      pauseButton.textContent = gameState.isPaused ? "Resume" : "Pause";
      updateStats();
      console.log(`Game ${gameState.isPaused ? "paused" : "resumed"}`);
    });
  }

  if (speedButton) {
    speedButton.addEventListener("click", () => {
      gameState.gameSpeed = gameState.gameSpeed === 1 ? 2 : gameState.gameSpeed === 2 ? 4 : 1;
      updateStats();
      console.log(`Game speed set to ${gameState.gameSpeed}x`);
    });
  }

  if (chatInput) {
    chatInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter" && ws && ws.readyState === WebSocket.OPEN) {
        const message = e.target.value.trim();
        if (message) {
          ws.send(JSON.stringify({ type: "chat", message, sender: gameState.username }));
          e.target.value = "";
        }
      }
    });
  }

  if (upgradePowerButton) {
    upgradePowerButton.addEventListener("click", () => {
      if (gameState.selectedTower) gameState.selectedTower.upgrade("power");
    });
  }

  if (upgradeUtilityButton) {
    upgradeUtilityButton.addEventListener("click", () => {
      if (gameState.selectedTower) gameState.selectedTower.upgrade("utility");
    });
  }

  if (restartButton) {
    restartButton.addEventListener("click", () => {
      document.getElementById("end-screen").style.display = "none";
      resetGame();
      spawnWave();
    });
  }

  if (mainMenuButton) {
    mainMenuButton.addEventListener("click", () => {
      document.getElementById("end-screen").style.display = "none";
      if (ws) ws.close();
      window.location.href = "/";
    });
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
    if (!gameState.isPartyMode) spawnWave();
    requestAnimationFrame(update);
  } catch (error) {
    console.error("Initialization error:", error);
    showNotification("Failed to initialize game. Please try again.");
    setTimeout(() => window.location.href = "/", 2000);
  }
}

init();