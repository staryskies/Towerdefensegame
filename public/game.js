const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const moneySpan = document.getElementById('money');
const healthSpan = document.getElementById('health');
const waveSpan = document.getElementById('wave');
const scoreSpan = document.getElementById('score');

// Expose gameState and related functions globally
window.gameState = null;
window.initializeGameState = function(initialState) {
  window.gameState = {
    ...initialState,
    enemies: initialState.enemies ? initialState.enemies.map(e => {
      const enemyType = enemyThemes[mapThemes[initialState.map]][initialState.difficulty][0];
      return new Enemy(enemyType, initialState.wave, e.pathKey);
    }) : [],
    projectiles: initialState.projectiles || [],
    isSpawning: initialState.isSpawning || false,
    spawnTimer: initialState.spawnTimer || 0,
    enemiesToSpawn: initialState.enemiesToSpawn || 0,
    waveDelay: initialState.waveDelay || 0,
    isBossWave: initialState.isBossWave || false,
    bossSpawned: initialState.bossSpawned || false,
  };
  spawnWave();
};

window.updateGameState = function(key, value) {
  if (window.gameState) {
    if (key === 'enemies' && Array.isArray(value)) {
      window.gameState.enemies = value.map(e => {
        const enemyType = enemyThemes[mapThemes[window.gameState.map]][window.gameState.difficulty][0];
        const newEnemy = new Enemy(enemyType, window.gameState.wave, e.pathKey);
        newEnemy.x = e.x;
        newEnemy.y = e.y;
        newEnemy.health = e.health;
        newEnemy.maxHealth = e.maxHealth;
        newEnemy.pathIndex = e.pathIndex;
        newEnemy.isBoss = e.isBoss || false;
        return newEnemy;
      });
    } else if (key === 'towers' && Array.isArray(value)) {
      window.gameState.towers = value.map(t => {
        const newTower = new Tower(t.x, t.y, t.type, t.placedBy);
        newTower.damage = t.damage || newTower.damage;
        newTower.range = t.range || newTower.range;
        newTower.fireRate = t.fireRate || newTower.fireRate;
        newTower.lastShot = t.lastShot || newTower.lastShot;
        newTower.angle = t.angle || newTower.angle;
        newTower.powerLevel = t.powerLevel || newTower.powerLevel;
        newTower.utilityLevel = t.utilityLevel || newTower.utilityLevel;
        return newTower;
      });
    } else if (key === 'projectiles' && Array.isArray(value)) {
      window.gameState.projectiles = value.map(p => new Projectile(p.x, p.y, p.target, p.damage, p.speed, p.type));
    } else {
      window.gameState[key] = value;
    }
  }
};

// Game constants
const CANVAS_WIDTH = 1920;
const CANVAS_HEIGHT = 1080;
const PATH_WIDTH = 40;
const MAX_ENEMIES = 100;
const MAX_PROJECTILES = 200;

// Map and Theme Definitions
const mapThemes = {
  map1: "grassland", map2: "desert", map3: "stone", map4: "forest", map5: "mountain",
  map6: "desert", map7: "river", map8: "canyon", map9: "arctic",
};

