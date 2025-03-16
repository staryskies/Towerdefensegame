const express = require('express');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');
const dotenv = require('dotenv');
const { createCanvas, loadImage } = require('canvas');

dotenv.config();
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

const CANVAS_WIDTH = 1920;
const CANVAS_HEIGHT = 1080;
const gameInstances = new Map();

const mapThemes = {
  map1: { background: '#90EE90', path: '#D2B48C', name: 'Grassland' },
  map2: { background: '#EDC9AF', path: '#C19A6B', name: 'Desert' },
  map3: { background: '#B0C4DE', path: '#708090', name: 'Stone' },
  map4: { background: '#228B22', path: '#8B4513', name: 'Forest' },
  map5: { background: '#D3D3D3', path: '#808080', name: 'Mountain' },
  map6: { background: '#EDC9AF', path: '#C19A6B', name: 'Desert Maze' },
  map7: { background: '#90EE90', path: '#4682B4', name: 'River Bend' },
  map8: { background: '#A0522D', path: '#8B0000', name: 'Canyon' },
  map9: { background: '#F0F8FF', path: '#ADD8E6', name: 'Arctic' },
};

const paths = {
  map1: [
    [{ x: 0, y: 500 }, { x: 300, y: 500 }, { x: 300, y: 200 }, { x: 600, y: 200 }, { x: 600, y: 500 }, { x: 900, y: 500 }, { x: 900, y: 200 }, { x: 1200, y: 200 }, { x: 1200, y: 500 }, { x: 1500, y: 500 }, { x: 1500, y: 200 }, { x: 1920, y: 200 }],
    [{ x: 0, y: 800 }, { x: 400, y: 800 }, { x: 400, y: 600 }, { x: 800, y: 600 }, { x: 800, y: 800 }, { x: 1100, y: 800 }, { x: 1100, y: 600 }, { x: 1400, y: 600 }, { x: 1400, y: 800 }, { x: 1700, y: 800 }, { x: 1700, y: 600 }, { x: 1920, y: 600 }],
  ],
  map2: [
    [{ x: 0, y: 400 }, { x: 500, y: 400 }, { x: 500, y: 700 }, { x: 1000, y: 700 }, { x: 1000, y: 200 }, { x: 1500, y: 200 }, { x: 1500, y: 600 }, { x: 1920, y: 600 }],
    [{ x: 0, y: 800 }, { x: 300, y: 800 }, { x: 300, y: 300 }, { x: 800, y: 300 }, { x: 800, y: 800 }, { x: 1300, y: 800 }, { x: 1300, y: 400 }, { x: 1920, y: 400 }],
  ],
  map3: [
    [{ x: 0, y: 300 }, { x: 600, y: 300 }, { x: 600, y: 600 }, { x: 1200, y: 600 }, { x: 1200, y: 300 }, { x: 1920, y: 300 }],
    [{ x: 0, y: 700 }, { x: 400, y: 700 }, { x: 400, y: 400 }, { x: 1000, y: 400 }, { x: 1000, y: 700 }, { x: 1600, y: 700 }, { x: 1600, y: 400 }, { x: 1920, y: 400 }],
  ],
  map4: [
    [{ x: 0, y: 500 }, { x: 300, y: 500 }, { x: 300, y: 200 }, { x: 600, y: 200 }, { x: 600, y: 500 }, { x: 900, y: 500 }, { x: 900, y: 800 }, { x: 1200, y: 800 }, { x: 1200, y: 500 }, { x: 1500, y: 500 }, { x: 1500, y: 200 }, { x: 1920, y: 200 }],
    [{ x: 0, y: 800 }, { x: 400, y: 800 }, { x: 400, y: 600 }, { x: 800, y: 600 }, { x: 800, y: 300 }, { x: 1100, y: 300 }, { x: 1100, y: 600 }, { x: 1400, y: 600 }, { x: 1400, y: 800 }, { x: 1920, y: 800 }],
  ],
  map5: [
    [{ x: 0, y: 400 }, { x: 500, y: 400 }, { x: 500, y: 700 }, { x: 1000, y: 700 }, { x: 1000, y: 200 }, { x: 1500, y: 200 }, { x: 1500, y: 600 }, { x: 1920, y: 600 }],
    [{ x: 0, y: 800 }, { x: 300, y: 800 }, { x: 300, y: 300 }, { x: 800, y: 300 }, { x: 800, y: 800 }, { x: 1300, y: 800 }, { x: 1300, y: 400 }, { x: 1920, y: 400 }],
  ],
  map6: [
    [{ x: 0, y: 500 }, { x: 200, y: 500 }, { x: 200, y: 200 }, { x: 400, y: 200 }, { x: 400, y: 500 }, { x: 600, y: 500 }, { x: 600, y: 800 }, { x: 800, y: 800 }, { x: 800, y: 500 }, { x: 1000, y: 500 }, { x: 1000, y: 200 }, { x: 1200, y: 200 }, { x: 1200, y: 500 }, { x: 1400, y: 500 }, { x: 1400, y: 800 }, { x: 1600, y: 800 }, { x: 1600, y: 500 }, { x: 1920, y: 500 }],
    [{ x: 0, y: 800 }, { x: 300, y: 800 }, { x: 300, y: 600 }, { x: 500, y: 600 }, { x: 500, y: 300 }, { x: 700, y: 300 }, { x: 700, y: 600 }, { x: 900, y: 600 }, { x: 900, y: 300 }, { x: 1100, y: 300 }, { x: 1100, y: 600 }, { x: 1300, y: 600 }, { x: 1300, y: 800 }, { x: 1500, y: 800 }, { x: 1500, y: 600 }, { x: 1920, y: 600 }],
  ],
  map7: [
    [{ x: 0, y: 400 }, { x: 400, y: 400 }, { x: 400, y: 700 }, { x: 800, y: 700 }, { x: 800, y: 400 }, { x: 1200, y: 400 }, { x: 1200, y: 700 }, { x: 1600, y: 700 }, { x: 1600, y: 400 }, { x: 1920, y: 400 }],
    [{ x: 0, y: 800 }, { x: 300, y: 800 }, { x: 300, y: 500 }, { x: 600, y: 500 }, { x: 600, y: 800 }, { x: 900, y: 800 }, { x: 900, y: 500 }, { x: 1200, y: 500 }, { x: 1200, y: 800 }, { x: 1500, y: 800 }, { x: 1500, y: 500 }, { x: 1920, y: 500 }],
  ],
  map8: [
    [{ x: 0, y: 300 }, { x: 500, y: 300 }, { x: 500, y: 600 }, { x: 1000, y: 600 }, { x: 1000, y: 300 }, { x: 1500, y: 300 }, { x: 1500, y: 600 }, { x: 1920, y: 600 }],
    [{ x: 0, y: 700 }, { x: 400, y: 700 }, { x: 400, y: 400 }, { x: 800, y: 400 }, { x: 800, y: 700 }, { x: 1200, y: 700 }, { x: 1200, y: 400 }, { x: 1920, y: 400 }],
  ],
  map9: [
    [{ x: 0, y: 500 }, { x: 300, y: 500 }, { x: 300, y: 200 }, { x: 600, y: 200 }, { x: 600, y: 500 }, { x: 900, y: 500 }, { x: 900, y: 800 }, { x: 1200, y: 800 }, { x: 1200, y: 500 }, { x: 1500, y: 500 }, { x: 1500, y: 200 }, { x: 1920, y: 200 }],
    [{ x: 0, y: 800 }, { x: 400, y: 800 }, { x: 400, y: 600 }, { x: 800, y: 600 }, { x: 800, y: 300 }, { x: 1100, y: 300 }, { x: 1100, y: 600 }, { x: 1400, y: 600 }, { x: 1400, y: 800 }, { x: 1920, y: 800 }],
  ],
};

