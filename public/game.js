// Canvas Setup
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const originalWidth = 1200;
const originalHeight = 600;
let scaleX = 1;
let scaleY = 1;

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  scaleX = canvas.width / originalWidth;
  scaleY = canvas.height / originalHeight;
}

resizeCanvas();
window.addEventListener("resize", resizeCanvas);

// Game State
let gameState = {
  enemies: [],
  towers: [],
  projectiles: [],
  wave: 1,
  score: 0,
  money: 200,
  selectedTowerType: null,
  gameOver: false,
  playerHealth: 20,
  isPaused: false,
  gameSpeed: 1,
  selectedTower: null,
  isSpawning: false,
};

// Tower Stats
const towerStats = {
  basic: { cost: 50, damage: 20, range: 100, cooldown: 60, color: "gray", ability: "None", unlocked: true },
  sniper: { cost: 100, damage: 50, range: 200, cooldown: 120, color: "blue", ability: "High Damage", unlocked: false },
  splash: { cost: 150, damage: 10, range: 80, cooldown: 30, color: "orange", ability: "Area Damage", unlocked: false },
  slow: { cost: 75, damage: 5, range: 120, cooldown: 90, color: "cyan", ability: "Slows Enemies", unlocked: false },
  rapid: { cost: 125, damage: 15, range: 90, cooldown: 12, color: "purple", ability: "Rapid Fire", unlocked: false },
  bomb: { cost: 200, damage: 40, range: 150, cooldown: 90, color: "brown", ability: "Explosive Damage", unlocked: false },
};

// Load Unlocked Towers
function loadUnlockedTowers() {
  const unlocked = JSON.parse(localStorage.getItem("unlockedTowers") || "[]");
  towerStats.basic.unlocked = true;
  unlocked.forEach(type => {
    if (towerStats[type]) towerStats[type].unlocked = true;
  });
}

// Map Data with Difficulties
const maps = {
  map1: { name: "Beginner Path", path: [{ x: 0, y: 300 }, { x: 300, y: 300 }, { x: 600, y: 100 }, { x: 1200, y: 100 }], spawnPoint: { x: 0, y: 300 }, moneyReward: 50, difficulty: "easy" },
  map2: { name: "Zigzag Path", path: [{ x: 0, y: 150 }, { x: 400, y: 150 }, { x: 400, y: 450 }, { x: 800, y: 450 }, { x: 1200, y: 150 }], spawnPoint: { x: 0, y: 150 }, moneyReward: 75, difficulty: "medium" },
  map3: { name: "Snake Path", path: [{ x: 0, y: 300 }, { x: 200, y: 100 }, { x: 400, y: 300 }, { x: 600, y: 100 }, { x: 800, y: 300 }, { x: 1000, y: 100 }, { x: 1200, y: 300 }], spawnPoint: { x: 0, y: 300 }, moneyReward: 100, difficulty: "hard" },
  map4: { name: "Forest Trail", path: [{ x: 0, y: 200 }, { x: 300, y: 400 }, { x: 600, y: 200 }, { x: 900, y: 400 }, { x: 1200, y: 200 }], spawnPoint: { x: 0, y: 200 }, moneyReward: 60, difficulty: "easy" },
  map5: { name: "Mountain Pass", path: [{ x: 0, y: 300 }, { x: 200, y: 100 }, { x: 400, y: 400 }, { x: 800, y: 100 }, { x: 1000, y: 400 }, { x: 1200, y: 300 }], spawnPoint: { x: 0, y: 300 }, moneyReward: 80, difficulty: "medium" },
  map6: { name: "Desert Maze", path: [{ x: 0, y: 150 }, { x: 300, y: 300 }, { x: 500, y: 150 }, { x: 700, y: 300 }, { x: 900, y: 150 }, { x: 1200, y: 300 }], spawnPoint: { x: 0, y: 150 }, moneyReward: 120, difficulty: "hard" },
  map7: { name: "River Bend", path: [{ x: 0, y: 250 }, { x: 400, y: 100 }, { x: 800, y: 400 }, { x: 1200, y: 250 }], spawnPoint: { x: 0, y: 250 }, moneyReward: 55, difficulty: "easy" },
  map8: { name: "Canyon Run", path: [{ x: 0, y: 200 }, { x: 300, y: 400 }, { x: 600, y: 200 }, { x: 900, y: 400 }, { x: 1200, y: 200 }], spawnPoint: { x: 0, y: 200 }, moneyReward: 85, difficulty: "medium" },
  map9: { name: "Arctic Path", path: [{ x: 0, y: 300 }, { x: 200, y: 100 }, { x: 500, y: 400 }, { x: 800, y: 100 }, { x: 1000, y: 400 }, { x: 1200, y: 300 }], spawnPoint: { x: 0, y: 300 }, moneyReward: 130, difficulty: "hard" },
};

