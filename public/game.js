// Import Tower, Projectile, and towerStats
import { Tower, Projectile } from './tower.js';
import { towerStats } from './stats.js';

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

// Load Unlocked Towers
function loadUnlockedTowers() {
  const unlocked = JSON.parse(localStorage.getItem("unlockedTowers") || "[]");
  towerStats.basic.unlocked = true;
  unlocked.forEach(type => {
    if (towerStats[type]) towerStats[type].unlocked = true;
  });
}

// Map Data
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

let scaledPath, scaledSpawnPoint;
function updateScaledPathAndSpawnPoint() {
  scaledPath = path.map(point => ({ x: point.x * scaleX, y: point.y * scaleY }));
  scaledSpawnPoint = { x: spawnPoint.x * scaleX, y: spawnPoint.y * scaleY };
}
updateScaledPathAndSpawnPoint();

// Enemy Types
const enemyTypes = {
  easy: [{ health: 100, speed: 1, radius: 10, color: "red" }],
  medium: [
    { health: 150, speed: 1.2, radius: 12, color: "blue" },
    { health: 75, speed: 1.5, radius: 8, color: "green" },
  ],
  hard: [
    { health: 200, speed: 1.5, radius: 15, color: "purple" },
    { health: 100, speed: 2, radius: 10, color: "yellow" },
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

// Game Loop
function gameLoop() {
  if (gameState.gameOver) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  updateScaledPathAndSpawnPoint();

  ctx.beginPath();
  ctx.moveTo(scaledPath[0].x, scaledPath[0].y);
  for (let point of scaledPath) ctx.lineTo(point.x, point.y);
  ctx.strokeStyle = "black";
  ctx.lineWidth = 5;
  ctx.stroke();

  if (!gameState.isPaused) {
    gameState.enemies.forEach(enemy => enemy.update(gameState));
    gameState.towers.forEach(tower => tower.update(gameState, scaleX, scaleY)); // Pass scaleX and scaleY
    gameState.projectiles.forEach(projectile => projectile.update(gameState));
    gameState.projectiles = gameState.projectiles.filter(p => p.isActive);
  }

  gameState.enemies.forEach(enemy => enemy.draw(ctx, scaleX, scaleY));
  gameState.towers.forEach(tower => tower.draw(ctx, scaleX, scaleY));
  gameState.projectiles.forEach(projectile => projectile.draw(ctx, scaleX, scaleY));

  if (gameState.selectedTowerType) drawTowerFootprint();

  if (gameState.enemies.length === 0 && !gameState.isSpawning && !gameState.isPaused && !gameState.gameOver) {
    spawnWave();
    gameState.wave++;
  }

  document.getElementById("score").textContent = `Score: ${gameState.score}`;
  document.getElementById("money").textContent = `Money: $${gameState.money}`;
  document.getElementById("health").textContent = `Health: ${gameState.playerHealth}`;
  document.getElementById("wave").textContent = `Wave: ${gameState.wave}`;
  document.getElementById("speed").textContent = `Speed: ${gameState.gameSpeed}x`;

  requestAnimationFrame(gameLoop);
}

// Spawn Wave
function spawnWave() {
  gameState.isSpawning = true;
  let waveSize = gameState.wave * 5;
  let moneyReward = maps[selectedMap].moneyReward;
  let healthMultiplier = 1;
  let spawnInterval = 1000;

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
        console.log(`Selected tower type: ${type}`);
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
  gameLoop();
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
    if (distance < minDistance) {
      console.log(`Cannot place: too close to tower at (${tower.x}, ${tower.y})`);
      return false;
    }
  }
  return true;
}

canvas.addEventListener("click", e => {
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) / scaleX;
  const y = (e.clientY - rect.top) / scaleY;
  console.log(`Clicked at (${x}, ${y}), selectedTowerType: ${gameState.selectedTowerType}`);

  if (gameState.selectedTowerType) {
    const cost = towerStats[gameState.selectedTowerType].cost;
    if (gameState.money >= cost) {
      if (canPlaceTower(x, y)) {
        gameState.towers.push(new Tower(x, y, gameState.selectedTowerType));
        gameState.money -= cost;
        gameState.selectedTowerType = null;
        document.querySelectorAll(".tower-option").forEach(o => o.classList.remove("selected"));
        showNotification(`Tower placed at (${Math.round(x)}, ${Math.round(y)})!`);
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