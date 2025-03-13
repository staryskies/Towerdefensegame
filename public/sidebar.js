// sidebar.js
const towerStats = {
    basic: { damage: 10, range: 100, fireRate: 1000, cost: 50, color: "gray", ability: "Basic shot" },
    archer: { damage: 15, range: 120, fireRate: 2000, cost: 75, color: "brown", ability: "Double shot" },
    cannon: { damage: 30, range: 80, fireRate: 3000, cost: 100, color: "black", ability: "Splash damage" },
    sniper: { damage: 50, range: 150, fireRate: 4000, cost: 150, color: "green", ability: "Critical hit" },
    freeze: { damage: 5, range: 100, fireRate: 2000, cost: 120, color: "lightblue", ability: "Slows enemies" },
    mortar: { damage: 40, range: 120, fireRate: 5000, cost: 200, color: "darkgray", ability: "Large splash" },
    laser: { damage: 100, range: 150, fireRate: 10000, cost: 350, color: "red", ability: "Continuous beam" },
    tesla: { damage: 25, range: 120, fireRate: 3000, cost: 250, color: "yellow", ability: "Chain lightning" },
    flamethrower: { damage: 20, range: 80, fireRate: 2000, cost: 180, color: "orange", ability: "Burning damage" },
    missile: { damage: 60, range: 130, fireRate: 4000, cost: 200, color: "silver", ability: "High damage" },
    poison: { damage: 15, range: 110, fireRate: 3000, cost: 250, color: "limegreen", ability: "Poison splash" },
    vortex: { damage: 0, range: 150, fireRate: 5000, cost: 300, color: "purple", ability: "Pulls enemies" },
  };
  
  function initSidebar() {
    const sidebar = document.createElement("div");
    sidebar.style.position = "absolute";
    sidebar.style.top = "10px";
    sidebar.style.right = "10px";
    sidebar.style.background = "rgba(0, 0, 0, 0.8)";
    sidebar.style.padding = "10px";
    sidebar.style.color = "white";
  
    Object.keys(towerStats).forEach(type => {
      const button = document.createElement("button");
      button.textContent = `${type} (${towerStats[type].cost})`;
      button.addEventListener("click", () => {
        gameState.selectedTowerType = type;
        gameState.selectedTower = null;
        updateTowerInfo();
      });
      sidebar.appendChild(button);
      sidebar.appendChild(document.createElement("br"));
    });
  
    document.body.appendChild(sidebar);
  }
  
  initSidebar();