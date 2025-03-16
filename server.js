const express = require('express');
const { WebSocketServer } = require('ws');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const server = require('http').createServer(app);
const wss = new WebSocketServer({ server });

const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

// Database setup
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
});

// Game constants
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
      { cost: 50, damageIncrease: 2, desc: "Damage +20%" },
      { cost: 100, damageIncrease: 3, desc: "Damage +30%" },
      { cost: 150, rangeIncrease: 20, desc: "Range +20%" },
      { cost: 200, fireRateDecrease: 100, desc: "Fire Rate +10%" },
    ],
    utility: [
      { cost: 50, rangeIncrease: 10, desc: "Range +10%" },
      { cost: 100, fireRateDecrease: 100, desc: "Fire Rate +10%" },
      { cost: 150, damageIncrease: 2, desc: "Damage +20%" },
      { cost: 200, rangeIncrease: 15, desc: "Range +15%" },
    ],
  },
  archer: {
    power: [
      { cost: 75, damageIncrease: 3, desc: "Damage +20%" },
      { cost: 150, damageIncrease: 4, desc: "Damage +27%" },
      { cost: 225, rangeIncrease: 24, desc: "Range +20%" },
      { cost: 300, fireRateDecrease: 200, desc: "Fire Rate +10%" },
    ],
    utility: [
      { cost: 75, rangeIncrease: 12, desc: "Range +10%" },
      { cost: 150, fireRateDecrease: 200, desc: "Fire Rate +10%" },
      { cost: 225, damageIncrease: 3, desc: "Damage +20%" },
      { cost: 300, rangeIncrease: 18, desc: "Range +15%" },
    ],
  },
  cannon: {
    power: [
      { cost: 100, damageIncrease: 6, desc: "Damage +20%" },
      { cost: 200, damageIncrease: 9, desc: "Damage +30%" },
      { cost: 300, rangeIncrease: 16, desc: "Range +20%" },
      { cost: 400, fireRateDecrease: 300, desc: "Fire Rate +10%" },
    ],
    utility: [
      { cost: 100, rangeIncrease: 8, desc: "Range +10%" },
      { cost: 200, fireRateDecrease: 300, desc: "Fire Rate +10%" },
      { cost: 300, damageIncrease: 6, desc: "Damage +20%" },
      { cost: 400, rangeIncrease: 12, desc: "Range +15%" },
    ],
  },
  sniper: {
    power: [
      { cost: 150, damageIncrease: 10, desc: "Damage +20%" },
      { cost: 300, damageIncrease: 15, desc: "Damage +30%" },
      { cost: 450, rangeIncrease: 30, desc: "Range +20%" },
      { cost: 600, fireRateDecrease: 400, desc: "Fire Rate +10%" },
    ],
    utility: [
      { cost: 150, rangeIncrease: 15, desc: "Range +10%" },
      { cost: 300, fireRateDecrease: 400, desc: "Fire Rate +10%" },
      { cost: 450, damageIncrease: 10, desc: "Damage +20%" },
      { cost: 600, rangeIncrease: 22.5, desc: "Range +15%" },
    ],
  },
  freeze: {
    power: [
      { cost: 120, damageIncrease: 1, desc: "Damage +20%" },
      { cost: 240, damageIncrease: 1.5, desc: "Damage +30%" },
      { cost: 360, rangeIncrease: 20, desc: "Range +20%" },
      { cost: 480, fireRateDecrease: 200, desc: "Fire Rate +10%" },
    ],
    utility: [
      { cost: 120, rangeIncrease: 10, desc: "Range +10%" },
      { cost: 240, fireRateDecrease: 200, desc: "Fire Rate +10%" },
      { cost: 360, damageIncrease: 1, desc: "Damage +20%" },
      { cost: 480, rangeIncrease: 15, desc: "Range +15%" },
    ],
  },
  mortar: {
    power: [
      { cost: 200, damageIncrease: 8, desc: "Damage +20%" },
      { cost: 400, damageIncrease: 12, desc: "Damage +30%" },
      { cost: 600, rangeIncrease: 24, desc: "Range +20%" },
      { cost: 800, fireRateDecrease: 500, desc: "Fire Rate +10%" },
    ],
    utility: [
      { cost: 200, rangeIncrease: 12, desc: "Range +10%" },
      { cost: 400, fireRateDecrease: 500, desc: "Fire Rate +10%" },
      { cost: 600, damageIncrease: 8, desc: "Damage +20%" },
      { cost: 800, rangeIncrease: 18, desc: "Range +15%" },
    ],
  },
  laser: {
    power: [
      { cost: 350, damageIncrease: 20, desc: "Damage +20%" },
      { cost: 700, damageIncrease: 30, desc: "Damage +30%" },
      { cost: 1050, rangeIncrease: 30, desc: "Range +20%" },
      { cost: 1400, fireRateDecrease: 1000, desc: "Fire Rate +10%" },
    ],
    utility: [
      { cost: 350, rangeIncrease: 15, desc: "Range +10%" },
      { cost: 700, fireRateDecrease: 1000, desc: "Fire Rate +10%" },
      { cost: 1050, damageIncrease: 20, desc: "Damage +20%" },
      { cost: 1400, rangeIncrease: 22.5, desc: "Range +15%" },
    ],
  },
  tesla: {
    power: [
      { cost: 250, damageIncrease: 5, desc: "Damage +20%" },
      { cost: 500, damageIncrease: 7.5, desc: "Damage +30%" },
      { cost: 750, rangeIncrease: 24, desc: "Range +20%" },
      { cost: 1000, fireRateDecrease: 300, desc: "Fire Rate +10%" },
    ],
    utility: [
      { cost: 250, rangeIncrease: 12, desc: "Range +10%" },
      { cost: 500, fireRateDecrease: 300, desc: "Fire Rate +10%" },
      { cost: 750, damageIncrease: 5, desc: "Damage +20%" },
      { cost: 1000, rangeIncrease: 18, desc: "Range +15%" },
    ],
  },
  flamethrower: {
    power: [
      { cost: 180, damageIncrease: 4, desc: "Damage +20%" },
      { cost: 360, damageIncrease: 6, desc: "Damage +30%" },
      { cost: 540, rangeIncrease: 16, desc: "Range +20%" },
      { cost: 720, fireRateDecrease: 200, desc: "Fire Rate +10%" },
    ],
    utility: [
      { cost: 180, rangeIncrease: 8, desc: "Range +10%" },
      { cost: 360, fireRateDecrease: 200, desc: "Fire Rate +10%" },
      { cost: 540, damageIncrease: 4, desc: "Damage +20%" },
      { cost: 720, rangeIncrease: 12, desc: "Range +15%" },
    ],
  },
  missile: {
    power: [
      { cost: 200, damageIncrease: 12, desc: "Damage +20%" },
      { cost: 400, damageIncrease: 18, desc: "Damage +30%" },
      { cost: 600, rangeIncrease: 26, desc: "Range +20%" },
      { cost: 800, fireRateDecrease: 400, desc: "Fire Rate +10%" },
    ],
    utility: [
      { cost: 200, rangeIncrease: 13, desc: "Range +10%" },
      { cost: 400, fireRateDecrease: 400, desc: "Fire Rate +10%" },
      { cost: 600, damageIncrease: 12, desc: "Damage +20%" },
      { cost: 800, rangeIncrease: 19.5, desc: "Range +15%" },
    ],
  },
  poison: {
    power: [
      { cost: 250, damageIncrease: 3, desc: "Damage +20%" },
      { cost: 500, damageIncrease: 4.5, desc: "Damage +30%" },
      { cost: 750, rangeIncrease: 22, desc: "Range +20%" },
      { cost: 1000, fireRateDecrease: 300, desc: "Fire Rate +10%" },
    ],
    utility: [
      { cost: 250, rangeIncrease: 11, desc: "Range +10%" },
      { cost: 500, fireRateDecrease: 300, desc: "Fire Rate +10%" },
      { cost: 750, damageIncrease: 3, desc: "Damage +20%" },
      { cost: 1000, rangeIncrease: 16.5, desc: "Range +15%" },
    ],
  },
  vortex: {
    power: [
      { cost: 300, damageIncrease: 0, desc: "No damage increase" },
      { cost: 600, rangeIncrease: 30, desc: "Range +20%" },
      { cost: 900, fireRateDecrease: 500, desc: "Fire Rate +10%" },
      { cost: 1200, rangeIncrease: 22.5, desc: "Range +15%" },
    ],
    utility: [
      { cost: 300, rangeIncrease: 15, desc: "Range +10%" },
      { cost: 600, fireRateDecrease: 500, desc: "Fire Rate +10%" },
      { cost: 900, damageIncrease: 0, desc: "No damage increase" },
      { cost: 1200, rangeIncrease: 22.5, desc: "Range +15%" },
    ],
  },
};

