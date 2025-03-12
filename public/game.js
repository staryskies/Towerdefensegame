// Ensure variables are declared only once at the top
const selectedMap = localStorage.getItem("selectedMap") || "map1";
const selectedDifficulty = localStorage.getItem("selectedDifficulty") || "easy";

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

const path = maps[selectedMap].path;
const spawnPoint = maps[selectedMap].spawnPoint;
const mapTheme = maps[selectedMap].theme;

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
  textScale = Math.min(canvas.height / originalHeight, 1.5);
  updateScaledPathAndSpawnPoint();
}

let scaledPath, scaledSpawnPoint;
function updateScaledPathAndSpawnPoint() {
  scaledPath = path.map(point => ({ x: point.x * scaleX, y: point.y * scaleY }));
  scaledSpawnPoint = { x: spawnPoint.x * scaleX, y: spawnPoint.y * scaleY };
}

resizeCanvas();
window.addEventListener("resize", resizeCanvas);

let gameState = {
  enemies: [],
  towers: [],
  projectiles: [],
  wave: 1,
  score: 0,
  gameMoney: selectedDifficulty === "easy" ? 300 : selectedDifficulty === "medium" ? 300 : 400, // Easy mode now starts with 300
  persistentMoney: 0,
  selectedTowerType: null,
  gameOver: false,
  playerHealth: 20,
  isPaused: false,
  gameSpeed: 1,
  selectedTower: null,
  isSpawning: false,
  gameWon: false,
};

// Proxy for debugging selectedTowerType
gameState = new Proxy(gameState, {
  set(target, prop, value) {
    if (prop === "selectedTowerType") {
      console.log(`selectedTowerType changed from ${target[prop]} to ${value}`);
    }
    target[prop] = value;
    return true;
  }
});

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
    boss: { easy: { health: 650, speed: 0.8, radius: 20, color: "sienna" }, medium: { health: 950, speed: 1.0, radius: 25, color: "peru" }, hard: { health: 1500, speed: 1.2, radius: 30, color: "chocolate" } },
  },
  river: {
    easy: [{ health: 115, speed: 1.0, radius: 10, color: "teal" }],
    medium: [{ health: 165, speed: 1.2, radius: 12, color: "cyan" }, { health: 85, speed: 1.5, radius: 8, color: "lightblue" }],
    hard: [{ health: 225, speed: 1.5, radius: 15, color: "darkcyan" }, { health: 115, speed: 2.0, radius: 10, color: "skyblue" }],
    boss: { easy: { health: 575, speed: 0.7, radius: 20, color: "navy" }, medium: { health: 875, speed: 0.9, radius: 25, color: "deepskyblue" }, hard: { health: 1350, speed: 1.1, radius: 30, color: "dodgerblue" } },
  },
  canyon: {
    easy: [{ health: 125, speed: 0.9, radius: 10, color: "coral" }],
    medium: [{ health: 175, speed: 1.1, radius: 12, color: "tomato" }, { health: 90, speed: 1.4, radius: 8, color: "salmon" }],
    hard: [{ health: 235, speed: 1.4, radius: 15, color: "crimson" }, { health: 120, speed: 1.9, radius: 10, color: "orangered" }],
    boss: { easy: { health: 625, speed: 0.6, radius: 20, color: "darkred" }, medium: { health: 925, speed: 0.8, radius: 25, color: "firebrick" }, hard: { health: 1450, speed: 1.0, radius: 30, color: "maroon" } },
  },
  arctic: {
    easy: [{ health: 135, speed: 0.8, radius: 10, color: "aliceblue" }],
    medium: [{ health: 185, speed: 1.0, radius: 12, color: "lightcyan" }, { health: 95, speed: 1.3, radius: 8, color: "powderblue" }],
    hard: [{ health: 245, speed: 1.3, radius: 15, color: "deepskyblue" }, { health: 125, speed: 1.8, radius: 10, color: "lightskyblue" }],
    boss: { easy: { health: 675, speed: 0.5, radius: 20, color: "steelblue" }, medium: { health: 975, speed: 0.7, radius: 25, color: "slateblue" }, hard: { health: 1600, speed: 0.9, radius: 30, color: "darkslateblue" } },
  },
};

const enemyTypes = enemyThemes[mapTheme][selectedDifficulty];
const bossType = enemyThemes[mapTheme].boss[selectedDifficulty];