const selectedMap = localStorage.getItem("selectedMap") || "map1";
const selectedDifficulty = localStorage.getItem("selectedDifficulty") || "easy";
const path = maps[selectedMap].path;
const spawnPoint = maps[selectedMap].spawnPoint;

const { scaledPath, scaledSpawnPoint } = getScaledPathAndSpawnPoint();

function getScaledPathAndSpawnPoint() {
  const scaledPath = path.map(point => ({ x: point.x * scaleX, y: point.y * scaleY }));
  const scaledSpawnPoint = { x: spawnPoint.x * scaleX, y: spawnPoint.y * scaleY };
  return { scaledPath, scaledSpawnPoint };
}

// Enemy Types (adjusted for difficulty)
const enemyTypes = {
  easy: [
    { health: 100, speed: 1, radius: 10, color: "red" }, // Basic
  ],
  medium: [
    { health: 150, speed: 1.2, radius: 12, color: "blue" }, // Tank
    { health: 75, speed: 1.5, radius: 8, color: "green" }, // Fast
  ],
  hard: [
    { health: 200, speed: 1.5, radius: 15, color: "purple" }, // Strong Tank
    { health: 100, speed: 2, radius: 10, color: "yellow" }, // Very Fast
  ],
};

// Enemy Class
class Enemy {
  constructor(path, type, spawnPoint) {
    this.path = path;
    this.x = spawnPoint.x;
    this.y = spawnPoint.y;
    this.health = type.health;
    this.maxHealth = type.health;
    this.speed = type.speed;
    this.radius = type.radius;
    this.color = type.color;
    this.pathIndex = 1;
    this.slowed = false;
  }

  update(gameState) {
    if (this.pathIndex >= this.path.length) {
      gameState.playerHealth -= 1;
      gameState.enemies = gameState.enemies.filter(e => e !== this);
      checkGameEnd();
      return;
    }
    const target = this.path[this.pathIndex];
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const effectiveSpeed = this.slowed ? this.speed * 0.5 : this.speed;
    if (distance < effectiveSpeed) {
      this.x = target.x;
      this.y = target.y;
      this.pathIndex++;
    } else {
      this.x += (dx / distance) * effectiveSpeed * gameState.gameSpeed;
      this.y += (dy / distance) * effectiveSpeed * gameState.gameSpeed;
    }
  }

  draw(ctx, scaleX, scaleY) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * Math.min(scaleX, scaleY), 0, 2 * Math.PI);
    ctx.fillStyle = this.color;
    ctx.fill();
    const barWidth = 20 * Math.min(scaleX, scaleY);
    ctx.fillStyle = "red";
    ctx.fillRect(this.x - barWidth / 2, this.y - 15 * Math.min(scaleX, scaleY), barWidth, 2);
    ctx.fillStyle = "green";
    ctx.fillRect(this.x - barWidth / 2, this.y - 15 * Math.min(scaleX, scaleY), barWidth * (this.health / this.maxHealth), 2);
  }
}

