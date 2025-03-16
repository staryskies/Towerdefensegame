const express = require('express');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');
const { createCanvas } = require('canvas');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

// Database setup
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Game constants
const CANVAS_WIDTH = 1920;
const CANVAS_HEIGHT = 1080;
const PATH_WIDTH = 40;

// Map and Theme Definitions
const mapThemes = {
  map1: "grassland", map2: "desert", map3: "stone", map4: "forest", map5: "mountain",
  map6: "desert", map7: "river", map8: "canyon", map9: "arctic",
};

const themeBackgrounds = {
  map1: "#90ee90", map2: "#f4a460", map3: "#a9a9a9", map4: "#6b8e23", map5: "#cd853f",
  map6: "#f4a460", map7: "#87ceeb", map8: "#cd5c5c", map9: "#e0ffff",
};

const paths = {
  map1: {
    path1: [
      { x: 0, y: 540 }, { x: 300, y: 540 }, { x: 300, y: 300 }, { x: 600, y: 300 },
      { x: 600, y: 600 }, { x: 900, y: 600 }, { x: 1920, y: 600 },
    ],
    path2: [
      { x: 0, y: 200 }, { x: 400, y: 200 }, { x: 400, y: 800 }, { x: 1200, y: 800 },
      { x: 1200, y: 400 }, { x: 1920, y: 400 },
    ],
  },
  map2: {
    path1: [
      { x: 0, y: 700 }, { x: 500, y: 700 }, { x: 500, y: 300 }, { x: 1000, y: 300 },
      { x: 1000, y: 600 }, { x: 1920, y: 600 },
    ],
    path2: [
      { x: 0, y: 100 }, { x: 300, y: 100 }, { x: 300, y: 900 }, { x: 1400, y: 900 },
      { x: 1920, y: 900 },
    ],
  },
  map3: {
    path1: [
      { x: 0, y: 400 }, { x: 600, y: 400 }, { x: 600, y: 700 }, { x: 1200, y: 700 },
      { x: 1920, y: 700 },
    ],
    path2: [
      { x: 0, y: 800 }, { x: 400, y: 800 }, { x: 400, y: 200 }, { x: 1000, y: 200 },
      { x: 1920, y: 200 },
    ],
  },
  map4: {
    path1: [
      { x: 0, y: 300 }, { x: 500, y: 300 }, { x: 500, y: 600 }, { x: 900, y: 600 },
      { x: 900, y: 400 }, { x: 1920, y: 400 },
    ],
    path2: [
      { x: 0, y: 900 }, { x: 700, y: 900 }, { x: 700, y: 500 }, { x: 1300, y: 500 },
      { x: 1920, y: 500 },
    ],
  },
  map5: {
    path1: [
      { x: 0, y: 600 }, { x: 400, y: 600 }, { x: 400, y: 300 }, { x: 800, y: 300 },
      { x: 800, y: 700 }, { x: 1920, y: 700 },
    ],
    path2: [
      { x: 0, y: 200 }, { x: 600, y: 200 }, { x: 600, y: 800 }, { x: 1100, y: 800 },
      { x: 1920, y: 800 },
    ],
  },
  map6: {
    path1: [
      { x: 0, y: 500 }, { x: 300, y: 500 }, { x: 300, y: 800 }, { x: 900, y: 800 },
      { x: 1920, y: 800 },
    ],
    path2: [
      { x: 0, y: 100 }, { x: 500, y: 100 }, { x: 500, y: 400 }, { x: 1200, y: 400 },
      { x: 1920, y: 400 },
    ],
  },
  map7: {
    path1: [
      { x: 0, y: 700 }, { x: 600, y: 700 }, { x: 600, y: 300 }, { x: 1000, y: 300 },
      { x: 1920, y: 300 },
    ],
    path2: [
      { x: 0, y: 400 }, { x: 400, y: 400 }, { x: 400, y: 900 }, { x: 1300, y: 900 },
      { x: 1920, y: 900 },
    ],
  },
  map8: {
    path1: [
      { x: 0, y: 600 }, { x: 500, y: 600 }, { x: 500, y: 200 }, { x: 900, y: 200 },
      { x: 1920, y: 200 },
    ],
    path2: [
      { x: 0, y: 800 }, { x: 700, y: 800 }, { x: 700, y: 500 }, { x: 1200, y: 500 },
      { x: 1920, y: 500 },
    ],
  },
  map9: {
    path1: [
      { x: 0, y: 300 }, { x: 400, y: 300 }, { x: 400, y: 700 }, { x: 1000, y: 700 },
      { x: 1920, y: 700 },
    ],
    path2: [
      { x: 0, y: 900 }, { x: 600, y: 900 }, { x: 600, y: 400 }, { x: 1300, y: 400 },
      { x: 1920, y: 400 },
    ],
  },
};