const towerTypes = {
  basic: { damage: 10, range: 150, speed: 1, cost: 50, radius: 20, color: '#FF0000', ability: 'None' },
  archer: { damage: 15, range: 200, speed: 1.5, cost: 75, radius: 25, color: '#00FF00', ability: 'Piercing Shot' },
  cannon: { damage: 30, range: 100, speed: 0.5, cost: 100, radius: 30, color: '#0000FF', ability: 'Splash Damage' },
  sniper: { damage: 50, range: 300, speed: 0.3, cost: 150, radius: 20, color: '#FFFF00', ability: 'Headshot' },
  freeze: { damage: 5, range: 120, speed: 1, cost: 120, radius: 25, color: '#00FFFF', ability: 'Slow' },
  mortar: { damage: 40, range: 250, speed: 0.4, cost: 200, radius: 35, color: '#FF00FF', ability: 'Area Blast' },
  laser: { damage: 20, range: 180, speed: 2, cost: 350, radius: 20, color: '#FFA500', ability: 'Continuous Beam' },
  tesla: { damage: 25, range: 150, speed: 1.2, cost: 250, radius: 25, color: '#800080', ability: 'Chain Lightning' },
  flamethrower: { damage: 15, range: 100, speed: 1.5, cost: 180, radius: 20, color: '#FF4500', ability: 'Burn' },
  missile: { damage: 35, range: 200, speed: 0.8, cost: 200, radius: 30, color: '#4682B4', ability: 'Homing' },
  poison: { damage: 10, range: 130, speed: 1, cost: 250, radius: 25, color: '#32CD32', ability: 'Damage Over Time' },
  vortex: { damage: 20, range: 150, speed: 1, cost: 300, radius: 30, color: '#8A2BE2', ability: 'Pull Enemies' },
};