// Tower Class
class Tower {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.damage = towerStats[type].damage;
    this.range = towerStats[type].range;
    this.cooldown = towerStats[type].cooldown;
    this.color = towerStats[type].color;
    this.ability = towerStats[type].ability;
    this.cooldownTimer = 0;
    this.level = 1;
    this.selected = false;
  }

  update(gameState) {
    if (this.cooldownTimer > 0) this.cooldownTimer--;
    if (this.cooldownTimer === 0) {
      for (let enemy of gameState.enemies) {
        const dx = enemy.x - this.x * scaleX;
        const dy = enemy.y - this.y * scaleY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance <= this.range * Math.min(scaleX, scaleY)) {
          if (this.ability === "Area Damage") {
            gameState.enemies.forEach(e => {
              const d = Math.sqrt((e.x - this.x * scaleX) ** 2 + (e.y - this.y * scaleY) ** 2);
              if (d <= this.range * Math.min(scaleX, scaleY)) {
                gameState.projectiles.push(new Projectile(this.x * scaleX, this.y * scaleY, e, this.damage, this.color));
              }
            });
          } else if (this.ability === "Slows Enemies") {
            enemy.slowed = true;
            setTimeout(() => (enemy.slowed = false), 2000);
            gameState.projectiles.push(new Projectile(this.x * scaleX, this.y * scaleY, enemy, this.damage, this.color));
          } else {
            gameState.projectiles.push(new Projectile(this.x * scaleX, this.y * scaleY, enemy, this.damage, this.color));
          }
          this.cooldownTimer = this.cooldown;
          break;
        }
      }
    }
  }

  draw(ctx, scaleX, scaleY) {
    ctx.fillStyle = this.color;
    const size = 40 * Math.min(scaleX, scaleY);
    ctx.fillRect(this.x * scaleX - size / 2, this.y * scaleY - size / 2, size, size);
    if (this.selected) {
      ctx.beginPath();
      ctx.arc(this.x * scaleX, this.y * scaleY, this.range * Math.min(scaleX, scaleY), 0, 2 * Math.PI);
      ctx.strokeStyle = "yellow";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  upgrade() {
    this.level++;
    this.damage += Math.floor(this.damage * 0.5);
    this.range += 20;
    this.cooldown = Math.max(this.cooldown - 10, 5);
  }
}

// Projectile Class
class Projectile {
  constructor(x, y, target, damage, color) {
    this.x = x;
    this.y = y;
    this.target = target;
    this.damage = damage;
    this.color = color;
    this.speed = 5;
  }

  update(gameState) {
    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < this.speed) {
      this.target.health -= this.damage;
      if (this.target.health <= 0) {
        gameState.score += 10;
        gameState.money += 5;
        gameState.enemies = gameState.enemies.filter(e => e !== this.target);
      }
      gameState.projectiles = gameState.projectiles.filter(p => p !== this);
    } else {
      this.x += (dx / distance) * this.speed * gameState.gameSpeed;
      this.y += (dy / distance) * this.speed * gameState.gameSpeed;
    }
  }

  draw(ctx) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, 5, 0, 2 * Math.PI);
    ctx.fillStyle = this.color;
    ctx.fill();
  }
}

// Game Loop
function gameLoop() {
  if (gameState.gameOver) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw Path
  ctx.beginPath();
  ctx.moveTo(scaledPath[0].x, scaledPath[0].y);
  for (let point of scaledPath) ctx.lineTo(point.x, point.y);
  ctx.strokeStyle = "black";
  ctx.lineWidth = 5;
  ctx.stroke();

  // Update and Draw Game Objects
  if (!gameState.isPaused) {
    gameState.enemies.forEach(enemy => enemy.update(gameState));
    gameState.towers.forEach(tower => tower.update(gameState));
    gameState.projectiles.forEach(projectile => projectile.update(gameState));
  }
  gameState.enemies.forEach(enemy => enemy.draw(ctx, scaleX, scaleY));
  gameState.towers.forEach(tower => tower.draw(ctx, scaleX, scaleY));
  gameState.projectiles.forEach(projectile => projectile.draw(ctx));

  if (gameState.selectedTowerType) drawTowerFootprint();

  if (gameState.enemies.length === 0 && !gameState.isSpawning && !gameState.isPaused && !gameState.gameOver) {
    spawnWave();
    gameState.wave++;
  }

  // Update Stats
  document.getElementById("score").textContent = `Score: ${gameState.score}`;
  document.getElementById("money").textContent = `Money: $${gameState.money}`;
  document.getElementById("health").textContent = `Health: ${gameState.playerHealth}`;
  document.getElementById("wave").textContent = `Wave: ${gameState.wave}`;
  document.getElementById("speed").textContent = `Speed: ${gameState.gameSpeed}x`;

  requestAnimationFrame(gameLoop);
}

