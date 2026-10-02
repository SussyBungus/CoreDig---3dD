/**
 * Economy.js
 * Currencies, 24-slot backpack inventory, gear equipment loadout,
 * upgrade trees, tycoon automations, prestige shop, and localStorage persistence.
 */
export class Economy {
  constructor(soundFX) {
    this.soundFX = soundFX;

    this.cash = 0;
    this.planetCores = 0;

    // Day & Night persistence
    this.dayCount = 1;
    this.timeOfDay = 10.0;

    // Full 24-slot inventory support
    this.inventory = {
      dirt: 0,
      clay: 0,
      coal: 0,
      copper: 0,
      iron: 0,
      silver: 0,
      gold: 0,
      amethyst: 0,
      ruby: 0,
      diamond: 0,
      voidite: 0,
      coreShard: 0
    };

    this.oreValues = {
      dirt: 1,
      clay: 2,
      coal: 5,
      copper: 12,
      iron: 28,
      silver: 65,
      gold: 160,
      amethyst: 400,
      ruby: 1000,
      diamond: 2500,
      voidite: 6500,
      coreShard: 25000
    };

    // Equipment & Stats
    this.currentToolIndex = 0;
    this.currentBackpackIndex = 0;

    this.stats = {
      headlampLevel: 1,
      jumpLevel: 1,
      speedLevel: 1,
      critLevel: 0
    };

    // Tycoon Automation
    this.tycoon = {
      perimeterDrills: 0,
      drones: 0,
      chuteLevel: 0
    };

    // Prestige Perks
    this.prestigePerks = {
      solarMagnet: false,
      melterAura: false,
      supernovaMult: 1,
      drillMatrix: 1
    };

    this.initUpgradeDefinitions();
    this.loadSave();
  }

  initUpgradeDefinitions() {
    this.tools = [
      { name: 'Wooden Spade', cost: 0, damage: 2, speed: 1.0, cleave: 0, icon: '🪵' },
      { name: 'Reinforced Shovel', cost: 60, damage: 6, speed: 1.15, cleave: 0, icon: '⛏️' },
      { name: 'Hardened Pickaxe', cost: 300, damage: 16, speed: 1.3, cleave: 0, icon: '⛏️' },
      { name: 'Pneumatic Jackhammer', cost: 1400, damage: 45, speed: 1.5, cleave: 1, icon: '🔨' },
      { name: 'Laser Excavator', cost: 6000, damage: 120, speed: 1.8, cleave: 2, icon: '🔦' },
      { name: 'Plasma Smasher', cost: 28000, damage: 320, speed: 2.1, cleave: 3, icon: '💥' },
      { name: 'Quantum Singularity Beam', cost: 150000, damage: 1000, speed: 2.5, cleave: 5, icon: '🌌' }
    ];

    this.backpacks = [
      { name: 'Canvas Pouch', cost: 0, capacity: 24, icon: '🎒' },
      { name: 'Reinforced Sack', cost: 100, capacity: 60, icon: '🎒' },
      { name: 'Heavy Hauler', cost: 500, capacity: 150, icon: '🧳' },
      { name: 'Industrial Crate', cost: 2500, capacity: 350, icon: '📦' },
      { name: 'Titanium Container', cost: 12000, capacity: 900, icon: '🗄️' },
      { name: 'Quantum Void-Pocket', cost: 60000, capacity: 3000, icon: '🌀' }
    ];

    this.statUpgrades = {
      headlamp: {
        name: 'Headlamp Lumens',
        icon: '💡',
        desc: 'Pierces through the dark underground.',
        costs: [0, 80, 400, 2000, 10000],
        maxLevel: 5
      },
      jump: {
        name: 'Piston Boots (Jump)',
        icon: '🦘',
        desc: 'Leap higher to climb out of deep pits.',
        costs: [0, 120, 600, 3000, 15000],
        maxLevel: 5
      },
      speed: {
        name: 'Sprint Exosuit (Speed)',
        icon: '👟',
        desc: 'Move faster across the dig site.',
        costs: [0, 100, 500, 2500, 12000],
        maxLevel: 5
      },
      crit: {
        name: 'Seismic Impact (Crit Chance)',
        icon: '🎯',
        desc: '+10% chance to deal 4x damage per hit.',
        costs: [0, 250, 1200, 5000, 25000],
        maxLevel: 5
      }
    };

    this.tycoonUpgrades = [
      {
        id: 'perimeterDrills',
        name: 'Perimeter Drill Rig',
        icon: '🏗️',
        desc: 'Automated drill towers on the surface rim that extract deep ores every 4s.',
        baseCost: 500,
        costMult: 2.2,
        max: 8
      },
      {
        id: 'drones',
        name: 'Subterranean Drone',
        icon: '🤖',
        desc: 'Autonomous hovering drone that digs blocks and attacks the Core.',
        baseCost: 1800,
        costMult: 2.4,
        max: 6
      },
      {
        id: 'chuteLevel',
        name: 'Pneumatic Sell Chute',
        icon: '📮',
        desc: 'Instantly auto-sells a portion of mined ores directly into cash.',
        costs: [0, 4000, 18000, 75000],
        max: 3
      }
    ];

    this.prestigeUpgrades = [
      {
        id: 'solarMagnet',
        name: 'Solar Magnetism',
        icon: '🧲',
        cost: 1,
        desc: 'Mined ores fly straight into your inventory from up to 50 meters away!'
      },
      {
        id: 'melterAura',
        name: 'Core Melter Aura',
        icon: '🔥',
        cost: 2,
        desc: 'Radiates solar heat, continuously damaging nearby blocks and the Sun Core.'
      },
      {
        id: 'supernovaMult',
        name: 'Supernova Ore Multiplier',
        icon: '✨',
        cost: 3,
        desc: 'Permanently triples the cash payout of every mined ore (3x Value).'
      },
      {
        id: 'drillMatrix',
        name: 'Cosmic Automation Matrix',
        icon: '⚡',
        cost: 4,
        desc: 'Multiplies all automated drill & drone speeds and damage by 300%!'
      }
    ];
  }