const towerUpgradePaths = {
  basic: {
    power: [{ cost: 50, damageIncrease: 5 }, { cost: 100, damageIncrease: 10 }, { cost: 150, damageIncrease: 15 }, { cost: 200, damageIncrease: 20 }],
    utility: [{ cost: 50, rangeIncrease: 20 }, { cost: 100, rangeIncrease: 30 }, { cost: 150, rangeIncrease: 40 }, { cost: 200, rangeIncrease: 50 }],
  },
  archer: {
    power: [{ cost: 75, damageIncrease: 10 }, { cost: 150, damageIncrease: 15 }, { cost: 225, damageIncrease: 20 }, { cost: 300, damageIncrease: 25 }],
    utility: [{ cost: 75, speedIncrease: 0.5 }, { cost: 150, speedIncrease: 0.7 }, { cost: 225, speedIncrease: 1 }, { cost: 300, speedIncrease: 1.2 }],
  },
  cannon: {
    power: [{ cost: 100, damageIncrease: 15 }, { cost: 200, damageIncrease: 20 }, { cost: 300, damageIncrease: 25 }, { cost: 400, damageIncrease: 30 }],
    utility: [{ cost: 100, rangeIncrease: 10 }, { cost: 200, rangeIncrease: 20 }, { cost: 300, rangeIncrease: 30 }, { cost: 400, rangeIncrease: 40 }],
  },
  sniper: {
    power: [{ cost: 150, damageIncrease: 20 }, { cost: 300, damageIncrease: 30 }, { cost: 450, damageIncrease: 40 }, { cost: 600, damageIncrease: 50 }],
    utility: [{ cost: 150, speedIncrease: 0.1 }, { cost: 300, speedIncrease: 0.2 }, { cost: 450, speedIncrease: 0.3 }, { cost: 600, speedIncrease: 0.4 }],
  },
  freeze: {
    power: [{ cost: 120, damageIncrease: 5 }, { cost: 240, damageIncrease: 10 }, { cost: 360, damageIncrease: 15 }, { cost: 480, damageIncrease: 20 }],
    utility: [{ cost: 120, slowIncrease: 0.1 }, { cost: 240, slowIncrease: 0.2 }, { cost: 360, slowIncrease: 0.3 }, { cost: 480, slowIncrease: 0.4 }],
  },
  mortar: {
    power: [{ cost: 200, damageIncrease: 20 }, { cost: 400, damageIncrease: 30 }, { cost: 600, damageIncrease: 40 }, { cost: 800, damageIncrease: 50 }],
    utility: [{ cost: 200, rangeIncrease: 30 }, { cost: 400, rangeIncrease: 40 }, { cost: 600, rangeIncrease: 50 }, { cost: 800, rangeIncrease: 60 }],
  },
  laser: {
    power: [{ cost: 350, damageIncrease: 10 }, { cost: 700, damageIncrease: 15 }, { cost: 1050, damageIncrease: 20 }, { cost: 1400, damageIncrease: 25 }],
    utility: [{ cost: 350, speedIncrease: 0.5 }, { cost: 700, speedIncrease: 1 }, { cost: 1050, speedIncrease: 1.5 }, { cost: 1400, speedIncrease: 2 }],
  },
  tesla: {
    power: [{ cost: 250, damageIncrease: 10 }, { cost: 500, damageIncrease: 15 }, { cost: 750, damageIncrease: 20 }, { cost: 1000, damageIncrease: 25 }],
    utility: [{ cost: 250, chainIncrease: 1 }, { cost: 500, chainIncrease: 2 }, { cost: 750, chainIncrease: 3 }, { cost: 1000, chainIncrease: 4 }],
  },
  flamethrower: {
    power: [{ cost: 180, damageIncrease: 5 }, { cost: 360, damageIncrease: 10 }, { cost: 540, damageIncrease: 15 }, { cost: 720, damageIncrease: 20 }],
    utility: [{ cost: 180, rangeIncrease: 20 }, { cost: 360, rangeIncrease: 30 }, { cost: 540, rangeIncrease: 40 }, { cost: 720, rangeIncrease: 50 }],
  },
  missile: {
    power: [{ cost: 200, damageIncrease: 15 }, { cost: 400, damageIncrease: 20 }, { cost: 600, damageIncrease: 25 }, { cost: 800, damageIncrease: 30 }],
    utility: [{ cost: 200, speedIncrease: 0.2 }, { cost: 400, speedIncrease: 0.4 }, { cost: 600, speedIncrease: 0.6 }, { cost: 800, speedIncrease: 0.8 }],
  },
  poison: {
    power: [{ cost: 250, damageIncrease: 5 }, { cost: 500, damageIncrease: 10 }, { cost: 750, damageIncrease: 15 }, { cost: 1000, damageIncrease: 20 }],
    utility: [{ cost: 250, durationIncrease: 1 }, { cost: 500, durationIncrease: 2 }, { cost: 750, durationIncrease: 3 }, { cost: 1000, durationIncrease: 4 }],
  },
  vortex: {
    power: [{ cost: 300, damageIncrease: 10 }, { cost: 600, damageIncrease: 15 }, { cost: 900, damageIncrease: 20 }, { cost: 1200, damageIncrease: 25 }],
    utility: [{ cost: 300, pullStrengthIncrease: 0.1 }, { cost: 600, pullStrengthIncrease: 0.2 }, { cost: 900, pullStrengthIncrease: 0.3 }, { cost: 1200, pullStrengthIncrease: 0.4 }],
  },
};

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
        state JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Database schema ensured');

    const defaultTowers = ['basic'];
    const users = await pool.query('SELECT id FROM users');
    for (const user of users.rows) {
      for (const tower of defaultTowers) {
        await pool.query(
          'INSERT INTO user_towers (user_id, tower) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [user.id, tower]
        );
      }
    }
    console.log('Default towers assigned to users');
  } catch (err) {
    console.error('Database init error:', err.message);
  }
}

