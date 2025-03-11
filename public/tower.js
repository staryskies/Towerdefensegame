import { towerStats } from './stats.js';

class Projectile {
  constructor(x, y, target, damage, speed, scaleX, scaleY, ability = "None", abilityData = {}) {
    this.x = x;
    this.y = y;
    this.target = target;
    this.damage = damage;
    this.speed = speed * Math.min(scaleX, scaleY);
    this.scaleX = scaleX;
    this.scaleY = scaleY;
    this.isActive = true;
    this.ability = ability.split(":")[0].trim(); // Extract ability name
    this.abilityData = abilityData;
    this.trail = [];
  }

  update(gameState) {
    if (!this.target || this.target.health <= 0) {
      this.isActive = false;
      return;
    }

    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const scaledSpeed = this.speed * gameState.gameSpeed;
    if (distance < scaledSpeed) {
      this.target.health -= this.damage;
      this.applyAbility(gameState);
      this.isActive = false;
      if (this.target.health <= 0) {
        gameState.score += 10;
        gameState.money += 5;
        gameState.enemies = gameState.enemies.filter(e => e !== this.target);
      }
    } else {
      this.trail.push({ x: this.x, y: this.y });
      if (this.trail.length > 10) this.trail.shift();
      this.x += (dx / distance) * scaledSpeed;
      this.y += (dy / distance) * scaledSpeed;
    }
  }

