const towerStats = {
    basic: { cost: 50, damage: 20, range: 100, cooldown: 60, color: "gray", ability: "None", unlockCost: 0, unlocked: true },
    sniper: { cost: 100, damage: 50, range: 200, cooldown: 120, color: "blue", ability: "High Damage", unlockCost: 500, unlocked: false },
    splash: { cost: 150, damage: 10, range: 80, cooldown: 30, color: "orange", ability: "Area Damage", unlockCost: 750, unlocked: false },
    slow: { cost: 75, damage: 5, range: 120, cooldown: 90, color: "cyan", ability: "Slows Enemies", unlockCost: 600, unlocked: false },
    rapid: { cost: 125, damage: 15, range: 90, cooldown: 12, color: "purple", ability: "Rapid Fire", unlockCost: 800, unlocked: false },
    bomb: { cost: 200, damage: 40, range: 150, cooldown: 90, color: "brown", ability: "Explosive Damage", unlockCost: 1000, unlocked: false },
    laser: { cost: 250, damage: 30, range: 180, cooldown: 80, color: "red", ability: "Piercing Shots", unlockCost: 1200, unlocked: false },
    freeze: { cost: 175, damage: 10, range: 140, cooldown: 100, color: "lightblue", ability: "Freeze Enemies", unlockCost: 900, unlocked: false },
    poison: { cost: 225, damage: 15, range: 110, cooldown: 70, color: "green", ability: "Poison Over Time", unlockCost: 1100, unlocked: false },
    flame: { cost: 275, damage: 25, range: 90, cooldown: 50, color: "yellow", ability: "Burn Damage", unlockCost: 1300, unlocked: false },
    shield: { cost: 300, damage: 20, range: 150, cooldown: 120, color: "silver", ability: "Protect Allies", unlockCost: 1500, unlocked: false },
    missile: { cost: 350, damage: 60, range: 200, cooldown: 150, color: "darkgray", ability: "Guided Missile", unlockCost: 1800, unlocked: false },
  };
  
  export { towerStats };