// Game state management
const gameInstances = new Map();
const clientConnections = new Map();

function initializeGame(partyId, difficulty = "easy", map = "map1", isPartyMode = false) {
  if (!gameInstances.has(partyId)) {
    const gameMoney = difficulty === "easy" ? 200 : difficulty === "medium" ? 400 : 600;
    const gameState = {
      enemies: [],
      towers: [],
      projectiles: [],
      players: new Set(),
      partyLeader: null,
      partyId,
      isPartyMode,
      difficulty,
      map,
      gameMoney,
      playerHealth: 20,
      score: 0,
      wave: 1,
      isPaused: false,
      gameOver: false,
      gameWon: false,
      gameSpeed: 1,
      isSpawning: false,
      spawnTimer: 0,
      enemiesToSpawn: 0,
      waveDelay: 0,
      isBossWave: false,
      bossSpawned: false,
      paths: {
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
      }[map],
      lastSaved: 0,
    };
    gameInstances.set(partyId, gameState);
    clientConnections.set(partyId, new Set());
    console.log(`Game instance created for party ${partyId}, map: ${map}, difficulty: ${difficulty}, mode: ${isPartyMode ? "party" : "solo"}`);
    return gameState;
  }
  return gameInstances.get(partyId);
}

async function saveGameState(partyId) {
  const gameState = gameInstances.get(partyId);
  if (!gameState) return;
  try {
    await pool.query(
      'INSERT INTO game_instances (party_id, state) VALUES ($1, $2) ON CONFLICT (party_id) DO UPDATE SET state = $2, created_at = CURRENT_TIMESTAMP',
      [partyId, gameState]
    );
    gameState.lastSaved = Date.now();
    console.log(`Successfully saved state for party ${partyId}`);
  } catch (err) {
    console.error(`Error saving game state for party ${partyId}:`, err.message);
  }
}

