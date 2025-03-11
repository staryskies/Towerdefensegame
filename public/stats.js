const towerStats = {
  basic: {
    unlocked: true,
    damage: 15,
    range: 100,
    fireRate: 1000,
    unlockCost: 0,
    ability: "None"
  },
  archer: {
    unlocked: false,
    damage: 20,
    range: 120,
    fireRate: 800,
    unlockCost: 100,
    ability: "Multi-Shot: Fires 2 arrows every 2 seconds"
  },
  cannon: {
    unlocked: false,
    damage: 40,
    range: 150,
    fireRate: 2000,
    unlockCost: 250,
    ability: "Splash Damage: Deals 50% damage in a 50-unit radius"
  },
  sniper: {
    unlocked: false,
    damage: 70,
    range: 250,
    fireRate: 3000,
    unlockCost: 600,
    ability: "Critical Hit: 20% chance to deal double damage"
  },
  freeze: {
    unlocked: false,
    damage: 25,
    range: 130,
    fireRate: 1500,
    unlockCost: 400,
    ability: "Slow: Reduces enemy speed by 50% for 2 seconds"
  },
  mortar: {
    unlocked: false,
    damage: 50,
    range: 200,
    fireRate: 2500,
    unlockCost: 750,
    ability: "Area Blast: Deals 75% damage in a 75-unit radius every 3 seconds"
  },
  laser: {
    unlocked: false,
    damage: 80,
    range: 180,
    fireRate: 1000,
    unlockCost: 1000,
    ability: "Beam: Continuously damages enemies in range for 5 seconds every 10 seconds"
  },
  tesla: {
    unlocked: false,
    damage: 35,
    range: 140,
    fireRate: 1200,
    unlockCost: 500,
    ability: "Chain Lightning: Jumps to 2 nearby enemies, dealing 50% damage"
  },
  flamethrower: {
    unlocked: false,
    damage: 45,
    range: 110,
    fireRate: 900,
    unlockCost: 650,
    ability: "Burn: Deals 10 damage per second for 3 seconds after hit"
  },
  missile: {
    unlocked: false,
    damage: 100,
    range: 220,
    fireRate: 4000,
    unlockCost: 1500,
    ability: "Homing Missile: Tracks the strongest enemy, dealing 100% damage on hit"
  },
  poison: {
    unlocked: false,
    damage: 20,
    range: 160,
    fireRate: 1800,
    unlockCost: 600,
    ability: "Poison Cloud: Deals 5 damage per second to all enemies in range for 4 seconds"
  },
  vortex: {
    unlocked: false,
    damage: 60,
    range: 190,
    fireRate: 3000,
    unlockCost: 1200,
    ability: "Pull: Pulls enemies 50 units toward the tower every 5 seconds"
  }
};