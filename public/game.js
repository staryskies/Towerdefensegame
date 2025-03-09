// Import classes
import { Enemy } from "./enemy.js";
import { Tower } from "./tower.js";
import { Projectile } from "./projectile.js";

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
  isSpawning: false, // Track if a wave is currently spawning
};

// Tower Stats
const towerStats = {
  basic: {
    cost: 50,
    damage: 20,
    range: 100,
    cooldown: 60, // Cooldown in frames
    color: "gray",
    ability: "None",
    unlocked: true, // Basic tower is unlocked by default
    unlockCost: 0
  },
  sniper: {
    cost: 100,
    damage: 50,
    range: 200,
    cooldown: 120,
    color: "blue",
    ability: "High Damage",
    unlocked: false,
    unlockCost: 500
  },
  splash: {
    cost: 150,
    damage: 10,
    range: 80,
    cooldown: 30,
    color: "orange",
    ability: "Area Damage",
    unlocked: false,
    unlockCost: 750
  },
  slow: {
    cost: 75,
    damage: 5,
    range: 120,
    cooldown: 90,
    color: "cyan",
    ability: "Slows Enemies",
    unlocked: false,
    unlockCost: 600
  },
  rapid: {
    cost: 125,
    damage: 15,
    range: 90,
    cooldown: 12,
    color: "purple",
    ability: "Rapid Fire",
    unlocked: false,
    unlockCost: 800
  },
  bomb: {
    cost: 200,
    damage: 40,
    range: 150,
    cooldown: 90,
    color: "brown",
    ability: "Explosive Damage",
    unlocked: false,
    unlockCost: 1000
  },
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
    moneyReward: 50,
    name: "Beginner Path"
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
    moneyReward: 75,
    name: "Zigzag Path"
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
    moneyReward: 100,
    name: "Snake Path"
  },
  map4: {
    path: [
      { x: 0, y: 200 },
      { x: 400, y: 200 },
      { x: 400, y: 400 },
      { x: 800, y: 400 },
      { x: 800, y: 200 },
      { x: 1200, y: 200 },
    ],
    spawnPoint: { x: 0, y: 200 },
    moneyReward: 80,
    name: "Double Zigzag"
  },
  map5: {
    path: [
      { x: 0, y: 100 },
      { x: 200, y: 100 },
      { x: 200, y: 500 },
      { x: 400, y: 500 },
      { x: 400, y: 100 },
      { x: 600, y: 100 },
      { x: 600, y: 500 },
      { x: 800, y: 500 },
      { x: 800, y: 100 },
      { x: 1000, y: 100 },
      { x: 1000, y: 500 },
      { x: 1200, y: 500 },
    ],
    spawnPoint: { x: 0, y: 100 },
    moneyReward: 120,
    name: "Extreme Snake"
  },
  map6: {
    path: [
      { x: 0, y: 300 },
      { x: 600, y: 300 },
      { x: 600, y: 100 },
      { x: 1200, y: 100 },
    ],
    spawnPoint: { x: 0, y: 300 },
    moneyReward: 60,
    name: "Shortcut"
  },
  map7: {
    path: [
      { x: 0, y: 400 },
      { x: 300, y: 400 },
      { x: 300, y: 200 },
      { x: 600, y: 200 },
      { x: 600, y: 400 },
      { x: 900, y: 400 },
      { x: 900, y: 200 },
      { x: 1200, y: 200 },
    ],
    spawnPoint: { x: 0, y: 400 },
    moneyReward: 90,
    name: "Alternate Path"
  },
  map8: {
    path: [
      { x: 0, y: 100 },
      { x: 400, y: 100 },
      { x: 400, y: 500 },
      { x: 800, y: 500 },
      { x: 800, y: 100 },
      { x: 1200, y: 100 },
    ],
    spawnPoint: { x: 0, y: 100 },
    moneyReward: 110,
    name: "Long Zigzag"
  },
  map9: {
    path: [
      { x: 0, y: 300 },
      { x: 200, y: 300 },
      { x: 200, y: 100 },
      { x: 400, y: 100 },
      { x: 400, y: 500 },
      { x: 600, y: 500 },
      { x: 600, y: 100 },
      { x: 800, y: 100 },
      { x: 800, y: 500 },
      { x: 1000, y: 500 },
      { x: 1000, y: 100 },
      { x: 1200, y: 100 },
    ],
    spawnPoint: { x: 0, y: 300 },
    moneyReward: 130,
    name: "Crazy Path"
  },
};
// Function to create the map selection menu
function createMapSelectionMenu() {
  const mapList = document.getElementById("map-list");

  // Clear existing buttons
  mapList.innerHTML = "";

  // Add a button for each map
  for (const [key, map] of Object.entries(maps)) {
    const button = document.createElement("button");
    button.className = "map-button";
    button.textContent = map.name;
    button.addEventListener("click", () => {
      // Save the selected map to localStorage
      localStorage.setItem("selectedMap", key);
      // Reload the game with the selected map
      window.location.reload();
    });
    mapList.appendChild(button);
  }
}