const themeBackgrounds = {
  grassland: "#B2E0B2",
  forest: "#A8D5A8",
  mountain: "#D3D3D3",
  desert: "#F5E8C7",
  river: "#B0E0E6",
  canyon: "#FFDAB9",
  arctic: "#F0FFFF",
};

function showNotification(message, duration = 3000) {
  const box = document.getElementById("notification-box");
  box.textContent = message;
  box.classList.add("show");
  setTimeout(() => box.classList.remove("show"), duration);
}

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
    if (!response.ok) throw new Error((await response.json()).message || "Server error");
    const data = await response.json();
    console.log("Unlocked towers from server:", data.towers);
    towerStats.basic.unlocked = true; // Basic tower is always unlocked
    data.towers.forEach(type => {
      if (towerStats[type]) {
        towerStats[type].unlocked = true;
      } else {
        console.warn(`Unknown tower type from server: ${type}`);
      }
    });
  } catch (err) {
    console.error("Error loading towers:", err);
    showNotification("Error loading towers: " + err.message);
  }
}

async function fetchUserMoney() {
  const token = localStorage.getItem("token");
  if (!token) {
    showNotification("Not authenticated. Please log in.");
    window.location.href = "/";
    return;
  }
  try {
    const response = await fetch('/user', {
      headers: { "Authorization": token }
    });
    if (!response.ok) throw new Error((await response.json()).message || "Server error");
    const data = await response.json();
    gameState.persistentMoney = data.money || 0;
    gameState.gameMoney = selectedDifficulty === "easy" ? 300 : selectedDifficulty === "medium" ? 300 : 400; // Easy mode now starts with 300
    console.log("Fetched persistent money:", gameState.persistentMoney);
  } catch (err) {
    console.error("Error fetching money:", err);
    showNotification("Error fetching money: " + err.message);
    if (err.message === "Invalid token") window.location.href = "/";
  }
}

async function updateUserMoney() {
  const token = localStorage.getItem("token");
  if (!token) {
    showNotification("Not authenticated. Progress not saved.", 5000);
    return false;
  }
  try {
    const response = await fetch('/update-money', {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": token
      },
      body: JSON.stringify({ money: gameState.persistentMoney })
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to update money");
    }
    console.log("Persistent money updated:", gameState.persistentMoney);
    return true;
  } catch (err) {
    console.error("Error updating money:", err);
    showNotification("Error saving progress: " + err.message, 5000);
    return false;
  }
}

async function unlockTower(type) {
  const token = localStorage.getItem("token");
  if (!token) {
    showNotification("Not authenticated.");
    return;
  }
  const cost = towerStats[type].persistentCost;
  if (gameState.persistentMoney < cost) {
    showNotification("Not enough persistent money!");
    return;
  }
  try {
    const response = await fetch('/unlock-tower', {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": token
      },
      body: JSON.stringify({ tower: type })
    });
    if (!response.ok) throw new Error((await response.json()).message);
    gameState.persistentMoney -= cost;
    towerStats[type].unlocked = true;
    await updateUserMoney();
    showNotification(`${type} unlocked!`);
    initSidebar();
  } catch (err) {
    console.error("Error unlocking tower:", err);
    showNotification("Error unlocking tower: " + err.message);
  }
}

class Enemy {
  constructor(type, wave) {
    this.x = scaledSpawnPoint.x;
    this.y = scaledSpawnPoint.y;
    const healthMultiplier = selectedDifficulty === "easy" ? 0.5 : selectedDifficulty === "medium" ? 1 : 1.25; // Easy mode health reduced to 50%
    this.health = Math.floor(type.health * healthMultiplier * (1 + ((wave - 1) * 14) / 59));
    this.maxHealth = this.health;
    this.speed = type.speed * scaleX;
    this.radius = type.radius * textScale;
    this.color = type.color;
    this.pathIndex = 1;
    this.isBoss = false;
  }