async function initializeGame(partyId, difficulty = "easy", map = "map1", isPartyMode = false) {
  const gameMoney = difficulty === "easy" ? 200 : difficulty === "medium" ? 400 : 600;
  const gameState = {
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
  };

  try {
    await pool.query(
      'INSERT INTO game_instances (party_id, state) VALUES ($1, $2) ON CONFLICT (party_id) DO UPDATE SET state = $2',
      [partyId, gameState]
    );
    console.log(`Game instance saved to database for party ${partyId}`);
  } catch (err) {
    console.error(`Error saving game instance for party ${partyId}:`, err.message);
  }

  gameInstances.set(partyId, gameState);
  console.log(`Game instance created in memory for party ${partyId}`);
}

async function loadGameState(partyId) {
  if (gameInstances.has(partyId)) {
    return gameInstances.get(partyId);
  }

  try {
    const result = await pool.query('SELECT state FROM game_instances WHERE party_id = $1', [partyId]);
    if (result.rows.length > 0) {
      const gameState = result.rows[0].state;
      gameState.players = new Set(gameState.players);
      gameInstances.set(partyId, gameState);
      console.log(`Game instance loaded from database for party ${partyId}`);
      return gameState;
    }
  } catch (err) {
    console.error(`Error loading game state for party ${partyId}:`, err.message);
  }
  return null;
}

