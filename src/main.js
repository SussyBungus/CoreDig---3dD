import * as THREE from 'three';
import { SoundFX } from './systems/SoundFX.js';
import { AssetRegistry } from './systems/AssetRegistry.js';
import { Economy } from './systems/Economy.js';
import { World } from './systems/World.js';
import { SunCore } from './systems/SunCore.js';
import { PlayerController } from './systems/PlayerController.js';

/**
 * main.js
 * Application entry point for CoreDig.
 */

// 1. Scene, Camera, Renderer
const canvas = document.getElementById('webgl-canvas');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x38bdf8);
scene.fog = new THREE.FogExp2(0x38bdf8, 0.008);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 700);
scene.add(camera);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.3;

// 2. Systems
const soundFX = new SoundFX();
const assetRegistry = new AssetRegistry();
const economy = new Economy(soundFX);
const world = new World(scene, soundFX, economy);

if (economy.dayCount) world.dayCount = economy.dayCount;
if (economy.timeOfDay !== undefined) world.timeOfDay = economy.timeOfDay;

const sunCore = new SunCore(scene, soundFX, economy);
const player = new PlayerController(camera, scene, canvas, soundFX, economy, world, sunCore, assetRegistry);

// 3. Tycoon Automation (Drones)
const activeDrones = [];
let drillTimer = 0;

function syncDrones() {
  const desired = economy.tycoon.drones;
  while (activeDrones.length < desired) {
    const droneMesh = assetRegistry.createPlaceholderDrone();
    const spawnPos = new THREE.Vector3(
      (Math.random() - 0.5) * 20,
      -10 - Math.random() * 40,
      (Math.random() - 0.5) * 20
    );
    droneMesh.position.copy(spawnPos);
    scene.add(droneMesh);

    activeDrones.push({
      mesh: droneMesh,
      cooldown: Math.random() * 2
    });
  }
}

// 4. UI Elements
const elLoadingScreen = document.getElementById('loading-screen');
const elLoadingBarFill = document.getElementById('loading-bar-fill');
const elLoadingStatusText = document.getElementById('loading-status-text');

const elCash = document.getElementById('cash-val');
const elCores = document.getElementById('cores-val');
const elDepth = document.getElementById('depth-val');
const elDayLbl = document.getElementById('day-lbl');
const elClockVal = document.getElementById('clock-val');
const elTimeIcon = document.getElementById('time-icon');

const elBossContainer = document.getElementById('boss-bar-container');
const elBossHpFill = document.getElementById('boss-hp-fill');
const elBossHpText = document.getElementById('boss-hp-text');

const elDepotBanner = document.getElementById('surface-depot-banner');
const elDepotBannerTitle = document.getElementById('depot-banner-title');
const elBackpackAlert = document.getElementById('backpack-full-alert');
const elBlocker = document.getElementById('blocker');
const elPlayBtn = document.getElementById('play-btn');

// Hotbar Elements
const elHotbarToolIcon = document.getElementById('hotbar-tool-icon');
const elHotbarToolName = document.getElementById('hotbar-tool-name');
const elHotbarSlotsContainer = document.getElementById('hotbar-slots-container');
const elHotbarBackpackBtn = document.getElementById('hotbar-backpack-btn');

// Full Backpack Modal Elements
const elBackpackModal = document.getElementById('backpack-modal');
const elCloseBackpackBtn = document.getElementById('close-backpack-btn');
const elModalBackpackCap = document.getElementById('modal-backpack-cap');
const elInventory24Grid = document.getElementById('inventory-24-grid');
const elGearToolIcon = document.getElementById('gear-tool-icon');
const elGearToolName = document.getElementById('gear-tool-name');
const elGearToolStats = document.getElementById('gear-tool-stats');
const elGearLampStats = document.getElementById('gear-lamp-stats');
const elGearJumpStats = document.getElementById('gear-jump-stats');
const elGearSpeedStats = document.getElementById('gear-speed-stats');
const elGearCargoVal = document.getElementById('gear-cargo-val');
const elBackpackSellBtn = document.getElementById('backpack-sell-btn');

