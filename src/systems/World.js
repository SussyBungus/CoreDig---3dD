import * as THREE from 'three';

/**
 * World.js
 * - Surface Mining Camp & Outpost:
 *   1. Tool Forge & Armory (Equipment Upgrades)
 *   2. Mineral Smelter & Refinery (Ore Selling & Smelting)
 *   3. Tech & Drone Lab (Tycoon Automation & Drones)
 *   4. Heavy Mining Hauler Truck, Quonset Hut Barracks, Fuel Reservoirs, Pallets & Barrels
 * - Dynamic Day / Night cycle (rotating Sun & Moon, sky/fog transitions, day counter)
 * - Block damage crumbling, cracking, and debris bursts
 * - Voxel collision detection & ore drops
 */
export class World {
  constructor(scene, soundFX, economy) {
    this.scene = scene;
    this.soundFX = soundFX;
    this.economy = economy;

    this.radius = 32; // 100m scale boundary
    this.blockSize = 2.0;

    // Day / Night cycle
    this.timeOfDay = 10.0;
    this.dayCount = 1;
    this.cycleSpeed = 0.05;

    this.blocks = new Map();
    this.oreDrops = [];
    this.debrisParticles = [];

    this.initSkyAndLighting();
    this.initSurfaceEnvironment();
    this.initClouds();
    this.initDistantScenery();
    this.initMiningCrane();
    this.initCircularPerimeter();

    // Camp Buildings & Outpost Shops
    this.initMiningCampOutpost();

    this.initSubterraneanStrata();
  }

  // --- GRID HELPERS ---

  gridCoord(val) {
    return Math.round(val / this.blockSize);
  }

  gridKey(gx, gy, gz) {
    return `${gx},${gy},${gz}`;
  }

  getBlockAt(x, y, z) {
    const gx = this.gridCoord(x);
    const gy = this.gridCoord(y);
    const gz = this.gridCoord(z);
    return this.blocks.get(this.gridKey(gx, gy, gz)) || null;
  }

  isSolidAt(x, y, z) {
    return this.getBlockAt(x, y, z) !== null;
  }

  // --- SKY & LIGHTING ---

  initSkyAndLighting() {
    this.ambientLight = new THREE.AmbientLight(0xffedd5, 0.65);
    this.scene.add(this.ambientLight);

    this.sunLight = new THREE.DirectionalLight(0xfff7ed, 2.2);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 300;
    this.sunLight.shadow.camera.left = -70;
    this.sunLight.shadow.camera.right = 70;
    this.sunLight.shadow.camera.top = 70;
    this.sunLight.shadow.camera.bottom = -70;
    this.scene.add(this.sunLight);

    this.moonLight = new THREE.DirectionalLight(0x93c5fd, 0.4);
    this.scene.add(this.moonLight);

    this.sunMesh = new THREE.Mesh(
      new THREE.SphereGeometry(12, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xfef08a })
    );
    this.scene.add(this.sunMesh);

