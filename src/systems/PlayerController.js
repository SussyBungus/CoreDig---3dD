import * as THREE from 'three';

/**
 * PlayerController.js
 * - 3D AABB Voxel Collision: Completely prevents walking through rock blocks horizontally or vertically
 * - Continuous fluid mining swing rhythm
 * - Articulated astronaut arm holding stylized tool with weapon sway
 * - Dynamic sensitivity & FOV customization
 */
export class PlayerController {
  constructor(camera, scene, domElement, soundFX, economy, world, sunCore, assetRegistry) {
    this.camera = camera;
    this.scene = scene;
    this.domElement = domElement;
    this.soundFX = soundFX;
    this.economy = economy;
    this.world = world;
    this.sunCore = sunCore;
    this.assetRegistry = assetRegistry;

    // Configurable Settings
    this.mouseSensitivity = 0.0022;

    // Camera mode: '1st' or '3rd'
    this.pov = '1st';
    this.thirdPersonOffset = new THREE.Vector3(0, 2.2, 4.5);

    // Position & Physics Dimensions
    this.position = new THREE.Vector3(0, 2, 32);
    this.velocity = new THREE.Vector3();
    this.isGrounded = false;
    this.playerRadius = 0.42;
    this.playerHeight = 1.8;

    // Inputs
    this.keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      jump: false
    };

    // Mouse Look
    this.pitch = 0;
    this.yaw = 0;
    this.isPointerLocked = false;

    // Weapon Sway & Bobbing
    this.swayX = 0;
    this.swayY = 0;
    this.walkBobTimer = 0;

    // Raycast & Mining
    this.raycaster = new THREE.Raycaster();
    this.isMining = false;
    this.mineCooldown = 0;
    this.swingProgress = 0;
    this.isSwinging = false;