  move() {
    if (this.pathIndex >= scaledPath.length) {
      gameState.playerHealth -= this.isBoss 
        ? (selectedDifficulty === "easy" ? 2.5 : selectedDifficulty === "medium" ? 5 : 7.5) 
        : (selectedDifficulty === "easy" ? 0.5 : selectedDifficulty === "medium" ? 1 : 1.5);
      gameState.enemies = gameState.enemies.filter(e => e !== this);
      return;
    }
    const target = scaledPath[this.pathIndex];
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < this.speed * gameState.gameSpeed) {
      this.x = target.x;
      this.y = target.y;
      this.pathIndex++;
    } else {
      this.x += (dx / distance) * this.speed * gameState.gameSpeed;
      this.y += (dy / distance) * this.speed * gameState.gameSpeed;
    }
  }

  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.closePath();

    ctx.fillStyle = "black";
    ctx.font = `${12 * textScale}px Arial`;
    ctx.textAlign = "center";
    ctx.fillText(`${Math.floor(this.health)}/${this.maxHealth}`, this.x, this.y - this.radius - 5 * textScale);
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
    this.radius = type === "missile" ? 8 * textScale : 5 * textScale;
    this.color = towerStats[type].color || "black";
  }

  move() {
    if (!this.target || !gameState.enemies.includes(this.target)) {
      gameState.projectiles = gameState.projectiles.filter(p => p !== this);
      return;
    }
    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < this.speed) {
      this.hit();
    } else {
      this.x += (dx / distance) * this.speed;
      this.y += (dy / distance) * this.speed;
    }
  }

  hit() {
    if (this.target) {
      this.target.health -= this.damage;
      if (this.target.health <= 0) {
        gameState.score += this.target.isBoss ? 50 : 10;
        gameState.gameMoney += this.target.isBoss ? 100 : 20;
        gameState.enemies = gameState.enemies.filter(e => e !== this.target);
      }
      switch (this.type) {
        case "cannon":
          gameState.enemies.forEach(enemy => {
            if (enemy !== this.target && Math.hypot(enemy.x - this.x, enemy.y - this.y) < 50 * scaleX) {
              enemy.health -= this.damage * 0.5;
              if (enemy.health <= 0) {
                gameState.score += enemy.isBoss ? 50 : 10;
                gameState.gameMoney += enemy.isBoss ? 100 : 20;
                gameState.enemies = gameState.enemies.filter(e => e !== enemy);
              }
            }
          });
          break;
        case "sniper":
          if (Math.random() < 0.2) this.target.health -= this.damage;
          break;
        case "freeze":
          this.target.speed *= 0.5;
          this.target.color = "lightblue";
          setTimeout(() => { if (this.target) { this.target.speed /= 0.5; this.target.color = enemyThemes[mapTheme][selectedDifficulty][0].color; } }, 2000);
          break;
        case "mortar":
          gameState.enemies.forEach(enemy => {
            if (Math.hypot(enemy.x - this.x, enemy.y - this.y) < 75 * scaleX) {
              enemy.health -= this.damage * 0.75;
              if (enemy.health <= 0) {
                gameState.score += enemy.isBoss ? 50 : 10;
                gameState.gameMoney += enemy.isBoss ? 100 : 20;
                gameState.enemies = gameState.enemies.filter(e => e !== enemy);
              }
            }
          });
          break;
        case "tesla":
          let chainTargets = gameState.enemies.filter(e => e !== this.target && Math.hypot(e.x - this.target.x, e.y - this.target.y) < 100 * scaleX).slice(0, 2);
          chainTargets.forEach(enemy => {
            enemy.health -= this.damage * 0.5;
            if (enemy.health <= 0) {
              gameState.score += enemy.isBoss ? 50 : 10;
              gameState.gameMoney += enemy.isBoss ? 100 : 20;
              gameState.enemies = gameState.enemies.filter(e => e !== enemy);
            }
          });
          break;
        case "flamethrower":
          let burnInterval = setInterval(() => {
            if (this.target && this.target.health > 0) {
              this.target.health -= 10;
              this.target.color = "orange";
              if (this.target.health <= 0) {
                gameState.score += this.target.isBoss ? 50 : 10;
                gameState.gameMoney += this.target.isBoss ? 100 : 20;
                gameState.enemies = gameState.enemies.filter(e => e !== this.target);
              }
            } else {
              clearInterval(burnInterval);
            }
          }, 1000);
          setTimeout(() => clearInterval(burnInterval), 3000);
          break;
        case "poison":
          gameState.enemies.forEach(enemy => {
            if (Math.hypot(enemy.x - this.x, enemy.y - this.y) < 160 * scaleX) {
              let poisonInterval = setInterval(() => {
                if (enemy.health > 0) {
                  enemy.health -= 5;
                  enemy.color = "limegreen";
                  if (enemy.health <= 0) {
                    gameState.score += enemy.isBoss ? 50 : 10;
                    gameState.gameMoney += enemy.isBoss ? 100 : 20;
                    gameState.enemies = gameState.enemies.filter(e => e !== enemy);
                  }
                } else {
                  clearInterval(poisonInterval);
                }
              }, 1000);
              setTimeout(() => clearInterval(poisonInterval), 4000);
            }
          });
          break;
      }
      gameState.projectiles = gameState.projectiles.filter(p => p !== this);
    }
  }

  draw() {
    ctx.beginPath();
    switch (this.type) {
      case "archer":
        ctx.moveTo(this.x, this.y - 5 * textScale);
        ctx.lineTo(this.x - 5 * textScale, this.y + 5 * textScale);
        ctx.lineTo(this.x + 5 * textScale, this.y + 5 * textScale);
        break;
      case "cannon":
        ctx.arc(this.x, this.y, 8 * textScale, 0, Math.PI * 2);
        break;
      case "freeze":
        ctx.arc(this.x, this.y, 5 * textScale, 0, Math.PI * 2);
        ctx.fillStyle = "lightblue";
        break;
      case "tesla":
        ctx.moveTo(this.x - 5 * textScale, this.y);
        ctx.lineTo(this.x + 5 * textScale, this.y);
        break;
      case "flamethrower":
        ctx.arc(this.x, this.y, 5 * textScale, 0, Math.PI * 2);
        ctx.fillStyle = "orange";
        break;
      case "poison":
        ctx.arc(this.x, this.y, 5 * textScale, 0, Math.PI * 2);
        ctx.fillStyle = "limegreen";
        break;
      default:
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
    }
    ctx.fill();
    ctx.closePath();

    if (this.type === "tesla" && this.target) {
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(this.target.x, this.target.y);
      ctx.strokeStyle = "yellow";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
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
    this.level = 1;
    this.color = towerStats[type].color || "gray";
  }

  shoot() {
    const now = Date.now();
    if (now - this.lastShot < this.fireRate / gameState.gameSpeed) return;
    let target = gameState.enemies.find(enemy => Math.hypot(enemy.x - this.x, enemy.y - this.y) < this.range);
    if (target) {
      switch (this.type) {
        case "archer":
          if (now - this.lastShot >= 2000) {
            gameState.projectiles.push(new Projectile(this.x, this.y, target, this.damage, 5, this.type));
            gameState.projectiles.push(new Projectile(this.x, this.y, gameState.enemies.find(e => e !== target && Math.hypot(e.x - this.x, e.y - this.y) < this.range) || target, this.damage, 5, this.type));
            this.lastShot = now;
          }
          break;
        case "laser":
          if (now - this.lastShot >= 10000) {
            let beamInterval = setInterval(() => {
              gameState.enemies.forEach(enemy => {
                if (Math.hypot(enemy.x - this.x, enemy.y - this.y) < this.range) {
                  enemy.health -= this.damage / 5;
                  ctx.beginPath();
                  ctx.moveTo(this.x, this.y);
                  ctx.lineTo(enemy.x, enemy.y);
                  ctx.strokeStyle = "red";
                  ctx.lineWidth = 2;
                  ctx.stroke();
                  if (enemy.health <= 0) {
                    gameState.score += enemy.isBoss ? 50 : 10;
                    gameState.gameMoney += enemy.isBoss ? 100 : 20;
                    gameState.enemies = gameState.enemies.filter(e => e !== enemy);
                  }
                }
              });
            }, 1000);
            setTimeout(() => clearInterval(beamInterval), 5000);
            this.lastShot = now;
          }
          break;
        case "vortex":
          if (now - this.lastShot >= 5000) {
            gameState.enemies.forEach(enemy => {
              if (Math.hypot(enemy.x - this.x, enemy.y - this.y) < this.range) {
                const dx = this.x - enemy.x;
                const dy = this.y - enemy.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance > 50 * scaleX) {
                  enemy.x += (dx / distance) * 50 * scaleX;
                  enemy.y += (dy / distance) * 50 * scaleY;
                  ctx.beginPath();
                  ctx.arc(this.x, this.y, 20 * textScale, 0, Math.PI * 2);
                  ctx.strokeStyle = "purple";
                  ctx.lineWidth = 2;
                  ctx.stroke();
                }
              }
            });
            this.lastShot = now;
          }
          break;
        default:
          gameState.projectiles.push(new Projectile(this.x, this.y, target, this.damage, 5, this.type));
          this.lastShot = now;
      }
    }
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);

    let target = gameState.enemies.find(enemy => Math.hypot(enemy.x - this.x, enemy.y - this.y) < this.range);
    if (target) {
      const angle = Math.atan2(target.y - this.y, target.x - this.x);
      ctx.rotate(angle + Math.PI / 2);
    }

    ctx.beginPath();
    switch (this.type) {
      case "basic":
        ctx.arc(0, 0, 10 * textScale, 0, Math.PI * 2);
        ctx.rect(0, -5 * textScale, 20 * textScale, 10 * textScale);
        break;
      case "archer":
        ctx.moveTo(-10 * textScale, 10 * textScale);
        ctx.lineTo(10 * textScale, 10 * textScale);
        ctx.lineTo(0, 0);
        ctx.closePath();
        ctx.rect(0, -5 * textScale, 15 * textScale, 5 * textScale);
        break;
      case "cannon":
        ctx.arc(0, 0, 15 * textScale, 0, Math.PI * 2);
        ctx.rect(0, -8 * textScale, 25 * textScale, 16 * textScale);
        break;
      case "sniper":
        ctx.rect(-5 * textScale, -10 * textScale, 10 * textScale, 20 * textScale);
        ctx.rect(0, -5 * textScale, 30 * textScale, 5 * textScale);
        break;
      case "freeze":
        ctx.moveTo(0, -10 * textScale);
        ctx.lineTo(-10 * textScale, 0);
        ctx.lineTo(0, 10 * textScale);
        ctx.lineTo(10 * textScale, 0);
        ctx.closePath();
        ctx.rect(0, -5 * textScale, 15 * textScale, 5 * textScale);
        break;
      case "mortar":
        ctx.arc(0, 0, 15 * textScale, 0, Math.PI * 2);
        ctx.rect(0, -10 * textScale, 20 * textScale, 15 * textScale);
        break;
      case "laser":
        ctx.rect(-10 * textScale, -10 * textScale, 20 * textScale, 20 * textScale);
        ctx.rect(0, -5 * textScale, 25 * textScale, 5 * textScale);
        break;
      case "tesla":
        ctx.moveTo(-10 * textScale, 10 * textScale);
        ctx.lineTo(10 * textScale, 10 * textScale);
        ctx.lineTo(0, 0);
        ctx.closePath();
        ctx.moveTo(0, 0);
        ctx.lineTo(5 * textScale, -5 * textScale);
        ctx.lineTo(0, -10 * textScale);
        ctx.lineTo(5 * textScale, -15 * textScale);
        break;
      case "flamethrower":
        ctx.arc(0, 0, 10 * textScale, 0, Math.PI * 2);
        ctx.rect(0, -10 * textScale, 15 * textScale, 15 * textScale);
        break;
      case "missile":
        ctx.moveTo(-10 * textScale, 10 * textScale);
        ctx.lineTo(10 * textScale, 10 * textScale);
        ctx.lineTo(0, 0);
        ctx.closePath();
        ctx.rect(0, -5 * textScale, 20 * textScale, 5 * textScale);
        break;
      case "poison":
        ctx.arc(0, 0, 10 * textScale, 0, Math.PI * 2);
        ctx.rect(0, -5 * textScale, 15 * textScale, 5 * textScale);
        ctx.arc(15 * textScale, 0, 3 * textScale, 0, Math.PI * 2);
        break;
      case "vortex":
        ctx.arc(0, 0, 12 * textScale, 0, Math.PI * 2);
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(10 * textScale, -10 * textScale, 20 * textScale, 0);
        break;
    }
    ctx.fillStyle = this.color || "gray";
    ctx.fill();
    ctx.closePath();

    if (gameState.selectedTower === this) {
      ctx.beginPath();
      ctx.arc(0, 0, this.range, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(0, 255, 0, 0.3)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.restore();

    ctx.fillStyle = "white";
    ctx.font = `${12 * textScale}px Arial`;
    ctx.textAlign = "center";
    ctx.fillText(this.type.charAt(0).toUpperCase() + this.type.slice(1), this.x, this.y + 25 * textScale);
  }

  upgrade() {
    if (this.level < 3 && gameState.gameMoney >= 100 * this.level) {
      gameState.gameMoney -= 100 * this.level;
      this.level++;
      this.damage *= 1.5;
      this.range *= 1.2;
      this.fireRate *= 0.9;
      showNotification(`${this.type} upgraded to level ${this.level}!`);
    } else {
      showNotification("Not enough in-game money or max level reached!");
    }
  }
}