function broadcastUpdate(partyId, update) {
  const clients = clientConnections.get(partyId);
  if (clients) {
    clients.forEach(client => {
      if (client.readyState === 1) {
        client.send(JSON.stringify(update));
      }
    });
  }
}

// WebSocket handling
wss.on('connection', (ws, req) => {
  const urlParams = new URLSearchParams(req.url.split('?')[1]);
  const partyId = urlParams.get('partyId');
  const username = urlParams.get('username');

  if (!partyId || !username) {
    ws.close(1008, 'partyId and username required');
    return;
  }

  const gameState = gameInstances.get(partyId);
  if (!gameState) {
    ws.close(1008, 'Game not found');
    return;
  }

  if (!gameState.players.has(username)) {
    ws.close(1008, 'Not a player in this game');
    return;
  }

  const clients = clientConnections.get(partyId);
  clients.add(ws);
  console.log(`Client connected to party ${partyId}: ${username}`);

  // Send initial state to new client
  ws.send(JSON.stringify({
    type: 'INITIAL_STATE',
    gameState: {
      players: Array.from(gameState.players),
      partyLeader: gameState.partyLeader,
      partyId,
      isPartyMode: gameState.isPartyMode,
      difficulty: gameState.difficulty,
      map: gameState.map,
      gameMoney: gameState.gameMoney,
      playerHealth: gameState.playerHealth,
      score: gameState.score,
      wave: gameState.wave,
      isPaused: gameState.isPaused,
      gameOver: gameState.gameOver,
      gameWon: gameState.gameWon,
      gameSpeed: gameState.gameSpeed,
      paths: gameState.paths,
      towers: gameState.towers,
      enemies: gameState.enemies,
      projectiles: gameState.projectiles,
    },
  }));

  ws.on('close', () => {
    clients.delete(ws);
    console.log(`Client disconnected from party ${partyId}: ${username}`);
  });

  ws.on('message', async (message) => {
    try {
      const action = JSON.parse(message);
      await handleClientAction(partyId, username, action);
    } catch (err) {
      console.error(`Error handling message from ${username} in party ${partyId}:`, err.message);
    }
  });
});

