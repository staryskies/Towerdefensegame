import { Tower, Projectile } from './tower.js';
import { towerStats } from './stats.js';

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const originalWidth = 1200;
const originalHeight = 600;
let scaleX = 1;
let scaleY = 1;
let textScale = 1;

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  scaleX = Math.min(canvas.width / originalWidth, 2);
  scaleY = Math.min(canvas.height / originalHeight, 2);
  textScale = Math.min(canvas.height / originalHeight, 1.5); // Changed to scaleY
  updateScaledPathAndSpawnPoint();
}

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
  gameWon: false,
};

async function loadUnlockedTowers() {
  const token = localStorage.getItem("token");
  if (!token) {
    showNotification("Not authenticated. Please log in.");
    window.location.href = "/";
    return;
  }
  try {
    const response = await fetch('/towers', {
      headers: { "Authorization": token }
    });
    const data = await response.json();
    if (response.ok) {
      towerStats.basic.unlocked = true;
      data.towers.forEach(type => {
        if (towerStats[type]) towerStats[type].unlocked = true;
      });
    } else {
      throw new Error(data.message);
    }
  } catch (err) {
    showNotification("Error loading towers.");
  }
}

async function fetchUserMoney() {
  const token = localStorage.getItem("token");
  if (!token) return;
  try {
    const response = await fetch('/user', {
      headers: { "Authorization": token }
    });
    const data = await response.json();
    if (response.ok) {
      gameState.money = data.money;
    } else {
      throw new Error(data.message);
    }
  } catch (err) {
    showNotification("Error fetching money.");
  }
}

async function updateUserMoney() {
  const token = localStorage.getItem("token");
  if (!token) return;
  try {
    await fetch('/update-money', {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": token
      },
      body: JSON.stringify({ money: gameState.money })
    });
  } catch (err) {
    showNotification("Error updating money.");
  }
}

const maps = {
  map1: { name: "Beginner Path", path: [{ x: 0, y: 300 }, { x: 100, y: 200 }, { x: 200, y: 400 }, { x: 300, y: 300 }, { x: 400, y: 100 }, { x: 500, y: 300 }, { x: 600, y: 200 }, { x: 700, y: 400 }, { x: 800, y: 300 }, { x: 900, y: 100 }, { x: 1000, y: 300 }, { x: 1100, y: 200 }, { x: 1200, y: 300 }], spawnPoint: { x: 0, y: 300 }, moneyReward: 50, difficulty: "easy", theme: "grassland" },
  map2: { name: "Zigzag Path", path: [{ x: 0, y: 150 }, { x: 400, y: 150 }, { x: 400, y: 450 }, { x: 800, y: 450 }, { x: 1200, y: 150 }], spawnPoint: { x: 0, y: 150 }, moneyReward: 75, difficulty: "medium", theme: "grassland" },
  map3: { name: "Snake Path", path: [{ x: 0, y: 300 }, { x: 200, y: 100 }, { x: 400, y: 300 }, { x: 600, y: 100 }, { x: 800, y: 300 }, { x: 1000, y: 100 }, { x: 1200, y: 300 }], spawnPoint: { x: 0, y: 300 }, moneyReward: 150, difficulty: "hard", theme: "grassland" },
  map4: { name: "Forest Trail", path: [{ x: 0, y: 200 }, { x: 100, y: 400 }, { x: 200, y: 150 }, { x: 300, y: 350 }, { x: 400, y: 250 }, { x: 500, y: 400 }, { x: 600, y: 200 }, { x: 700, y: 350 }, { x: 800, y: 150 }, { x: 900, y: 300 }, { x: 1000, y: 400 }, { x: 1100, y: 250 }, { x: 1200, y: 200 }], spawnPoint: { x: 0, y: 200 }, moneyReward: 60, difficulty: "easy", theme: "forest" },
  map5: { name: "Mountain Pass", path: [{ x: 0, y: 300 }, { x: 200, y: 100 }, { x: 400, y: 400 }, { x: 800, y: 100 }, { x: 1000, y: 400 }, { x: 1200, y: 300 }], spawnPoint: { x: 0, y: 300 }, moneyReward: 90, difficulty: "medium", theme: "mountain" },
  map6: { name: "Desert Maze", path: [{ x: 0, y: 150 }, { x: 300, y: 300 }, { x: 500, y: 150 }, { x: 700, y: 300 }, { x: 900, y: 150 }, { x: 1200, y: 300 }], spawnPoint: { x: 0, y: 150 }, moneyReward: 180, difficulty: "hard", theme: "desert" },
  map7: { name: "River Bend", path: [{ x: 0, y: 250 }, { x: 100, y: 100 }, { x: 200, y: 350 }, { x: 300, y: 150 }, { x: 400, y: 300 }, { x: 500, y: 200 }, { x: 600, y: 400 }, { x: 700, y: 250 }, { x: 800, y: 100 }, { x: 900, y: 350 }, { x: 1000, y: 200 }, { x: 1100, y: 300 }, { x: 1200, y: 250 }], spawnPoint: { x: 0, y: 250 }, moneyReward: 65, difficulty: "easy", theme: "river" },
  map8: { name: "Canyon Run", path: [{ x: 0, y: 200 }, { x: 300, y: 400 }, { x: 600, y: 200 }, { x: 900, y: 400 }, { x: 1200, y: 200 }], spawnPoint: { x: 0, y: 200 }, moneyReward: 100, difficulty: "medium", theme: "canyon" },
  map9: { name: "Arctic Path", path: [{ x: 0, y: 300 }, { x: 200, y: 100 }, { x: 500, y: 400 }, { x: 800, y: 100 }, { x: 1000, y: 400 }, { x: 1200, y: 300 }], spawnPoint: { x: 0, y: 300 }, moneyReward: 200, difficulty: "hard", theme: "arctic" },
};