// Settings Modal Elements
const elOpenSettingsBtn = document.getElementById('open-settings-btn');
const elSettingsModal = document.getElementById('settings-modal');
const elCloseSettingsBtn = document.getElementById('close-settings-btn');
const elSensSlider = document.getElementById('sens-slider');
const elSensVal = document.getElementById('sens-val');
const elFovSlider = document.getElementById('fov-slider');
const elFovVal = document.getElementById('fov-val');
const elToggleMuteBtn = document.getElementById('toggle-mute-btn');
const elResetSaveBtn = document.getElementById('reset-save-btn');

// Shop Modal Elements
const elShopModal = document.getElementById('shop-modal');
const elShopModalHeading = document.getElementById('shop-modal-heading');
const elCloseShop = document.getElementById('close-shop-btn');
const elSellAllBtn = document.getElementById('sell-all-btn');
const elSellValuePreview = document.getElementById('sell-value-preview');

let isShopOpen = false;
let isBackpackOpen = false;
let isSettingsOpen = false;

// 5. ANIMATED LOADING SCREEN SEQUENCE
function startLoadingSequence() {
  const steps = [
    { pct: 20, text: 'Scanning Planetary Crust...' },
    { pct: 45, text: 'Generating 1,000m Subterranean Strata...' },
    { pct: 70, text: 'Calibrating Titanium Mining Pickaxe...' },
    { pct: 90, text: 'Stabilizing Sun Core Containment Field...' },
    { pct: 100, text: 'Expedition Outpost Ready!' }
  ];

  let currentStep = 0;
  const interval = setInterval(() => {
    if (currentStep < steps.length) {
      const s = steps[currentStep];
      elLoadingBarFill.style.width = `${s.pct}%`;
      elLoadingStatusText.textContent = s.text;
      currentStep++;
    } else {
      clearInterval(interval);
      setTimeout(() => {
        elLoadingScreen.classList.add('fade-out');
        elBlocker.classList.remove('hidden');
      }, 400);
    }
  }, 320);
}

startLoadingSequence();

// Play Button
elPlayBtn.addEventListener('click', () => {
  soundFX.init();
  elBlocker.classList.add('hidden');
  canvas.requestPointerLock();
});

// Ore Metadata
const ORE_METADATA = {
  dirt: { icon: '🪨', name: 'Dirt' },
  clay: { icon: '🧱', name: 'Clay' },
  coal: { icon: '⬛', name: 'Coal' },
  copper: { icon: '🥉', name: 'Copper' },
  iron: { icon: '🥈', name: 'Iron' },
  silver: { icon: '⚪', name: 'Silver' },
  gold: { icon: '🟡', name: 'Gold' },
  amethyst: { icon: '🔮', name: 'Amethyst' },
  ruby: { icon: '💎', name: 'Ruby' },
  diamond: { icon: '🔷', name: 'Diamond' },
  voidite: { icon: '🌌', name: 'Voidite' },
  coreShard: { icon: '☀️', name: 'Core Shard' }
};

// 6. Hotbar & Inventory Rendering
function renderHotbar() {
  const tool = economy.getCurrentTool();
  elHotbarToolIcon.textContent = tool.icon;
  elHotbarToolName.textContent = tool.name;

  const activeOres = Object.entries(economy.inventory).filter(([k, v]) => v > 0);

  elHotbarSlotsContainer.innerHTML = '';
  for (let i = 0; i < 8; i++) {
    const slot = document.createElement('div');
    slot.className = 'hotbar-slot';

    const slotNum = document.createElement('span');
    slotNum.className = 'slot-num';
    slotNum.textContent = i + 1;
    slot.appendChild(slotNum);

    if (i < activeOres.length) {
      const [key, count] = activeOres[i];
      const meta = ORE_METADATA[key] || { icon: '💎', name: key };
      slot.classList.add('has-item');
      slot.title = `${meta.name}: ${count}`;

      const icon = document.createElement('div');
      icon.className = 'slot-item-icon';
      icon.textContent = meta.icon;
      slot.appendChild(icon);

      const countBadge = document.createElement('span');
      countBadge.className = 'slot-count';
      countBadge.textContent = count;
      slot.appendChild(countBadge);
    }
    elHotbarSlotsContainer.appendChild(slot);
  }
}

