// Import classes
import { Enemy } from "../enemy.js";
import { Tower } from "../tower.js";
import { Projectile } from "../projectile.js";

// Responsive Canvas Setup
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Original canvas dimensions (reference for scaling)
const originalWidth = 1200;
const originalHeight = 600;

// Scale factors
let scaleX = 1;
let scaleY = 1;

// Function to resize the canvas and scale game elements
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  scaleX = canvas.width / originalWidth;
  scaleY = canvas.height / originalHeight;

  console.log(`Canvas resized. Scale factors: scaleX=${scaleX}, scaleY=${scaleY}`);
}

// Initial resize
resizeCanvas();

// Resize canvas when the window is resized
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
};

// Map Data
const maps = {
  map1: {
    path: [
      { x: 0, y: 300 },
      { x: 300, y: 300 },
      { x: 300, y: 100 },
      { x: 600, y: 100 },
      { x: 600, y: 400 },
      { x: 900, y: 400 },
      { x: 900, y: 300 },
      { x: 1200, y: 300 },
    ],
    spawnPoint: { x: 0, y: 300 },
    moneyReward: 50, // Money earned per wave for map1
  },
  map2: {
    path: [
      { x: 0, y: 150 },
      { x: 400, y: 150 },
      { x: 400, y: 450 },
      { x: 800, y: 450 },
      { x: 800, y: 150 },
      { x: 1200, y: 150 },
    ],
    spawnPoint: { x: 0, y: 150 },
    moneyReward: 75, // Money earned per wave for map2
  },
  map3: {
    path: [
      { x: 0, y: 300 },
      { x: 200, y: 300 },
      { x: 200, y: 100 },
      { x: 400, y: 100 },
      { x: 400, y: 300 },
      { x: 600, y: 300 },
      { x: 600, y: 100 },
      { x: 800, y: 100 },
      { x: 800, y: 300 },
      { x: 1000, y: 300 },
      { x: 1000, y: 100 },
      { x: 1200, y: 100 },
    ],
    spawnPoint: { x: 0, y: 300 },
    moneyReward: 100, // Money earned per wave for map3
  },
};

// Load Selected Map
const selectedMap = localStorage.getItem("selectedMap") || "map1";
const path = maps[selectedMap].path;
const spawnPoint = maps[selectedMap].spawnPoint;

// Function to create a scaled copy of the path and spawn point
function getScaledPathAndSpawnPoint() {
  const scaledPath = path.map((point) => ({
    x: point.x * scaleX,
    y: point.y * scaleY,
  }));

  const scaledSpawnPoint = {
    x: spawnPoint.x * scaleX,
    y: spawnPoint.y * scaleY,
  };

  return { scaledPath, scaledSpawnPoint };
}

// Create scaled path and spawn point
const { scaledPath, scaledSpawnPoint } = getScaledPathAndSpawnPoint();

// Enemy Types
const enemyTypes = [
  { health: 100, speed: 1, radius: 10, color: "red" }, // Basic
  { health: 200, speed: 0.8, radius: 15, color: "blue" }, // Tank
  { health: 50, speed: 2, radius: 8, color: "green" }, // Fast
];

// Tower Stats
const towerStats = {
  basic: {
    cost: 50,
    damage: 20,
    range: 100,
    cooldown: 60, // Cooldown in frames
    color: "gray",
    ability: "None",
  },
  sniper: {
    cost: 100,
    damage: 50,
    range: 200,
    cooldown: 120,
    color: "blue",
    ability: "High Damage",
  },
  splash: {
    cost: 150,
    damage: 10,
    range: 80,
    cooldown: 30,
    color: "orange",
    ability: "Area Damage",
  },
  slow: {
    cost: 75,
    damage: 5,
    range: 120,
    cooldown: 90,
    color: "cyan",
    ability: "Slows Enemies",
  },
  rapid: {
    cost: 125,
    damage: 15,
    range: 90,
    cooldown: 12,
    color: "purple",
    ability: "Rapid Fire",
  },
  bomb: {
    cost: 200,
    damage: 40,
    range: 150,
    cooldown: 90,
    color: "brown",
    ability: "Explosive Damage",
  },
};

// Function to fetch user data from the server
async function fetchUserData() {
  try {
    const token = localStorage.getItem("token");
    const response = await fetch("/user", {
      headers: {
        Authorization: token,
      },
    });
    const data = await response.json();
    gameState.money = data.money;
  } catch (err) {
    console.error("Error fetching user data:", err);
  }
}

