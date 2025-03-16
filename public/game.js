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
    enemies: initialState.enemies || [],
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
    window.gameState[key] = value;
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
    easy: [{ health: 50, speed: 1, radius: 10, color: "red", image: "enemy_red.png" }],
    medium: [{ health: 75, speed: 1.2, radius: 12, color: "darkred", image: "enemy_darkred.png" }],
    hard: [{ health: 100, speed: 1.5, radius: 15, color: "crimson", image: "enemy_crimson.png" }],
  },
  desert: {
    easy: [{ health: 60, speed: 1.1, radius: 10, color: "sandybrown", image: "enemy_sandy.png" }],
    medium: [{ health: 85, speed: 1.3, radius: 12, color: "peru", image: "enemy_peru.png" }],
    hard: [{ health: 120, speed: 1.6, radius: 15, color: "sienna", image: "enemy_sienna.png" }],
  },
  stone: {
    easy: [{ health: 70, speed: 0.9, radius: 10, color: "gray", image: "enemy_gray.png" }],
    medium: [{ health: 95, speed: 1.1, radius: 12, color: "darkgray", image: "enemy_darkgray.png" }],
    hard: [{ health: 130, speed: 1.4, radius: 15, color: "slategray", image: "enemy_slate.png" }],
  },
  forest: {
    easy: [{ health: 55, speed: 1, radius: 10, color: "green", image: "enemy_green.png" }],
    medium: [{ health: 80, speed: 1.2, radius: 12, color: "darkgreen", image: "enemy_darkgreen.png" }],
    hard: [{ health: 110, speed: 1.5, radius: 15, color: "forestgreen", image: "enemy_forest.png" }],
  },
  mountain: {
    easy: [{ health: 65, speed: 0.8, radius: 10, color: "brown", image: "enemy_brown.png" }],
    medium: [{ health: 90, speed: 1, radius: 12, color: "saddlebrown", image: "enemy_saddle.png" }],
    hard: [{ health: 125, speed: 1.3, radius: 15, color: "chocolate", image: "enemy_choco.png" }],
  },
  river: {
    easy: [{ health: 50, speed: 1.2, radius: 10, color: "blue", image: "enemy_blue.png" }],
    medium: [{ health: 75, speed: 1.4, radius: 12, color: "darkblue", image: "enemy_darkblue.png" }],
    hard: [{ health: 100, speed: 1.7, radius: 15, color: "navy", image: "enemy_navy.png" }],
  },
  canyon: {
    easy: [{ health: 60, speed: 1, radius: 10, color: "orange", image: "enemy_orange.png" }],
    medium: [{ health: 85, speed: 1.2, radius: 12, color: "darkorange", image: "enemy_darkorange.png" }],
    hard: [{ health: 115, speed: 1.5, radius: 15, color: "orangered", image: "enemy_orange.png" }],
  },
  arctic: {
    easy: [{ health: 70, speed: 0.9, radius: 10, color: "lightblue", image: "enemy_lightblue.png" }],
    medium: [{ health: 95, speed: 1.1, radius: 12, color: "cyan", image: "enemy_cyan.png" }],
    hard: [{ health: 130, speed: 1.4, radius: 15, color: "deepskyblue", image: "enemy_deepblue.png" }],
  },
};

const towerStats = {
  basic: { damage: 10, range: 100, fireRate: 1000, cost: 50, persistentCost: 0, color: "gray", ability: "Basic shot", image: "tower_basic.png" },
  archer: { damage: 15, range: 120, fireRate: 2000, cost: 75, persistentCost: 225, color: "brown", ability: "Double shot", image: "tower_archer.png" },
  cannon: { damage: 30, range: 80, fireRate: 3000, cost: 100, persistentCost: 300, color: "black", ability: "Splash damage", image: "tower_cannon.png" },
  sniper: { damage: 50, range: 150, fireRate: 4000, cost: 150, persistentCost: 350, color: "green", ability: "Critical hit", image: "tower_sniper.png" },
  freeze: { damage: 5, range: 100, fireRate: 2000, cost: 120, persistentCost: 400, color: "lightblue", ability: "Slows enemies", image: "tower_freeze.png" },
  mortar: { damage: 40, range: 120, fireRate: 5000, cost: 200, persistentCost: 450, color: "darkgray", ability: "Large splash", image: "tower_mortar.png" },
  laser: { damage: 100, range: 150, fireRate: 10000, cost: 350, persistentCost: 500, color: "red", ability: "Continuous beam", image: "tower_laser.png" },
  tesla: { damage: 25, range: 120, fireRate: 3000, cost: 250, persistentCost: 550, color: "yellow", ability: "Chain lightning", image: "tower_tesla.png" },
  flamethrower: { damage: 20, range: 80, fireRate: 2000, cost: 180, persistentCost: 600, color: "orange", ability: "Burning damage", image: "tower_flame.png" },
  missile: { damage: 60, range: 130, fireRate: 4000, cost: 200, persistentCost: 650, color: "silver", ability: "High damage", image: "tower_missile.png" },
  poison: { damage: 15, range: 110, fireRate: 3000, cost: 250, persistentCost: 700, color: "limegreen", ability: "Poison splash", image: "tower_poison.png" },
  vortex: { damage: 0, range: 150, fireRate: 5000, cost: 300, persistentCost: 750, color: "purple", ability: "Pulls enemies", image: "tower_vortex.png" },
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
    this.image = new Image();
    this.image.src = type.image || `images/${type.color}_enemy.png`; // Fallback to color-based images
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
    this.image = new Image();
    this.image.src = towerStats[type].image || `images/${type}_tower.png`; // Fallback to type-based images
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

  window.gameState.enemies.forEach(enemy => enemy.move(dt));
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
    enemies: window.gameState.enemies,
    towers: window.gameState.towers,
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
  ctx.fillStyle = enemy.color;
  ctx.beginPath();
  ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
  ctx.fill();
  // Draw health bar
  const barWidth = enemy.radius * 2;
  const barHeight = 5;
  const healthRatio = enemy.health / enemy.maxHealth;
  ctx.fillStyle = 'red';
  ctx.fillRect(enemy.x - barWidth / 2, enemy.y - enemy.radius - 10, barWidth, barHeight);
  ctx.fillStyle = 'green';
  ctx.fillRect(enemy.x - barWidth / 2, enemy.y - enemy.radius - 10, barWidth * healthRatio, barHeight);
}

function drawTower(tower) {
  ctx.fillStyle = tower.color;
  ctx.beginPath();
  ctx.arc(tower.x, tower.y, tower.radius, 0, Math.PI * 2);
  ctx.fill();
  // Draw range circle
  ctx.beginPath();
  ctx.arc(tower.x, tower.y, tower.range, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.stroke();
  // Draw turret
  ctx.save();
  ctx.translate(tower.x, tower.y);
  ctx.rotate(tower.angle);
  ctx.fillStyle = 'black';
  ctx.fillRect(0, -5, 20, 10);
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
  ctx.fillStyle = themeBackgrounds[window.gameState.map];
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
      enemies: window.gameState.enemies,
      towers: window.gameState.towers,
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