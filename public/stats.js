const towerStats = {
  basic: { damage: 10, range: 100, fireRate: 1000, unlockCost: 50, persistentCost: 150, color: "gray", ability: "Basic attack", unlocked: true },
  archer: { damage: 15, range: 150, fireRate: 500, unlockCost: 75, persistentCost: 225, color: "brown", ability: "Double shot every 2s", unlocked: false },
  cannon: { damage: 50, range: 80, fireRate: 2000, unlockCost: 100, persistentCost: 400, color: "black", ability: "Splash damage", unlocked: false },
  sniper: { damage: 100, range: 200, fireRate: 3000, unlockCost: 150, persistentCost: 600, color: "darkgreen", ability: "20% chance for double damage", unlocked: false },
  freeze: { damage: 5, range: 120, fireRate: 1500, unlockCost: 120, persistentCost: 480, color: "lightblue", ability: "Slows enemies", unlocked: false },
  mortar: { damage: 80, range: 100, fireRate: 2500, unlockCost: 200, persistentCost: 800, color: "darkgray", ability: "Large splash damage", unlocked: false },
  laser: { damage: 20, range: 150, fireRate: 10000, unlockCost: 350, persistentCost: 1200, color: "red", ability: "Continuous beam every 10s", unlocked: false },
  tesla: { damage: 30, range: 130, fireRate: 1500, unlockCost: 250, persistentCost: 1000, color: "yellow", ability: "Chain lightning", unlocked: false },
  flamethrower: { damage: 15, range: 90, fireRate: 1000, unlockCost: 180, persistentCost: 720, color: "orange", ability: "Burn over time", unlocked: false },
  missile: { damage: 60, range: 140, fireRate: 2000, unlockCost: 200, persistentCost: 880, color: "silver", ability: "High damage", unlocked: false },
  poison: { damage: 10, range: 160, fireRate: 2000, unlockCost: 250, persistentCost: 800, color: "limegreen", ability: "Poison splash", unlocked: false },
  vortex: { damage: 0, range: 150, fireRate: 5000, unlockCost: 200, persistentCost: 1400, color: "purple", ability: "Pulls enemies back every 5s", unlocked: false },
};