function renderBackpackModal() {
  const tool = economy.getCurrentTool();
  elGearToolIcon.textContent = tool.icon;
  elGearToolName.textContent = tool.name;
  elGearToolStats.textContent = `Dmg: ${tool.damage} | Spd: ${tool.speed}x ${tool.cleave ? `| AoE: ${tool.cleave}` : ''}`;

  elGearLampStats.textContent = `Level ${economy.stats.headlampLevel} / 5`;
  elGearJumpStats.textContent = `Level ${economy.stats.jumpLevel} / 5`;
  elGearSpeedStats.textContent = `Level ${economy.stats.speedLevel} / 5`;

  const held = economy.getTotalOreCount();
  const cap = economy.getCapacity();
  const totalVal = economy.calculateInventoryValue();

  elModalBackpackCap.textContent = `Capacity: ${held} / ${cap}`;
  elGearCargoVal.textContent = `$${totalVal.toLocaleString()}`;

  elInventory24Grid.innerHTML = '';
  const entries = Object.entries(economy.inventory).filter(([k, v]) => v > 0);

  for (let i = 0; i < 24; i++) {
    const slot = document.createElement('div');
    slot.className = 'inv-24-slot';

    if (i < entries.length) {
      const [key, count] = entries[i];
      const meta = ORE_METADATA[key] || { icon: '💎', name: key };
      const unitPrice = (economy.oreValues[key] || 1) * economy.prestigePerks.supernovaMult;

      slot.classList.add('filled');
      slot.title = `${meta.name} | Qty: ${count} | $${unitPrice}/ea`;

      slot.innerHTML = `
        <span class="inv-item-count">${count}</span>
        <div class="inv-item-icon">${meta.icon}</div>
        <div class="inv-item-name">${meta.name}</div>
      `;
    }
    elInventory24Grid.appendChild(slot);
  }
}

// 7. Modal Toggles
function toggleBackpack(open) {
  isBackpackOpen = (open !== undefined) ? open : !isBackpackOpen;
  if (isBackpackOpen) {
    if (isShopOpen) toggleShop(false);
    if (isSettingsOpen) toggleSettings(false);
    document.exitPointerLock();
    renderBackpackModal();
    elBackpackModal.classList.remove('hidden');
  } else {
    elBackpackModal.classList.add('hidden');
    canvas.requestPointerLock();
  }
}

function toggleSettings(open) {
  isSettingsOpen = (open !== undefined) ? open : !isSettingsOpen;
  if (isSettingsOpen) {
    if (isShopOpen) toggleShop(false);
    if (isBackpackOpen) toggleBackpack(false);
    document.exitPointerLock();
    elSettingsModal.classList.remove('hidden');
  } else {
    elSettingsModal.classList.add('hidden');
    canvas.requestPointerLock();
  }
}

function toggleShop(open, targetTab = null, title = null) {
  isShopOpen = (open !== undefined) ? open : !isShopOpen;
  if (isShopOpen) {
    if (isBackpackOpen) toggleBackpack(false);
    if (isSettingsOpen) toggleSettings(false);
    document.exitPointerLock();

    if (title) elShopModalHeading.textContent = title;

    if (targetTab) {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
      const activeBtn = document.querySelector(`.tab-btn[data-tab="${targetTab}"]`);
      if (activeBtn) activeBtn.classList.add('active');
      const activePane = document.getElementById(targetTab);
      if (activePane) activePane.classList.add('active');
    }

    renderShop();
    elShopModal.classList.remove('hidden');
  } else {
    elShopModal.classList.add('hidden');
    canvas.requestPointerLock();
  }
}

// Button Listeners
elHotbarBackpackBtn.addEventListener('click', () => toggleBackpack());
elCloseBackpackBtn.addEventListener('click', () => toggleBackpack(false));
elBackpackSellBtn.addEventListener('click', () => {
  economy.sellAllOres();
  renderBackpackModal();
  renderHotbar();
});

elOpenSettingsBtn.addEventListener('click', () => toggleSettings(true));
elCloseSettingsBtn.addEventListener('click', () => toggleSettings(false));

elCloseShop.addEventListener('click', () => toggleShop(false));
elSellAllBtn.addEventListener('click', () => {
  economy.sellAllOres();
  renderShop();
  renderHotbar();
});

// Settings Handlers
elSensSlider.addEventListener('input', (e) => {
  const mult = parseFloat(e.target.value);
  player.mouseSensitivity = 0.0022 * mult;
  elSensVal.textContent = `${mult.toFixed(1)}x`;
});