  getCurrentTool() {
    return this.tools[this.currentToolIndex];
  }

  getCapacity() {
    return this.backpacks[this.currentBackpackIndex].capacity;
  }

  getTotalOreCount() {
    return Object.values(this.inventory).reduce((a, b) => a + b, 0);
  }

  isBackpackFull() {
    return this.getTotalOreCount() >= this.getCapacity();
  }

  addOre(type, count = 1) {
    if (this.isBackpackFull()) return false;

    if (this.tycoon.chuteLevel > 0) {
      const autoPercent = [0, 0.25, 0.50, 1.0][this.tycoon.chuteLevel];
      if (Math.random() < autoPercent) {
        const value = (this.oreValues[type] || 1) * this.prestigePerks.supernovaMult;
        this.cash += value;
        return true;
      }
    }

    if (this.inventory[type] !== undefined) {
      this.inventory[type] += count;
    } else {
      this.inventory[type] = count;
    }
    return true;
  }

  calculateInventoryValue() {
    let sum = 0;
    for (const [type, count] of Object.entries(this.inventory)) {
      sum += (this.oreValues[type] || 1) * count;
    }
    return sum * this.prestigePerks.supernovaMult;
  }

  sellAllOres() {
    const value = this.calculateInventoryValue();
    if (value <= 0) return 0;

    this.cash += value;
    for (const k in this.inventory) {
      this.inventory[k] = 0;
    }

    this.soundFX.playCash();
    this.saveGame();
    return value;
  }

  buyTool(index) {
    const tool = this.tools[index];
    if (!tool || index <= this.currentToolIndex) return false;
    if (this.cash >= tool.cost) {
      this.cash -= tool.cost;
      this.currentToolIndex = index;
      this.soundFX.playCash();
      this.saveGame();
      return true;
    }
    return false;
  }

  buyBackpack(index) {
    const pack = this.backpacks[index];
    if (!pack || index <= this.currentBackpackIndex) return false;
    if (this.cash >= pack.cost) {
      this.cash -= pack.cost;
      this.currentBackpackIndex = index;
      this.soundFX.playCash();
      this.saveGame();
      return true;
    }
    return false;
  }

  upgradeStat(statKey) {
    const def = this.statUpgrades[statKey];
    if (!def) return false;
    const curLevel = this.stats[`${statKey}Level`];
    if (curLevel >= def.maxLevel) return false;
    const cost = def.costs[curLevel];
    if (this.cash >= cost) {
      this.cash -= cost;
      this.stats[`${statKey}Level`]++;
      this.soundFX.playCash();
      this.saveGame();
      return true;
    }
    return false;
  }