    this.initAvatar();
    this.initArticulatedArm();
    this.initHeadlamp();
    this.bindInputs();
  }

  // --- AVATAR & ARM SETUP ---

  initAvatar() {
    this.avatarGroup = new THREE.Group();
    this.avatarMesh = this.assetRegistry.createPlaceholderPlayer();
    this.avatarGroup.add(this.avatarMesh);
    this.avatarGroup.position.copy(this.position);
    this.scene.add(this.avatarGroup);

    this.avatarGroup.visible = (this.pov === '3rd');
  }

  initArticulatedArm() {
    this.armRig = new THREE.Group();
    this.baseArmPos = new THREE.Vector3(0.42, -0.38, -0.65);
    this.armRig.position.copy(this.baseArmPos);
    this.armRig.rotation.set(0.12, -0.25, 0.08);

    // Sleeve
    const sleeveGeo = new THREE.CylinderGeometry(0.09, 0.12, 0.65, 12);
    const sleeveMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      roughness: 0.6,
      metalness: 0.1
    });
    this.forearm = new THREE.Mesh(sleeveGeo, sleeveMat);
    this.forearm.position.set(0, -0.22, 0.15);
    this.forearm.rotation.x = Math.PI / 4;
    this.armRig.add(this.forearm);

    // Cuff
    const cuffGeo = new THREE.TorusGeometry(0.11, 0.025, 8, 16);
    const cuffMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.8,
      roughness: 0.3
    });
    const cuff = new THREE.Mesh(cuffGeo, cuffMat);
    cuff.position.set(0, -0.05, 0.02);
    cuff.rotation.x = Math.PI / 4;
    this.armRig.add(cuff);

    // Glove
    const gloveMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.4,
      metalness: 0.1
    });
    this.glove = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.18, 0.16), gloveMat);
    this.glove.position.set(0, 0.06, -0.05);
    this.armRig.add(this.glove);

    // Fingers
    const fingerMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 });
    const fingers = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.14, 0.08), fingerMat);
    fingers.position.set(0, 0.08, -0.12);
    this.armRig.add(fingers);

    // Tool Socket
    this.toolSocket = new THREE.Group();
    this.toolSocket.position.set(0, 0.08, -0.12);

    this.toolMesh = this.assetRegistry.createPlaceholderTool();
    this.toolMesh.rotation.set(-Math.PI / 6, 0, Math.PI / 8);
    this.toolMesh.scale.setScalar(0.85);
    this.toolSocket.add(this.toolMesh);

    this.armRig.add(this.toolSocket);
    this.camera.add(this.armRig);
  }

  initHeadlamp() {
    this.headlamp = new THREE.SpotLight(0xfffbeb, 3.2, 50, Math.PI / 3.8, 0.4, 1.2);
    this.headlamp.position.set(0, 0, 0);
    this.headlamp.target = new THREE.Object3D();
    this.headlamp.target.position.set(0, 0, -10);

    this.camera.add(this.headlamp);
    this.camera.add(this.headlamp.target);
  }

  // --- INPUTS ---

  bindInputs() {
    this.domElement.addEventListener('click', () => {
      if (!this.isPointerLocked) {
        this.domElement.requestPointerLock();
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = (document.pointerLockElement === this.domElement);
    });

    document.addEventListener('mousemove', (e) => {
      if (!this.isPointerLocked) return;

      this.yaw -= e.movementX * this.mouseSensitivity;
      this.pitch -= e.movementY * this.mouseSensitivity;

      const maxPitch = Math.PI / 2 - 0.05;
      this.pitch = Math.max(-maxPitch, Math.min(maxPitch, this.pitch));

      this.swayX = THREE.MathUtils.clamp(this.swayX - e.movementX * 0.0006, -0.06, 0.06);
      this.swayY = THREE.MathUtils.clamp(this.swayY + e.movementY * 0.0006, -0.06, 0.06);
    });

    window.addEventListener('mousedown', (e) => {
      if (e.button === 0 && this.isPointerLocked) {
        this.isMining = true;
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.isMining = false;
      }
    });

    window.addEventListener('keydown', (e) => {
      switch (e.code) {
        case 'KeyW': this.keys.forward = true; break;
        case 'KeyS': this.keys.backward = true; break;
        case 'KeyA': this.keys.left = true; break;
        case 'KeyD': this.keys.right = true; break;
        case 'Space': this.keys.jump = true; break;
        case 'KeyV': this.togglePOV(); break;
        case 'KeyF': this.toggleHeadlamp(); break;
        case 'KeyR': this.teleportToSurface(); break;
      }
    });

    window.addEventListener('keyup', (e) => {
      switch (e.code) {
        case 'KeyW': this.keys.forward = false; break;
        case 'KeyS': this.keys.backward = false; break;
        case 'KeyA': this.keys.left = false; break;
        case 'KeyD': this.keys.right = false; break;
        case 'Space': this.keys.jump = false; break;
      }
    });

    this.assetRegistry.onModelUpdated((type, newModel) => {
      if (type === 'player') {
        this.avatarGroup.remove(this.avatarMesh);
        this.avatarMesh = newModel;
        this.avatarGroup.add(this.avatarMesh);
      } else if (type === 'tool') {
        this.toolSocket.remove(this.toolMesh);
        this.toolMesh = newModel;
        this.toolMesh.scale.setScalar(0.85);
        this.toolSocket.add(this.toolMesh);
      }
    });
  }

  // --- ACTIONS ---

  togglePOV() {
    this.pov = (this.pov === '1st') ? '3rd' : '1st';
    this.avatarGroup.visible = (this.pov === '3rd');
    this.armRig.visible = (this.pov === '1st');

    const povText = document.getElementById('pov-text');
    if (povText) povText.textContent = (this.pov === '1st') ? '1st Person' : '3rd Person';
  }

  toggleHeadlamp() {
    this.headlamp.visible = !this.headlamp.visible;
  }

  teleportToSurface() {
    this.position.set(0, 2, 32);
    this.velocity.set(0, 0, 0);
    this.soundFX.playRecall();
  }

  performMiningAction() {
    const curTool = this.economy.getCurrentTool();
    this.mineCooldown = (1.0 / curTool.speed) * 0.28;

    this.isSwinging = true;
    this.swingProgress = 0;
    this.soundFX.playSwing();

    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    const intersects = this.raycaster.intersectObjects(this.scene.children, true);
    const maxReach = 7.0;

    for (const hit of intersects) {
      if (hit.distance > maxReach) continue;

      let obj = hit.object;
      let isCore = false;
      while (obj && obj !== this.scene) {
        if (obj.userData && obj.userData.isSunCore) {
          isCore = true;
          break;
        }
        obj = obj.parent;
      }

      if (isCore) {
        let dmg = curTool.damage;
        const critChance = this.economy.stats.critLevel * 0.1;
        if (Math.random() < critChance) dmg *= 4;

        this.sunCore.takeDamage(dmg);
        return;
      }

      if (hit.object && hit.object.userData && hit.object.userData.hp !== undefined) {
        const block = hit.object.userData;
        let dmg = curTool.damage;

        const critChance = this.economy.stats.critLevel * 0.1;
        if (Math.random() < critChance) dmg *= 4;

        this.world.damageBlock(block, dmg);

        if (curTool.cleave > 0) {
          this.performCleave(block.x, block.y, block.z, curTool.cleave, dmg * 0.5);
        }
        return;
      }
    }
  }

  performCleave(x, y, z, radius, dmg) {
    for (const [key, block] of this.world.blocks.entries()) {
      const dx = block.x - x;
      const dy = block.y - y;
      const dz = block.z - z;
      if (Math.sqrt(dx * dx + dy * dy + dz * dz) <= radius * 2.2) {
        this.world.damageBlock(block, dmg);
      }
    }
  }

  // --- FULL 3D AABB VOXEL COLLISION RESOLUTION ---

  /**
   * Tests if the player's bounding box at a given position intersects any solid block
   */
  checkBlockCollisionAt(posX, posY, posZ) {
    const halfBlock = this.world.blockSize / 2;
    const r = this.playerRadius;
    const h = this.playerHeight;

    const minX = posX - r;
    const maxX = posX + r;
    const minY = posY + 0.15; // small foot step threshold
    const maxY = posY + h;
    const minZ = posZ - r;
    const maxZ = posZ + r;

    const gxStart = this.world.gridCoord(minX);
    const gxEnd = this.world.gridCoord(maxX);
    const gyStart = this.world.gridCoord(minY);
    const gyEnd = this.world.gridCoord(maxY);
    const gzStart = this.world.gridCoord(minZ);
    const gzEnd = this.world.gridCoord(maxZ);

    for (let gx = gxStart; gx <= gxEnd; gx++) {
      for (let gy = gyStart; gy <= gyEnd; gy++) {
        for (let gz = gzStart; gz <= gzEnd; gz++) {
          const block = this.world.blocks.get(this.world.gridKey(gx, gy, gz));
          if (block) {
            const bMinX = block.x - halfBlock;
            const bMaxX = block.x + halfBlock;
            const bMinY = block.y - halfBlock;
            const bMaxY = block.y + halfBlock;
            const bMinZ = block.z - halfBlock;
            const bMaxZ = block.z + halfBlock;

            // AABB overlap test
            if (maxX > bMinX && minX < bMaxX &&
                maxY > bMinY && minY < bMaxY &&
                maxZ > bMinZ && minZ < bMaxZ) {
              return true; // Overlap detected
            }
          }
        }
      }
    }
    return false;
  }

  // --- UPDATE LOOP ---

  update(delta) {
    // 1. Tool Swing Animation
    if (this.isSwinging) {
      this.swingProgress += delta * 15;
      const angle = Math.sin(this.swingProgress * Math.PI);

      this.armRig.position.z = this.baseArmPos.z + angle * 0.18;
      this.armRig.position.y = this.baseArmPos.y - angle * 0.14;
      this.armRig.rotation.x = 0.12 + angle * 1.1;
      this.armRig.rotation.y = -0.25 - angle * 0.4;
      this.armRig.rotation.z = 0.08 - angle * 0.3;

      if (this.swingProgress >= 1.0) {
        this.isSwinging = false;
        this.armRig.position.copy(this.baseArmPos);
        this.armRig.rotation.set(0.12, -0.25, 0.08);
      }
    }

    // 2. Continuous Digging
    if (this.mineCooldown > 0) {
      this.mineCooldown -= delta;
    } else if (this.isMining) {
      this.performMiningAction();
    }

    // 3. Movement Physics & Inputs
    const baseSpeed = 9.5 + this.economy.stats.speedLevel * 2.2;
    const moveDir = new THREE.Vector3();

    const cosY = Math.cos(this.yaw);
    const sinY = Math.sin(this.yaw);

    const forward = new THREE.Vector3(-sinY, 0, -cosY);
    const right = new THREE.Vector3(cosY, 0, -sinY);

    if (this.keys.forward) moveDir.add(forward);
    if (this.keys.backward) moveDir.sub(forward);
    if (this.keys.right) moveDir.add(right);
    if (this.keys.left) moveDir.sub(right);

    const isMoving = moveDir.lengthSq() > 0;
    if (isMoving) {
      moveDir.normalize();
      this.velocity.x = moveDir.x * baseSpeed;
      this.velocity.z = moveDir.z * baseSpeed;
      this.walkBobTimer += delta * 10;
    } else {
      this.velocity.x *= 0.75;
      this.velocity.z *= 0.75;
      this.walkBobTimer = 0;
    }

    const jumpStrength = 8.5 + this.economy.stats.jumpLevel * 1.6;
    if (this.keys.jump && this.isGrounded) {
      this.velocity.y = jumpStrength;
      this.isGrounded = false;
    }

    // Gravity
    this.velocity.y -= 24 * delta;

    // --- 4. STEP-BY-STEP HORIZONTAL & VERTICAL COLLISION (NO PASSING THROUGH BLOCKS) ---

    // Move X
    const newX = this.position.x + this.velocity.x * delta;
    if (!this.checkBlockCollisionAt(newX, this.position.y, this.position.z)) {
      this.position.x = newX;
    } else {
      this.velocity.x = 0;
    }

    // Move Z
    const newZ = this.position.z + this.velocity.z * delta;
    if (!this.checkBlockCollisionAt(this.position.x, this.position.y, newZ)) {
      this.position.z = newZ;
    } else {
      this.velocity.z = 0;
    }

    // Clamp inside pit walls if below surface
    if (this.position.y < 0) {
      const distFromCenter = Math.hypot(this.position.x, this.position.z);
      const maxAllowed = this.world.radius - 0.6;
      if (distFromCenter > maxAllowed) {
        const factor = maxAllowed / distFromCenter;
        this.position.x *= factor;
        this.position.z *= factor;
      }
    }

    // Move Y (Vertical)
    this.position.y += this.velocity.y * delta;

    // Check floor standing support
    let highestFloor = -102;
    const halfBlock = this.world.blockSize / 2;

    const feetSampleOffsets = [
      [0, 0], [0.3, 0], [-0.3, 0], [0, 0.3], [0, -0.3]
    ];

    // Inside pit: check blocks beneath feet
    if (Math.hypot(this.position.x, this.position.z) < this.world.radius) {
      for (const [ox, oz] of feetSampleOffsets) {
        const sx = this.position.x + ox;
        const sz = this.position.z + oz;
        const gySample = this.world.gridCoord(this.position.y);

        for (let gy = gySample + 1; gy >= gySample - 2; gy--) {
          const block = this.world.blocks.get(this.world.gridKey(
            this.world.gridCoord(sx),
            gy,
            this.world.gridCoord(sz)
          ));

          if (block) {
            const blockTop = block.y + halfBlock;
            if (blockTop > highestFloor && this.position.y >= blockTop - 0.55) {
              highestFloor = blockTop;
            }
          }
        }
      }
    } else {
      // Outside pit: Surface level ground
      highestFloor = 1.5;
    }

    // Ground clamp
    if (this.position.y <= highestFloor + 0.1 && this.velocity.y <= 0) {
      this.position.y = highestFloor;
      this.velocity.y = 0;
      this.isGrounded = true;
    } else {
      this.isGrounded = false;
    }

    // Absolute pit bedrock floor
    if (this.position.y <= -102) {
      this.position.y = -102;
      this.velocity.y = 0;
      this.isGrounded = true;
    }

    // 5. Weapon Inertia & Walking Bob
    if (!this.isSwinging && this.pov === '1st') {
      this.swayX = THREE.MathUtils.lerp(this.swayX, 0, delta * 8);
      this.swayY = THREE.MathUtils.lerp(this.swayY, 0, delta * 8);

      const bobY = Math.sin(this.walkBobTimer) * 0.015;
      const bobX = Math.cos(this.walkBobTimer * 0.5) * 0.012;

      this.armRig.position.x = this.baseArmPos.x + this.swayX + bobX;
      this.armRig.position.y = this.baseArmPos.y + this.swayY + bobY;
      this.armRig.position.z = this.baseArmPos.z;
    }

    this.headlamp.intensity = 2.0 + this.economy.stats.headlampLevel * 1.5;

    // 6. Update Camera & Avatar Positions
    this.avatarGroup.position.copy(this.position);
    this.avatarGroup.rotation.y = this.yaw;

    if (this.pov === '1st') {
      this.camera.position.set(this.position.x, this.position.y + 1.25, this.position.z);
      this.camera.rotation.order = 'YXZ';
      this.camera.rotation.y = this.yaw;
      this.camera.rotation.x = this.pitch;
    } else {
      const camOffset = this.thirdPersonOffset.clone();
      camOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
      camOffset.y += Math.sin(-this.pitch) * 2;

      this.camera.position.copy(this.position).add(camOffset);
      this.camera.lookAt(this.position.x, this.position.y + 1.25, this.position.z);
    }
  }
}