// Show the map selection menu when the game starts
document.addEventListener("DOMContentLoaded", () => {
  createMapSelectionMenu();
});

// Add event listener for the "Change Map" button
document.getElementById("open-map-menu").addEventListener("click", () => {
  createMapSelectionMenu();
  document.getElementById("map-selection-menu").style.display = "block";
});
// Load Selected Map
const selectedMap = localStorage.getItem("selectedMap") || "map1"; // Default to map1 if no map is selected
const path = maps[selectedMap].path;
const spawnPoint = maps[selectedMap].spawnPoint;

// Load global money from localStorage or initialize it
let globalMoney = parseInt(localStorage.getItem("globalMoney") || "0");

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

// Function to show a notification
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

// Function to show the end screen
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
    enemy.draw(ctx, scaleX, scaleY);
  }

  // Update and Draw Towers
  for (let tower of gameState.towers) {
    tower.update(gameState);
    tower.draw(ctx, scaleX, scaleY);
  }

  // Update and Draw Projectiles
  for (let projectile of gameState.projectiles) {
    if (!gameState.isPaused) projectile.update(gameState);
    projectile.draw(ctx, scaleX, scaleY);
  }

  // Draw the tower footprint if a tower is selected
  if (gameState.selectedTowerType) {
    drawTowerFootprint();
  }

  // Check if all enemies are defeated and no wave is currently spawning
  if (gameState.enemies.length === 0 && !gameState.isSpawning && !gameState.isPaused && !gameState.gameOver) {
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
  gameState.isSpawning = true;

  const waveSize = gameState.wave * 5;

  // Award money for completing the previous wave
  const moneyReward = maps[selectedMap].moneyReward;
  gameState.money += moneyReward;
  
  // Add to global money as well (for the shop)
  globalMoney += Math.floor(moneyReward / 2);
  localStorage.setItem("globalMoney", globalMoney);
  
  showNotification(`Wave ${gameState.wave} completed! +$${moneyReward} (Game), +$${Math.floor(moneyReward / 2)} (Global)`);

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

      // Mark the end of spawning after the last enemy is spawned
      if (i === waveSize - 1) {
        gameState.isSpawning = false;
      }
    }, (i * 1000) / gameState.gameSpeed); // Space out enemy spawns
  }

  console.log(`Wave ${gameState.wave} started with ${waveSize} enemies.`);
}

// Initialize the sidebar with available towers
function initSidebar() {
  const sidebar = document.getElementById("sidebar");
  
  // Clear existing content
  sidebar.innerHTML = "";
  
  // Add tower options
  for (const [type, stats] of Object.entries(towerStats)) {
    // Skip towers that aren't unlocked
    if (!stats.unlocked) continue;
    
    const towerOption = document.createElement("div");
    towerOption.className = "tower-option";
    towerOption.setAttribute("data-type", type);
    towerOption.setAttribute("data-cost", stats.cost);
    
    towerOption.innerHTML = `
      ${capitalizeFirstLetter(type)} Tower ($${stats.cost})
      <div class="tower-stats">
        Damage: ${stats.damage}<br>
        Range: ${stats.range}<br>
        Ability: ${stats.ability}
      </div>
    `;
    
    sidebar.appendChild(towerOption);
  }
  
  // Add control buttons
  const pauseButton = document.createElement("div");
  pauseButton.id = "pause-button";
  pauseButton.textContent = "Pause";
  sidebar.appendChild(pauseButton);
  
  const fastForwardButton = document.createElement("div");
  fastForwardButton.id = "fast-forward-button";
  fastForwardButton.textContent = "Fast Forward (1x)";
  sidebar.appendChild(fastForwardButton);
  
  const homeButton = document.createElement("div");
  homeButton.id = "home-button";
  homeButton.textContent = "Home";
  sidebar.appendChild(homeButton);
}