// Spawn Wave with Difficulty Adjustment
function spawnWave() {
  gameState.isSpawning = true;
  let waveSize = gameState.wave * 5;
  let moneyReward = maps[selectedMap].moneyReward;
  let healthMultiplier = 1;
  let spawnInterval = 1000;

  // Adjust based on difficulty
  if (selectedDifficulty === "medium") {
    healthMultiplier = 1.5;
    waveSize *= 1.2;
    spawnInterval = 800;
  } else if (selectedDifficulty === "hard") {
    healthMultiplier = 2;
    waveSize *= 1.5;
    spawnInterval = 600;
  }

  gameState.money += moneyReward;
  let globalMoney = parseInt(localStorage.getItem("globalMoney") || "0");
  globalMoney += Math.floor(moneyReward / 2);
  localStorage.setItem("globalMoney", globalMoney);
  showNotification(`Wave ${gameState.wave} completed! +$${moneyReward} (Game), +$${Math.floor(moneyReward / 2)} (Global)`);

  for (let i = 0; i < waveSize; i++) {
    setTimeout(() => {
      if (!gameState.isPaused && !gameState.gameOver) {
        let type = enemyTypes[selectedDifficulty][Math.floor(Math.random() * enemyTypes[selectedDifficulty].length)];
        type = { ...type, health: type.health * healthMultiplier };
        gameState.enemies.push(new Enemy(scaledPath, type, scaledSpawnPoint));
        if (i === waveSize - 1) gameState.isSpawning = false;
      }
    }, (i * spawnInterval) / gameState.gameSpeed);
  }
}

// Sidebar
function initSidebar() {
  const sidebar = document.getElementById("sidebar");
  sidebar.innerHTML = "";
  for (const [type, stats] of Object.entries(towerStats)) {
    if (!stats.unlocked) continue;
    const div = document.createElement("div");
    div.className = "tower-option";
    div.setAttribute("data-type", type);
    div.setAttribute("data-cost", stats.cost);
    div.textContent = `${type.charAt(0).toUpperCase() + type.slice(1)} Tower ($${stats.cost})`;
    sidebar.appendChild(div);
  }
  sidebar.innerHTML += `
    <div id="pause-button">Pause</div>
    <div id="fast-forward-button">Fast Forward (1x)</div>
    <div id="home-button">Home</div>
  `;
}

document.addEventListener("DOMContentLoaded", () => {
  loadUnlockedTowers();
  initSidebar();
  const sidebar = document.getElementById("sidebar");
  sidebar.addEventListener("click", e => {
    const option = e.target.closest(".tower-option");
    if (option) {
      const type = option.getAttribute("data-type");
      const cost = parseInt(option.getAttribute("data-cost"));
      document.querySelectorAll(".tower-option").forEach(o => o.classList.remove("selected"));
      if (gameState.money >= cost) {
        gameState.selectedTowerType = type;
        option.classList.add("selected");
      } else {
        showNotification("Not enough money!");
      }
    }
    if (e.target.id === "pause-button") {
      gameState.isPaused = !gameState.isPaused;
      e.target.textContent = gameState.isPaused ? "Resume" : "Pause";
      e.target.classList.toggle("active", gameState.isPaused);
    }
    if (e.target.id === "fast-forward-button") {
      gameState.gameSpeed = gameState.gameSpeed === 1 ? 2 : 1;
      e.target.textContent = `Fast Forward (${gameState.gameSpeed}x)`;
      e.target.classList.toggle("active", gameState.gameSpeed === 2);
    }
    if (e.target.id === "home-button") {
      window.location.href = "index.html";
    }
  });
});

// Tower Placement and Selection
let mouseX = 0, mouseY = 0;
canvas.addEventListener("mousemove", e => {
  const rect = canvas.getBoundingClientRect();
  mouseX = e.clientX - rect.left;
  mouseY = e.clientY - rect.top;
});

function drawTowerFootprint() {
  const stats = towerStats[gameState.selectedTowerType];
  ctx.beginPath();
  ctx.arc(mouseX, mouseY, stats.range * Math.min(scaleX, scaleY), 0, 2 * Math.PI);
  ctx.strokeStyle = "rgba(0, 255, 0, 0.5)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "rgba(0, 255, 0, 0.2)";
  ctx.fillRect(
    mouseX - 20 * Math.min(scaleX, scaleY),
    mouseY - 20 * Math.min(scaleX, scaleY),
    40 * Math.min(scaleX, scaleY),
    40 * Math.min(scaleX, scaleY)
  );
}