elFovSlider.addEventListener('input', (e) => {
  const fov = parseInt(e.target.value);
  camera.fov = fov;
  camera.updateProjectionMatrix();
  elFovVal.textContent = `${fov}°`;
});

elToggleMuteBtn.addEventListener('click', () => {
  soundFX.muted = !soundFX.muted;
  elToggleMuteBtn.textContent = soundFX.muted ? '🔇 Sound: MUTED' : '🔊 Sound: ON';
});

elResetSaveBtn.addEventListener('click', () => {
  if (confirm('Are you sure you want to reset all game progress?')) {
    economy.resetSave();
  }
});

// Keybinds
window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyE') {
    if (isShopOpen) {
      toggleShop(false);
    } else {
      const nearShop = world.getNearShopType(player.position);
      if (nearShop) {
        toggleShop(true, nearShop.tab, nearShop.title);
      }
    }
  } else if (e.code === 'KeyB') {
    toggleBackpack();
  }
});

// Shop Tabs navigation
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

    btn.classList.add('active');
    const targetId = btn.getAttribute('data-tab');
    document.getElementById(targetId).classList.add('active');
  });
});

// 3D Model Upload Handlers
function setupModelUpload(inputId, statusId, type, size) {
  const input = document.getElementById(inputId);
  const status = document.getElementById(statusId);

  input.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    status.textContent = 'Loading...';
    try {
      const model = await assetRegistry.loadCustomModel(file, type, size);
      status.textContent = `Custom (${file.name})`;
      status.style.color = '#22c55e';

      if (type === 'core') {
        sunCore.setCustomModel(model);
      }
    } catch (err) {
      status.textContent = 'Error loading file';
      status.style.color = '#ef4444';
    }
  });
}

setupModelUpload('upload-tool-file', 'tool-model-status', 'tool', 1.2);
setupModelUpload('upload-player-file', 'player-model-status', 'player', 2.0);
setupModelUpload('upload-core-file', 'core-model-status', 'core', 15.0);
setupModelUpload('upload-drone-file', 'drone-model-status', 'drone', 0.8);

