import { towerStats } from './stats.js';

class Projectile {
  constructor(x, y, target, damage, speed) {
    this.x = x;
    this.y = y;
    this.target = target;
    this.damage = damage;
    this.speed = speed;
    this.isActive = true;
  }

  update(gameState) {
    if (!this.target || this.target.health <= 0) {
      this.isActive = false;
      return;
    }

    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < this.speed) {
      this.target.health -= this.damage;
      this.isActive = false;
      if (this.target.health <= 0) {
        gameState.score += 10;
        gameState.money += 5;
        gameState.enemies = gameState.enemies.filter(e => e !== this.target);
      }
    } else {
      this.x += (dx / distance) * this.speed * gameState.gameSpeed;
      this.y += (dy / distance) * this.speed * gameState.gameSpeed;
    }
  }

  draw(ctx, scaleX, scaleY) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, 5 * Math.min(scaleX, scaleY), 0, 2 * Math.PI);
    ctx.fillStyle = "black";
    ctx.fill();
  }
}

class Tower {
  constructor(x, y, type) {
    this.x = x; // Game coordinates
    this.y = y;
    this.type = type;
    this.level = 1;
    this.stats = towerStats[type];
    this.damage = this.stats.damage || 10;
    this.range = this.stats.range || 100;
    this.fireRate = this.stats.fireRate || 1000; // Milliseconds between shots
    this.ability = this.stats.ability || "none";
    this.lastShot = 0;
    this.selected = false;
  }

  update(gameState, scaleX, scaleY) {
    const now = Date.now();
    if (now - this.lastShot < this.fireRate / gameState.gameSpeed) return;

    // Find a target within range (convert tower position to canvas coordinates for comparison)
    const towerCanvasX = this.x * scaleX;
    const towerCanvasY = this.y * scaleY;
    let target = null;
    for (let enemy of gameState.enemies) {
      const dx = enemy.x - towerCanvasX;
      const dy = enemy.y - towerCanvasY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance <= this.range * Math.min(scaleX, scaleY)) {
        target = enemy;
        break;
      }
    }

    if (target) {
      console.log(`Tower at (gameX=${this.x}, gameY=${this.y}) firing at enemy at (canvasX=${target.x}, canvasY=${target.y})`);
      gameState.projectiles.push(new Projectile(towerCanvasX, towerCanvasY, target, this.damage, 5));
      this.lastShot = now;
    }
  }

  draw(ctx, scaleX, scaleY) {
    // Draw in canvas coordinates
    const canvasX = this.x * scaleX;
    const canvasY = this.y * scaleY;
    ctx.fillStyle = this.type === "basic" ? "blue" : this.type === "sniper" ? "purple" : "orange";
    ctx.fillRect(
      canvasX - 20 * Math.min(scaleX, scaleY),
      canvasY - 20 * Math.min(scaleX, scaleY),
      40 * Math.min(scaleX, scaleY),
      40 * Math.min(scaleX, scaleY)
    );
    if (this.selected) {
      ctx.beginPath();
      ctx.arc(canvasX, canvasY, this.range * Math.min(scaleX, scaleY), 0, 2 * Math.PI);
      ctx.strokeStyle = "yellow";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  upgrade() {
    this.level++;
    this.damage += 5;
    this.range += 10;
    this.fireRate = Math.max(200, this.fireRate - 100); // Faster firing
  }
}

export { Tower, Projectile };