function generateGameImage(gameState) {
  const canvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = gameState.mapTheme.background;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  ctx.strokeStyle = gameState.mapTheme.path;
  ctx.lineWidth = 50;
  gameState.paths.forEach(path => {
    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i++) {
      ctx.lineTo(path[i].x, path[i].y);
    }
    ctx.stroke();
  });

  gameState.enemies.forEach(enemy => {
    ctx.fillStyle = enemy.isBoss ? '#FF0000' : '#FFA500';
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, enemy.isBoss ? 20 : 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000000';
    ctx.fillText(Math.floor(enemy.health), enemy.x - 10, enemy.y - 15);
  });

  gameState.towers.forEach(tower => {
    ctx.fillStyle = towerTypes[tower.type].color;
    ctx.beginPath();
    ctx.arc(tower.x, tower.y, towerTypes[tower.type].radius, 0, Math.PI * 2);
    ctx.fill();
  });

  gameState.projectiles.forEach(projectile => {
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(projectile.x, projectile.y, 5, 0, Math.PI * 2);
    ctx.fill();
  });

  return canvas.toBuffer('image/png');
}

function spawnWave(gameState) {
  if (gameState.isSpawning) return;
  gameState.wave++;
  gameState.isSpawning = true;
  gameState.enemiesToSpawn = gameState.wave * 5;
  gameState.isBossWave = gameState.wave % 5 === 0;
  gameState.bossSpawned = false;
  gameState.spawnTimer = 0;
  console.log(`Spawning wave ${gameState.wave} for party ${gameState.partyId}`);
}

