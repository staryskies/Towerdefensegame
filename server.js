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

function initializeGame(partyId, difficulty = "easy", map = "map1", isPartyMode = false) {
  if (!gameInstances.has(partyId)) {
    const gameMoney = difficulty === "easy" ? 200 : difficulty === "medium" ? 400 : 600;
    gameInstances.set(partyId, {
      enemies: [],
      towers: [],
      projectiles: [],
      playerHealth: 20,
      gameMoney,
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

async function loadGameState(partyId) {
  return gameInstances.get(partyId); // Simplified in-memory load
}

// Game Classes
class Enemy {
  constructor(type, wave, gameState, pathKey) {
    this.pathKey = pathKey;
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
    this.placedBy = placedBy;
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
    if (upgrade.damageIncrease) this.damage += upgrade.damageIncrease;
    if (upgrade.rangeIncrease) this.range += upgrade.rangeIncrease;
    if (upgrade.fireRateDecrease) this.fireRate -= upgrade.fireRateDecrease;
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
      const pathKey = Math.random() < 0.5 ? "path1" : "path2";
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
  try {
    const canvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = themeBackgrounds[gameState.selectedMap] || '#90ee90';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    Object.values(gameState.paths).forEach(path => {
      ctx.beginPath();
      ctx.moveTo(path[0].x, path[0].y);
      path.slice(1).forEach(point => ctx.lineTo(point.x, point.y));
      ctx.strokeStyle = "brown";
      ctx.lineWidth = PATH_WIDTH;
      ctx.stroke();
    });

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

    gameState.projectiles.forEach(projectile => {
      ctx.beginPath();
      ctx.arc(projectile.x, projectile.y, projectile.radius, 0, Math.PI * 2);
      ctx.fillStyle = projectile.color;
      ctx.fill();
    });

    return canvas.toBuffer('image/png');
  } catch (err) {
    console.error('Error generating game image:', err.message);
    return createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT).toBuffer('image/png'); // Fallback blank image
  }
}

// Periodic update loop
setInterval(() => {
  gameInstances.forEach(async (gameState, partyId) => {
    updateGameState(partyId);
    try {
      await pool.query(
        'INSERT INTO game_instances (party_id, state) VALUES ($1, $2) ON CONFLICT (party_id) DO UPDATE SET state = $2, created_at = CURRENT_TIMESTAMP',
        [partyId, gameState]
      );
    } catch (err) {
      console.error(`Error updating game state for party ${partyId}:`, err.message);
    }
  });
}, 1000 / 60);

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
    console.error('Error fetching towers:', err.message);
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
  initializeGame(effectivePartyId, difficulty, map, isPartyMode);
  
  const gameState = await loadGameState(effectivePartyId);
  if (!gameState) {
    console.error('Failed to initialize game state for partyId:', effectivePartyId);
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

  const gameState = await loadGameState(partyId);
  if (!gameState) {
    console.log('Game instance not found, attempting to reinitialize for partyId:', partyId);
    const username = partyId.split('-')[0];
    if (!username) {
      return res.status(400).json({ message: 'Invalid partyId format' });
    }
    initializeGame(partyId, "easy", "map1", false);
    const reinitializedState = await loadGameState(partyId);
    if (reinitializedState) {
      reinitializedState.players.add(username);
      reinitializedState.partyLeader = username;
      spawnWave(reinitializedState);
      console.log(`Reinitialized game for partyId ${partyId} with username ${username}`);
    } else {
      return res.status(500).json({ message: 'Failed to reinitialize game' });
    }
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
    initializeGame(partyId, "easy", "map1", false);
    gameState = await loadGameState(partyId); // Ensure gameState is updated
    if (!gameState) {
      console.error('Reinitialization failed for partyId:', partyId);
      return res.status(500).json({ message: 'Failed to reinitialize game state' });
    }
    gameState.players.add(username);
    gameState.partyLeader = username;
    spawnWave(gameState);
    console.log(`Reinitialized game for partyId ${partyId} with username ${username}`);
  }

  // Fallback to default values if gameState is still undefined (should not happen)
  if (!gameState) {
    console.error('Critical error: gameState is undefined after reinitialization for partyId:', partyId);
    return res.status(500).json({ message: 'Internal server error' });
  }

  res.json({
    money: gameState.gameMoney || 0,
    health: gameState.playerHealth || 0,
    wave: gameState.wave || 1,
    score: gameState.score || 0,
    gameSpeed: gameState.gameSpeed || 1,
    isPaused: gameState.isPaused || false,
    gameOver: gameState.gameOver || false,
    gameWon: gameState.gameWon || false,
    players: Array.from(gameState.players || []),
    partyLeader: gameState.partyLeader || null,
    towers: (gameState.towers || []).map(t => ({
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

  const towerCost = towerStats[type].cost;
  const sharedMoney = gameState.isPartyMode ? gameState.gameMoney : (await pool.query('SELECT money FROM users WHERE username = $1', [username])).rows[0].money;

  if (sharedMoney < towerCost) return res.status(400).json({ message: 'Not enough money' });

  const tower = new Tower(x, y, type, username);
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
    tower.damage += (upgrade.damageIncrease || 0);
    tower.powerLevel++;
  } else if (path === 'utility') {
    tower.range += (upgrade.rangeIncrease || 0);
    tower.fireRate -= (upgrade.fireRateDecrease || 0);
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
        'INSERT INTO game_instances (party_id, state) VALUES ($1, $2) ON CONFLICT (party_id) DO UPDATE SET state = $2, created_at = CURRENT_TIMESTAMP',
        [partyId, gameState]
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