// 8. Shop UI Rendering
function renderShop() {
  const totalVal = economy.calculateInventoryValue();
  elSellValuePreview.textContent = `$${totalVal.toLocaleString()}`;

  const toolsGrid = document.getElementById('tools-grid');
  toolsGrid.innerHTML = '';
  economy.tools.forEach((tool, idx) => {
    const isOwned = idx <= economy.currentToolIndex;
    const isCurrent = idx === economy.currentToolIndex;
    const canAfford = economy.cash >= tool.cost;

    const card = document.createElement('div');
    card.className = `upgrade-card ${isOwned ? 'owned' : ''}`;
    card.innerHTML = `
      <div class="card-top">
        <div class="card-icon">${tool.icon}</div>
        <div>
          <div class="card-title">${tool.name}</div>
          <div class="card-level">Tier ${idx + 1}</div>
        </div>
      </div>
      <div class="card-desc">Damage: <b>${tool.damage}</b> | Speed: <b>${tool.speed}x</b> ${tool.cleave ? `| AoE: <b>${tool.cleave}</b>` : ''}</div>
      <button class="buy-btn ${isCurrent ? 'equipped' : ''}" ${isOwned || !canAfford ? 'disabled' : ''}>
        ${isCurrent ? 'EQUIPPED' : (isOwned ? 'OWNED' : `$${tool.cost.toLocaleString()}`)}
      </button>
    `;

    if (!isOwned && canAfford) {
      card.querySelector('button').addEventListener('click', () => {
        economy.buyTool(idx);
        renderShop();
        renderHotbar();
      });
    }
    toolsGrid.appendChild(card);
  });

  const backpackGrid = document.getElementById('backpack-grid');
  backpackGrid.innerHTML = '';
  economy.backpacks.forEach((pack, idx) => {
    const isOwned = idx <= economy.currentBackpackIndex;
    const isCurrent = idx === economy.currentBackpackIndex;
    const canAfford = economy.cash >= pack.cost;

    const card = document.createElement('div');
    card.className = `upgrade-card ${isOwned ? 'owned' : ''}`;
    card.innerHTML = `
      <div class="card-top">
        <div class="card-icon">${pack.icon}</div>
        <div>
          <div class="card-title">${pack.name}</div>
          <div class="card-level">Tier ${idx + 1}</div>
        </div>
      </div>
      <div class="card-desc">Capacity: <b>${pack.capacity} Ores</b></div>
      <button class="buy-btn ${isCurrent ? 'equipped' : ''}" ${isOwned || !canAfford ? 'disabled' : ''}>
        ${isCurrent ? 'EQUIPPED' : (isOwned ? 'OWNED' : `$${pack.cost.toLocaleString()}`)}
      </button>
    `;

    if (!isOwned && canAfford) {
      card.querySelector('button').addEventListener('click', () => {
        economy.buyBackpack(idx);
        renderShop();
      });
    }
    backpackGrid.appendChild(card);
  });

  const statsGrid = document.getElementById('stats-grid');
  statsGrid.innerHTML = '';
  for (const [key, def] of Object.entries(economy.statUpgrades)) {
    const lvl = economy.stats[`${key}Level`];
    const isMax = lvl >= def.maxLevel;
    const cost = isMax ? 0 : def.costs[lvl];
    const canAfford = !isMax && economy.cash >= cost;

    const card = document.createElement('div');
    card.className = `upgrade-card ${isMax ? 'owned' : ''}`;
    card.innerHTML = `
      <div class="card-top">
        <div class="card-icon">${def.icon}</div>
        <div>
          <div class="card-title">${def.name}</div>
          <div class="card-level">Level ${lvl} / ${def.maxLevel}</div>
        </div>
      </div>
      <div class="card-desc">${def.desc}</div>
      <button class="buy-btn" ${isMax || !canAfford ? 'disabled' : ''}>
        ${isMax ? 'MAXED' : `$${cost.toLocaleString()}`}
      </button>
    `;

    if (!isMax && canAfford) {
      card.querySelector('button').addEventListener('click', () => {
        economy.upgradeStat(key);
        renderShop();
      });
    }
    statsGrid.appendChild(card);
  }

  const tycoonGrid = document.getElementById('tycoon-grid');
  tycoonGrid.innerHTML = '';
  economy.tycoonUpgrades.forEach((u) => {
    let curVal = economy.tycoon[u.id];
    let isMax = curVal >= u.max;
    let cost = 0;
    if (!isMax) {
      cost = u.costs ? u.costs[curVal + 1] : Math.round(u.baseCost * Math.pow(u.costMult, curVal));
    }
    const canAfford = !isMax && economy.cash >= cost;

    const card = document.createElement('div');
    card.className = `upgrade-card ${isMax ? 'owned' : ''}`;
    card.innerHTML = `
      <div class="card-top">
        <div class="card-icon">${u.icon}</div>
        <div>
          <div class="card-title">${u.name}</div>
          <div class="card-level">Count: ${curVal} / ${u.max}</div>
        </div>
      </div>
      <div class="card-desc">${u.desc}</div>
      <button class="buy-btn" ${isMax || !canAfford ? 'disabled' : ''}>
        ${isMax ? 'MAXED' : `$${cost.toLocaleString()}`}
      </button>
    `;

    if (!isMax && canAfford) {
      card.querySelector('button').addEventListener('click', () => {
        economy.buyTycoon(u.id);
        syncDrones();
        renderShop();
      });
    }
    tycoonGrid.appendChild(card);
  });

  const prestigeGrid = document.getElementById('prestige-grid');
  prestigeGrid.innerHTML = '';
  economy.prestigeUpgrades.forEach((p) => {
    const isOwned = (p.id === 'solarMagnet' && economy.prestigePerks.solarMagnet) ||
                    (p.id === 'melterAura' && economy.prestigePerks.melterAura) ||
                    (p.id === 'supernovaMult' && economy.prestigePerks.supernovaMult > 1) ||
                    (p.id === 'drillMatrix' && economy.prestigePerks.drillMatrix > 1);

    const canAfford = economy.planetCores >= p.cost;

    const card = document.createElement('div');
    card.className = `upgrade-card ${isOwned ? 'owned' : ''}`;
    card.innerHTML = `
      <div class="card-top">
        <div class="card-icon">${p.icon}</div>
        <div>
          <div class="card-title">${p.name}</div>
          <div class="card-level">Cost: ${p.cost} 🌟</div>
        </div>
      </div>
      <div class="card-desc">${p.desc}</div>
      <button class="buy-btn" ${isOwned || !canAfford ? 'disabled' : ''}>
        ${isOwned ? 'UNLOCKED' : `${p.cost} 🌟 BUY`}
      </button>
    `;

    if (!isOwned && canAfford) {
      card.querySelector('button').addEventListener('click', () => {
        economy.buyPrestigePerk(p.id);
        renderShop();
      });
    }
    prestigeGrid.appendChild(card);
  });
}