// Function to update money on the server
async function updateMoneyOnServer(money) {
  try {
    const token = localStorage.getItem("token");
    await fetch("/update-money", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token,
      },
      body: JSON.stringify({ money }),
    });
  } catch (err) {
    console.error("Error updating money:", err);
  }
}

// Function to show end screen
function showEndScreen(message) {
  const endScreen = document.getElementById("end-screen");
  const endMessage = document.getElementById("end-message");

  // Set the end message
  endMessage.textContent = message;

  // Show the end screen
  endScreen.style.display = "block";
}

// Restart the game
document.getElementById("restart-button").addEventListener("click", () => {
  // Reload the page to restart the game
  window.location.reload();
});

// Game Loop
function gameLoop() {
  if (gameState.gameOver) {
    document.getElementById("game-over").style.display = "block";
    return;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw Path (scaled)
  ctx.beginPath();
  ctx.moveTo(scaledPath[0].x, scaledPath[0].y);
  for (let point of scaledPath) {
    ctx.lineTo(point.x, point.y);
  }
  ctx.strokeStyle = "black";
  ctx.lineWidth = 5;
  ctx.stroke();

  // Update and Draw Enemies
  for (let enemy of gameState.enemies) {
    if (!gameState.isPaused) enemy.update(gameState);
    enemy.draw(ctx, scaleX, scaleY); // Pass scaling factors
  }

  // Update and Draw Towers
  for (let tower of gameState.towers) {
    tower.update(gameState);
    tower.draw(ctx, scaleX, scaleY); // Pass scaling factors
  }

  // Update and Draw Projectiles
  for (let projectile of gameState.projectiles) {
    if (!gameState.isPaused) projectile.update(gameState);
    projectile.draw(ctx, scaleX, scaleY); // Pass scaling factors
  }

  // Check if all enemies are defeated
  if (gameState.enemies.length === 0 && !gameState.isPaused && !gameState.gameOver) {
    spawnWave(); // Spawn the next wave
    gameState.wave++; // Increment wave counter
  }

  // Update Stats Panel
  document.getElementById("score").textContent = `Score: ${gameState.score}`;
  document.getElementById("money").textContent = `Money: $${gameState.money}`;
  document.getElementById("health").textContent = `Health: ${gameState.playerHealth}`;
  document.getElementById("wave").textContent = `Wave: ${gameState.wave}`;
  document.getElementById("speed").textContent = `Speed: ${gameState.gameSpeed}x`;

  requestAnimationFrame(gameLoop);
}

// Spawn Enemies in Waves
function spawnWave() {
  const waveSize = gameState.wave * 5; // Increase wave size as the game progresses

  // Award money for completing the previous wave
  const moneyReward = maps[selectedMap].moneyReward;
  gameState.money += moneyReward;
  updateMoneyOnServer(gameState.money); // Update money on the server
  showNotification(`Wave ${gameState.wave} completed! +$${moneyReward}`);

  for (let i = 0; i < waveSize; i++) {
    setTimeout(() => {
      if (!gameState.isPaused && !gameState.gameOver) {
        let type;
        if (gameState.wave <= 3) {
          type = enemyTypes[0]; // Basic enemies in early waves
        } else if (gameState.wave <= 6) {
          type = Math.random() < 0.5 ? enemyTypes[0] : enemyTypes[1]; // Mix of basic and tank enemies
        } else {
          type = enemyTypes[Math.floor(Math.random() * enemyTypes.length)]; // Random enemy types in later waves
        }
        // Spawn enemy at the scaled spawn point
        gameState.enemies.push(new Enemy(scaledPath, type, scaledSpawnPoint));
      }
    }, (i * 1000) / gameState.gameSpeed); // Space out enemy spawns
  }
  gameState.wave++; // Increment wave counter
  console.log(`Wave ${gameState.wave} started with ${waveSize} enemies.`);
}

// Sidebar Tower Selection
const sidebar = document.getElementById("sidebar");
const towerOptions = document.querySelectorAll(".tower-option");

sidebar.addEventListener("click", (e) => {
  if (e.target.classList.contains("tower-option")) {
    const type = e.target.getAttribute("data-type");
    const cost = parseInt(e.target.getAttribute("data-cost"));

    // Deselect all towers
    towerOptions.forEach((option) => option.classList.remove("selected"));

    if (gameState.money >= cost) {
      gameState.selectedTowerType = type;
      e.target.classList.add("selected");
    } else {
      showNotification("Not enough money!");
      gameState.selectedTowerType = null;
    }
  }
});

// Place Towers on Canvas Click
canvas.addEventListener("click", (e) => {
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left; // Mouse X relative to canvas
  const mouseY = e.clientY - rect.top; // Mouse Y relative to canvas

  // Convert mouse coordinates to unscaled coordinates
  const x = mouseX / scaleX;
  const y = mouseY / scaleY;

  if (gameState.selectedTowerType) {
    const cost = towerStats[gameState.selectedTowerType].cost;

    if (gameState.money >= cost) {
      // Place the tower at the unscaled coordinates
      gameState.towers.push(new Tower(x, y, gameState.selectedTowerType, scaleX, scaleY));
      gameState.money -= cost;
      updateMoneyOnServer(gameState.money); // Update money on the server
      gameState.selectedTowerType = null;
      towerOptions.forEach((option) => option.classList.remove("selected"));
      showNotification(`Tower placed at (${x.toFixed(1)}, ${y.toFixed(1)})`);
    } else {
      // Not enough money
      showNotification("Not enough money!");
    }
  } else {
    let towerClicked = false;

    // Check if a tower is clicked
    for (let tower of gameState.towers) {
      const dx = mouseX - tower.x * tower.scaleX; // Convert tower position to scaled coordinates
      const dy = mouseY - tower.y * tower.scaleY; // Convert tower position to scaled coordinates
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance <= 20 * Math.min(tower.scaleX, tower.scaleY)) { // Adjust click radius for scaling
        if (gameState.selectedTower) gameState.selectedTower.selected = false;
        gameState.selectedTower = tower;
        gameState.selectedTower.selected = true;
        showTowerInfoPanel(tower);
        towerClicked = true;
        break;
      }
    }

    // If no tower was clicked, hide the upgrade bar
    if (!towerClicked) {
      const panel = document.getElementById("tower-info-panel");
      panel.style.display = "none";
      if (gameState.selectedTower) {
        gameState.selectedTower.selected = false;
        gameState.selectedTower = null;
      }
    }
  }
});