async function handleClientAction(partyId, username, action) {
  const gameState = gameInstances.get(partyId);
  if (!gameState) return;

  switch (action.type) {
    case 'TOGGLE_PAUSE':
      if (gameState.partyLeader !== username) return;
      gameState.isPaused = !gameState.isPaused;
      broadcastUpdate(partyId, { type: 'UPDATE_STATE', isPaused: gameState.isPaused });
      break;

    case 'SET_SPEED':
      if (gameState.partyLeader !== username) return;
      const validSpeeds = [1, 2];
      if (!validSpeeds.includes(action.speed)) return;
      gameState.gameSpeed = action.speed;
      broadcastUpdate(partyId, { type: 'UPDATE_STATE', gameSpeed: gameState.gameSpeed });
      break;

    case 'PLACE_TOWER':
      if (!gameState.players.has(username)) return;
      const towerType = action.towerType;
      if (!towerStats[towerType]) return;
      const towerCost = towerStats[towerType].cost;
      const moneyAvailable = gameState.isPartyMode
        ? gameState.gameMoney
        : (await pool.query('SELECT money FROM users WHERE username = $1', [username])).rows[0]?.money || 0;
      if (moneyAvailable < towerCost) return;

      if (gameState.isPartyMode) {
        gameState.gameMoney -= towerCost;
      } else {
        await pool.query('UPDATE users SET money = money - $1 WHERE username = $2', [towerCost, username]);
      }

      const newTower = {
        x: action.x,
        y: action.y,
        type: towerType,
        damage: towerStats[towerType].damage,
        range: towerStats[towerType].range,
        fireRate: towerStats[towerType].fireRate,
        lastShot: 0,
        radius: 20,
        color: towerStats[towerType].color,
        angle: 0,
        powerLevel: 0,
        utilityLevel: 0,
        placedBy: username,
      };
      gameState.towers.push(newTower);
      broadcastUpdate(partyId, { type: 'TOWER_PLACED', tower: newTower, index: gameState.towers.length - 1 });
      break;

    case 'UPGRADE_TOWER':
      if (!gameState.players.has(username)) return;
      const towerIndex = action.towerIndex;
      if (towerIndex < 0 || towerIndex >= gameState.towers.length) return;
      const tower = gameState.towers[towerIndex];
      if (!towerUpgradePaths[tower.type]) return;
      const upgrades = towerUpgradePaths[tower.type][action.path];
      const level = action.path === "power" ? tower.powerLevel : tower.utilityLevel;
      if (level >= 4) return;
      const upgrade = upgrades[level];
      const upgradeMoney = gameState.isPartyMode
        ? gameState.gameMoney
        : (await pool.query('SELECT money FROM users WHERE username = $1', [username])).rows[0]?.money || 0;
      if (upgradeMoney < upgrade.cost) return;

      if (gameState.isPartyMode) {
        gameState.gameMoney -= upgrade.cost;
      } else {
        await pool.query('UPDATE users SET money = money - $1 WHERE username = $2', [upgrade.cost, username]);
      }

      if (upgrade.damageIncrease) tower.damage += upgrade.damageIncrease;
      if (upgrade.rangeIncrease) tower.range += upgrade.rangeIncrease;
      if (upgrade.fireRateDecrease) tower.fireRate -= upgrade.fireRateDecrease;
      if (action.path === "power") tower.powerLevel++;
      else tower.utilityLevel++;
      broadcastUpdate(partyId, { type: 'TOWER_UPGRADED', towerIndex, tower });
      break;

    case 'UPDATE_STATE':
      gameState.gameMoney = action.gameMoney;
      gameState.playerHealth = action.playerHealth;
      gameState.score = action.score;
      gameState.wave = action.wave;
      gameState.gameOver = action.gameOver;
      gameState.gameWon = action.gameWon;
      gameState.enemies = action.enemies;
      gameState.towers = action.towers;
      gameState.projectiles = action.projectiles;
      if (gameState.gameOver || gameState.gameWon) {
        await saveGameState(partyId);
      }
      broadcastUpdate(partyId, {
        type: 'UPDATE_STATE',
        gameMoney: gameState.gameMoney,
        playerHealth: gameState.playerHealth,
        score: gameState.score,
        wave: gameState.wave,
        gameOver: gameState.gameOver,
        gameWon: gameState.gameWon,
        enemies: gameState.enemies,
        towers: gameState.towers,
        projectiles: gameState.projectiles,
      });
      break;
  }

  if (Date.now() - gameState.lastSaved > 5000 || (action.type === 'UPDATE_STATE' && (gameState.gameOver || gameState.gameWon))) {
    await saveGameState(partyId);
  }
}

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
    await pool.query(`
      CREATE TABLE IF NOT EXISTS game_instances (
        party_id VARCHAR(255) PRIMARY KEY,
        state JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Database schema ensured');

    const userCount = (await pool.query('SELECT COUNT(*) FROM users')).rows[0].count;
    if (parseInt(userCount, 10) === 0) {
      const defaultUsername = 'starynightssss';
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
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/map.html');
});

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

    localStorage.setItem('username', username); // Set username in localStorage
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
    console.error('Error fetching towers:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/user', async (req, res) => {
  const { username } = req.query;
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
  const { username, partyId, difficulty = localStorage.getItem("selectedDifficulty") || "easy", map = localStorage.getItem("selectedMap") || "map1", isPartyMode = localStorage.getItem('isPartyMode') === 'true' } = req.body;
  if (!username || !partyId) {
    return res.status(400).json({ message: 'Username and partyId required' });
  }

  const effectivePartyId = isPartyMode ? partyId : `${username}-${Date.now()}`;
  const gameState = initializeGame(effectivePartyId, difficulty, map, isPartyMode);

  gameState.players.add(username);
  if (!gameState.partyLeader) gameState.partyLeader = username;

  console.log(`Player ${username} joined party ${effectivePartyId} with map: ${map}, difficulty: ${difficulty}, mode: ${isPartyMode ? "party" : "solo"}`);
  res.json({
    message: `Joined game ${effectivePartyId} in ${isPartyMode ? "party" : "solo"} mode`,
    partyId: effectivePartyId,
    gameState,
  });
});

server.listen(port, async () => {
  console.log(`Server running on port ${port}`);
  await initializeDatabase();
});