  applyAbility(gameState) {
    switch (this.ability) {
      case "Multi-Shot":
        if (!this.abilityData.shotCount) {
          this.abilityData.shotCount = 1;
          gameState.projectiles.push(new Projectile(this.x, this.y, this.target, this.damage, 5, this.scaleX, this.scaleY, this.ability, { shotCount: 2 }));
        }
        break;
      case "Splash Damage":
        gameState.enemies.forEach(enemy => {
          const dx = enemy.x - this.target.x;
          const dy = enemy.y - this.target.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance <= 50 * Math.min(this.scaleX, this.scaleY)) {
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
          if (distance <= 75 * Math.min(this.scaleX, this.scaleY)) {
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
              if (distance < minDistance && distance <= 100 * Math.min(this.scaleX, this.scaleY)) {
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
        const pullDistance = 50 * Math.min(this.scaleX, this.scaleY);
        const dx = this.target.x - this.abilityData.originX;
        const dy = this.target.y - this.abilityData.originY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0) {
          this.target.x -= (dx / dist) * pullDistance;
          this.target.y -= (dy / dist) * pullDistance;
        }
        break;
    }
  }

  draw(ctx) {
    const scaledSize = 15 * Math.min(this.scaleX, this.scaleY);
    ctx.save();
    ctx.translate(this.x, this.y);

    // Draw trail
    this.trail.forEach((point, index) => {
      ctx.beginPath();
      ctx.arc(point.x - this.x, point.y - this.y, scaledSize * (1 - index * 0.1), 0, 2 * Math.PI);
      ctx.fillStyle = `rgba(255, 255, 255, ${0.8 - index * 0.08})`;
      ctx.fill();
    });

    // Draw projectile with ability-specific effect
    switch (this.ability) {
      case "None":
        ctx.beginPath();
        ctx.arc(0, 0, scaledSize, 0, 2 * Math.PI);
        ctx.fillStyle = "black";
        ctx.fill();
        break;
      case "Multi-Shot":
        ctx.beginPath();
        ctx.arc(0, 0, scaledSize * 0.8, 0, 2 * Math.PI);
        ctx.fillStyle = "gray";
        ctx.fill();
        ctx.strokeStyle = "white"; // Small flash effect
        ctx.lineWidth = 2;
        ctx.stroke();
        break;
      case "Splash Damage":
        ctx.beginPath();
        ctx.arc(0, 0, scaledSize * 1.2, 0, 2 * Math.PI);
        ctx.fillStyle = "orange";
        ctx.fill();
        ctx.strokeStyle = `rgba(255, 165, 0, ${Math.sin(Date.now() * 0.01) * 0.5 + 0.5})`; // Pulsing ring
        ctx.stroke();
        break;
      case "Critical Hit":
        ctx.beginPath();
        ctx.moveTo(-scaledSize, -scaledSize);
        ctx.lineTo(scaledSize, scaledSize);
        ctx.lineTo(-scaledSize, scaledSize);
        ctx.lineTo(scaledSize, -scaledSize);
        ctx.closePath();
        ctx.fillStyle = "red";
        ctx.fill();
        ctx.fillStyle = "rgba(255, 0, 0, 0.5)"; // Small burst
        ctx.arc(0, 0, scaledSize * 1.5, 0, Math.PI * 2);
        ctx.fill();
        break;
      case "Slow":
        ctx.beginPath();
        ctx.arc(0, 0, scaledSize, 0, 2 * Math.PI);
        ctx.fillStyle = "cyan";
        ctx.fill();
        ctx.strokeStyle = "lightblue"; // Icy shimmer
        ctx.lineWidth = 3;
        ctx.stroke();
        break;
      case "Area Blast":
        ctx.beginPath();
        ctx.arc(0, 0, scaledSize * 1.5, 0, 2 * Math.PI);
        ctx.fillStyle = "darkorange";
        ctx.fill();
        ctx.fillStyle = "rgba(255, 140, 0, 0.3)"; // Explosion fade
        ctx.arc(0, 0, scaledSize * 2, 0, Math.PI * 2);
        ctx.fill();
        break;
      case "Burn":
        ctx.beginPath();
        ctx.arc(0, 0, scaledSize, 0, 2 * Math.PI);
        ctx.fillStyle = "red";
        ctx.fill();
        ctx.fillStyle = `rgba(255, 69, 0, ${Math.random() * 0.5 + 0.5})`; // Flickering flame
        ctx.arc(0, scaledSize * 0.5, scaledSize * 0.5, 0, Math.PI * 2);
        ctx.fill();
        break;
      case "Homing Missile":
        ctx.beginPath();
        ctx.moveTo(0, -scaledSize * 1.5);
        ctx.lineTo(scaledSize, scaledSize);
        ctx.lineTo(-scaledSize, scaledSize);
        ctx.closePath();
        ctx.fillStyle = "black";
        ctx.fill();
        ctx.strokeStyle = "gray"; // Smoke trail effect
        ctx.lineWidth = 1;
        ctx.stroke();
        break;
      case "Poison Cloud":
        ctx.beginPath();
        ctx.arc(0, 0, scaledSize, 0, 2 * Math.PI);
        ctx.fillStyle = "lime";
        ctx.fill();
        ctx.fillStyle = "rgba(0, 255, 0, 0.4)"; // Toxic mist
        ctx.arc(0, 0, scaledSize * 1.5, 0, Math.PI * 2);
        ctx.fill();
        break;
      case "Chain Lightning":
        ctx.beginPath();
        ctx.moveTo(-scaledSize, 0);
        ctx.lineTo(scaledSize, 0);
        ctx.lineTo(0, -scaledSize);
        ctx.closePath();
        ctx.fillStyle = "yellow";
        ctx.fill();
        ctx.strokeStyle = `rgba(255, 255, 0, ${Math.sin(Date.now() * 0.02) * 0.5 + 0.5})`; // Electric spark
        ctx.lineWidth = 2;
        ctx.stroke();
        break;
      case "Pull":
        ctx.beginPath();
        ctx.arc(0, 0, scaledSize, 0, 2 * Math.PI);
        ctx.fillStyle = "purple";
        ctx.fill();
        ctx.strokeStyle = "violet"; // Swirl effect
        ctx.lineWidth = 2;
        ctx.stroke();
        break;
    }
    ctx.restore();
  }
}

class Tower {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.level = 1;
    this.stats = towerStats[type];
    this.damage = this.stats.damage * (1 + this.stats.unlockCost / 200);
    this.range = this.stats.range;
    this.fireRate = this.stats.fireRate;
    this.ability = this.stats.ability;
    this.lastShot = Date.now() - 10000; // Start ready to fire
    this.isActive = false;
    this.selected = false;
    this.angle = 0;
    this.abilityData = {};
  }

  update(gameState, scaleX, scaleY) {
    const now = Date.now();
    const towerCanvasX = this.x * scaleX;
    const towerCanvasY = this.y * scaleY;
    const abilityName = this.ability.split(":")[0].trim();

    // Special continuous abilities
    if (abilityName === "Beam") {
      if (now - this.lastShot >= 10000 / gameState.gameSpeed) {
        this.isActive = true;
        this.lastShot = now;
        console.log(`Beam activated for ${this.type}`);
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

    if (abilityName === "Pull") {
      if (now - this.lastShot >= 5000 / gameState.gameSpeed) {
        this.isActive = true;
        this.lastShot = now;
        this.abilityData.originX = towerCanvasX;
        this.abilityData.originY = towerCanvasY;
        console.log(`Pull activated for ${this.type}`);
        gameState.enemies.forEach(enemy => {
          const dx = enemy.x - towerCanvasX;
          const dy = enemy.y - towerCanvasY;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance <= this.range * Math.min(scaleX, scaleY)) {
            gameState.projectiles.push(new Projectile(towerCanvasX, towerCanvasY, enemy, 0, 0, scaleX, scaleY, "Pull", { originX: towerCanvasX, originY: towerCanvasY }));
          }
        });
        this.isActive = false;
      }
      return;
    }

    // Projectile-based abilities
    if (now - this.lastShot < this.fireRate / gameState.gameSpeed) return;

    let target = null;
    if (abilityName === "Homing Missile") {
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
      if (abilityName === "Multi-Shot") {
        gameState.projectiles.push(new Projectile(towerCanvasX, towerCanvasY, target, this.damage, 5, scaleX, scaleY, this.ability, { shotCount: 1 }));
        gameState.projectiles.push(new Projectile(towerCanvasX, towerCanvasY, target, this.damage, 5, scaleX, scaleY, this.ability, { shotCount: 2 }));
      } else {
        gameState.projectiles.push(new Projectile(towerCanvasX, towerCanvasY, target, this.damage, 5, scaleX, scaleY, this.ability));
      }
      this.lastShot = now;
      this.angle = Math.atan2(target.y - towerCanvasY, target.x - towerCanvasX);
    }
  }

  draw(ctx, scaleX, scaleY) {
    const canvasX = this.x * scaleX;
    const canvasY = this.y * scaleY;
    const baseSize = 20 * Math.min(scaleX, scaleY);
    const abilityName = this.ability.split(":")[0].trim();

    ctx.save();
    ctx.translate(canvasX, canvasY);
    ctx.rotate(this.angle + Math.PI / 2);

    // Draw tower shape
    switch (this.type) {
      case "basic": ctx.arc(0, 0, baseSize, 0, 2 * Math.PI); ctx.fillStyle = "blue"; break;
      case "archer": ctx.moveTo(0, -baseSize); ctx.lineTo(baseSize * 0.7, baseSize * 0.7); ctx.lineTo(-baseSize * 0.7, baseSize * 0.7); ctx.closePath(); ctx.fillStyle = "green"; break;
      case "cannon": ctx.rect(-baseSize, -baseSize * 0.5, baseSize * 2, baseSize); ctx.fillStyle = "gray"; break;
      case "sniper": ctx.moveTo(0, -baseSize * 1.5); ctx.lineTo(baseSize, baseSize * 0.5); ctx.lineTo(-baseSize, baseSize * 0.5); ctx.closePath(); ctx.fillStyle = "purple"; break;
      case "freeze": ctx.arc(0, 0, baseSize * 0.8, 0, 2 * Math.PI); ctx.moveTo(0, -baseSize * 0.8); ctx.arc(0, -baseSize * 0.8, baseSize * 0.3, 0, 2 * Math.PI); ctx.fillStyle = "cyan"; break;
      case "mortar": ctx.arc(0, 0, baseSize * 1.2, 0, 2 * Math.PI); ctx.moveTo(baseSize * 0.6, 0); ctx.arc(baseSize * 0.6, 0, baseSize * 0.4, 0, 2 * Math.PI); ctx.fillStyle = "brown"; break;
      case "laser": ctx.rect(-baseSize * 0.5, -baseSize * 1.5, baseSize, baseSize * 3); ctx.fillStyle = "red"; break;
      case "tesla": ctx.moveTo(0, -baseSize); ctx.lineTo(baseSize * 0.8, 0); ctx.lineTo(0, baseSize); ctx.lineTo(-baseSize * 0.8, 0); ctx.closePath(); ctx.fillStyle = "yellow"; break;
      case "flamethrower": ctx.moveTo(-baseSize, -baseSize * 0.5); ctx.lineTo(baseSize * 1.5, 0); ctx.lineTo(-baseSize, baseSize * 0.5); ctx.closePath(); ctx.fillStyle = "orange"; break;
      case "missile": ctx.moveTo(0, -baseSize * 2); ctx.lineTo(baseSize * 0.8, 0); ctx.lineTo(-baseSize * 0.8, 0); ctx.closePath(); ctx.fillStyle = "black"; break;
      case "poison": ctx.arc(0, 0, baseSize * 0.9, 0, 2 * Math.PI); ctx.moveTo(baseSize * 0.4, -baseSize * 0.4); ctx.arc(baseSize * 0.4, -baseSize * 0.4, baseSize * 0.3, 0, 2 * Math.PI); ctx.fillStyle = "lime"; break;
      case "vortex": ctx.arc(0, 0, baseSize * 1.3, 0, 2 * Math.PI); ctx.moveTo(0, -baseSize * 0.8); ctx.arc(0, -baseSize * 0.8, baseSize * 0.5, 0, 2 * Math.PI); ctx.fillStyle = "indigo"; break;
    }
    ctx.fill();

    // Ability-specific effects on tower
    switch (abilityName) {
      case "Beam":
        if (this.isActive) {
          gameState.enemies.forEach(enemy => {
            const dx = enemy.x - canvasX;
            const dy = enemy.y - canvasY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance <= this.range * Math.min(scaleX, scaleY)) {
              ctx.beginPath();
              ctx.moveTo(0, 0);
              ctx.lineTo(enemy.x - canvasX, enemy.y - canvasY);
              ctx.strokeStyle = `rgba(255, 0, 0, ${Math.sin(Date.now() * 0.01) * 0.5 + 0.5})`; // Pulsing beam
              ctx.lineWidth = 4;
              ctx.stroke();
            }
          });
        }
        break;
      case "Pull":
        if (this.isActive) {
          ctx.beginPath();
          ctx.arc(0, 0, baseSize * 1.5, 0, Math.PI * 2 * (Date.now() % 1000 / 1000)); // Swirling vortex
          ctx.strokeStyle = "violet";
          ctx.lineWidth = 3;
          ctx.stroke();
        }
        break;
      case "Multi-Shot":
        if (Date.now() - this.lastShot < 100) {
          ctx.beginPath();
          ctx.arc(0, -baseSize, baseSize * 0.5, 0, Math.PI * 2); // Flash at tip
          ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
          ctx.fill();
        }
        break;
      case "Splash Damage":
        if (Date.now() - this.lastShot < 200) {
          ctx.beginPath();
          ctx.arc(0, 0, baseSize * 2, 0, Math.PI * 2); // Explosion ring
          ctx.strokeStyle = "rgba(255, 165, 0, 0.5)";
          ctx.lineWidth = 2;
          ctx.stroke();
        }
        break;
      case "Critical Hit":
        if (Date.now() - this.lastShot < 100) {
          ctx.beginPath();
          ctx.arc(0, -baseSize * 1.5, baseSize * 0.5, 0, Math.PI * 2); // Spark at barrel
          ctx.fillStyle = "rgba(255, 0, 0, 0.7)";
          ctx.fill();
        }
        break;
      case "Slow":
        if (Date.now() - this.lastShot < 150) {
          ctx.beginPath();
          ctx.arc(0, 0, baseSize * 1.2, 0, Math.PI * 2); // Icy mist
          ctx.fillStyle = "rgba(173, 216, 230, 0.3)";
          ctx.fill();
        }
        break;
      case "Area Blast":
        if (Date.now() - this.lastShot < 200) {
          ctx.beginPath();
          ctx.arc(0, 0, baseSize * 2.5, 0, Math.PI * 2); // Larger blast
          ctx.strokeStyle = "rgba(255, 140, 0, 0.4)";
          ctx.lineWidth = 3;
          ctx.stroke();
        }
        break;
      case "Burn":
        if (Date.now() - this.lastShot < 100) {
          ctx.beginPath();
          ctx.arc(baseSize * 1.5, 0, baseSize * 0.5, 0, Math.PI * 2); // Flame burst
          ctx.fillStyle = `rgba(255, 69, 0, ${Math.random() * 0.5 + 0.5})`;
          ctx.fill();
        }
        break;
      case "Homing Missile":
        if (Date.now() - this.lastShot < 150) {
          ctx.beginPath();
          ctx.arc(0, -baseSize * 2, baseSize * 0.5, 0, Math.PI * 2); // Smoke puff
          ctx.fillStyle = "rgba(128, 128, 128, 0.6)";
          ctx.fill();
        }
        break;
      case "Poison Cloud":
        if (Date.now() - this.lastShot < 200) {
          ctx.beginPath();
          ctx.arc(0, 0, baseSize * 1.5, 0, Math.PI * 2); // Toxic cloud
          ctx.fillStyle = "rgba(0, 255, 0, 0.3)";
          ctx.fill();
        }
        break;
      case "Chain Lightning":
        if (Date.now() - this.lastShot < 100) {
          ctx.beginPath();
          ctx.arc(0, 0, baseSize * 1.2, 0, Math.PI * 2); // Electric pulse
          ctx.strokeStyle = `rgba(255, 255, 0, ${Math.sin(Date.now() * 0.02) * 0.5 + 0.5})`;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
        break;
    }

    ctx.restore();

    if (this.selected) {
      ctx.beginPath();
      ctx.arc(canvasX, canvasY, this.range * Math.min(scaleX, scaleY), 0, 2 * Math.PI);
      ctx.strokeStyle = "yellow";
      ctx.lineWidth = 2 * Math.min(scaleX, scaleY);
      ctx.stroke();
    }
  }

  upgrade() {
    this.level++;
    this.damage += 15;
    this.range += 10;
    this.fireRate = Math.max(500, this.fireRate - 200);
  }
}

export { Tower, Projectile };