function updateGameState(partyId) {
  const gameState = gameInstances.get(partyId);
  if (!gameState || gameState.isPaused || gameState.gameOver || gameState.gameWon) return;

  const now = Date.now();
  const deltaTime = (now - gameState.lastUpdate) / 1000 * gameState.gameSpeed;
  gameState.lastUpdate = now;

  if (gameState.waveDelay > 0) {
    gameState.waveDelay -= deltaTime;
    if (gameState.waveDelay <= 0) {
      spawnWave(gameState);
    }
  }

  if (gameState.isSpawning) {
    gameState.spawnTimer -= deltaTime;
    if (gameState.spawnTimer <= 0 && gameState.enemiesToSpawn > 0) {
      const pathIndex = Math.floor(Math.random() * gameState.paths.length);
      const path = gameState.paths[pathIndex];
      const enemy = {
        x: path[0].x,
        y: path[0].y,
        pathIndex: 0,
        pathSegment: 0,
        path: path,
        health: gameState.isBossWave ? 50 * gameState.wave : 10 * gameState.wave,
        maxHealth: gameState.isBossWave ? 50 * gameState.wave : 10 * gameState.wave,
        speed: gameState.isBossWave ? 50 : 100,
        isBoss: gameState.isBossWave && !gameState.bossSpawned,
      };
      gameState.enemies.push(enemy);
      gameState.enemiesToSpawn--;
      gameState.spawnTimer = 1;
      if (gameState.isBossWave && !gameState.bossSpawned) {
        gameState.bossSpawned = true;
      }
    }
    if (gameState.enemiesToSpawn <= 0 && !gameState.bossSpawned) {
      gameState.isSpawning = false;
      if (gameState.wave >= 20) {
        gameState.gameWon = true;
      } else {
        gameState.waveDelay = 5;
      }
    }
  }

  gameState.enemies.forEach(enemy => {
    const segment = enemy.path[enemy.pathSegment];
    const nextSegment = enemy.path[enemy.pathSegment + 1];
    if (!nextSegment) {
      gameState.playerHealth -= enemy.isBoss ? 5 : 1;
      enemy.health = 0;
      return;
    }

    const dx = nextSegment.x - enemy.x;
    const dy = nextSegment.y - enemy.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const moveDistance = enemy.speed * deltaTime;

    if (distance <= moveDistance) {
      enemy.x = nextSegment.x;
      enemy.y = nextSegment.y;
      enemy.pathSegment++;
    } else {
      const angle = Math.atan2(dy, dx);
      enemy.x += Math.cos(angle) * moveDistance;
      enemy.y += Math.sin(angle) * moveDistance;
    }
  });

  gameState.enemies = gameState.enemies.filter(enemy => enemy.health > 0 && enemy.pathSegment < enemy.path.length);

  gameState.towers.forEach(tower => {
    tower.cooldown -= deltaTime;
    if (tower.cooldown <= 0) {
      const target = gameState.enemies.find(enemy => {
        const dx = enemy.x - tower.x;
        const dy = enemy.y - tower.y;
        return Math.sqrt(dx * dx + dy * dy) <= tower.range;
      });
      if (target) {
        const projectile = {
          x: tower.x,
          y: tower.y,
          target,
          damage: tower.damage,
          speed: 300,
        };
        gameState.projectiles.push(projectile);
        tower.cooldown = 1 / tower.speed;
      }
    }
  });

  gameState.projectiles.forEach(projectile => {
    const dx = projectile.target.x - projectile.x;
    const dy = projectile.target.y - projectile.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const moveDistance = projectile.speed * deltaTime;

    if (distance <= moveDistance) {
      projectile.target.health -= projectile.damage;
      if (projectile.target.health <= 0) {
        const moneyReward = projectile.target.isBoss ? 50 : 10;
        const scoreReward = projectile.target.isBoss ? 100 : 20;
        gameState.gameMoney += moneyReward;
        gameState.score += scoreReward;
        updateUserMoney(projectile.target.placedBy, moneyReward);
      }
      projectile.x = -100;
    } else {
      const angle = Math.atan2(dy, dx);
      projectile.x += Math.cos(angle) * moveDistance;
      projectile.y += Math.sin(angle) * moveDistance;
    }
  });

  gameState.projectiles = gameState.projectiles.filter(p => p.x !== -100);

  if (gameState.playerHealth <= 0) {
    gameState.gameOver = true;
  }
}

async function updateUserMoney(username, amount) {
  try {
    await pool.query(
      'UPDATE users SET money = money + $1 WHERE username = $2',
      [amount, username]
    );
  } catch (err) {
    console.error(`Error updating money for user ${username}:`, err.message);
  }
}

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

app.post('/game/join', async (req, res) => {
  const { username, partyId, difficulty = "easy", map = "map1", isPartyMode = false } = req.body;
  console.log('Received /game/join request:', { username, partyId, difficulty, map, isPartyMode });

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
  console.log('Current gameInstances keys:', Array.from(gameInstances.keys()));
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
  console.log('Current gameInstances keys:', Array.from(gameInstances.keys()));
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
  console.log('Current gameInstances keys:', Array.from(gameInstances.keys()));
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
      console.log(`Game state updated in database for party ${partyId}`);
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