// Load unlocked towers from localStorage
function loadUnlockedTowers() {
  const unlockedTowers = JSON.parse(localStorage.getItem("unlockedTowers") || "[]");
  
  // Basic tower is always unlocked
  towerStats.basic.unlocked = true;
  
  unlockedTowers.forEach(towerType => {
    if (towerStats[towerType]) {
      towerStats[towerType].unlocked = true;
    }
  });
}

// Helper function to capitalize first letter
function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

// Sidebar Tower Selection
document.addEventListener("DOMContentLoaded", function() {
  // Load unlocked towers first
  loadUnlockedTowers();
  
  // Initialize sidebar with available towers
  initSidebar();
  
  const sidebar = document.getElementById("sidebar");
  
  sidebar.addEventListener("click", (e) => {
    // Handle tower option click
    if (e.target.classList.contains("tower-option") || e.target.closest(".tower-option")) {
      const towerOption = e.target.classList.contains("tower-option") ? 
                        e.target : e.target.closest(".tower-option");
      
      const type = towerOption.getAttribute("data-type");
      const cost = parseInt(towerOption.getAttribute("data-cost"));
      
      // Deselect all towers
      document.querySelectorAll(".tower-option").forEach((option) => 
        option.classList.remove("selected"));
      
      if (gameState.money >= cost) {
        gameState.selectedTowerType = type;
        towerOption.classList.add("selected");
      } else {
        showNotification("Not enough money!");
        gameState.selectedTowerType = null;
      }
    }
    
    // Handle pause button click
    if (e.target.id === "pause-button") {
      gameState.isPaused = !gameState.isPaused;
      e.target.classList.toggle("active", gameState.isPaused);
      e.target.textContent = gameState.isPaused ? "Resume" : "Pause";
    }
    
    // Handle fast-forward button click
    if (e.target.id === "fast-forward-button") {
      gameState.gameSpeed = gameState.gameSpeed === 1 ? 2 : 1;
      e.target.classList.toggle("active", gameState.gameSpeed === 2);
      e.target.textContent = `Fast Forward (${gameState.gameSpeed}x)`;
    }
    
    // Handle home button click
    if (e.target.id === "home-button") {
      window.location.href = "index.html#menu"; // Redirect to main menu with hash
    }
  });
});

let mouseX = 0;
let mouseY = 0;


canvas.addEventListener("mousemove", (e) => {
  const rect = canvas.getBoundingClientRect();
  mouseX = e.clientX - rect.left; // Mouse X relative to canvas
  mouseY = e.clientY - rect.top; // Mouse Y relative to canvas
});

function drawTowerFootprint() {
  if (gameState.selectedTowerType) {
    const towerType = gameState.selectedTowerType;
    const stats = towerStats[towerType];

    // Convert mouse coordinates to unscaled coordinates
    const x = mouseX / scaleX;
    const y = mouseY / scaleY;

    // Draw the tower range (as a circle)
    ctx.beginPath();
    ctx.arc(x * scaleX, y * scaleY, stats.range * Math.min(scaleX, scaleY), 0, 2 * Math.PI);
    ctx.strokeStyle = "rgba(0, 255, 0, 0.5)"; // Semi-transparent green
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw the tower footprint (as a square)
    ctx.fillStyle = "rgba(0, 255, 0, 0.2)"; // Semi-transparent green
    ctx.fillRect(
      x * scaleX - 20 * Math.min(scaleX, scaleY), // Adjust for scaling
      y * scaleY - 20 * Math.min(scaleX, scaleY), // Adjust for scaling
      40 * Math.min(scaleX, scaleY), // Tower size
      40 * Math.min(scaleX, scaleY) // Tower size
    );

    // Draw the tower type text
    ctx.fillStyle = "black";
    ctx.font = "12px Arial";
    ctx.textAlign = "center";
    ctx.fillText(
      `${capitalizeFirstLetter(towerType)} Tower`,
      x * scaleX,
      y * scaleY + 30 * Math.min(scaleX, scaleY)
    );
  }
}

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
      gameState.selectedTowerType = null;
      document.querySelectorAll(".tower-option").forEach((option) => option.classList.remove("selected"));
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

