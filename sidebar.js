function initSidebar() {
    const sidebar = document.getElementById("sidebar");
    sidebar.innerHTML = ""; // Clear existing content
  
    gameState.unlockedTowers.forEach(type => {
      const div = document.createElement("div");
      div.className = "tower-option";
      div.textContent = `${type.charAt(0).toUpperCase() + type.slice(1)} ($${towerStats[type].cost})`;
      div.style.background = towerStats[type].color; // Use tower color for visual feedback
      div.style.color = "white";
      div.addEventListener("click", () => {
        gameState.selectedTowerType = type;
        gameState.selectedTower = null; // Deselect any selected tower
        document.querySelectorAll(".tower-option").forEach(el => el.classList.remove("selected"));
        div.classList.add("selected");
        updateTowerInfo(); // Update tower info panel
      });
      sidebar.appendChild(div);
    });
  
    // Add persistent money display
    const moneyDisplay = document.createElement("div");
    moneyDisplay.id = "persistent-money";
    moneyDisplay.textContent = `Persistent Money: $${gameState.persistentMoney}`;
    moneyDisplay.style.marginTop = "10px";
    sidebar.appendChild(moneyDisplay);
  }