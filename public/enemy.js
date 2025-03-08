export class Enemy {
  constructor(path, type, spawnPoint) {
    this.path = path; // Array of path points
    this.currentPoint = 0; // Current target point in the path
    this.x = spawnPoint.x; // Initial x position (scaled)
    this.y = spawnPoint.y; // Initial y position (scaled)
    this.type = type; // Enemy type (basic, tank, fast, etc.)
    this.health = type.health; // Current health
    this.maxHealth = type.health; // Maximum health
    this.speed = type.speed; // Movement speed
    this.radius = type.radius; // Radius (will be scaled during drawing)
    this.color = type.color; // Enemy color
    this.isAlive = true; // Track if the enemy is alive
  }

  /**
   * Take damage and check if the enemy is dead.
   * @param {number} damage - The amount of damage to take.
   * @returns {boolean} - True if the enemy is dead, false otherwise.
   */
  takeDamage(damage) {
    console.log(`Enemy took ${damage} damage. Health: ${this.health} -> ${this.health - damage}`);
    this.health -= damage;
    if (this.health <= 0) {
      console.log("Enemy is dead!");
      this.isAlive = false;
      return true; // Enemy is dead
    }
    return false; // Enemy is still alive
  }

  /**
   * Update the enemy's position and state.
   * @param {Object} gameState - The current game state.
   */
  update(gameState) {
    if (!this.isAlive) return; // Skip if the enemy is dead

    // Check if the enemy has reached the end of the path
    if (this.currentPoint >= this.path.length - 1) {
      this.handleEndOfPath(gameState);
      return;
    }

    // Move towards the next point in the path
    this.moveTowardsNextPoint();
  }

  /**
   * Move the enemy towards the next point in the path.
   */
  moveTowardsNextPoint() {
    const target = this.path[this.currentPoint + 1];
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > this.speed) {
      // Move towards the target point
      this.x += (dx / distance) * this.speed;
      this.y += (dy / distance) * this.speed;
    } else {
      // Reached the target point, move to the next point
      this.currentPoint++;
    }
  }

  /**
   * Handle the enemy reaching the end of the path.
   * @param {Object} gameState - The current game state.
   */
  handleEndOfPath(gameState) {
    gameState.playerHealth--; // Reduce player health
    this.isAlive = false; // Mark the enemy as dead
    console.log("Enemy reached the end! Player health: ", gameState.playerHealth);

    // Check for game over
    if (gameState.playerHealth <= 0) {
      gameState.gameOver = true;
      console.log("Game Over!");
    }
  }

  /**
   * Draw the enemy on the canvas.
   * @param {CanvasRenderingContext2D} ctx - The canvas rendering context.
   * @param {number} scaleX - Horizontal scaling factor.
   * @param {number} scaleY - Vertical scaling factor.
   */
  draw(ctx, scaleX, scaleY) {
    if (!this.isAlive) return; // Skip if the enemy is dead

    // Draw the enemy body (scaled)
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * Math.min(scaleX, scaleY), 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.closePath();

    // Draw the health bar (scaled)
    const healthWidth = 30 * scaleX; // Width of the health bar
    const healthHeight = 5 * scaleY; // Height of the health bar
    const healthX = this.x - healthWidth / 2; // X position of the health bar
    const healthY = this.y - this.radius * Math.min(scaleX, scaleY) - 10; // Y position of the health bar

    // Draw the background of the health bar
    ctx.fillStyle = "black";
    ctx.fillRect(healthX, healthY, healthWidth, healthHeight);

    // Draw the current health
    ctx.fillStyle = "green";
    ctx.fillRect(
      healthX,
      healthY,
      (this.health / this.maxHealth) * healthWidth,
      healthHeight
    );

    // Draw the health number
    ctx.fillStyle = "black";
    ctx.font = `${12 * Math.min(scaleX, scaleY)}px Arial`; // Scale font size
    ctx.textAlign = "center";
    ctx.fillText(Math.round(this.health), this.x, healthY - 5);
  }
}