const enemyThemes = {
  grassland: {
    easy: [{ health: 50, speed: 1, radius: 10, color: "red" }],
    medium: [{ health: 75, speed: 1.2, radius: 12, color: "darkred" }],
    hard: [{ health: 100, speed: 1.5, radius: 15, color: "crimson" }],
  },
  desert: {
    easy: [{ health: 60, speed: 1.1, radius: 10, color: "sandybrown" }],
    medium: [{ health: 85, speed: 1.3, radius: 12, color: "peru" }],
    hard: [{ health: 120, speed: 1.6, radius: 15, color: "sienna" }],
  },
  stone: {
    easy: [{ health: 70, speed: 0.9, radius: 10, color: "gray" }],
    medium: [{ health: 95, speed: 1.1, radius: 12, color: "darkgray" }],
    hard: [{ health: 130, speed: 1.4, radius: 15, color: "slategray" }],
  },
  forest: {
    easy: [{ health: 55, speed: 1, radius: 10, color: "green" }],
    medium: [{ health: 80, speed: 1.2, radius: 12, color: "darkgreen" }],
    hard: [{ health: 110, speed: 1.5, radius: 15, color: "forestgreen" }],
  },
  mountain: {
    easy: [{ health: 65, speed: 0.8, radius: 10, color: "brown" }],
    medium: [{ health: 90, speed: 1, radius: 12, color: "saddlebrown" }],
    hard: [{ health: 125, speed: 1.3, radius: 15, color: "chocolate" }],
  },
  river: {
    easy: [{ health: 50, speed: 1.2, radius: 10, color: "blue" }],
    medium: [{ health: 75, speed: 1.4, radius: 12, color: "darkblue" }],
    hard: [{ health: 100, speed: 1.7, radius: 15, color: "navy" }],
  },
  canyon: {
    easy: [{ health: 60, speed: 1, radius: 10, color: "orange" }],
    medium: [{ health: 85, speed: 1.2, radius: 12, color: "darkorange" }],
    hard: [{ health: 115, speed: 1.5, radius: 15, color: "orangered" }],
  },
  arctic: {
    easy: [{ health: 70, speed: 0.9, radius: 10, color: "lightblue" }],
    medium: [{ health: 95, speed: 1.1, radius: 12, color: "cyan" }],
    hard: [{ health: 130, speed: 1.4, radius: 15, color: "deepskyblue" }],
  },
};

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
  // Add other tower upgrade paths similarly
};

// Game state management
const gameInstances = new Map(); // Key: partyId, Value: gameState

function initializeGame(partyId, difficulty = "easy", map = "map1", isPartyMode = false) {
  if (!gameInstances.has(partyId)) {
    const gameMoney = difficulty === "easy" ? 200 : difficulty === "medium" ? 400 : 600;
    gameInstances.set(partyId, {
      enemies: [],
      towers: [],
      projectiles: [],
      playerHealth: 20,
      gameMoney: gameMoney,
      score: 0,
      wave: 1,
      isPaused: false,
      gameOver: false,
      gameWon: false,
      isSpawning: false,
      gameSpeed: 1,
      spawnTimer: 0,
      enemiesToSpawn: 0,
      waveDelay: 0,
      isBossWave: false,
      bossSpawned: false,
      players: new Set(),
      partyLeader: null,
      partyId,
      lastUpdate: Date.now(),
      selectedMap: map,
      selectedDifficulty: difficulty,
      mapTheme: mapThemes[map],
      paths: paths[map],
      isPartyMode,
    });
    console.log(`Game instance created for party ${partyId}, map: ${map}, difficulty: ${difficulty}, mode: ${isPartyMode ? "party" : "solo"}`);
  }
}