    this.moonMesh = new THREE.Mesh(
      new THREE.SphereGeometry(8, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xe0f2fe })
    );
    this.scene.add(this.moonMesh);

    const starCount = 500;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * (Math.PI / 2);
      const dist = 260 + Math.random() * 40;
      starPos[i * 3] = dist * Math.sin(phi) * Math.cos(theta);
      starPos[i * 3 + 1] = Math.max(15, dist * Math.cos(phi));
      starPos[i * 3 + 2] = dist * Math.sin(phi) * Math.sin(theta);
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    this.starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 1.8, transparent: true, opacity: 0 });
    this.stars = new THREE.Points(starGeo, this.starMat);
    this.scene.add(this.stars);
  }

  initClouds() {
    this.cloudsGroup = new THREE.Group();
    const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, transparent: true, opacity: 0.85 });

    for (let i = 0; i < 18; i++) {
      const cloud = new THREE.Group();
      const numPuffs = 4 + Math.floor(Math.random() * 4);
      for (let p = 0; p < numPuffs; p++) {
        const puff = new THREE.Mesh(new THREE.DodecahedronGeometry(6 + Math.random() * 4), cloudMat);
        puff.position.set(p * 5 + (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 4);
        cloud.add(puff);
      }
      const angle = Math.random() * Math.PI * 2;
      const dist = 60 + Math.random() * 90;
      cloud.position.set(Math.cos(angle) * dist, 70 + Math.random() * 20, Math.sin(angle) * dist);
      this.cloudsGroup.add(cloud);
    }
    this.scene.add(this.cloudsGroup);
  }

  initDistantScenery() {
    const mountainMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.9, flatShading: true });
    const numMountains = 20;
    for (let i = 0; i < numMountains; i++) {
      const angle = (i / numMountains) * Math.PI * 2;
      const dist = 135 + (i % 3) * 25;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;

      const radius = 24 + Math.random() * 22;
      const height = 45 + Math.random() * 55;

      const mountain = new THREE.Mesh(new THREE.ConeGeometry(radius, height, 6), mountainMat);
      mountain.position.set(x, height / 2 - 4, z);
      mountain.rotation.y = Math.random() * Math.PI;
      mountain.receiveShadow = true;
      this.scene.add(mountain);
    }
  }

  initSurfaceEnvironment() {
    const ground = new THREE.Mesh(
      new THREE.RingGeometry(this.radius, 160, 64),
      new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.8 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.receiveShadow = true;
    this.scene.add(ground);

    const pitWall = new THREE.Mesh(
      new THREE.CylinderGeometry(this.radius, this.radius, 110, 48, 1, true),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, side: THREE.BackSide, roughness: 0.95 })
    );
    pitWall.position.y = -55;
    this.scene.add(pitWall);

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(this.radius, 48),
      new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.9 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -105;
    this.scene.add(floor);
  }

  initMiningCrane() {
    const craneGroup = new THREE.Group();
    craneGroup.position.set(this.radius * 0.75, 0, -this.radius * 0.75);

    const metalMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.6, roughness: 0.35 });
    const darkMetal = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8 });

    const tower = new THREE.Mesh(new THREE.BoxGeometry(3, 26, 3), metalMat);
    tower.position.y = 13;
    craneGroup.add(tower);

    const boom = new THREE.Mesh(new THREE.BoxGeometry(34, 2, 2), metalMat);
    boom.position.set(-11, 26, 0);
    craneGroup.add(boom);

    const counter = new THREE.Mesh(new THREE.BoxGeometry(5.5, 4.5, 3), darkMetal);
    counter.position.set(6.5, 26, 0);
    craneGroup.add(counter);

    const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 38, 6), darkMetal);
    cable.position.set(-19, 10, 0);
    craneGroup.add(cable);

    this.scene.add(craneGroup);
  }

  initCircularPerimeter() {
    const pylonCount = 32;
    const pylonMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.6, roughness: 0.3 });

    for (let i = 0; i < pylonCount; i++) {
      const angle = (i / pylonCount) * Math.PI * 2;
      const x = Math.cos(angle) * this.radius;
      const z = Math.sin(angle) * this.radius;

      const pylon = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.45, 3.2, 8), pylonMat);
      pylon.position.set(x, 1.6, z);
      pylon.castShadow = true;
      this.scene.add(pylon);
    }

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(this.radius, 0.1, 8, 64),
      new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.85 })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 2.4;
    this.scene.add(ring);
  }

  // --- SURFACE MINING CAMP OUTPOST & SHOPS ---

  initMiningCampOutpost() {
    this.shops = [];

    // 1. MAIN SURFACE DEPOT & FORGE (Center: 0, 0, radius + 3)
    const depotGroup = new THREE.Group();
    depotGroup.position.set(0, 0, this.radius + 3);

    const kiosk = new THREE.Mesh(
      new THREE.BoxGeometry(7, 4.5, 5),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4 })
    );
    kiosk.position.y = 2.25;
    kiosk.castShadow = true;
    depotGroup.add(kiosk);

    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(6, 2, 4),
      new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.3 })
    );
    roof.position.y = 5.2;
    roof.rotation.y = Math.PI / 4;
    depotGroup.add(roof);

    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(4.8, 1.2, 0.3),
      new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x22c55e, emissiveIntensity: 0.8 })
    );
    sign.position.set(0, 3.4, -2.6);
    depotGroup.add(sign);

    const pad = new THREE.Mesh(
      new THREE.CylinderGeometry(3, 3, 0.1, 24),
      new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x16a34a, emissiveIntensity: 0.5 })
    );
    pad.position.set(0, 0.05, -4);
    depotGroup.add(pad);

    this.scene.add(depotGroup);
    this.depotPosition = depotGroup.position.clone();

    // 2. MINERAL SMELTER & REFINERY SHOP (Left: -24, 0, radius + 6)
    const smelterGroup = new THREE.Group();
    smelterGroup.position.set(-24, 0, this.radius + 6);

    const smelterBuilding = new THREE.Mesh(
      new THREE.BoxGeometry(8, 5, 6),
      new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.9 })
    );
    smelterBuilding.position.y = 2.5;
    smelterGroup.add(smelterBuilding);

    // Twin chimneys
    const ch1 = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 6, 8), new THREE.MeshStandardMaterial({ color: 0x0f172a }));
    ch1.position.set(-2, 6, 1);
    smelterGroup.add(ch1);

    const ch2 = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 6, 8), new THREE.MeshStandardMaterial({ color: 0x0f172a }));
    ch2.position.set(2, 6, 1);
    smelterGroup.add(ch2);

    // Glowing smelter sign
    const smelterSign = new THREE.Mesh(
      new THREE.BoxGeometry(5, 1.2, 0.2),
      new THREE.MeshStandardMaterial({ color: 0xf97316, emissive: 0xea580c, emissiveIntensity: 0.8 })
    );
    smelterSign.position.set(0, 4.2, -3.1);
    smelterGroup.add(smelterSign);

    this.scene.add(smelterGroup);

    // 3. TECH & DRONE LAB (Right: 24, 0, radius + 6)
    const labGroup = new THREE.Group();
    labGroup.position.set(24, 0, this.radius + 6);

    const labBuilding = new THREE.Mesh(
      new THREE.BoxGeometry(8, 4.5, 6),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3, metalness: 0.5 })
    );
    labBuilding.position.y = 2.25;
    labGroup.add(labBuilding);

    // Rotating Radar Dish on roof
    const dishStem = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 2, 8), new THREE.MeshStandardMaterial({ color: 0x94a3b8 }));
    dishStem.position.set(0, 5, 0);
    labGroup.add(dishStem);

    const dish = new THREE.Mesh(new THREE.ConeGeometry(1.8, 0.6, 12, 1, true), new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.8 }));
    dish.position.set(0, 6, 0);
    dish.rotation.x = Math.PI / 3;
    labGroup.add(dish);
    this.radarDish = dish;

    // Glowing Tech Sign
    const labSign = new THREE.Mesh(
      new THREE.BoxGeometry(5, 1.2, 0.2),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.8 })
    );
    labSign.position.set(0, 3.8, -3.1);
    labGroup.add(labSign);

    this.scene.add(labGroup);

    // 4. QUONSET HUT (CREW BARRACKS: -40, 0, radius + 14)
    const hutGroup = new THREE.Group();
    hutGroup.position.set(-42, 0, this.radius + 12);
    const hutArch = new THREE.Mesh(
      new THREE.CylinderGeometry(4.5, 4.5, 12, 16, 1, false, 0, Math.PI),
      new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.7 })
    );
    hutArch.rotation.z = Math.PI / 2;
    hutArch.rotation.y = Math.PI / 2;
    hutArch.position.y = 0;
    hutGroup.add(hutArch);
    this.scene.add(hutGroup);

    // 5. HEAVY MINING HAULER TRUCK (Right camp prop: 42, 0, radius + 12)
    const truckGroup = new THREE.Group();
    truckGroup.position.set(42, 0, this.radius + 12);
    truckGroup.rotation.y = -Math.PI / 6;

    const truckBody = new THREE.Mesh(
      new THREE.BoxGeometry(5, 3.5, 9),
      new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4 })
    );
    truckBody.position.y = 3;
    truckGroup.add(truckBody);

    const cab = new THREE.Mesh(
      new THREE.BoxGeometry(4.5, 2.5, 3.5),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.2 })
    );
    cab.position.set(0, 5, 2);
    truckGroup.add(cab);

    // Chunky black rubber wheels
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9 });
    const wheelOffsets = [
      [-2.6, 1.4, 2.5], [2.6, 1.4, 2.5],
      [-2.6, 1.4, -2.5], [2.6, 1.4, -2.5]
    ];
    wheelOffsets.forEach(([wx, wy, wz]) => {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 0.9, 12), wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(wx, wy, wz);
      truckGroup.add(wheel);
    });

    this.scene.add(truckGroup);

    // 6. FUEL RESERVOIR TANKS (-12, 0, radius + 16)
    const tankMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.3 });
    for (let i = 0; i < 2; i++) {
      const tank = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 6, 16), tankMat);
      tank.position.set(-12 + i * 5.5, 3, this.radius + 16);
      this.scene.add(tank);
    }

    // 7. CARGO PALLETS & BARRELS (Scattered neatly near walkways)
    const barrelMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.8, roughness: 0.3 });
    const barrelOffsets = [
      [-8, 0.7, this.radius + 4],
      [-9.5, 0.7, this.radius + 4],
      [8, 0.7, this.radius + 4],
      [10, 0.7, this.radius + 5]
    ];
    barrelOffsets.forEach(([bx, by, bz]) => {
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 1.4, 10), barrelMat);
      barrel.position.set(bx, by, bz);
      this.scene.add(barrel);
    });
  }

  // --- SUBTERRANEAN STRATA ENGINE ---

  initSubterraneanStrata() {
    const bSize = this.blockSize;
    const maxRadius = this.radius - 2.5;

    const strataConfig = [
      { minY: -14, maxY: 0, type: 'dirt', oreChance: 0.35, ores: ['coal', 'copper'], baseHp: 4, color: 0x92400e },
      { minY: -32, maxY: -14, type: 'stone', oreChance: 0.30, ores: ['iron', 'silver'], baseHp: 16, color: 0x475569 },
      { minY: -54, maxY: -32, type: 'granite', oreChance: 0.28, ores: ['gold', 'amethyst'], baseHp: 50, color: 0x64748b },
      { minY: -76, maxY: -54, type: 'obsidian', oreChance: 0.24, ores: ['ruby', 'diamond'], baseHp: 140, color: 0x1e1b4b },
      { minY: -88, maxY: -76, type: 'mantle', oreChance: 0.22, ores: ['voidite', 'coreShard'], baseHp: 400, color: 0x450a0a }
    ];

    const blockGeo = new THREE.BoxGeometry(bSize * 0.96, bSize * 0.96, bSize * 0.96);

    this.materials = {
      dirt: new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.85 }),
      stone: new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.8 }),
      granite: new THREE.MeshStandardMaterial({ color: 0x78716c, roughness: 0.7 }),
      obsidian: new THREE.MeshStandardMaterial({ color: 0x1e1b4b, roughness: 0.4 }),
      mantle: new THREE.MeshStandardMaterial({ color: 0x450a0a, emissive: 0x7f1d1d, emissiveIntensity: 0.4 }),

      coal: new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9 }),
      copper: new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.6, roughness: 0.3 }),
      iron: new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.3 }),
      silver: new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9, roughness: 0.2 }),
      gold: new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.8, roughness: 0.2 }),
      amethyst: new THREE.MeshStandardMaterial({ color: 0xa855f7, roughness: 0.2 }),
      ruby: new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.2 }),
      diamond: new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.1 }),
      voidite: new THREE.MeshStandardMaterial({ color: 0x8b5cf6, emissive: 0x6d28d9, emissiveIntensity: 0.6 }),
      coreShard: new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xf59e0b, emissiveIntensity: 1.4 })
    };

    for (let y = -1; y >= -86; y -= bSize) {
      const strata = strataConfig.find(s => y <= s.maxY && y > s.minY) || strataConfig[0];
      const chamberHole = y <= -72 ? 12 : (y <= -46 ? 6 : 0);

      for (let x = -maxRadius; x <= maxRadius; x += bSize) {
        for (let z = -maxRadius; z <= maxRadius; z += bSize) {
          const dist = Math.sqrt(x * x + z * z);
          if (dist <= maxRadius && dist >= chamberHole) {
            let oreType = null;
            let mat = this.materials[strata.type];
            let hp = strata.baseHp;

            if (Math.random() < strata.oreChance) {
              oreType = strata.ores[Math.floor(Math.random() * strata.ores.length)];
              mat = this.materials[oreType] || mat;
              hp = Math.round(hp * 1.5);
            }

            const mesh = new THREE.Mesh(blockGeo, mat);
            mesh.position.set(x, y - bSize / 2, z);
            mesh.castShadow = true;
            mesh.receiveShadow = true;

            const gx = this.gridCoord(x);
            const gy = this.gridCoord(y - bSize / 2);
            const gz = this.gridCoord(z);

            const blockData = {
              gx, gy, gz,
              x, y: y - bSize / 2, z,
              mesh,
              hp,
              maxHp: hp,
              oreType,
              strataType: strata.type
            };

            mesh.userData = blockData;
            this.scene.add(mesh);
            this.blocks.set(this.gridKey(gx, gy, gz), blockData);
          }
        }
      }
    }
  }

  // --- MINING & PROGRESSIVE BLOCK BREAKING ANIMATION ---

  damageBlock(blockData, damage) {
    if (!blockData || !blockData.mesh) return null;

    blockData.hp -= damage;
    this.soundFX.playHit(blockData.hp > 0);

    const mesh = blockData.mesh;
    const damagePct = 1.0 - (blockData.hp / blockData.maxHp);

    const scaleFactor = 1.0 - damagePct * 0.18;
    mesh.scale.set(scaleFactor, scaleFactor, scaleFactor);

    const origPos = new THREE.Vector3(blockData.x, blockData.y, blockData.z);
    mesh.position.x = origPos.x + (Math.random() - 0.5) * 0.12;
    mesh.position.y = origPos.y + (Math.random() - 0.5) * 0.12;
    mesh.position.z = origPos.z + (Math.random() - 0.5) * 0.12;

    setTimeout(() => {
      if (mesh.parent) {
        mesh.position.copy(origPos);
      }
    }, 60);

    this.spawnDebrisBurst(origPos, blockData.oreType || blockData.strataType, 4);

    if (blockData.hp <= 0) {
      return this.destroyBlock(blockData);
    }
    return null;
  }

  destroyBlock(blockData) {
    const mesh = blockData.mesh;
    const pos = mesh.position.clone();

    this.spawnDebrisBurst(pos, blockData.oreType || blockData.strataType, 12);

    this.scene.remove(mesh);
    this.blocks.delete(this.gridKey(blockData.gx, blockData.gy, blockData.gz));

    this.soundFX.playBreak();

    const oreType = blockData.oreType || blockData.strataType;
    this.spawnOreDrop(pos, oreType);

    return oreType;
  }

  spawnDebrisBurst(position, oreType, count = 6) {
    const mat = this.materials[oreType] || this.materials.dirt;
    const geo = new THREE.BoxGeometry(0.2, 0.2, 0.2);

    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(position).add(new THREE.Vector3(
        (Math.random() - 0.5) * 0.8,
        (Math.random() - 0.5) * 0.8,
        (Math.random() - 0.5) * 0.8
      ));
      this.scene.add(mesh);

      this.debrisParticles.push({
        mesh,
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 6,
          Math.random() * 5 + 2,
          (Math.random() - 0.5) * 6
        ),
        lifetime: 0.6 + Math.random() * 0.4
      });
    }
  }

  spawnOreDrop(position, oreType) {
    const geo = new THREE.DodecahedronGeometry(0.38);
    const mat = this.materials[oreType] || this.materials.dirt;

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(position);
    this.scene.add(mesh);

    const drop = {
      mesh,
      oreType,
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 5,
        Math.random() * 5 + 3,
        (Math.random() - 0.5) * 5
      ),
      lifetime: 35.0
    };

    this.oreDrops.push(drop);
  }

  // --- DAY / NIGHT CYCLE UPDATE ---

  updateDayNightCycle(delta) {
    this.timeOfDay += delta * this.cycleSpeed;
    if (this.timeOfDay >= 24.0) {
      this.timeOfDay = 0.0;
      this.dayCount++;
    }

    const sunAngle = ((this.timeOfDay - 6) / 24) * Math.PI * 2;
    const orbitRadius = 180;

    const sunX = Math.cos(sunAngle) * orbitRadius;
    const sunY = Math.sin(sunAngle) * orbitRadius;
    const sunZ = 50;

    this.sunLight.position.set(sunX, Math.max(-20, sunY), sunZ);
    this.sunMesh.position.set(sunX, sunY, sunZ);

    this.moonLight.position.set(-sunX, -sunY, -sunZ);
    this.moonMesh.position.set(-sunX, -sunY, -sunZ);

    const dayFactor = Math.max(0, Math.min(1, (sunY + 10) / 70));

    const dayColor = new THREE.Color(0x38bdf8);
    const nightColor = new THREE.Color(0x070b19);
    const sunsetColor = new THREE.Color(0xf97316);

    let currentSkyColor;
    if (sunY > 20) {
      currentSkyColor = dayColor;
    } else if (sunY > -10) {
      const t = (sunY + 10) / 30;
      currentSkyColor = new THREE.Color().lerpColors(sunsetColor, dayColor, t);
    } else {
      currentSkyColor = nightColor;
    }

    this.scene.background = currentSkyColor;
    if (this.scene.fog) {
      this.scene.fog.color = currentSkyColor;
    }

    this.ambientLight.intensity = THREE.MathUtils.lerp(0.15, 0.7, dayFactor);
    this.sunLight.intensity = THREE.MathUtils.lerp(0.0, 2.4, dayFactor);
    this.moonLight.intensity = THREE.MathUtils.lerp(0.4, 0.0, dayFactor);

    if (this.starMat) {
      this.starMat.opacity = THREE.MathUtils.lerp(0.9, 0.0, dayFactor);
    }

    if (this.cloudsGroup) {
      this.cloudsGroup.rotation.y += delta * 0.015;
    }

    if (this.radarDish) {
      this.radarDish.rotation.z += delta * 1.5;
    }
  }

  // --- UPDATE LOOP ---

  update(delta, playerPos) {
    this.updateDayNightCycle(delta);

    for (let i = this.debrisParticles.length - 1; i >= 0; i--) {
      const p = this.debrisParticles[i];
      p.lifetime -= delta;
      p.velocity.y -= 20 * delta;
      p.mesh.position.addScaledVector(p.velocity, delta);

      if (p.lifetime <= 0) {
        this.scene.remove(p.mesh);
        this.debrisParticles.splice(i, 1);
      }
    }

    const magnetActive = this.economy.prestigePerks.solarMagnet;
    const magnetDistance = magnetActive ? 45 : 3.5;

    for (let i = this.oreDrops.length - 1; i >= 0; i--) {
      const drop = this.oreDrops[i];
      drop.lifetime -= delta;
      drop.velocity.y -= 18 * delta;
      drop.mesh.position.addScaledVector(drop.velocity, delta);

      if (drop.mesh.position.y < -102) {
        drop.mesh.position.y = -102;
        drop.velocity.y = -drop.velocity.y * 0.4;
      }

      const dist = drop.mesh.position.distanceTo(playerPos);
      if (dist < magnetDistance) {
        const dir = new THREE.Vector3().subVectors(playerPos, drop.mesh.position).normalize();
        const speed = magnetActive ? 24 : 12;
        drop.mesh.position.addScaledVector(dir, speed * delta);

        if (dist < 1.8) {
          const added = this.economy.addOre(drop.oreType, 1);
          if (added) {
            this.soundFX.playPickup();
            this.scene.remove(drop.mesh);
            this.oreDrops.splice(i, 1);
            continue;
          }
        }
      }

      if (drop.lifetime <= 0) {
        this.scene.remove(drop.mesh);
        this.oreDrops.splice(i, 1);
      }
    }

    if (this.economy.prestigePerks.melterAura && Math.random() < 0.2) {
      for (const [key, block] of this.blocks.entries()) {
        if (block.mesh && block.mesh.position.distanceTo(playerPos) < 6) {
          this.damageBlock(block, 8);
          break;
        }
      }
    }
  }

  // Detect which shop or building the player is near
  getNearShopType(playerPos) {
    if (playerPos.y <= -2) return null;

    // 1. Central Depot
    if (playerPos.distanceTo(this.depotPosition) < 7.5) {
      return { type: 'depot', title: '🏪 SURFACE DEPOT & FORGE', tab: 'tab-tools' };
    }

    // 2. Smelter & Refinery (-24, 0, radius + 6)
    const smelterPos = new THREE.Vector3(-24, 0, this.radius + 6);
    if (playerPos.distanceTo(smelterPos) < 8.0) {
      return { type: 'smelter', title: '🔥 MINERAL SMELTER & REFINERY', tab: 'tab-backpack' };
    }

    // 3. Drone Tech Lab (24, 0, radius + 6)
    const labPos = new THREE.Vector3(24, 0, this.radius + 6);
    if (playerPos.distanceTo(labPos) < 8.0) {
      return { type: 'techLab', title: '🤖 TECH & DRONE LAB', tab: 'tab-tycoon' };
    }

    return null;
  }

  isNearDepot(playerPos) {
    return this.getNearShopType(playerPos) !== null;
  }
}
