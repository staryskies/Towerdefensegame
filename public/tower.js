import { towerStats } from './stats.js';

class Projectile {
  constructor(x, y, target, damage, speed, ability = "none", abilityData = {}) {
    this.x = x;
    this.y = y;
    this.target = target;
    this.damage = damage;
    this.speed = speed * Math.min(scaleX, scaleY); // Scale speed
    this.isActive = true;
    this.ability = ability;
    this.abilityData = abilityData;
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
      this.applyAbility(gameState);
      this.isActive = false;
      if (this.target.health <= 0) {
        gameState.score += 10;
        gameState.money += 5;
        gameState.enemies = gameState.enemies.filter(e => e !== this.target);
      }
    } else {
      this.x += (dx / distance) * this.speed;
      this.y += (dy / distance) * this.speed;
    }
  }

  applyAbility(gameState) {
    switch (this.ability) {
      case "Multi-Shot":
        if (!this.abilityData.shotCount) {
          this.abilityData.shotCount = 1;
          gameState.projectiles.push(new Projectile(this.x, this.y, this.target, this.damage, this.speed, this.ability, { shotCount: 2 }));
        } else if (this.abilityData.shotCount === 2) {
          this.abilityData.shotCount = 0;
        }
        break;
      case "Splash Damage":
        gameState.enemies.forEach(enemy => {
          const dx = enemy.x - this.target.x;
          const dy = enemy.y - this.target.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance <= 50 * Math.min(scaleX, scaleY)) {
            enemy.health -= this.damage * 0.5;
            if (enemy.health <= 0) {
              gameState.score += 10;
              gameState.money += 5;
              gameState.enemies = gameState.enemies.filter(e => e !== enemy);
            }
          }
        });
        break;
      case "Critical Hit":
        if (Math.random() < 0.2) {
          this.target.health -= this.damage;
        }
        break;
      case "Slow":
        this.target.slowed = true;
        this.target.slowTimer = 2000;
        break;
      case "Area Blast":
        gameState.enemies.forEach(enemy => {
          const dx = enemy.x - this.target.x;
          const dy = enemy.y - this.target.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance <= 75 * Math.min(scaleX, scaleY)) {
            enemy.health -= this.damage * 0.75;
            if (enemy.health <= 0) {
              gameState.score += 10;
              gameState.money += 5;
              gameState.enemies = gameState.enemies.filter(e => e !== enemy);
            }
          }
        });
        break;
      case "Burn":
        if (!this.target.burnTimer) {
          this.target.burnTimer = 3000;
          this.target.burnDamage = 10 / (1000 / 60);
        }
        break;
      case "Homing Missile":
        break;
      case "Poison Cloud":
        if (!this.target.poisonTimer) {
          this.target.poisonTimer = 4000;
          this.target.poisonDamage = 5 / (1000 / 60);
        }
        break;
      case "Chain Lightning":
        let chainedEnemies = [this.target];
        for (let i = 0; i < 2; i++) {
          let closest = null;
          let minDistance = Infinity;
          gameState.enemies.forEach(enemy => {
            if (!chainedEnemies.includes(enemy) && enemy.health > 0) {
              const dx = enemy.x - chainedEnemies[chainedEnemies.length - 1].x;
              const dy = enemy.y - chainedEnemies[chainedEnemies.length - 1].y;
              const distance = Math.sqrt(dx * dx + dy * dy);
              if (distance < minDistance && distance <= 100 * Math.min(scaleX, scaleY)) {
                minDistance = distance;
                closest = enemy;
              }
            }
          });
          if (closest) {
            closest.health -= this.damage * 0.5;
            chainedEnemies.push(closest);
            if (closest.health <= 0) {
              gameState.score += 10;
              gameState.money += 5;
              gameState.enemies = gameState.enemies.filter(e => e !== closest);
            }
          }
        }
        break;
      case "Pull":
        this.target.x -= 50 * (this.target.x - this.abilityData.originX) / Math.sqrt((this.target.x - this.abilityData.originX) ** 2 + (this.target.y - this.abilityData.originY) ** 2);
        this.target.y -= 50 * (this.target.y - this.abilityData.originY) / Math.sqrt((this.target.x - this.abilityData.originX) ** 2 + (this.target.y - this.abilityData.originY) ** 2);
        break;
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
    this.x = x;
    this.y = y;
    this.type = type;
    this.level = 1;
    this.stats = towerStats[type];
    this.damage = this.stats.damage;
    this.range = this.stats.range;
    this.fireRate = this.stats.fireRate;
    this.ability = this.stats.ability;
    this.lastShot = 0;
    this.isActive = true;
    this.selected = false;
    this.angle = 0;
    this.abilityData = {};
  }

  update(gameState, scaleX, scaleY) {
    const now = Date.now();
    const towerCanvasX = this.x * scaleX;
    const towerCanvasY = this.y * scaleY;

    if (this.ability === "Beam") {
      if (now - this.lastShot >= 10000 / gameState.gameSpeed) {
        this.isActive = true;
        this.lastShot = now;
      }
      if (this.isActive && now - this.lastShot <= 5000 / gameState.gameSpeed) {
        gameState.enemies.forEach(enemy => {
          const dx = enemy.x - towerCanvasX;
          const dy = enemy.y - towerCanvasY;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance <= this.range * Math.min(scaleX, scaleY)) {
            enemy.health -= this.damage * gameState.gameSpeed / 60;
            if (enemy.health <= 0) {
              gameState.score += 10;
              gameState.money += 5;
              gameState.enemies = gameState.enemies.filter(e => e !== enemy);
            }
          }
        });
      } else if (now - this.lastShot > 5000 / gameState.gameSpeed) {
        this.isActive = false;
      }
      return;
    }

    if (this.ability === "Pull") {
      if (now - this.lastShot >= 5000 / gameState.gameSpeed) {
        this.isActive = true;
        this.lastShot = now;
        this.abilityData.originX = towerCanvasX;
        this.abilityData.originY = towerCanvasY;
      }
      if (this.isActive) {
        gameState.enemies.forEach(enemy => {
          const dx = enemy.x - towerCanvasX;
          const dy = enemy.y - towerCanvasY;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance <= this.range * Math.min(scaleX, scaleY)) {
            gameState.projectiles.push(new Projectile(towerCanvasX, towerCanvasY, enemy, 0, 0, "Pull", { originX: towerCanvasX, originY: towerCanvasY }));
          }
        });
        this.isActive = false;
      }
      return;
    }

    if (now - this.lastShot < this.fireRate / gameState.gameSpeed) return;

    let target = null;

    if (this.ability === "Homing Missile") {
      let strongest = null;
      let maxHealth = 0;
      gameState.enemies.forEach(enemy => {
        const dx = enemy.x - towerCanvasX;
        const dy = enemy.y - towerCanvasY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance <= this.range * Math.min(scaleX, scaleY) && enemy.health > maxHealth) {
          maxHealth = enemy.health;
          strongest = enemy;
        }
      });
      target = strongest;
    } else if (this.ability === "Multi-Shot") {
      for (let enemy of gameState.enemies) {
        const dx = enemy.x - towerCanvasX;
        const dy = enemy.y - towerCanvasY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance <= this.range * Math.min(scaleX, scaleY)) {
          target = enemy;
          break;
        }
      }
    } else {
      for (let enemy of gameState.enemies) {
        const dx = enemy.x - towerCanvasX;
        const dy = enemy.y - towerCanvasY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance <= this.range * Math.min(scaleX, scaleY)) {
          target = enemy;
          break;
        }
      }
    }

    if (target) {
      if (this.ability === "Multi-Shot") {
        gameState.projectiles.push(new Projectile(towerCanvasX, towerCanvasY, target, this.damage, 5 * Math.min(scaleX, scaleY), this.ability, { shotCount: 1 }));
        gameState.projectiles.push(new Projectile(towerCanvasX, towerCanvasY, target, this.damage, 5 * Math.min(scaleX, scaleY), this.ability, { shotCount: 2 }));
      } else {
        gameState.projectiles.push(new Projectile(towerCanvasX, towerCanvasY, target, this.damage, 5 * Math.min(scaleX, scaleY), this.ability));
      }
      this.lastShot = now;

      const dx = target.x - towerCanvasX;
      const dy = target.y - towerCanvasY;
      this.angle = Math.atan2(dy, dx);
    }
  }

  draw(ctx, scaleX, scaleY) {
    const canvasX = this.x * scaleX;
    const canvasY = this.y * scaleY;
    const baseSize = 20 * Math.min(scaleX, scaleY);
    const complexityFactor = this.stats.unlockCost / 50;

    ctx.save();
    ctx.translate(canvasX, canvasY);
    ctx.rotate(this.angle + Math.PI / 2);

    switch (this.type) {
      case "basic":
        ctx.beginPath();
        ctx.arc(0, 0, baseSize, 0, 2 * Math.PI);
        ctx.fillStyle = "blue";
        break;
      case "archer":
        ctx.beginPath();
        ctx.moveTo(0, -baseSize);
        ctx.lineTo(baseSize * 0.7, baseSize * 0.7);
        ctx.lineTo(-baseSize * 0.7, baseSize * 0.7);
        ctx.closePath();
        ctx.fillStyle = "green";
        break;
      case "cannon":
        ctx.beginPath();
        ctx.rect(-baseSize, -baseSize * 0.5, baseSize * 2, baseSize);
        ctx.fillStyle = "gray";
        break;
      case "sniper":
        ctx.beginPath();
        ctx.moveTo(0, -baseSize * 1.5);
        ctx.lineTo(baseSize, baseSize * 0.5);
        ctx.lineTo(-baseSize, baseSize * 0.5);
        ctx.closePath();
        ctx.fillStyle = "purple";
        break;
      case "freeze":
        ctx.beginPath();
        ctx.arc(0, 0, baseSize * 0.8, 0, 2 * Math.PI);
        ctx.moveTo(0, -baseSize * 0.8);
        ctx.arc(0, -baseSize * 0.8, baseSize * 0.3, 0, 2 * Math.PI);
        ctx.fillStyle = "cyan";
        break;
      case "mortar":
        ctx.beginPath();
        ctx.arc(0, 0, baseSize * 1.2, 0, 2 * Math.PI);
        ctx.moveTo(baseSize * 0.6, 0);
        ctx.arc(baseSize * 0.6, 0, baseSize * 0.4, 0, 2 * Math.PI);
        ctx.fillStyle = "brown";
        break;
      case "laser":
        ctx.beginPath();
        ctx.rect(-baseSize * 0.5, -baseSize * 1.5, baseSize, baseSize * 3);
        ctx.fillStyle = "red";
        break;
      case "tesla":
        ctx.beginPath();
        ctx.moveTo(0, -baseSize);
        ctx.lineTo(baseSize * 0.8, 0);
        ctx.lineTo(0, baseSize);
        ctx.lineTo(-baseSize * 0.8, 0);
        ctx.closePath();
        ctx.fillStyle = "yellow";
        break;
      case "flamethrower":
        ctx.beginPath();
        ctx.moveTo(-baseSize, -baseSize * 0.5);
        ctx.lineTo(baseSize * 1.5, 0);
        ctx.lineTo(-baseSize, baseSize * 0.5);
        ctx.closePath();
        ctx.fillStyle = "orange";
        break;
      case "missile":
        ctx.beginPath();
        ctx.moveTo(0, -baseSize * 2);
        ctx.lineTo(baseSize * 0.8, 0);
        ctx.lineTo(-baseSize * 0.8, 0);
        ctx.closePath();
        ctx.fillStyle = "black";
        break;
      case "poison":
        ctx.beginPath();
        ctx.arc(0, 0, baseSize * 0.9, 0, 2 * Math.PI);
        ctx.moveTo(baseSize * 0.4, -baseSize * 0.4);
        ctx.arc(baseSize * 0.4, -baseSize * 0.4, baseSize * 0.3, 0, 2 * Math.PI);
        ctx.fillStyle = "lime";
        break;
      case "vortex":
        ctx.beginPath();
        ctx.arc(0, 0, baseSize * 1.3, 0, 2 * Math.PI);
        ctx.moveTo(0, -baseSize * 0.8);
        ctx.arc(0, -baseSize * 0.8, baseSize * 0.5, 0, 2 * Math.PI);
        ctx.fillStyle = "indigo";
        break;
    }

    ctx.fill();
    ctx.restore();

    if (this.selected) {
      ctx.beginPath();
      ctx.arc(canvasX, canvasY, this.range * Math.min(scaleX, scaleY), 0, 2 * Math.PI);
      ctx.strokeStyle = "yellow";
      ctx.lineWidth = 2 * Math.min(scaleX, scaleY);
      ctx.stroke();
    }

    if (this.ability === "Beam" && this.isActive) {
      gameState.enemies.forEach(enemy => {
        const dx = enemy.x - canvasX;
        const dy = enemy.y - canvasY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance <= this.range * Math.min(scaleX, scaleY)) {
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(dx, dy);
          ctx.strokeStyle = "red";
          ctx.lineWidth = 2 * Math.min(scaleX, scaleY);
          ctx.stroke();
        }
      });
    }
  }

  upgrade() {
    this.level++;
    this.damage += 5;
    this.range += 10;
    this.fireRate = Math.max(500, this.fireRate - 200);
  }
}

export { Tower, Projectile };