const selectedMap = localStorage.getItem("selectedMap") || "map1";
const selectedDifficulty = localStorage.getItem("selectedDifficulty") || "easy";
const path = maps[selectedMap].path;
const spawnPoint = maps[selectedMap].spawnPoint;
const mapTheme = maps[selectedMap].theme;

let scaledPath, scaledSpawnPoint;
function updateScaledPathAndSpawnPoint() {
  scaledPath = path.map(point => ({ x: point.x * scaleX, y: point.y * scaleY }));
  scaledSpawnPoint = { x: spawnPoint.x * scaleX, y: spawnPoint.y * scaleY };
}

resizeCanvas();
window.addEventListener("resize", resizeCanvas);

const enemyThemes = {
  grassland: {
    easy: [{ health: 100, speed: 1, radius: 10, color: "red" }],
    medium: [{ health: 150, speed: 1.2, radius: 12, color: "blue" }, { health: 75, speed: 1.5, radius: 8, color: "green" }],
    hard: [{ health: 200, speed: 1.5, radius: 15, color: "purple" }, { health: 100, speed: 2, radius: 10, color: "yellow" }],
    boss: { easy: { health: 500, speed: 0.7, radius: 20, color: "darkred" }, medium: { health: 800, speed: 0.9, radius: 25, color: "darkblue" }, hard: { health: 1200, speed: 1.1, radius: 30, color: "darkviolet" } },
  },
  forest: {
    easy: [{ health: 110, speed: 0.9, radius: 10, color: "darkgreen" }],
    medium: [{ health: 160, speed: 1.1, radius: 12, color: "brown" }, { health: 80, speed: 1.4, radius: 8, color: "olive" }],
    hard: [{ health: 220, speed: 1.4, radius: 15, color: "forestgreen" }, { health: 110, speed: 1.9, radius: 10, color: "limegreen" }],
    boss: { easy: { health: 550, speed: 0.6, radius: 20, color: "darkgreen" }, medium: { health: 850, speed: 0.8, radius: 25, color: "saddlebrown" }, hard: { health: 1300, speed: 1.0, radius: 30, color: "darkolivegreen" } },
  },
  mountain: {
    easy: [{ health: 120, speed: 0.8, radius: 10, color: "gray" }],
    medium: [{ health: 170, speed: 1.0, radius: 12, color: "slategray" }, { health: 85, speed: 1.3, radius: 8, color: "lightgray" }],
    hard: [{ health: 230, speed: 1.3, radius: 15, color: "darkgray" }, { health: 115, speed: 1.8, radius: 10, color: "silver" }],
    boss: { easy: { health: 600, speed: 0.5, radius: 20, color: "dimgray" }, medium: { health: 900, speed: 0.7, radius: 25, color: "gray" }, hard: { health: 1400, speed: 0.9, radius: 30, color: "darkslategray" } },
  },
  desert: {
    easy: [{ health: 130, speed: 1.1, radius: 10, color: "sandybrown" }],
    medium: [{ health: 180, speed: 1.3, radius: 12, color: "tan" }, { health: 90, speed: 1.6, radius: 8, color: "khaki" }],
    hard: [{ health: 240, speed: 1.6, radius: 15, color: "darkorange" }, { health: 120, speed: 2.1, radius: 10, color: "gold" }],
    boss: { easy: { health: 650, speed: 0.8, radius: 20, color: "peru" }, medium: { health: 950, speed: 1.0, radius: 25, color: "sienna" }, hard: { health: 1500, speed: 1.2, radius: 30, color: "chocolate" } },
  },
  river: {
    easy: [{ health: 100, speed: 1.2, radius: 10, color: "aqua" }],
    medium: [{ health: 150, speed: 1.4, radius: 12, color: "teal" }, { health: 75, speed: 1.7, radius: 8, color: "lightblue" }],
    hard: [{ health: 200, speed: 1.7, radius: 15, color: "deepskyblue" }, { health: 100, speed: 2.2, radius: 10, color: "cyan" }],
    boss: { easy: { health: 500, speed: 0.9, radius: 20, color: "darkcyan" }, medium: { health: 800, speed: 1.1, radius: 25, color: "turquoise" }, hard: { health: 1200, speed: 1.3, radius: 30, color: "darkturquoise" } },
  },
  canyon: {
    easy: [{ health: 120, speed: 1.0, radius: 10, color: "sienna" }],
    medium: [{ health: 170, speed: 1.2, radius: 12, color: "peru" }, { health: 85, speed: 1.5, radius: 8, color: "burlywood" }],
    hard: [{ health: 230, speed: 1.5, radius: 15, color: "chocolate" }, { health: 115, speed: 2.0, radius: 10, color: "coral" }],
    boss: { easy: { health: 600, speed: 0.7, radius: 20, color: "saddlebrown" }, medium: { health: 900, speed: 0.9, radius: 25, color: "rosybrown" }, hard: { health: 1400, speed: 1.1, radius: 30, color: "brown" } },
  },
  arctic: {
    easy: [{ health: 140, speed: 0.9, radius: 10, color: "white" }],
    medium: [{ health: 190, speed: 1.1, radius: 12, color: "aliceblue" }, { health: 95, speed: 1.4, radius: 8, color: "snow" }],
    hard: [{ health: 250, speed: 1.4, radius: 15, color: "ghostwhite" }, { health: 125, speed: 1.9, radius: 10, color: "ivory" }],
    boss: { easy: { health: 700, speed: 0.6, radius: 20, color: "lightcyan" }, medium: { health: 1000, speed: 0.8, radius: 25, color: "azure" }, hard: { health: 1600, speed: 1.0, radius: 30, color: "lightblue" } },
  },
};

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
    this.slowTimer = 0;
    this.burnTimer = 0;
    this.burnDamage = 0;
    this.poisonTimer = 0;
    this.poisonDamage = 0;
    this.isStrongest = false;
  }

  update(gameState) {
    if (this.pathIndex >= this.path.length) {
      gameState.playerHealth -= this.radius / 10;
      gameState.enemies = gameState.enemies.filter(e => e !== this);
      checkGameEnd();
      return;
    }

    if (this.slowed && this.slowTimer > 0) {
      this.slowTimer -= 1000 / 60 * gameState.gameSpeed;
      if (this.slowTimer <= 0) this.slowed = false;
    }

    if (this.burnTimer > 0) {
      this.health -= this.burnDamage * gameState.gameSpeed / 60;
      this.burnTimer -= 1000 / 60 * gameState.gameSpeed;
      if (this.health <= 0) {
        gameState.score += 10;
        gameState.money += 5;
        updateUserMoney();
        gameState.enemies = gameState.enemies.filter(e => e !== this);
        return;
      }
    }

    if (this.poisonTimer > 0) {
      this.health -= this.poisonDamage * gameState.gameSpeed / 60;
      this.poisonTimer -= 1000 / 60 * gameState.gameSpeed;
      if (this.health <= 0) {
        gameState.score += 10;
        gameState.money += 5;
        updateUserMoney();
        gameState.enemies = gameState.enemies.filter(e => e !== this);
        return;
      }
    }

    const target = this.path[this.pathIndex];
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const effectiveSpeed = (this.slowed ? this.speed * 0.5 : this.speed) * Math.min(scaleX, scaleY);
    if (distance < effectiveSpeed) {
      this.x = target.x;
      this.y = target.y;
      this.pathIndex++;
    } else {
      this.x += (dx / distance) * effectiveSpeed * gameState.gameSpeed;
      this.y += (dy / distance) * effectiveSpeed * gameState.gameSpeed;
    }
  }

  draw(ctx) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * Math.min(scaleX, scaleY), 0, 2 * Math.PI);
    ctx.fillStyle = this.color;
    ctx.fill();

    const barWidth = 20 * Math.min(scaleX, scaleY);
    ctx.fillStyle = "red";
    ctx.fillRect(this.x - barWidth / 2, this.y - 15 * Math.min(scaleX, scaleY), barWidth, 2 * Math.min(scaleX, scaleY));
    ctx.fillStyle = "green";
    ctx.fillRect(this.x - barWidth / 2, this.y - 15 * Math.min(scaleX, scaleY), barWidth * (this.health / this.maxHealth), 2 * Math.min(scaleX, scaleY));

    const scaledRadius = this.radius * Math.min(scaleX, scaleY);
    if (this.slowed && this.slowTimer > 0) {
      ctx.beginPath();
      ctx.arc(this.x, this.y, scaledRadius + 2, 0, 2 * Math.PI);
      ctx.strokeStyle = "blue";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    if (this.burnTimer > 0) {
      ctx.beginPath();
      ctx.arc(this.x, this.y, scaledRadius + 1, 0, 2 * Math.PI);
      ctx.strokeStyle = `rgba(255, 0, 0, ${Math.sin(Date.now() * 0.01) * 0.5 + 0.5})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    if (this.poisonTimer > 0) {
      ctx.save();
      ctx.globalAlpha = 0.5;
      for (let i = 0; i < 3; i++) {
        const offsetX = (Math.random() - 0.5) * scaledRadius * 2;
        const offsetY = (Math.random() - 0.5) * scaledRadius * 2;
        ctx.beginPath();
        ctx.arc(this.x + offsetX, this.y + offsetY, scaledRadius * 0.3, 0, 2 * Math.PI);
        ctx.fillStyle = "lime";
        ctx.fill();
      }
      ctx.restore();
    }
  }
}

function gameLoop() {
  if (gameState.gameOver || gameState.gameWon) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  updateScaledPathAndSpawnPoint();

  ctx.beginPath();
  ctx.moveTo(scaledPath[0].x, scaledPath[0].y);
  for (let point of scaledPath) ctx.lineTo(point.x, point.y);
  ctx.strokeStyle = mapTheme === "arctic" ? "lightblue" : mapTheme === "desert" ? "sandybrown" : mapTheme === "forest" ? "darkgreen" : mapTheme === "mountain" ? "gray" : mapTheme === "river" ? "aqua" : mapTheme === "canyon" ? "sienna" : "black";
  ctx.lineWidth = 5 * Math.min(scaleX, scaleY);
  ctx.stroke();

  if (!gameState.isPaused) {
    gameState.enemies.forEach(enemy => enemy.update(gameState));
    gameState.towers.forEach(tower => tower.update(gameState, scaleX, scaleY));
    gameState.projectiles.forEach(projectile => projectile.update(gameState));
    gameState.projectiles = gameState.projectiles.filter(p => p.isActive && p.target && p.target.health > 0);
  }

  gameState.enemies.forEach(enemy => enemy.draw(ctx));
  gameState.towers.forEach(tower => tower.draw(ctx, scaleX, scaleY));
  gameState.projectiles.forEach(projectile => projectile.draw(ctx));

  if (gameState.selectedTowerType) drawTowerFootprint();

  if (selectedMap === "map9" && gameState.wave > 60 && gameState.enemies.length === 0 && !gameState.isSpawning) {
    gameState.gameWon = true;
    const earnedMoney = Math.floor(gameState.score / 5);
    gameState.money += earnedMoney;
    updateUserMoney();
    document.getElementById("end-screen").style.display = "block";
    document.getElementById("end-message").textContent = `Victory! You survived all 60 waves on Arctic Path! Score: ${gameState.score}. Earned $${earnedMoney}.`;
    document.getElementById("end-message").style.fontSize = `${20 * textScale}px`;
    document.getElementById("restart-button").style.fontSize = `${16 * textScale}px`;
    document.getElementById("main-menu-button").style.fontSize = `${16 * textScale}px`;
    return;
  }

  if (gameState.enemies.length === 0 && !gameState.isSpawning && !gameState.isPaused && !gameState.gameOver && !gameState.gameWon) {
    spawnWave();
    gameState.wave++;
  }

  document.getElementById("score").style.fontSize = `${16 * textScale}px`;
  document.getElementById("money").style.fontSize = `${16 * textScale}px`;
  document.getElementById("health").style.fontSize = `${16 * textScale}px`;
  document.getElementById("wave").style.fontSize = `${16 * textScale}px`;
  document.getElementById("speed").style.fontSize = `${16 * textScale}px`;
  document.getElementById("score").textContent = `Score: ${gameState.score}`;
  document.getElementById("money").textContent = `Money: $${gameState.money}`;
  document.getElementById("health").textContent = `Health: ${gameState.playerHealth}`;
  document.getElementById("wave").textContent = `Wave: ${gameState.wave}`;
  document.getElementById("speed").textContent = `Speed: ${gameState.gameSpeed}x`;

  requestAnimationFrame(gameLoop);
}

function spawnWave() {
  gameState.isSpawning = true;
  let baseWaveSize = selectedDifficulty === "easy" ? 5 : selectedDifficulty === "medium" ? 8 : 10;
  baseWaveSize *= gameState.wave;
  let waveSize = Math.round(baseWaveSize);
  let moneyReward = maps[selectedMap].moneyReward;
  let healthMultiplier = selectedDifficulty === "easy" ? 1 : selectedDifficulty === "medium" ? 1.5 : 2;
  let spawnInterval = selectedDifficulty === "easy" ? 1000 : selectedDifficulty === "medium" ? 800 : 600;

  if (selectedMap === "map9") {
    waveSize = Math.min(waveSize, 20);
    if (gameState.wave % 10 === 0) {
      const bossType = enemyThemes.arctic.boss.hard;
      gameState.enemies.push(new Enemy(scaledPath, { ...bossType, health: bossType.health * (1 + gameState.wave / 10) }, scaledSpawnPoint));
      showNotification(`Boss Wave ${gameState.wave} on Arctic Path!`);
      window.dispatchEvent(new CustomEvent("bossActive", { detail: { wave: gameState.wave } }));
    }
  } else {
    const bossInterval = selectedDifficulty === "easy" ? 20 : selectedDifficulty === "medium" ? 10 : 5;
    if (gameState.wave % bossInterval === 0 && gameState.wave > 1) {
      const bossType = enemyThemes[mapTheme].boss[selectedDifficulty];
      gameState.enemies.push(new Enemy(scaledPath, { ...bossType, health: bossType.health * (1 + gameState.wave / 10) }, scaledSpawnPoint));
      showNotification(`Boss Wave ${gameState.wave} on ${maps[selectedMap].name}!`);
      window.dispatchEvent(new CustomEvent("bossActive", { detail: { wave: gameState.wave } }));
    }
  }

  if (selectedMap !== "map9") waveSize = Math.min(waveSize, 15);

  gameState.money += moneyReward;
  updateUserMoney();
  showNotification(`Wave ${gameState.wave} completed! +$${moneyReward}`);

  let strongestEnemy = null;
  let maxHealth = 0;
  gameState.enemies.forEach(enemy => {
    if (enemy.health > maxHealth) {
      maxHealth = enemy.health;
      strongestEnemy = enemy;
    }
  });
  if (strongestEnemy) {
    gameState.enemies.forEach(enemy => enemy.isStrongest = false);
    strongestEnemy.isStrongest = true;
  }

  for (let i = 0; i < waveSize; i++) {
    setTimeout(() => {
      if (!gameState.isPaused && !gameState.gameOver && !gameState.gameWon) {
        let type = enemyThemes[mapTheme][selectedDifficulty][Math.floor(Math.random() * enemyThemes[mapTheme][selectedDifficulty].length)];
        type = { ...type, health: type.health * healthMultiplier * (1 + gameState.wave / 20) };
        gameState.enemies.push(new Enemy(scaledPath, type, scaledSpawnPoint));
        if (i === waveSize - 1) gameState.isSpawning = false;
      }
    }, (i * spawnInterval) / gameState.gameSpeed);
  }
}

function initSidebar() {
  const sidebar = document.getElementById("sidebar");
  sidebar.innerHTML = "";
  for (const [type, stats] of Object.entries(towerStats)) {
    if (!stats.unlocked) continue;
    const div = document.createElement("div");
    div.className = "tower-option";
    div.setAttribute("data-type", type);
    div.setAttribute("data-cost", stats.unlockCost);
    div.textContent = `${type.charAt(0).toUpperCase() + type.slice(1)} Tower ($${stats.unlockCost})`;
    div.style.fontSize = `${16 * textScale}px`;
    sidebar.appendChild(div);
  }
  sidebar.innerHTML += `
    <div id="pause-button" style="font-size: ${16 * textScale}px">Pause</div>
    <div id="fast-forward-button" style="font-size: ${16 * textScale}px">Fast Forward (1x)</div>
    <div id="home-button" style="font-size: ${16 * textScale}px">Home</div>
  `;
}

document.addEventListener("DOMContentLoaded", async () => {
  if (!localStorage.getItem("token")) {
    showNotification("Please log in to play.");
    window.location.href = "/";
    return;
  }

  await loadUnlockedTowers();
  await fetchUserMoney();
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
      updateUserMoney();
      window.location.href = "/";
    }
  });

  document.getElementById("upgrade-tower-button").addEventListener("click", () => {
    if (gameState.selectedTower) {
      const upgradeCost = 100 * gameState.selectedTower.level;
      if (gameState.money >= upgradeCost) {
        gameState.money -= upgradeCost;
        gameState.selectedTower.upgrade();
        updateUserMoney();
        showTowerInfoPanel(gameState.selectedTower);
        showNotification(`Tower upgraded to level ${gameState.selectedTower.level}!`);
      } else {
        showNotification("Not enough money to upgrade!");
      }
    }
  });

  document.getElementById("restart-button").addEventListener("click", () => {
    updateUserMoney();
    window.location.href = "/";
  });

  document.getElementById("main-menu-button").addEventListener("click", () => {
    updateUserMoney();
    window.location.href = "/";
  });

  if (document.getElementById("map-selection").style.display === "none") {
    gameLoop();
  }
});

let mouseX = 0, mouseY = 0;
canvas.addEventListener("mousemove", e => {
  const rect = canvas.getBoundingClientRect();
  mouseX = e.clientX - rect.left;
  mouseY = e.clientY - rect.top;
});

function drawTowerFootprint() {
  if (!gameState.selectedTowerType) return;
  const stats = towerStats[gameState.selectedTowerType];
  ctx.beginPath();
  ctx.arc(mouseX, mouseY, stats.range * Math.min(scaleX, scaleY), 0, 2 * Math.PI);
  ctx.strokeStyle = "rgba(0, 255, 0, 0.5)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "rgba(0, 255, 0, 0.2)";
  ctx.fillRect(mouseX - 20 * Math.min(scaleX, scaleY), mouseY - 20 * Math.min(scaleX, scaleY), 40 * Math.min(scaleX, scaleY), 40 * Math.min(scaleX, scaleY));
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
  const canvasX = e.clientX - rect.left;
  const canvasY = e.clientY - rect.top;
  const x = canvasX / scaleX;
  const y = canvasY / scaleY;

  if (gameState.selectedTowerType) {
    const cost = towerStats[gameState.selectedTowerType].unlockCost;
    if (gameState.money >= cost) {
      if (canPlaceTower(x, y)) {
        gameState.towers.push(new Tower(x, y, gameState.selectedTowerType));
        gameState.money -= cost;
        updateUserMoney();
        gameState.selectedTowerType = null;
        document.querySelectorAll(".tower-option").forEach(o => o.classList.remove("selected"));
        showNotification(`Tower placed at (gameX=${Math.round(x)}, gameY=${Math.round(y)})!`);
      } else {
        showNotification("Cannot place tower here: too close to another tower!");
      }
    } else {
      showNotification("Not enough money!");
    }
  } else {
    let towerClicked = false;
    for (let tower of gameState.towers) {
      const dx = canvasX - tower.x * scaleX;
      const dy = canvasY - tower.y * scaleY;
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

function showTowerInfoPanel(tower) {
  const panel = document.getElementById("tower-info-panel");
  panel.style.display = "block";
  panel.style.fontSize = `${16 * textScale}px`;
  document.getElementById("tower-type").textContent = `Type: ${tower.type.charAt(0).toUpperCase() + tower.type.slice(1)}`;
  document.getElementById("tower-damage").textContent = `Damage: ${tower.damage}`;
  document.getElementById("tower-range").textContent = `Range: ${tower.range}`;
  document.getElementById("tower-level").textContent = `Level: ${tower.level}`;
  document.getElementById("tower-ability").textContent = `Ability: ${tower.ability}`;
  const upgradeCost = 100 * tower.level;
  document.getElementById("upgrade-tower-button").textContent = `Upgrade ($${upgradeCost})`;
  document.getElementById("upgrade-tower-button").style.fontSize = `${16 * textScale}px`;
}

function showNotification(message, duration = 3000) {
  const box = document.getElementById("notification-box");
  box.textContent = message;
  box.style.fontSize = `${16 * textScale}px`;
  box.classList.add("show");
  setTimeout(() => box.classList.remove("show"), duration);
}

function checkGameEnd() {
  if (gameState.playerHealth <= 0 && !gameState.gameOver) {
    gameState.gameOver = true;
    const earnedMoney = Math.floor(gameState.score / 10);
    gameState.money += earnedMoney;
    updateUserMoney();
    document.getElementById("end-screen").style.display = "block";
    document.getElementById("end-message").textContent = `Game Over! Wave: ${gameState.wave}, Score: ${gameState.score}. Earned $${earnedMoney}.`;
    document.getElementById("end-message").style.fontSize = `${20 * textScale}px`;
    document.getElementById("restart-button").style.fontSize = `${16 * textScale}px`;
    document.getElementById("main-menu-button").style.fontSize = `${16 * textScale}px`;
  }
}