/**
 * Show a notification message.
 * @param {string} message - The message to display.
 * @param {number} duration - The duration (in milliseconds) to show the notification.
 */
function showNotification(message, duration = 3000) {
  const notificationBox = document.getElementById("notification-box");

  // Set the message
  notificationBox.textContent = message;

  // Show the notification
  notificationBox.classList.add("show");

  // Hide the notification after the specified duration
  setTimeout(() => {
    notificationBox.classList.remove("show");
  }, duration);
}

// Show Tower Info Panel
function showTowerInfoPanel(tower) {
  const panel = document.getElementById("tower-info-panel");
  panel.style.display = "block";

  // Update tower info
  document.getElementById("tower-type").textContent = `Type: ${tower.type}`;
  document.getElementById("tower-damage").textContent = `Damage: ${tower.damage}`;
  document.getElementById("tower-range").textContent = `Range: ${tower.range}`;
  document.getElementById("tower-level").textContent = `Level: ${tower.level}`;
  document.getElementById("tower-ability").textContent = `Ability: ${towerStats[tower.type].ability}`;

  // Style the panel to make it smaller
  panel.style.width = "150px"; // Reduce width
  panel.style.padding = "10px"; // Reduce padding
  panel.style.fontSize = "12px"; // Reduce font size
}

// Upgrade Tower
document.getElementById("upgrade-tower-button").addEventListener("click", () => {
  if (gameState.selectedTower) {
    gameState.selectedTower.upgrade(gameState);
    showTowerInfoPanel(gameState.selectedTower);
  }
});

// Pause/Resume Game
const pauseButton = document.getElementById("pause-button");
pauseButton.addEventListener("click", () => {
  gameState.isPaused = !gameState.isPaused;
  pauseButton.classList.toggle("active", gameState.isPaused);
  pauseButton.textContent = gameState.isPaused ? "Resume" : "Pause";
});

// Fast-Forward Game
const fastForwardButton = document.getElementById("fast-forward-button");
fastForwardButton.addEventListener("click", () => {
  gameState.gameSpeed = gameState.gameSpeed === 1 ? 2 : 1;
  fastForwardButton.classList.toggle("active", gameState.gameSpeed === 2);
  fastForwardButton.textContent = `Fast Forward (${gameState.gameSpeed}x)`;
});

// Home Button
const homeButton = document.getElementById("home-button");
homeButton.addEventListener("click", () => {
  window.location.href = "index.html"; // Redirect to main menu
});

// Fetch user data when the game starts
fetchUserData();

// Start Game
gameLoop();