// 9. Tycoon Simulation Loop
function updateTycoonAutomations(delta) {
  if (economy.tycoon.perimeterDrills > 0) {
    drillTimer += delta;
    if (drillTimer >= 4.0) {
      drillTimer = 0;
      const drillCount = economy.tycoon.perimeterDrills;
      const mult = economy.prestigePerks.drillMatrix;
      const payout = drillCount * 50 * mult * economy.prestigePerks.supernovaMult;
      economy.cash += payout;
    }
  }

  const droneSpeedMult = economy.prestigePerks.drillMatrix;
  activeDrones.forEach((drone) => {
    drone.cooldown -= delta * droneSpeedMult;
    drone.mesh.position.y += Math.sin(Date.now() * 0.004) * 0.015;

    if (drone.cooldown <= 0) {
      drone.cooldown = 1.8;
      if (drone.mesh.position.y < -70) {
        sunCore.takeDamage(30 * droneSpeedMult);
      } else {
        for (const [key, block] of world.blocks.entries()) {
          if (block.mesh && block.mesh.position.distanceTo(drone.mesh.position) < 8) {
            world.damageBlock(block, 18 * droneSpeedMult);
            break;
          }
        }
      }
    }
  });
}

// 10. Main Render Loop
const clock = new THREE.Clock();
let saveTimer = 0;

function animate() {
  requestAnimationFrame(animate);

  const delta = Math.min(clock.getDelta(), 0.08);
  const time = clock.getElapsedTime();

  // Systems
  player.update(delta);
  world.update(delta, player.position);
  sunCore.update(delta, time);
  updateTycoonAutomations(delta);

  // Sync HUD
  elCash.textContent = `$${Math.round(economy.cash).toLocaleString()}`;
  elCores.textContent = `${economy.planetCores}`;

  const depthMeters = Math.max(0, Math.round(-player.position.y * 10));
  elDepth.textContent = `${depthMeters}m`;

  const hours = Math.floor(world.timeOfDay);
  const minutes = Math.floor((world.timeOfDay % 1) * 60);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = ((hours + 11) % 12 + 1);
  const displayMinutes = minutes < 10 ? `0${minutes}` : minutes;

  elDayLbl.textContent = `DAY ${world.dayCount}`;
  elClockVal.textContent = `${displayHours}:${displayMinutes} ${period}`;
  elTimeIcon.textContent = (hours >= 6 && hours < 18) ? '☀️' : '🌙';

  // Periodic Save
  saveTimer += delta;
  if (saveTimer >= 5.0) {
    saveTimer = 0;
    economy.dayCount = world.dayCount;
    economy.timeOfDay = world.timeOfDay;
    economy.saveGame();
  }

  // Backpack Full Alert
  if (economy.isBackpackFull()) {
    elBackpackAlert.classList.remove('hidden');
  } else {
    elBackpackAlert.classList.add('hidden');
  }

  // Boss HP Bar
  const distToCore = player.position.distanceTo(sunCore.position);
  if (distToCore < 45 || depthMeters > 700) {
    elBossContainer.classList.remove('hidden');
    const bossHpPct = Math.max(0, (sunCore.hp / sunCore.maxHp) * 100);
    elBossHpFill.style.width = `${bossHpPct}%`;
    elBossHpText.textContent = `${Math.max(0, Math.round(sunCore.hp)).toLocaleString()} / ${sunCore.maxHp.toLocaleString()} HP`;
  } else {
    elBossContainer.classList.add('hidden');
  }

  // Surface Shop Banner & Detection
  const nearShop = world.getNearShopType(player.position);
  if (nearShop) {
    elDepotBanner.classList.remove('hidden');
    elDepotBannerTitle.textContent = nearShop.title;
  } else {
    elDepotBanner.classList.add('hidden');
  }

  renderHotbar();
  renderer.render(scene, camera);
}

// Window resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
