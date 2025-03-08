import { Projectile } from "./projectile.js";
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

export class Tower {
  constructor(x, y, type, scaleX, scaleY) {
    this.x = x; // Unscaled X coordinate
    this.y = y; // Unscaled Y coordinate
    this.type = type;
    this.range = towerStats[type].range; // Unscaled range
    this.damage = towerStats[type].damage;
    this.cooldown = towerStats[type].cooldown;
    this.color = towerStats[type].color;
    this.lastShot = 0; // Timestamp of the last shot
    this.level = 1; // Tower level
    this.selected = false; // Whether the tower is selected
    this.scaleX = scaleX; // Store scaleX
    this.scaleY = scaleY; // Store scaleY
  }

  /**
   * Update the tower's state.
   * @param {Object} gameState - The current game state.
   */
  update(gameState) {
    const now = Date.now();
    if (now - this.lastShot >= this.cooldown) {
      const target = this.findTarget(gameState.enemies);
      if (target) {
        this.shoot(target, gameState);
        this.lastShot = now;
      }
    }
  }

  /**
   * Find a target within range.
   * @param {Array} enemies - Array of enemies.
   * @returns {Enemy|null} - The target enemy, or null if no target is found.
   */
  findTarget(enemies) {
    for (const enemy of enemies) {
      const dx = enemy.x - this.x * this.scaleX; // Convert tower position to scaled coordinates
      const dy = enemy.y - this.y * this.scaleY; // Convert tower position to scaled coordinates
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance <= this.range * Math.min(this.scaleX, this.scaleY)) { // Scale range
        return enemy;
      }
    }
    return null;
  }

  /**
   * Shoot at the target enemy.
   * @param {Enemy} target - The target enemy.
   * @param {Object} gameState - The current game state.
   */
  shoot(target, gameState) {
    gameState.projectiles.push(new Projectile(this.x * this.scaleX, this.y * this.scaleY, target, this.damage));
  }

  /**
   * Draw the tower on the canvas.
   * @param {CanvasRenderingContext2D} ctx - The canvas rendering context.
   */
  draw(ctx) {
    // Convert tower position to scaled coordinates
    const scaledX = this.x * this.scaleX;
    const scaledY = this.y * this.scaleY;

    // Draw the tower body (scaled)
    const scaledRadius = 20 * Math.min(this.scaleX, this.scaleY);
    ctx.beginPath();
    ctx.arc(scaledX, scaledY, scaledRadius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.closePath();

    // Draw the range circle if the tower is selected
    if (this.selected) {
      ctx.beginPath();
      ctx.arc(scaledX, scaledY, this.range * Math.min(this.scaleX, this.scaleY), 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(0, 0, 0, 0.2)";
      ctx.stroke();
      ctx.closePath();
    }
  }

  /**
   * Upgrade the tower.
   * @param {Object} gameState - The current game state.
   */
  upgrade(gameState) {
    if (gameState.money >= 100) {
      this.level++;
      this.damage += 10;
      this.range += 20; // Increase unscaled range
      gameState.money -= 100;
    } else {
      alert("Not enough money to upgrade!");
    }
  }
}