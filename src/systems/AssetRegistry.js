import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * AssetRegistry.js
 * - High-detail stylized mining tool (Reinforced composite shaft, rubber grip, steel pick & adze, glowing power conduit)
 * - Cartoon astronaut player avatar
 * - Auto-miner drone
 * - Procedural Sun Core
 * - Live drop-in .glb / .gltf loader
 */
export class AssetRegistry {
  constructor() {
    this.gltfLoader = new GLTFLoader();
    this.models = {
      tool: null,
      player: null,
      core: null,
      drone: null
    };

    this.onModelUpdatedCallbacks = [];
  }

  onModelUpdated(fn) {
    this.onModelUpdatedCallbacks.push(fn);
  }

  notifyModelUpdated(type, newModel) {
    this.onModelUpdatedCallbacks.forEach(fn => fn(type, newModel));
  }

  // --- 1. DETAILED STYLIZED MINING TOOL ---
  createPlaceholderTool() {
    const group = new THREE.Group();

    // Materials
    const darkGripMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 });
    const shaftMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.5, roughness: 0.4 });
    const steelHeadMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.85, roughness: 0.25 });
    const goldAccentMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.8, roughness: 0.2 });
    const glowEnergyMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 1.8,
      roughness: 0.1
    });

    // 1. Shaft (Long ergonomic handle)
    const shaftGeo = new THREE.CylinderGeometry(0.038, 0.042, 1.1, 10);
    const shaft = new THREE.Mesh(shaftGeo, shaftMat);
    shaft.position.y = 0.45;
    shaft.castShadow = true;
    group.add(shaft);

    // 2. Rubberized Handle Grips (Ribbed rings on lower shaft)
    for (let i = 0; i < 6; i++) {
      const ringGeo = new THREE.TorusGeometry(0.043, 0.012, 6, 12);
      const ring = new THREE.Mesh(ringGeo, darkGripMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.08 + i * 0.07;
      group.add(ring);
    }

    // 3. Heavy Pommel / End-Cap at base
    const pommelGeo = new THREE.CylinderGeometry(0.055, 0.045, 0.08, 8);
    const pommel = new THREE.Mesh(pommelGeo, goldAccentMat);
    pommel.position.y = -0.05;
    group.add(pommel);

    // 4. Titanium Neck Collar
    const collarGeo = new THREE.BoxGeometry(0.12, 0.14, 0.12);
    const collar = new THREE.Mesh(collarGeo, goldAccentMat);
    collar.position.y = 0.98;
    group.add(collar);

    // 5. Heavy Pickaxe Head Body (Central block)
    const headBlockGeo = new THREE.BoxGeometry(0.14, 0.16, 0.18);
    const headBlock = new THREE.Mesh(headBlockGeo, steelHeadMat);
    headBlock.position.y = 1.05;
    group.add(headBlock);

    // 6. Primary Pick Spike (Curved, sharp pointed tooth)
    const pickSpikeGeo = new THREE.ConeGeometry(0.07, 0.55, 6);
    const pickSpike = new THREE.Mesh(pickSpikeGeo, steelHeadMat);
    pickSpike.position.set(0, 1.08, 0.32);
    pickSpike.rotation.x = Math.PI / 2.3;
    pickSpike.castShadow = true;
    group.add(pickSpike);

    // 7. Secondary Chisel / Adze Wedge (Flat blade on opposite end)
    const adzeGeo = new THREE.BoxGeometry(0.16, 0.04, 0.35);
    const adze = new THREE.Mesh(adzeGeo, steelHeadMat);
    adze.position.set(0, 1.03, -0.24);
    adze.rotation.x = -Math.PI / 16;
    adze.castShadow = true;
    group.add(adze);

    // 8. Glowing Sci-Fi Energy Conduit (Power cell core inside pick head)
    const coreGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.38, 8);
    const core = new THREE.Mesh(coreGeo, glowEnergyMat);
    core.rotation.x = Math.PI / 2;
    core.position.set(0, 1.05, 0.02);
    group.add(core);

    group.name = 'ToolModel';
    return group;
  }

  // --- 2. CARTOON MINER / ASTRONAUT ---
  createPlaceholderPlayer() {
    const group = new THREE.Group();

    // Body
    const bodyGeo = new THREE.CapsuleGeometry(0.45, 0.8, 8, 16);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.4 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.85;
    body.castShadow = true;
    group.add(body);

    // Visor
    const visorGeo = new THREE.BoxGeometry(0.45, 0.25, 0.2);
    const visorMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.1, metalness: 0.9 });
    const visor = new THREE.Mesh(visorGeo, visorMat);
    visor.position.set(0, 1.1, 0.35);
    group.add(visor);

    // Helmet Headlamp
    const lightCapGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.1, 8);
    const lightCapMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xfef08a, emissiveIntensity: 0.8 });
    const lightCap = new THREE.Mesh(lightCapGeo, lightCapMat);
    lightCap.rotation.x = Math.PI / 2;
    lightCap.position.set(0, 1.35, 0.4);
    group.add(lightCap);

    // Backpack
    const packGeo = new THREE.BoxGeometry(0.4, 0.6, 0.3);
    const packMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.6 });
    const pack = new THREE.Mesh(packGeo, packMat);
    pack.position.set(0, 0.85, -0.4);
    pack.castShadow = true;
    group.add(pack);

    // Boots
    const footMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 });
    const footL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.15, 0.35), footMat);
    footL.position.set(-0.25, 0.1, 0.05);
    group.add(footL);

    const footR = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.15, 0.35), footMat);
    footR.position.set(0.25, 0.1, 0.05);
    group.add(footR);

    group.name = 'PlayerModel';
    return group;
  }

  // --- 3. AUTO-MINER DRONE ---
  createPlaceholderDrone() {
    const group = new THREE.Group();

    const orb = new THREE.Mesh(
      new THREE.SphereGeometry(0.35, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.7, roughness: 0.2 })
    );
    group.add(orb);

    const eye = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 1.0 })
    );
    eye.position.set(0, 0, 0.28);
    group.add(eye);

    const ant = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.02, 0.3, 6),
      new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.8 })
    );
    ant.position.y = 0.45;
    group.add(ant);

    group.name = 'DroneModel';
    return group;
  }

  // --- 4. GLOWING SUN CORE ---
  createPlaceholderCore() {
    const group = new THREE.Group();

    const sunGeo = new THREE.SphereGeometry(7, 32, 32);
    const sunMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xf59e0b,
      emissiveIntensity: 2.2,
      roughness: 0.1
    });
    const sunMesh = new THREE.Mesh(sunGeo, sunMat);
    group.add(sunMesh);

    const coronaGeo = new THREE.SphereGeometry(8.5, 24, 24);
    const coronaMat = new THREE.MeshBasicMaterial({
      color: 0xf97316,
      transparent: true,
      opacity: 0.35,
      wireframe: true
    });
    const coronaMesh = new THREE.Mesh(coronaGeo, coronaMat);
    group.add(coronaMesh);

    group.userData = { sunMesh, coronaMesh };
    group.name = 'CoreModel';
    return group;
  }

  // --- DROP-IN CUSTOM MODEL LOADER ---
  async loadCustomModel(fileOrUrl, type, targetSize = 1.0) {
    let url = fileOrUrl;
    if (fileOrUrl instanceof File) {
      url = URL.createObjectURL(fileOrUrl);
    }

    return new Promise((resolve, reject) => {
      this.gltfLoader.load(
        url,
        (gltf) => {
          const loadedScene = gltf.scene;

          loadedScene.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });

          const bbox = new THREE.Box3().setFromObject(loadedScene);
          const size = bbox.getSize(new THREE.Vector3());
          const center = bbox.getCenter(new THREE.Vector3());

          const maxDim = Math.max(size.x, size.y, size.z);
          const scaleFactor = (targetSize / (maxDim || 1));
          loadedScene.scale.setScalar(scaleFactor);

          loadedScene.position.x = -center.x * scaleFactor;
          loadedScene.position.y = -bbox.min.y * scaleFactor;
          loadedScene.position.z = -center.z * scaleFactor;

          const container = new THREE.Group();
          container.add(loadedScene);
          container.name = `Custom_${type}`;

          this.models[type] = container;
          this.notifyModelUpdated(type, container);
          resolve(container);
        },
        undefined,
        (err) => {
          console.error(`Failed to load ${type} .glb model:`, err);
          reject(err);
        }
      );
    });
  }
}