function initSidebar() {
  const sidebar = document.getElementById("sidebar");
  sidebar.innerHTML = "";
  for (const [type, stats] of Object.entries(towerStats)) {
    if (stats.unlocked) { // Only show unlocked towers
      const option = document.createElement("div");
      option.className = "tower-option";
      option.textContent = `${type.charAt(0).toUpperCase() + type.slice(1)} ($${stats.unlockCost || 50})`;
      option.addEventListener("click", (e) => {
        e.stopPropagation();
        gameState.selectedTowerType = type;
        document.querySelectorAll(".tower-option").forEach(o => o.classList.remove("selected"));
        option.classList.add("selected");
        gameState.selectedTower = null;
        document.getElementById("tower-info-panel").style.display = "none";
      });
      sidebar.appendChild(option);
    }
  }

  const pauseButton = document.createElement("div");
  pauseButton.id = "pause-button";
  pauseButton.textContent = "Pause";
  pauseButton.addEventListener("click", () => {
    gameState.isPaused = !gameState.isPaused;
    pauseButton.classList.toggle("active");
    pauseButton.textContent = gameState.isPaused ? "Resume" : "Pause";
  });
  sidebar.appendChild(pauseButton);

  const fastForwardButton = document.createElement("div");
  fastForwardButton.id = "fast-forward-button";
  fastForwardButton.textContent = "Fast Forward (1x)";
  fastForwardButton.addEventListener("click", () => {
    gameState.gameSpeed = gameState.gameSpeed === 1 ? 2 : gameState.gameSpeed === 2 ? 3 : 1;
    fastForwardButton.classList.toggle("active", gameState.gameSpeed > 1);
    fastForwardButton.textContent = `Fast Forward (${gameState.gameSpeed}x)`;
    document.getElementById("speed").textContent = `Speed: ${gameState.gameSpeed}x`;
  });
  sidebar.appendChild(fastForwardButton);

  const homeButton = document.createElement("div");
  homeButton.id = "home-button";
  homeButton.textContent = "Main Menu";
  homeButton.addEventListener("click", async () => {
    const success = await updateUserMoney();
    if (success) window.location.href = "/";
  });
  sidebar.appendChild(homeButton);

  sidebar.addEventListener("click", (e) => {
    if (e.target.className === "tower-option" || 
        e.target.id === "pause-button" || 
        e.target.id === "fast-forward-button" || 
        e.target.id === "home-button") return;
    gameState.selectedTowerType = null;
    gameState.selectedTower = null;
    document.querySelectorAll(".tower-option").forEach(o => o.classList.remove("selected"));
    document.getElementById("tower-info-panel").style.display = "none";
  });
}