  buyTycoon(type) {
    if (type === 'perimeterDrills') {
      const cur = this.tycoon.perimeterDrills;
      const def = this.tycoonUpgrades.find(u => u.id === 'perimeterDrills');
      if (cur >= def.max) return false;
      const cost = Math.round(def.baseCost * Math.pow(def.costMult, cur));
      if (this.cash >= cost) {
        this.cash -= cost;
        this.tycoon.perimeterDrills++;
        this.soundFX.playCash();
        this.saveGame();
        return true;
      }
    } else if (type === 'drones') {
      const cur = this.tycoon.drones;
      const def = this.tycoonUpgrades.find(u => u.id === 'drones');
      if (cur >= def.max) return false;
      const cost = Math.round(def.baseCost * Math.pow(def.costMult, cur));
      if (this.cash >= cost) {
        this.cash -= cost;
        this.tycoon.drones++;
        this.soundFX.playCash();
        this.saveGame();
        return true;
      }
    } else if (type === 'chuteLevel') {
      const cur = this.tycoon.chuteLevel;
      const def = this.tycoonUpgrades.find(u => u.id === 'chuteLevel');
      if (cur >= def.max) return false;
      const cost = def.costs[cur + 1];
      if (this.cash >= cost) {
        this.cash -= cost;
        this.tycoon.chuteLevel++;
        this.soundFX.playCash();
        this.saveGame();
        return true;
      }
    }
    return false;
  }

  buyPrestigePerk(id) {
    const perk = this.prestigeUpgrades.find(p => p.id === id);
    if (!perk) return false;

    if (id === 'solarMagnet' && this.prestigePerks.solarMagnet) return false;
    if (id === 'melterAura' && this.prestigePerks.melterAura) return false;
    if (id === 'supernovaMult' && this.prestigePerks.supernovaMult > 1) return false;
    if (id === 'drillMatrix' && this.prestigePerks.drillMatrix > 1) return false;

    if (this.planetCores >= perk.cost) {
      this.planetCores -= perk.cost;
      if (id === 'solarMagnet') this.prestigePerks.solarMagnet = true;
      if (id === 'melterAura') this.prestigePerks.melterAura = true;
      if (id === 'supernovaMult') this.prestigePerks.supernovaMult = 3;
      if (id === 'drillMatrix') this.prestigePerks.drillMatrix = 3;

      this.soundFX.playSupernova();
      this.saveGame();
      return true;
    }
    return false;
  }

  rewardPlanetCore() {
    this.planetCores++;
    this.saveGame();
  }

  // LocalStorage Persistence
  saveGame() {
    const state = {
      cash: this.cash,
      planetCores: this.planetCores,
      dayCount: this.dayCount,
      timeOfDay: this.timeOfDay,
      currentToolIndex: this.currentToolIndex,
      currentBackpackIndex: this.currentBackpackIndex,
      inventory: this.inventory,
      stats: this.stats,
      tycoon: this.tycoon,
      prestigePerks: this.prestigePerks
    };
    try {
      localStorage.setItem('coredig_save', JSON.stringify(state));
    } catch (e) {
      // ignore
    }
  }

  loadSave() {
    try {
      const data = localStorage.getItem('coredig_save');
      if (data) {
        const s = JSON.parse(data);
        if (s.cash !== undefined) this.cash = s.cash;
        if (s.planetCores !== undefined) this.planetCores = s.planetCores;
        if (s.dayCount !== undefined) this.dayCount = s.dayCount;
        if (s.timeOfDay !== undefined) this.timeOfDay = s.timeOfDay;
        if (s.currentToolIndex !== undefined) this.currentToolIndex = s.currentToolIndex;
        if (s.currentBackpackIndex !== undefined) this.currentBackpackIndex = s.currentBackpackIndex;
        if (s.inventory) this.inventory = { ...this.inventory, ...s.inventory };
        if (s.stats) this.stats = { ...this.stats, ...s.stats };
        if (s.tycoon) this.tycoon = { ...this.tycoon, ...s.tycoon };
        if (s.prestigePerks) this.prestigePerks = { ...this.prestigePerks, ...s.prestigePerks };
      }
    } catch (e) {
      // ignore
    }
  }

  resetSave() {
    try {
      localStorage.removeItem('coredig_save');
      window.location.reload();
    } catch (e) {}
  }
}