const themeBackgrounds = {
  map1: "#90ee90", map2: "#f4a460", map3: "#a9a9a9", map4: "#6b8e23", map5: "#cd853f",
  map6: "#f4a460", map7: "#87ceeb", map8: "#cd5c5c", map9: "#e0ffff",
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

// Game Classes
class Enemy {
  constructor(type, wave, pathKey) {
    this.pathKey = pathKey;
    this.x = window.gameState.paths[pathKey][0].x;
    this.y = window.gameState.paths[pathKey][0].y;
    const healthMultiplier = window.gameState.difficulty === "easy" ? 0.25 : window.gameState.difficulty === "medium" ? 0.5 : 1;
    this.health = Math.floor(type.health * healthMultiplier * (1 + (wave - 1) * 0.25));
    this.maxHealth = this.health;
    this.speed = type.speed;
    this.radius = type.radius;
    this.color = type.color;
    this.pathIndex = 1;
    this.isBoss = window.gameState.isBossWave && !window.gameState.bossSpawned;
    if (this.isBoss) {
      this.health *= 5;
      this.maxHealth *= 5;
      this.radius *= 2;
      this.speed *= 0.8; // Slower but tankier
      window.gameState.bossSpawned = true;
    }
  }

  move(dt) {
    const path = window.gameState.paths[this.pathKey];
    if (this.pathIndex >= path.length) {
      window.gameState.playerHealth -= this.isBoss ? 5 : 1;
      window.gameState.enemies = window.gameState.enemies.filter(e => e !== this);
      if (window.gameState.playerHealth <= 0) endGame(false);
      return;
    }
    const target = path[this.pathIndex];
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const moveSpeed = this.speed * window.gameState.gameSpeed * dt;
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

  shoot() {
    const now = Date.now();
    if (now - this.lastShot < this.fireRate / window.gameState.gameSpeed) return;
    let target = window.gameState.enemies.find(enemy => Math.hypot(enemy.x - this.x, enemy.y - this.y) < this.range);
    if (target) {
      const dx = target.x - this.x;
      const dy = target.y - this.y;
      this.angle = Math.atan2(dy, dx);
      window.gameState.projectiles.push(new Projectile(this.x, this.y, target, this.damage, 5, this.type));
      this.lastShot = now;
    }
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

  move(dt) {
    if (!this.target || !window.gameState.enemies.includes(this.target)) {
      window.gameState.projectiles = window.gameState.projectiles.filter(p => p !== this);
      return;
    }
    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const moveSpeed = this.speed * window.gameState.gameSpeed * dt;
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
        window.gameState.score += this.target.isBoss ? 50 : 10;
        window.gameState.gameMoney += this.target.isBoss ? 20 : 5;
        window.gameState.enemies = window.gameState.enemies.filter(e => e !== this.target);
      }
      window.gameState.projectiles = window.gameState.projectiles.filter(p => p !== this);
    }
  }
}

// Game Functions
function spawnWave() {
  if (!window.gameState || window.gameState.isSpawning || window.gameState.waveDelay > 0) return;
  window.gameState.isSpawning = true;
  window.gameState.isBossWave = window.gameState.wave % 5 === 0;
  window.gameState.bossSpawned = false;
  window.gameState.enemiesToSpawn = window.gameState.isBossWave ? 5 : Math.min(10 + window.gameState.wave * 2, MAX_ENEMIES);
  window.gameState.spawnTimer = 0;
}

function updateEnemies(dt) {
  if (!window.gameState) return;

  if (!window.gameState.isSpawning && window.gameState.enemies.length === 0 && window.gameState.waveDelay <= 0) {
    window.gameState.wave++;
    if (window.gameState.wave > 20) {
      endGame(true);
      return;
    }
    window.gameState.waveDelay = 5; // 5-second delay between waves
    return;
  }

  if (window.gameState.waveDelay > 0) {
    window.gameState.waveDelay -= dt;
    return;
  }

  if (window.gameState.isSpawning) {
    window.gameState.spawnTimer -= dt;
    if (window.gameState.spawnTimer <= 0 && window.gameState.enemiesToSpawn > 0) {
      const theme = mapThemes[window.gameState.map];
      const difficulty = window.gameState.difficulty;
      const enemyType = enemyThemes[theme][difficulty][0];
      const pathKey = Math.random() < 0.5 ? 'path1' : 'path2';
      window.gameState.enemies.push(new Enemy(enemyType, window.gameState.wave, pathKey));
      window.gameState.enemiesToSpawn--;
      window.gameState.spawnTimer = window.gameState.isBossWave ? 2 : 1; // Slower spawn for bosses
    }
    if (window.gameState.enemiesToSpawn === 0) window.gameState.isSpawning = false;
  }

  window.gameState.enemies.forEach(enemy => {
    if (typeof enemy.move === 'function') {
      enemy.move(dt);
    } else {
      console.error('Enemy lacks move function:', enemy);
    }
  });
}

function updateTowers() {
  if (!window.gameState) return;
  window.gameState.towers.forEach(tower => tower.shoot());
}

function updateProjectiles(dt) {
  if (!window.gameState) return;
  window.gameState.projectiles.forEach(projectile => projectile.move(dt));
}

function endGame(won) {
  if (!window.gameState) return;
  window.gameState.gameOver = !won;
  window.gameState.gameWon = won;
  alert(won ? "You Won!" : "Game Over!");
  sendAction({
    type: 'UPDATE_STATE',
    gameMoney: window.gameState.gameMoney,
    playerHealth: window.gameState.playerHealth,
    score: window.gameState.score,
    wave: window.gameState.wave,
    gameOver: window.gameState.gameOver,
    gameWon: window.gameState.gameWon,
    enemies: window.gameState.enemies.map(e => ({
      x: e.x,
      y: e.y,
      health: e.health,
      maxHealth: e.maxHealth,
      speed: e.speed,
      radius: e.radius,
      color: e.color,
      pathKey: e.pathKey,
      pathIndex: e.pathIndex,
      isBoss: e.isBoss,
    })),
    towers: window.gameState.towers.map(t => ({
      x: t.x,
      y: t.y,
      type: t.type,
      damage: t.damage,
      range: t.range,
      fireRate: t.fireRate,
      lastShot: t.lastShot,
      radius: t.radius,
      color: t.color,
      angle: t.angle,
      powerLevel: t.powerLevel,
      utilityLevel: t.utilityLevel,
      placedBy: t.placedBy,
    })),
    projectiles: window.gameState.projectiles,
  });
  window.location.href = '/map.html';
}

// Rendering Functions
function drawPath(path) {
  if (!window.gameState) return;
  ctx.beginPath();
  ctx.moveTo(path[0].x, path[0].y);
  for (let i = 1; i < path.length; i++) {
    ctx.lineTo(path[i].x, path[i].y);
  }
  ctx.strokeStyle = '#555';
  ctx.lineWidth = PATH_WIDTH;
  ctx.stroke();
}

function drawEnemy(enemy) {
  ctx.save();
  const theme = mapThemes[window.gameState.map];
  const difficulty = window.gameState.difficulty;
  const scale = enemy.isBoss ? 1.5 : 1;
  const baseRadius = enemy.radius * scale;

  // Draw different shapes based on the map theme
  ctx.beginPath();
  switch (theme) {
    case 'grassland':
      // Pentagon shape for grassland enemies
      ctx.moveTo(enemy.x + baseRadius * Math.cos(0), enemy.y + baseRadius * Math.sin(0));
      for (let i = 1; i <= 5; i++) {
        ctx.lineTo(
          enemy.x + baseRadius * Math.cos((i * 2 * Math.PI) / 5),
          enemy.y + baseRadius * Math.sin((i * 2 * Math.PI) / 5)
        );
      }
      break;
    case 'desert':
      // Square shape for desert enemies
      ctx.rect(enemy.x - baseRadius, enemy.y - baseRadius, baseRadius * 2, baseRadius * 2);
      break;
    case 'stone':
      // Hexagon shape for stone enemies
      ctx.moveTo(enemy.x + baseRadius * Math.cos(0), enemy.y + baseRadius * Math.sin(0));
      for (let i = 1; i <= 6; i++) {
        ctx.lineTo(
          enemy.x + baseRadius * Math.cos((i * 2 * Math.PI) / 6),
          enemy.y + baseRadius * Math.sin((i * 2 * Math.PI) / 6)
        );
      }
      break;
    case 'forest':
      // Triangle shape for forest enemies
      ctx.moveTo(enemy.x, enemy.y - baseRadius);
      ctx.lineTo(enemy.x + baseRadius, enemy.y + baseRadius);
      ctx.lineTo(enemy.x - baseRadius, enemy.y + baseRadius);
      break;
    case 'mountain':
      // Diamond shape for mountain enemies
      ctx.moveTo(enemy.x, enemy.y - baseRadius);
      ctx.lineTo(enemy.x + baseRadius, enemy.y);
      ctx.lineTo(enemy.x, enemy.y + baseRadius);
      ctx.lineTo(enemy.x - baseRadius, enemy.y);
      break;
    case 'river':
      // Octagon shape for river enemies
      ctx.moveTo(enemy.x + baseRadius * Math.cos(0), enemy.y + baseRadius * Math.sin(0));
      for (let i = 1; i <= 8; i++) {
        ctx.lineTo(
          enemy.x + baseRadius * Math.cos((i * 2 * Math.PI) / 8),
          enemy.y + baseRadius * Math.sin((i * 2 * Math.PI) / 8)
        );
      }
      break;
    case 'canyon':
      // Star shape for canyon enemies
      const spikes = 5;
      for (let i = 0; i < spikes * 2; i++) {
        const radius = i % 2 === 0 ? baseRadius : baseRadius / 2;
        ctx.lineTo(
          enemy.x + radius * Math.cos((i * Math.PI) / spikes),
          enemy.y + radius * Math.sin((i * Math.PI) / spikes)
        );
      }
      break;
    case 'arctic':
      // Circle with inner details for arctic enemies
      ctx.arc(enemy.x, enemy.y, baseRadius, 0, Math.PI * 2);
      break;
    default:
      ctx.arc(enemy.x, enemy.y, baseRadius, 0, Math.PI * 2);
  }
  ctx.closePath();

  // Fill and stroke
  ctx.fillStyle = enemy.color;
  ctx.fill();
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Add difficulty-based details
  if (difficulty === 'medium') {
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, baseRadius / 2, 0, Math.PI * 2);
    ctx.strokeStyle = '#fff';
    ctx.stroke();
  } else if (difficulty === 'hard') {
    ctx.beginPath();
    ctx.moveTo(enemy.x - baseRadius / 2, enemy.y - baseRadius / 2);
    ctx.lineTo(enemy.x + baseRadius / 2, enemy.y + baseRadius / 2);
    ctx.moveTo(enemy.x + baseRadius / 2, enemy.y - baseRadius / 2);
    ctx.lineTo(enemy.x - baseRadius / 2, enemy.y + baseRadius / 2);
    ctx.strokeStyle = '#fff';
    ctx.stroke();
  }

  // Add glowing effect for boss enemies
  if (enemy.isBoss) {
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, baseRadius + 5, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)';
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  // Draw health bar
  const barWidth = baseRadius * 2;
  const barHeight = 5;
  const healthRatio = enemy.health / enemy.maxHealth;
  ctx.fillStyle = 'red';
  ctx.fillRect(enemy.x - barWidth / 2, enemy.y - baseRadius - 10, barWidth, barHeight);
  ctx.fillStyle = 'green';
  ctx.fillRect(enemy.x - barWidth / 2, enemy.y - baseRadius - 10, barWidth * healthRatio, barHeight);
  ctx.restore();
}

