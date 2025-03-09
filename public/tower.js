import { towerStats } from './stats.js';


// Projectile Class
class Projectile {
  constructor(x, y, target, damage, color = "yellow") {
    this.x = x;           // Starting X coordinate (scaled)
    this.y = y;           // Starting Y coordinate (scaled)
    this.target = target; // Target enemy object
    this.damage = damage; // Damage to deal on impact
    this.color = color;   // Color from tower or default
    this.speed = 5;       // Pixels per frame
    this.isActive = true; // Active state for cleanup
  }

  update(gameState) {
    if (!this.isActive || !this.target) {
      this.isActive = false;
      return;
    }

    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance <= this.speed * gameState.gameSpeed) {
      this.isActive = false;
      if (this.target.health > 0) {
        this.target.health -= this.damage;
        if (this.target.health <= 0) {
          gameState.score += 10;
          gameState.money += 5;
          const enemyIndex = gameState.enemies.indexOf(this.target);
          if (enemyIndex !== -1) {
            gameState.enemies.splice(enemyIndex, 1);
          }
          console.log(`Enemy killed! Score: ${gameState.score}, Money: ${gameState.money}`);
        }
      }
    } else {
      const moveX = (dx / distance) * this.speed * gameState.gameSpeed;
      const moveY = (dy / distance) * this.speed * gameState.gameSpeed;
      this.x += moveX;
      this.y += moveY;
    }

    if (!gameState.enemies.includes(this.target)) {
      this.isActive = false;
    }
  }

  draw(ctx, scaleX, scaleY) {
    if (!this.isActive) return;
    const scaledRadius = 5 * Math.min(scaleX, scaleY);
    ctx.beginPath();
    ctx.arc(this.x, this.y, scaledRadius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.closePath();
  }
}

// Tower Class
class Tower {
  constructor(x, y, type) {
    this.x = x; // Unscaled coordinates
    this.y = y;
    this.type = type;
    this.damage = towerStats[type].damage;
    this.range = towerStats[type].range;
    this.cooldown = towerStats[type].cooldown;
    this.color = towerStats[type].color;
    this.ability = towerStats[type].ability;
    this.cooldownTimer = 0;
    this.level = 1;
    this.selected = false;
  }

  update(gameState) {
    if (this.cooldownTimer > 0) this.cooldownTimer--;
    if (this.cooldownTimer === 0) {
      for (let enemy of gameState.enemies) {
        const dx = enemy.x - this.x * scaleX;
        const dy = enemy.y - this.y * scaleY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance <= this.range * Math.min(scaleX, scaleY)) {
          if (this.ability === "Area Damage") {
            gameState.enemies.forEach(e => {
              const d = Math.sqrt((e.x - this.x * scaleX) ** 2 + (e.y - this.y * scaleY) ** 2);
              if (d <= this.range * Math.min(scaleX, scaleY)) {
                gameState.projectiles.push(new Projectile(this.x * scaleX, this.y * scaleY, e, this.damage, this.color));
              }
            });
          } else if (this.ability === "Slows Enemies") {
            enemy.slowed = true;
            setTimeout(() => (enemy.slowed = false), 2000);
            gameState.projectiles.push(new Projectile(this.x * scaleX, this.y * scaleY, enemy, this.damage, this.color));
          } else {
            gameState.projectiles.push(new Projectile(this.x * scaleX, this.y * scaleY, enemy, this.damage, this.color));
          }
          this.cooldownTimer = this.cooldown;
          break;
        }
      }
    }
  }

  draw(ctx, scaleX, scaleY) {
    ctx.fillStyle = this.color;
    const size = 40 * Math.min(scaleX, scaleY);
    ctx.fillRect(this.x * scaleX - size / 2, this.y * scaleY - size / 2, size, size);
    if (this.selected) {
      ctx.beginPath();
      ctx.arc(this.x * scaleX, this.y * scaleY, this.range * Math.min(scaleX, scaleY), 0, 2 * Math.PI);
      ctx.strokeStyle = "yellow";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  upgrade() {
    this.level++;
    this.damage += Math.floor(this.damage * 0.5);
    this.range += 20;
    this.cooldown = Math.max(this.cooldown - 10, 5);
  }
}

// Note: towerStats is defined in game.js, so we assume it's globally available
// If you want to make this more modular, you could export it from a separate file
export { Tower, Projectile };