function spawnWave() {
  if (gameState.isSpawning || gameState.gameOver || gameState.gameWon) return;
  gameState.isSpawning = true;
  const isBossWave = gameState.wave % 5 === 0;
  const difficultyFactor = selectedDifficulty === "easy" ? 0.75 : selectedDifficulty === "medium" ? 1 : 1.25;
  const enemyCount = isBossWave ? 1 : Math.min(Math.floor((gameState.wave * 2 + 5) * difficultyFactor), 20);
  let spawned = 0;

  const spawnInterval = setInterval(() => {
    if (spawned >= enemyCount || gameState.gameOver || gameState.gameWon) {
      clearInterval(spawnInterval);
      gameState.isSpawning = false;
      return;
    }
    if (isBossWave) {
      const boss = new Enemy(bossType, gameState.wave);
      boss.isBoss = true;
      gameState.enemies.push(boss);
      window.dispatchEvent(new CustomEvent("bossActive", { detail: { wave: gameState.wave } }));
    } else {
      const type = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
      gameState.enemies.push(new Enemy(type, gameState.wave));
    }
    spawned++;
  }, 1000 / gameState.gameSpeed);

  const maxWaves = selectedDifficulty === "hard" ? 60 : selectedDifficulty === "medium" ? 40 : 20;
  if (gameState.wave === maxWaves && !isBossWave) {
    gameState.gameWon = true;
    endGame(true);
  }
}