// Game Classes
class Enemy {
  constructor(type, wave, gameState, pathKey) {
    this.pathKey = pathKey; // "path1" or "path2"
    this.x = gameState.paths[pathKey][0].x;
    this.y = gameState.paths[pathKey][0].y;
    const healthMultiplier = gameState.selectedDifficulty === "easy" ? 0.25 : gameState.selectedDifficulty === "medium" ? 0.5 : 1;
    this.health = Math.floor(type.health * healthMultiplier * (1 + (wave - 1) * 0.25));
    this.maxHealth = this.health;
    this.speed = type.speed;
    this.radius = type.radius;
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

  move(dt, gameState) {
    const path = gameState.paths[this.pathKey];
    if (this.pathIndex >= path.length) {
      gameState.playerHealth -= this.isBoss ? 5 : 1;
      gameState.enemies = gameState.enemies.filter(e => e !== this);
      if (gameState.playerHealth <= 0) endGame(gameState, false);
      return;
    }
    const target = path[this.pathIndex];
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
}

class Tower {
  constructor(x, y, type, placedBy) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.damage = towerStats[type].damage;
    this.range = towerStats[type].range;
    this.fireRate = towerStats[type].fireRate;
    this.lastShot = 0;
    this.radius = 20;
    this.color = towerStats[type].color;
    this.angle = 0;
    this.powerLevel = 0;
    this.utilityLevel = 0;
    this.specials = { tripleShot: false, crit: 0.2, splash: 1, slow: 0.5, multiBeam: false, chain: 2, burn: 1, pull: 100 };
    this.placedBy = placedBy; // Track who placed the tower
  }

  shoot(gameState) {
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

  upgrade(path, gameState) {
    const upgrades = towerUpgradePaths[this.type]?.[path] || [];
    const level = path === "power" ? this.powerLevel : this.utilityLevel;
    if (level >= 4) return { success: false, message: `Max upgrades reached for ${path} path!` };
    const upgrade = upgrades[level];
    if (!upgrade || gameState.gameMoney < upgrade.cost) return { success: false, message: "Not enough money!" };
    gameState.gameMoney -= upgrade.cost;
    if (upgrade.damage) this.damage *= upgrade.damage;
    if (upgrade.range) this.range *= upgrade.range;
    if (upgrade.fireRate) this.fireRate *= upgrade.fireRate;
    if (path === "power") this.powerLevel++;
    else this.utilityLevel++;
    return { success: true, message: `${this.type} upgraded: ${upgrade.desc}` };
  }
}

class Projectile {
  constructor(x, y, target, damage, speed, type) {
    this.x = x;
    this.y = y;
    this.target = target;
    this.damage = damage;
    this.speed = speed;
    this.type = type;
    this.radius = 5;
    this.color = towerStats[type].color;
  }

  move(dt, gameState) {
    if (!this.target || !gameState.enemies.includes(this.target)) {
      gameState.projectiles = gameState.projectiles.filter(p => p !== this);
      return;
    }
    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const moveSpeed = this.speed * gameState.gameSpeed * dt;
    if (distance < moveSpeed) {
      this.hit(gameState);
    } else {
      this.x += (dx / distance) * moveSpeed;
      this.y += (dy / distance) * moveSpeed;
    }
  }

  hit(gameState) {
    if (this.target) {
      this.target.health -= this.damage;
      if (this.target.health <= 0) {
        gameState.score += this.target.isBoss ? 50 : 10;
        gameState.gameMoney += this.target.isBoss ? 20 : 5;
        gameState.enemies = gameState.enemies.filter(e => e !== this.target);
      }
      gameState.projectiles = gameState.projectiles.filter(p => p !== this);
    }
  }
}

// Game Logic
function spawnWave(gameState) {
  const maxWaves = gameState.selectedMap === "map9" ? 60 : 30;
  if (gameState.wave > maxWaves) {
    endGame(gameState, true);
    return;
  }
  gameState.isSpawning = true;
  const enemiesPerWave = Math.min(5 + gameState.wave * 2, 50);
  gameState.enemiesToSpawn = enemiesPerWave;
  gameState.spawnTimer = 0;
  gameState.waveDelay = 0;
  gameState.isBossWave = gameState.wave % 5 === 0 && gameState.wave > 0;
  gameState.bossSpawned = false;
  console.log(`Starting wave ${gameState.wave} for party ${gameState.partyId}`);
}

function updateSpawning(dt, gameState) {
  if (gameState.waveDelay > 0) {
    gameState.waveDelay -= dt * gameState.gameSpeed;
    if (gameState.waveDelay <= 0) spawnWave(gameState);
    return;
  }
  if (gameState.isSpawning && gameState.enemiesToSpawn > 0) {
    gameState.spawnTimer += dt * gameState.gameSpeed;
    const spawnInterval = 1;
    if (gameState.spawnTimer >= spawnInterval) {
      const enemyType = enemyThemes[gameState.mapTheme][gameState.selectedDifficulty][0];
      const pathKey = Math.random() < 0.5 ? "path1" : "path2"; // Randomly choose path
      gameState.enemies.push(new Enemy(enemyType, gameState.wave, gameState, pathKey));
      gameState.enemiesToSpawn--;
      gameState.spawnTimer -= spawnInterval;
      if (gameState.enemiesToSpawn <= 0) gameState.isSpawning = false;
    }
  } else if (!gameState.isSpawning && gameState.enemies.length === 0 && gameState.playerHealth > 0) {
    gameState.waveDelay = 2;
    gameState.wave++;
  }
}

function endGame(gameState, won) {
  gameState.gameOver = !won;
  gameState.gameWon = won;
  console.log(`Game ${gameState.partyId} ended: ${won ? "Won" : "Lost"}`);
}

function updateGameState(partyId) {
  const gameState = gameInstances.get(partyId);
  if (!gameState) return;

  const now = Date.now();
  const dt = (now - gameState.lastUpdate) / 1000;
  gameState.lastUpdate = now;

  if (!gameState.isPaused && !gameState.gameOver && !gameState.gameWon) {
    updateSpawning(dt, gameState);
    gameState.enemies.forEach(enemy => enemy.move(dt, gameState));
    gameState.towers.forEach(tower => tower.shoot(gameState));
    gameState.projectiles.forEach(projectile => projectile.move(dt, gameState));
  }
}

function generateGameImage(gameState) {
  const canvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = themeBackgrounds[gameState.selectedMap];
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Paths
  Object.values(gameState.paths).forEach(path => {
    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    path.slice(1).forEach(point => ctx.lineTo(point.x, point.y));
    ctx.strokeStyle = "brown";
    ctx.lineWidth = PATH_WIDTH;
    ctx.stroke();
  });

  // Towers
  gameState.towers.forEach(tower => {
    ctx.save();
    ctx.translate(tower.x, tower.y);
    ctx.rotate(tower.angle);
    ctx.beginPath();
    ctx.arc(0, 0, tower.radius, 0, Math.PI * 2);
    ctx.fillStyle = tower.color;
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = "white";
    ctx.font = "12px Arial";
    ctx.textAlign = "center";
    ctx.fillText(`${tower.type.charAt(0).toUpperCase() + tower.type.slice(1)} (${tower.placedBy})`, tower.x, tower.y + 25);
  });

  // Enemies
  gameState.enemies.forEach(enemy => {
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
    ctx.fillStyle = enemy.isBoss ? "darkred" : enemy.color;
    ctx.fill();
    ctx.fillStyle = "white";
    ctx.font = "12px Arial";
    ctx.textAlign = "center";
    ctx.fillText(`${Math.floor(enemy.health)}`, enemy.x, enemy.y - enemy.radius - 5);
  });

  // Projectiles
  gameState.projectiles.forEach(projectile => {
    ctx.beginPath();
    ctx.arc(projectile.x, projectile.y, projectile.radius, 0, Math.PI * 2);
    ctx.fillStyle = projectile.color;
    ctx.fill();
  });

  return canvas.toBuffer('image/png');
}

// Periodic update loop
setInterval(() => {
  gameInstances.forEach((gameState, partyId) => {
    updateGameState(partyId);
  });
}, 1000 / 60); // 60 FPS update

// Database Initialization
async function initializeDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        money INTEGER DEFAULT 0
      );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_towers (
        user_id INTEGER REFERENCES users(id),
        tower VARCHAR(50),
        PRIMARY KEY (user_id, tower)
      );
    `);
    console.log('Database schema ensured');

    const userCount = (await pool.query('SELECT COUNT(*) FROM users')).rows[0].count;
    if (parseInt(userCount, 10) === 0) {
      const defaultUsername = 'starynightsss';
      const defaultPassword = 'password123';
      const hashedPassword = await bcrypt.hash(defaultPassword, 10);
      const userResult = await pool.query(
        'INSERT INTO users (username, password, money) VALUES ($1, $2, 0) RETURNING id',
        [defaultUsername, hashedPassword]
      );
      await pool.query(
        'INSERT INTO user_towers (user_id, tower) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [userResult.rows[0].id, 'basic']
      );
      console.log(`Default user '${defaultUsername}' created`);
    }
  } catch (err) {
    console.error('Database init error:', err.message);
  }
}

// Routes
app.post('/signup', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ message: 'Username and password required' });

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id',
      [username, hashedPassword]
    );
    const userId = result.rows[0].id;
    const defaultTowers = ['basic'];
    for (const tower of defaultTowers) {
      await pool.query(
        'INSERT INTO user_towers (user_id, tower) VALUES ($1, $2)',
        [userId, tower]
      );
    }
    res.json({ message: 'Signup successful' });
  } catch (err) {
    res.status(400).json({ message: 'Username already exists' });
  }
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ message: 'Username and password required' });

  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (result.rows.length === 0) return res.status(400).json({ message: 'User not found' });

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: 'Invalid password' });

    res.json({ message: 'Login successful', username });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/towers', async (req, res) => {
  const { username } = req.query;
  if (!username) return res.status(400).json({ message: 'Username required' });

  try {
    const userResult = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
    if (userResult.rows.length === 0) return res.status(404).json({ message: 'User not found' });

    const userId = userResult.rows[0].id;
    const towersResult = await pool.query('SELECT tower FROM user_towers WHERE user_id = $1', [userId]);
    const towers = towersResult.rows.map(row => row.tower);
    res.json({ towers });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/user', async (req, res) => {
  const { username } = req.query;
  console.log('Fetching user data for username:', username);
  if (!username) return res.status(400).json({ message: 'Username required' });

  try {
    const result = await pool.query('SELECT username, money FROM users WHERE username = $1', [username]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'User not found' });

    const user = result.rows[0];
    res.json({ username: user.username, money: user.money });
  } catch (err) {
    console.error('Error fetching user data:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/game/join', async (req, res) => {
  const { username, partyId, difficulty = "easy", map = "map1", isPartyMode = false } = req.body;
  console.log('Received /game/join request for username:', username, 'partyId:', partyId);

  if (!username || !partyId) {
    console.log('Missing username or partyId');
    return res.status(400).json({ message: 'Username and partyId required' });
  }
  
  const effectivePartyId = isPartyMode ? partyId : `${username}-${Date.now()}`;
  console.log('Effective partyId:', effectivePartyId);
  await initializeGame(effectivePartyId, difficulty, map, isPartyMode);
  
  const gameState = await loadGameState(effectivePartyId);
  if (!gameState) {
    console.log('Failed to initialize game state for partyId:', effectivePartyId);
    return res.status(500).json({ message: 'Failed to initialize game' });
  }

  gameState.players.add(username);
  if (!gameState.partyLeader) gameState.partyLeader = username;
  spawnWave(gameState);

  console.log(`Player ${username} joined party ${effectivePartyId}. Current players:`, Array.from(gameState.players));
  res.json({ 
    message: `Joined game ${effectivePartyId} in ${isPartyMode ? "party" : "solo"} mode`, 
    partyId: effectivePartyId,
    money: gameState.gameMoney, 
    health: gameState.playerHealth, 
    wave: gameState.wave 
  });
});

app.get('/game/state', async (req, res) => {
  const { partyId } = req.query;
  console.log('Received /game/state request for partyId:', partyId);
  if (!partyId) {
    console.log('No partyId provided');
    return res.status(400).json({ message: 'partyId required' });
  }

  let gameState = await loadGameState(partyId);
  if (!gameState) {
    console.log('Game instance not found, attempting to reinitialize for partyId:', partyId);
    const username = partyId.split('-')[0];
    if (!username) {
      return res.status(400).json({ message: 'Invalid partyId format' });
    }
    await initializeGame(partyId, "easy", "map1", false);
    gameState = await loadGameState(partyId);
    gameState.players.add(username);
    gameState.partyLeader = username;
    spawnWave(gameState);
    console.log(`Reinitialized game for partyId ${partyId} with username ${username}`);
  }

  const imageBuffer = generateGameImage(gameState);
  res.set('Content-Type', 'image/png');
  res.send(imageBuffer);
});

app.get('/game/stats', async (req, res) => {
  const { partyId } = req.query;
  console.log('Received /game/stats request for partyId:', partyId);
  if (!partyId) {
    console.log('No partyId provided');
    return res.status(400).json({ message: 'partyId required' });
  }

  let gameState = await loadGameState(partyId);
  if (!gameState) {
    console.log('Game instance not found, attempting to reinitialize for partyId:', partyId);
    const username = partyId.split('-')[0];
    if (!username) {
      return res.status(400).json({ message: 'Invalid partyId format' });
    }
    await initializeGame(partyId, "easy", "map1", false);
    gameState = await loadGameState(partyId);
    gameState.players.add(username);
    gameState.partyLeader = username;
    spawnWave(gameState);
    console.log(`Reinitialized game for partyId ${partyId} with username ${username}`);
  }

  res.json({
    money: gameState.gameMoney,
    health: gameState.playerHealth,
    wave: gameState.wave,
    score: gameState.score,
    gameSpeed: gameState.gameSpeed,
    isPaused: gameState.isPaused,
    gameOver: gameState.gameOver,
    gameWon: gameState.gameWon,
    players: Array.from(gameState.players),
    partyLeader: gameState.partyLeader,
    towers: gameState.towers.map(t => ({
      x: t.x,
      y: t.y,
      type: t.type,
      damage: t.damage,
      range: t.range,
      radius: t.radius,
      powerLevel: t.powerLevel,
      utilityLevel: t.utilityLevel,
      placedBy: t.placedBy,
    })),
  });
});

app.post('/game/place-tower', async (req, res) => {
  const { username, partyId, type, x, y } = req.body;
  const gameState = await loadGameState(partyId);
  if (!gameState) return res.status(404).json({ message: 'Game not found' });

  if (!gameState.players.has(username)) return res.status(403).json({ message: 'Not a player in this game' });

  const towerCost = towerTypes[type].cost;
  const sharedMoney = gameState.isPartyMode ? gameState.gameMoney : (await pool.query('SELECT money FROM users WHERE username = $1', [username])).rows[0].money;

  if (sharedMoney < towerCost) return res.status(400).json({ message: 'Not enough money' });

  const tower = {
    x,
    y,
    type,
    damage: towerTypes[type].damage,
    range: towerTypes[type].range,
    speed: towerTypes[type].speed,
    radius: towerTypes[type].radius,
    cooldown: 0,
    powerLevel: 0,
    utilityLevel: 0,
    placedBy: username,
  };
  gameState.towers.push(tower);

  if (gameState.isPartyMode) {
    gameState.gameMoney -= towerCost;
  } else {
    await pool.query('UPDATE users SET money = money - $1 WHERE username = $2', [towerCost, username]);
  }

  res.json({ message: 'Tower placed' });
});

app.post('/game/toggle-pause', async (req, res) => {
  const { username, partyId } = req.body;
  const gameState = await loadGameState(partyId);
  if (!gameState) return res.status(404).json({ message: 'Game not found' });

  if (gameState.partyLeader !== username) return res.status(403).json({ message: 'Only the party leader can toggle pause' });

  gameState.isPaused = !gameState.isPaused;
  res.json({ message: gameState.isPaused ? 'Game paused' : 'Game resumed' });
});

app.post('/game/set-speed', async (req, res) => {
  const { username, partyId, speed } = req.body;
  const gameState = await loadGameState(partyId);
  if (!gameState) return res.status(404).json({ message: 'Game not found' });

  if (gameState.partyLeader !== username) return res.status(403).json({ message: 'Only the party leader can set speed' });

  gameState.gameSpeed = speed;
  res.json({ message: `Game speed set to ${speed}x` });
});

app.post('/game/upgrade-tower', async (req, res) => {
  const { username, partyId, towerIndex, path } = req.body;
  const gameState = await loadGameState(partyId);
  if (!gameState) return res.status(404).json({ message: 'Game not found' });

  const tower = gameState.towers[towerIndex];
  if (!tower) return res.status(404).json({ message: 'Tower not found' });

  const upgradePath = towerUpgradePaths[tower.type][path];
  const currentLevel = path === 'power' ? tower.powerLevel : tower.utilityLevel;
  if (currentLevel >= 4) return res.status(400).json({ message: 'Tower already at max level' });

  const upgrade = upgradePath[currentLevel];
  const sharedMoney = gameState.isPartyMode ? gameState.gameMoney : (await pool.query('SELECT money FROM users WHERE username = $1', [username])).rows[0].money;

  if (sharedMoney < upgrade.cost) return res.status(400).json({ message: 'Not enough money' });

  if (path === 'power') {
    tower.damage += upgrade.damageIncrease;
    tower.powerLevel++;
  } else if (path === 'utility') {
    if (upgrade.rangeIncrease) tower.range += upgrade.rangeIncrease;
    if (upgrade.speedIncrease) tower.speed += upgrade.speedIncrease;
    if (upgrade.slowIncrease) tower.slow += upgrade.slowIncrease;
    if (upgrade.chainIncrease) tower.chain += upgrade.chainIncrease;
    if (upgrade.durationIncrease) tower.duration += upgrade.durationIncrease;
    if (upgrade.pullStrengthIncrease) tower.pullStrength += upgrade.pullStrengthIncrease;
    tower.utilityLevel++;
  }

  if (gameState.isPartyMode) {
    gameState.gameMoney -= upgrade.cost;
  } else {
    await pool.query('UPDATE users SET money = money - $1 WHERE username = $2', [upgrade.cost, username]);
  }

  res.json({ message: `Tower upgraded on ${path} path to level ${currentLevel + 1}` });
});

setInterval(() => {
  gameInstances.forEach(async (gameState, partyId) => {
    updateGameState(partyId);
    try {
      await pool.query(
        'UPDATE game_instances SET state = $1 WHERE party_id = $2',
        [gameState, partyId]
      );
    } catch (err) {
      console.error(`Error updating game state for party ${partyId}:`, err.message);
    }
  });
}, 1000 / 60);

app.listen(port, async () => {
  console.log(`Server running on port ${port}`);
  try {
    await initializeDatabase();
  } catch (err) {
    console.error('Failed to initialize database:', err.message);
  }
});