function canPlaceTower(x, y) {
  const minDistance = 40;
  for (let tower of gameState.towers) {
    const dx = x - tower.x;
    const dy = y - tower.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < minDistance) return false;
  }
  return true;
}

canvas.addEventListener("click", e => {
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) / scaleX;
  const y = (e.clientY - rect.top) / scaleY;
  if (gameState.selectedTowerType) {
    const cost = towerStats[gameState.selectedTowerType].cost;
    if (gameState.money >= cost) {
      if (canPlaceTower(x, y)) {
        gameState.towers.push(new Tower(x, y, gameState.selectedTowerType));
        gameState.money -= cost;
        gameState.selectedTowerType = null;
        document.querySelectorAll(".tower-option").forEach(o => o.classList.remove("selected"));
        showNotification(`Tower placed!`);
      } else {
        showNotification("Cannot place tower here: too close to another tower!");
      }
    } else {
      showNotification("Not enough money!");
    }
  } else {
    let towerClicked = false;
    for (let tower of gameState.towers) {
      const dx = (e.clientX - rect.left) - tower.x * scaleX;
      const dy = (e.clientY - rect.top) - tower.y * scaleY;
      if (Math.sqrt(dx * dx + dy * dy) <= 20 * Math.min(scaleX, scaleY)) {
        if (gameState.selectedTower) gameState.selectedTower.selected = false;
        gameState.selectedTower = tower;
        tower.selected = true;
        showTowerInfoPanel(tower);
        towerClicked = true;
        break;
      }
    }
    if (!towerClicked && gameState.selectedTower) {
      gameState.selectedTower.selected = false;
      gameState.selectedTower = null;
      document.getElementById("tower-info-panel").style.display = "none";
    }
  }
});

// Tower Info Panel
function showTowerInfoPanel(tower) {
  const panel = document.getElementById("tower-info-panel");
  panel.style.display = "block";
  document.getElementById("tower-type").textContent = `Type: ${tower.type.charAt(0).toUpperCase() + tower.type.slice(1)}`;
  document.getElementById("tower-damage").textContent = `Damage: ${tower.damage}`;
  document.getElementById("tower-range").textContent = `Range: ${tower.range}`;
  document.getElementById("tower-level").textContent = `Level: ${tower.level}`;
  document.getElementById("tower-ability").textContent = `Ability: ${tower.ability}`;
  const upgradeCost = 100 * tower.level;
  document.getElementById("upgrade-tower-button").textContent = `Upgrade ($${upgradeCost})`;
}

document.getElementById("upgrade-tower-button").addEventListener("click", () => {
  if (gameState.selectedTower) {
    const cost = 100 * gameState.selectedTower.level;
    if (gameState.money >= cost) {
      gameState.money -= cost;
      gameState.selectedTower.upgrade();
      showTowerInfoPanel(gameState.selectedTower);
      showNotification(`Tower upgraded to level ${gameState.selectedTower.level}!`);
    } else {
      showNotification(`Not enough money! Need $${cost}.`);
    }
  }
});

// Utilities
function showNotification(message, duration = 3000) {
  const box = document.getElementById("notification-box");
  box.textContent = message;
  box.classList.add("show");
  setTimeout(() => box.classList.remove("show"), duration);
}

function checkGameEnd() {
  if (gameState.playerHealth <= 0 && !gameState.gameOver) {
    gameState.gameOver = true;
    const earnedGlobalMoney = Math.floor(gameState.score / 10);
    let globalMoney = parseInt(localStorage.getItem("globalMoney") || "0");
    globalMoney += earnedGlobalMoney;
    localStorage.setItem("globalMoney", globalMoney);
    document.getElementById("end-screen").style.display = "block";
    document.getElementById("end-message").textContent = `Game Over! Wave: ${gameState.wave}, Score: ${gameState.score}. Earned $${earnedGlobalMoney} global money.`;
  }
}

document.getElementById("restart-button").addEventListener("click", () => {
  window.location.reload();
});

// Start Game
document.addEventListener("DOMContentLoaded", () => {
  gameLoop();
});