function updateStats() {
  document.getElementById("score").textContent = `Score: ${gameState.score}`;
  document.getElementById("health").textContent = `Health: ${gameState.playerHealth}`;
  document.getElementById("wave").textContent = `Wave: ${gameState.wave}`;
  document.getElementById("speed").textContent = `Speed: ${gameState.gameSpeed}x`;
}

function updateMoney() {
  document.getElementById("money").textContent = `In-Game: $${gameState.gameMoney} | Persistent: $${gameState.persistentMoney}`;
}

function updateTowerInfo() {
  const panel = document.getElementById("tower-info-panel");
  if (gameState.selectedTower) {
    panel.style.display = "block";
    document.getElementById("tower-type").textContent = `Type: ${gameState.selectedTower.type}`;
    document.getElementById("tower-damage").textContent = `Damage: ${gameState.selectedTower.damage}`;
    document.getElementById("tower-range").textContent = `Range: ${Math.round(gameState.selectedTower.range / scaleX)}`;
    document.getElementById("tower-level").textContent = `Level: ${gameState.selectedTower.level}`;
    document.getElementById("tower-ability").textContent = `Ability: ${towerStats[gameState.selectedTower.type].ability}`;
  } else {
    panel.style.display = "none";
  }
}

function draw() {
  ctx.fillStyle = themeBackgrounds[mapTheme];
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.beginPath();
  ctx.moveTo(scaledPath[0].x, scaledPath[0].y);
  for (let i = 1; i < scaledPath.length; i++) {
    ctx.lineTo(scaledPath[i].x, scaledPath[i].y);
  }
  ctx.strokeStyle = "brown";
  ctx.lineWidth = 10 * textScale;
  ctx.stroke();

  gameState.enemies.forEach(enemy => enemy.draw());
  gameState.towers.forEach(tower => tower.draw());
  gameState.projectiles.forEach(projectile => projectile.draw());

  if (gameState.selectedTowerType && !gameState.isPaused && lastMousePos) {
    const { x, y } = lastMousePos;
    ctx.beginPath();
    ctx.arc(x, y, towerStats[gameState.selectedTowerType].range * scaleX, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(0, 255, 0, 0.3)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.closePath();

    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    switch (gameState.selectedTowerType) {
      case "basic":
        ctx.rect(-10 * textScale, -10 * textScale, 20 * textScale, 20 * textScale);
        break;
      case "archer":
        ctx.moveTo(0, -15 * textScale);
        ctx.lineTo(-10 * textScale, 10 * textScale);
        ctx.lineTo(10 * textScale, 10 * textScale);
        break;
      case "cannon":
        ctx.arc(0, 0, 15 * textScale, 0, Math.PI * 2);
        ctx.fillRect(0, -5 * textScale, 20 * textScale, 10 * textScale);
        break;
      default:
        ctx.arc(0, 0, 20 * textScale, 0, Math.PI * 2);
    }
    ctx.fillStyle = "rgba(128, 128, 128, 0.5)";
    ctx.fill();
    ctx.restore();
  }
}

function update() {
  if (gameState.isPaused || gameState.gameOver || gameState.gameWon) return;

  gameState.enemies.forEach(enemy => enemy.move());
  gameState.towers.forEach(tower => tower.shoot());
  gameState.projectiles.forEach(projectile => projectile.move());

  if (gameState.playerHealth <= 0) {
    gameState.gameOver = true;
    endGame(false);
  }

  if (gameState.enemies.length === 0 && !gameState.isSpawning && !gameState.gameWon) {
    gameState.wave++;
    spawnWave();
  }

  updateStats();
  updateTowerInfo();
}

function endGame(won) {
  const endScreen = document.getElementById("end-screen");
  const endMessage = document.getElementById("end-message");
  const wavesSurvived = document.getElementById("waves-survived");
  const moneyEarnedDisplay = document.getElementById("persistent-money-earned");
  const moneyTotalDisplay = document.getElementById("persistent-money-total");

  endMessage.textContent = won ? "You Win!" : "Game Over!";
  wavesSurvived.textContent = `Waves Survived: ${gameState.wave - 1}`;

  let persistentReward = won
    ? (selectedDifficulty === "hard" ? 1000 : selectedDifficulty === "medium" ? 600 : 300)
    : (gameState.wave - 1) * 10;
  gameState.persistentMoney += persistentReward;

  moneyEarnedDisplay.textContent = `Persistent Money Earned: $${persistentReward}`;
  moneyTotalDisplay.textContent = `Total Persistent Money: $${gameState.persistentMoney}`;

  updateMoney();
  updateUserMoney().then(success => {
    endScreen.style.display = "block";
    if (!success) showNotification("Failed to save progress.");
  }).catch(err => {
    console.error("Error saving money:", err);
    showNotification("Error saving progress: " + err.message);
    endScreen.style.display = "block";
  });
}

let lastMousePos = null;
canvas.addEventListener("mousemove", (e) => {
  const rect = canvas.getBoundingClientRect();
  lastMousePos = {
    x: (e.clientX - rect.left) * (canvas.width / rect.width),
    y: (e.clientY - rect.top) * (canvas.height / rect.height),
  };
});

canvas.addEventListener("click", (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (canvas.width / rect.width);
  const y = (e.clientY - rect.top) * (canvas.height / rect.height);

  if (gameState.selectedTowerType) {
    const cost = towerStats[gameState.selectedTowerType].unlockCost || 50;
    const tooCloseToPath = isNearPath(x, y);
    const tooCloseToTower = gameState.towers.some(t => Math.hypot(t.x - x, t.y - y) < 50 * scaleX);

    if (gameState.gameMoney >= cost && !tooCloseToPath && !tooCloseToTower) {
      const newTower = new Tower(x, y, gameState.selectedTowerType);
      gameState.towers.push(newTower);
      gameState.gameMoney -= cost;
      gameState.selectedTowerType = null;
      document.querySelectorAll(".tower-option").forEach(o => o.classList.remove("selected"));
    } else {
      showNotification(
        gameState.gameMoney < cost ? "Not enough in-game money!" :
        tooCloseToPath ? "Too close to path!" : "Too close to another tower!"
      );
    }
  } else {
    const tower = gameState.towers.find(t => Math.hypot(t.x - x, t.y - y) < t.radius);
    if (tower) {
      gameState.selectedTower = tower;
      gameState.selectedTowerType = null;
      document.querySelectorAll(".tower-option").forEach(o => o.classList.remove("selected"));
    }
  }
});

document.getElementById("upgrade-tower-button").addEventListener("click", () => {
  if (gameState.selectedTower) gameState.selectedTower.upgrade();
});

document.getElementById("restart-button").addEventListener("click", async () => {
  const success = await updateUserMoney();
  if (!success) {
    showNotification("Failed to save progress before restarting.");
  }
  gameState = {
    enemies: [],
    towers: [],
    projectiles: [],
    wave: 1,
    score: 0,
    gameMoney: selectedDifficulty === "easy" ? 300 : selectedDifficulty === "medium" ? 300 : 400, // Easy mode now starts with 300
    persistentMoney: gameState.persistentMoney,
    selectedTowerType: null,
    gameOver: false,
    playerHealth: 20,
    isPaused: false,
    gameSpeed: 1,
    selectedTower: null,
    isSpawning: false,
    gameWon: false,
  };
  gameState = new Proxy(gameState, {
    set(target, prop, value) {
      if (prop === "selectedTowerType") {
        console.log(`selectedTowerType changed from ${target[prop]} to ${value}`);
      }
      target[prop] = value;
      return true;
    }
  });
  document.getElementById("end-screen").style.display = "none";
  initSidebar();
  spawnWave();
});

document.getElementById("main-menu-button").addEventListener("click", async () => {
  const success = await updateUserMoney();
  if (success) {
    window.location.href = "/";
  } else {
    showNotification("Failed to save progress. Returning to main menu anyway.");
    window.location.href = "/";
  }
});

function isNearPath(x, y) {
  for (let i = 0; i < scaledPath.length - 1; i++) {
    const p1 = scaledPath[i];
    const p2 = scaledPath[i + 1];
    const dist = pointToLineDistance(x, y, p1.x, p1.y, p2.x, p2.y);
    if (dist < 30 * textScale) return true;
  }
  return false;
}

function pointToLineDistance(px, py, x1, y1, x2, y2) {
  const A = px - x1;
  const B = py - y1;
  const C = x2 - x1;
  const D = y2 - y1;
  const dot = A * C + B * D;
  const len_sq = C * C + D * D;
  const param = len_sq !== 0 ? dot / len_sq : -1;
  let xx = param < 0 ? x1 : param > 1 ? x2 : x1 + param * C;
  let yy = param < 0 ? y1 : param > 1 ? y2 : y1 + param * D;
  return Math.sqrt((px - xx) ** 2 + (py - yy) ** 2);
}

async function init() {
  console.log("Initializing game...");
  await loadUnlockedTowers();
  await fetchUserMoney();
  initSidebar();
  spawnWave();
  console.log("Game initialized with persistent money:", gameState.persistentMoney, "and game money:", gameState.gameMoney);
  gameLoop();
}

function gameLoop() {
  updateMoney(); // Always update money display
  if (!gameState.gameOver && !gameState.gameWon && !gameState.isPaused) {
    update(); // Only update game logic if not paused
  }
  draw();
  requestAnimationFrame(gameLoop);
}

// Start the game
init();