function drawTower(tower) {
  ctx.save();
  const baseRadius = tower.radius;
  const powerLevel = tower.powerLevel;
  const utilityLevel = tower.utilityLevel;

  // Draw different shapes based on tower type
  ctx.beginPath();
  switch (tower.type) {
    case 'basic':
      // Square base with a small barrel
      ctx.rect(tower.x - baseRadius, tower.y - baseRadius, baseRadius * 2, baseRadius * 2);
      break;
    case 'archer':
      // Triangle base (like a bow)
      ctx.moveTo(tower.x, tower.y - baseRadius);
      ctx.lineTo(tower.x + baseRadius, tower.y + baseRadius);
      ctx.lineTo(tower.x - baseRadius, tower.y + baseRadius);
      break;
    case 'cannon':
      // Circle base with a larger barrel
      ctx.arc(tower.x, tower.y, baseRadius, 0, Math.PI * 2);
      break;
    case 'sniper':
      // Tall rectangle base (like a sniper tower)
      ctx.rect(tower.x - baseRadius / 2, tower.y - baseRadius * 1.5, baseRadius, baseRadius * 3);
      break;
    case 'freeze':
      // Hexagon base
      ctx.moveTo(tower.x + baseRadius * Math.cos(0), tower.y + baseRadius * Math.sin(0));
      for (let i = 1; i <= 6; i++) {
        ctx.lineTo(
          tower.x + baseRadius * Math.cos((i * 2 * Math.PI) / 6),
          tower.y + baseRadius * Math.sin((i * 2 * Math.PI) / 6)
        );
      }
      break;
    case 'mortar':
      // Pentagon base with a wide barrel
      ctx.moveTo(tower.x + baseRadius * Math.cos(0), tower.y + baseRadius * Math.sin(0));
      for (let i = 1; i <= 5; i++) {
        ctx.lineTo(
          tower.x + baseRadius * Math.cos((i * 2 * Math.PI) / 5),
          tower.y + baseRadius * Math.sin((i * 2 * Math.PI) / 5)
        );
      }
      break;
    case 'laser':
      // Diamond base
      ctx.moveTo(tower.x, tower.y - baseRadius);
      ctx.lineTo(tower.x + baseRadius, tower.y);
      ctx.lineTo(tower.x, tower.y + baseRadius);
      ctx.lineTo(tower.x - baseRadius, tower.y);
      break;
    case 'tesla':
      // Star shape
      const spikes = 5;
      for (let i = 0; i < spikes * 2; i++) {
        const radius = i % 2 === 0 ? baseRadius : baseRadius / 2;
        ctx.lineTo(
          tower.x + radius * Math.cos((i * Math.PI) / spikes),
          tower.y + radius * Math.sin((i * Math.PI) / spikes)
        );
      }
      break;
    case 'flamethrower':
      // Octagon base
      ctx.moveTo(tower.x + baseRadius * Math.cos(0), tower.y + baseRadius * Math.sin(0));
      for (let i = 1; i <= 8; i++) {
        ctx.lineTo(
          tower.x + baseRadius * Math.cos((i * 2 * Math.PI) / 8),
          tower.y + baseRadius * Math.sin((i * 2 * Math.PI) / 8)
        );
      }
      break;
    case 'missile':
      // Tall triangle base
      ctx.moveTo(tower.x, tower.y - baseRadius * 1.5);
      ctx.lineTo(tower.x + baseRadius, tower.y + baseRadius);
      ctx.lineTo(tower.x - baseRadius, tower.y + baseRadius);
      break;
    case 'poison':
      // Circle with inner circle
      ctx.arc(tower.x, tower.y, baseRadius, 0, Math.PI * 2);
      break;
    case 'vortex':
      // Spiral effect (simplified as concentric circles)
      ctx.arc(tower.x, tower.y, baseRadius, 0, Math.PI * 2);
      ctx.arc(tower.x, tower.y, baseRadius / 2, 0, Math.PI * 2);
      break;
    default:
      ctx.rect(tower.x - baseRadius, tower.y - baseRadius, baseRadius * 2, baseRadius * 2);
  }
  ctx.closePath();

  // Fill and stroke the base
  ctx.fillStyle = tower.color;
  ctx.fill();
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Add upgrade visuals based on powerLevel and utilityLevel
  if (powerLevel > 0) {
    // Add a small circle on top for each power level
    for (let i = 0; i < powerLevel; i++) {
      ctx.beginPath();
      ctx.arc(tower.x + (i - (powerLevel - 1) / 2) * (baseRadius / 2), tower.y - baseRadius - 5, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#ff0';
      ctx.fill();
    }
  }
  if (utilityLevel > 0) {
    // Add small bars on the sides for each utility level
    for (let i = 0; i < utilityLevel; i++) {
      ctx.fillStyle = '#0ff';
      ctx.fillRect(tower.x + baseRadius + 5, tower.y - baseRadius + i * 8, 3, 5);
    }
  }

  // Draw range circle
  ctx.beginPath();
  ctx.arc(tower.x, tower.y, tower.range, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.stroke();

  // Draw turret barrel
  ctx.save();
  ctx.translate(tower.x, tower.y);
  ctx.rotate(tower.angle);
  ctx.fillStyle = '#333';
  let barrelLength = 20;
  let barrelWidth = 10;
  if (tower.type === 'cannon' || tower.type === 'mortar') {
    barrelLength = 25;
    barrelWidth = 15;
  } else if (tower.type === 'sniper') {
    barrelLength = 30;
    barrelWidth = 8;
  }
  ctx.fillRect(0, -barrelWidth / 2, barrelLength, barrelWidth);
  ctx.restore();
  ctx.restore();
}

function drawProjectile(projectile) {
  ctx.fillStyle = projectile.color;
  ctx.beginPath();
  ctx.arc(projectile.x, projectile.y, projectile.radius, 0, Math.PI * 2);
  ctx.fill();
}

function render() {
  if (!window.gameState) return;
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.fillStyle = themeBackgrounds[window.gameState.map] || '#90ee90';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Draw paths
  drawPath(window.gameState.paths.path1);
  drawPath(window.gameState.paths.path2);

  // Draw game objects
  window.gameState.enemies.forEach(drawEnemy);
  window.gameState.towers.forEach(drawTower);
  window.gameState.projectiles.forEach(drawProjectile);
}

// Game Loop
let lastTime = 0;
function gameLoop(timestamp) {
  if (!lastTime) lastTime = timestamp;
  const dt = (timestamp - lastTime) / 1000;
  lastTime = timestamp;

  if (window.gameState && !window.gameState.isPaused && !window.gameState.gameOver && !window.gameState.gameWon) {
    updateEnemies(dt);
    updateTowers();
    updateProjectiles(dt);
    sendAction({
      type: 'UPDATE_STATE',
      gameMoney: window.gameState.gameMoney,
      playerHealth: window.gameState.playerHealth,
      score: window.gameState.score,
      wave: window.gameState.wave,
      gameOver: window.gameState.gameOver,
      gameWon: window.gameState.gameWon,
      enemies: window.gameState.enemies.map(e => ({
        x: e.x,
        y: e.y,
        health: e.health,
        maxHealth: e.maxHealth,
        speed: e.speed,
        radius: e.radius,
        color: e.color,
        pathKey: e.pathKey,
        pathIndex: e.pathIndex,
        isBoss: e.isBoss,
      })),
      towers: window.gameState.towers.map(t => ({
        x: t.x,
        y: t.y,
        type: t.type,
        damage: t.damage,
        range: t.range,
        fireRate: t.fireRate,
        lastShot: t.lastShot,
        radius: t.radius,
        color: t.color,
        angle: t.angle,
        powerLevel: t.powerLevel,
        utilityLevel: t.utilityLevel,
        placedBy: t.placedBy,
      })),
      projectiles: window.gameState.projectiles,
    });
  }

  render();
  updateStatsUI();
  requestAnimationFrame(gameLoop);
}

function startGameLoop() {
  if (window.gameState) {
    requestAnimationFrame(gameLoop);
  }
}

function updateStatsUI() {
  if (window.gameState) {
    moneySpan.textContent = window.gameState.gameMoney;
    healthSpan.textContent = window.gameState.playerHealth;
    waveSpan.textContent = window.gameState.wave;
    scoreSpan.textContent = window.gameState.score;
  }
}