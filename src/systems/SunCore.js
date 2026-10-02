import * as THREE from 'three';

/**
 * SunCore.js
 * The climactic boss entity at the bottom of the excavation abyss.
 * A pulsating mini-sun with solar flares, massive HP, and supernova rewards.
 */
export class SunCore {
  constructor(scene, soundFX, economy, position = new THREE.Vector3(0, -90, 0)) {
    this.scene = scene;
    this.soundFX = soundFX;
    this.economy = economy;
    this.position = position;

    this.maxHp = 50000;
    this.hp = this.maxHp;
    this.isDead = false;

    this.group = new THREE.Group();
    this.group.position.copy(this.position);
    this.scene.add(this.group);

    this.initMeshes();
    this.initParticles();
    this.initLight();
  }

  initMeshes() {
    // Inner molten core
    const coreGeo = new THREE.SphereGeometry(7, 32, 32);
    this.coreMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xf59e0b,
      emissiveIntensity: 2.2,
      roughness: 0.1
    });
    this.coreMesh = new THREE.Mesh(coreGeo, this.coreMat);
    this.coreMesh.userData = { isSunCore: true };
    this.group.add(this.coreMesh);

    // Outer plasma corona
    const coronaGeo = new THREE.SphereGeometry(8.5, 24, 24);
    this.coronaMat = new THREE.MeshBasicMaterial({
      color: 0xf97316,
      transparent: true,
      opacity: 0.35,
      wireframe: true
    });
    this.coronaMesh = new THREE.Mesh(coronaGeo, this.coronaMat);
    this.group.add(this.coronaMesh);
  }

  initLight() {
    this.sunLight = new THREE.PointLight(0xfbbf24, 3.5, 120, 1.2);
    this.sunLight.position.set(0, 0, 0);
    this.group.add(this.sunLight);
  }

  initParticles() {
    const particleCount = 120;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const speeds = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      const radius = 8 + Math.random() * 5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      speeds[i] = 0.5 + Math.random() * 1.5;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.particleSpeeds = speeds;

    const mat = new THREE.PointsMaterial({
      color: 0xfde047,
      size: 0.6,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });

    this.particles = new THREE.Points(geo, mat);
    this.group.add(this.particles);
  }

  // Swap placeholder with custom 3D model
  setCustomModel(newModel) {
    if (this.customModel) {
      this.group.remove(this.customModel);
    }
    this.coreMesh.visible = false;
    this.coronaMesh.visible = false;

    this.customModel = newModel;
    this.customModel.userData = { isSunCore: true };
    this.customModel.traverse(c => {
      c.userData = { isSunCore: true };
    });
    this.group.add(this.customModel);
  }

  // Damage the core
  takeDamage(amount) {
    if (this.isDead) return;

    this.hp -= amount;
    this.soundFX.playCoreHit();

    // Spawn 1-2 core shards occasionally
    if (Math.random() < 0.15) {
      this.economy.addOre('coreShard', 1);
      this.soundFX.playPickup();
    }

    // Flash core
    this.coreMat.emissiveIntensity = 4.0;
    setTimeout(() => {
      this.coreMat.emissiveIntensity = 2.2;
    }, 100);

    if (this.hp <= 0) {
      this.defeat();
    }
  }

  defeat() {
    this.isDead = true;
    this.hp = 0;

    this.soundFX.playSupernova();
    this.economy.rewardPlanetCore();

    // Trigger Screen Flash
    const flash = document.getElementById('screen-flash');
    if (flash) {
      flash.style.opacity = '1';
      setTimeout(() => {
        flash.style.opacity = '0';
      }, 700);
    }

    // Re-ignite next tier after 3 seconds
    setTimeout(() => {
      this.maxHp = Math.round(this.maxHp * 1.5);
      this.hp = this.maxHp;
      this.isDead = false;
    }, 3000);
  }

  update(delta, time) {
    // Gentle pulsation
    const pulse = Math.sin(time * 3) * 0.15;
    this.coreMesh.scale.setScalar(1 + pulse);
    this.coronaMesh.rotation.y += delta * 0.4;
    this.coronaMesh.rotation.x += delta * 0.2;

    // Rotate custom model if present
    if (this.customModel) {
      this.customModel.rotation.y += delta * 0.5;
    }

    // Orbit particles
    if (this.particles) {
      this.particles.rotation.y += delta * 0.6;
      this.particles.rotation.z += delta * 0.3;
    }
  }
}
