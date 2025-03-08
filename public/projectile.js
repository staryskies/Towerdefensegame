export class Projectile {
  constructor(x, y, target, damage) {
    this.x = x; // Original X coordinate
    this.y = y; // Original Y coordinate
    this.target = target; // Target enemy
    this.damage = damage; // Damage dealt by the projectile
    this.speed = 5; // Speed of the projectile
    this.isActive = true; // Whether the projectile is active
  }

  /**
   * Update the projectile's position and state.
   * @param {Object} gameState - The current game state.
   */
  update(gameState) {
    if (!this.isActive) return;

    // Move towards the target
    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance <= this.speed) {
      // Hit the target
      this.isActive = false;
      if (this.target.takeDamage(this.damage)) {
        // Enemy is dead
        gameState.score += 10;
        gameState.money += 5;
        console.log(`Enemy killed! Score: ${gameState.score}, Money: ${gameState.money}`);

        // Remove the enemy from the game state
        const enemyIndex = gameState.enemies.indexOf(this.target);
        if (enemyIndex !== -1) {
          gameState.enemies.splice(enemyIndex, 1);
        }
      }
    } else {
      // Move towards the target
      this.x += (dx / distance) * this.speed;
      this.y += (dy / distance) * this.speed;
    }
  }

  /**
   * Draw the projectile on the canvas.
   * @param {CanvasRenderingContext2D} ctx - The canvas rendering context.
   * @param {number} scaleX - Horizontal scaling factor.
   * @param {number} scaleY - Vertical scaling factor.
   */
  draw(ctx, scaleX, scaleY) {
    if (!this.isActive) return;

    // Draw the projectile (scaled)
    const scaledRadius = 5 * Math.min(scaleX, scaleY);
    ctx.beginPath();
    ctx.arc(this.x, this.y, scaledRadius, 0, Math.PI * 2);
    ctx.fillStyle = "yellow";
    ctx.fill();
    ctx.closePath();
  }
}