// Show Tower Info Panel
function showTowerInfoPanel(tower) {
  const panel = document.getElementById("tower-info-panel");
  panel.style.display = "block";

  // Update tower info
  document.getElementById("tower-type").textContent = `Type: ${capitalizeFirstLetter(tower.type)}`;
  document.getElementById("tower-damage").textContent = `Damage: ${tower.damage}`;
  document.getElementById("tower-range").textContent = `Range: ${tower.range}`;
  document.getElementById("tower-level").textContent = `Level: ${tower.level}`;
  document.getElementById("tower-ability").textContent = `Ability: ${towerStats[tower.type].ability}`;

  // Update upgrade button cost (based on tower level)
  const upgradeCost = 100 * tower.level;
  document.getElementById("upgrade-tower-button").textContent = `Upgrade ($${upgradeCost})`;

  // Style the panel to make it smaller
  panel.style.width = "150px"; // Reduce width
  panel.style.padding = "10px"; // Reduce padding
  panel.style.fontSize = "12px"; // Reduce font size
}

// Upgrade Tower
document.getElementById("upgrade-tower-button").addEventListener("click", () => {
  if (gameState.selectedTower) {
    const upgradeCost = 100 * gameState.selectedTower.level;
    
    if (gameState.money >= upgradeCost) {
      gameState.money -= upgradeCost;
      gameState.selectedTower.upgrade();
      showTowerInfoPanel(gameState.selectedTower);
      showNotification(`Tower upgraded to level ${gameState.selectedTower.level}!`);
    } else {
      showNotification(`Not enough money! Need $${upgradeCost} to upgrade.`);
    }
  }
});

// End game when player health reaches 0
function checkGameEnd() {
  if (gameState.playerHealth <= 0 && !gameState.gameOver) {
    gameState.gameOver = true;
    showEndScreen(`Game Over! You reached wave ${gameState.wave} with a score of ${gameState.score}.`);
    
    // Award global money based on score
    const earnedGlobalMoney = Math.floor(gameState.score / 10);
    globalMoney += earnedGlobalMoney;
    localStorage.setItem("globalMoney", globalMoney);
    
    // Update the end message to include earned money
    document.getElementById("end-message").textContent += ` Earned $${earnedGlobalMoney} global money.`;
  }
}

// Start Game
document.addEventListener("DOMContentLoaded", function() {
  loadUnlockedTowers();
  initSidebar();
  gameLoop();
});

// Check game end condition in the Enemy class's reachEnd method
// Enemy.prototype.reachEnd = function(gameState) {
//   gameState.playerHealth -= 1;
//   checkGameEnd();
//   return true;
// };

// This function helps enable the event handlers when the DOM is fully loaded
document.addEventListener("DOMContentLoaded", function() {
  const pauseButton = document.getElementById("pause-button");
  if (pauseButton) {
    pauseButton.addEventListener("click", () => {
      gameState.isPaused = !gameState.isPaused;
      pauseButton.classList.toggle("active", gameState.isPaused);
      pauseButton.textContent = gameState.isPaused ? "Resume" : "Pause";
    });
  }

  const fastForwardButton = document.getElementById("fast-forward-button");
  if (fastForwardButton) {
    fastForwardButton.addEventListener("click", () => {
      gameState.gameSpeed = gameState.gameSpeed === 1 ? 2 : 1;
      fastForwardButton.classList.toggle("active", gameState.gameSpeed === 2);
      fastForwardButton.textContent = `Fast Forward (${gameState.gameSpeed}x)`;
    });
  }

  const homeButton = document.getElementById("home-button");
  if (homeButton) {
    homeButton.addEventListener("click", () => {
      window.location.href = "index.html#menu";
    });
  }
});