# ⛏️ CoreDig - Dig to the Planet Core (3D Tycoon RPG)

A 3D cartoon mining tycoon game built in JavaScript with **Three.js** and **Vite**.

## 🚀 Quick Start

From the project directory:
```bash
npm run dev
```
Then open the local URL in your browser (usually `http://localhost:5173`).

---

## 🎮 Controls

| Key | Action |
| :--- | :--- |
| **W, A, S, D** | Move around the surface & dig pit |
| **Mouse Look** | Aim tool / Look around |
| **Left Click (Hold)** | Mine Blocks / Strike Sun Core |
| **V** | **Toggle 1st Person & 3rd Person View** |
| **Spacebar** | Jump |
| **F** | Toggle Headlamp (vital for deep pitch-black depths) |
| **R** | **Surface Recall Beacon** (Instantly teleports back up to base) |
| **E** | Open Surface Upgrade Depot (when near shop building) |
| **ESC** | Unlock mouse pointer |

---

## 💎 Gameplay Features

* **100m Circular Boundary**: Dig site surrounded by safety pylons and neon containment beam.
* **1,000m Subterranean Strata**:
  * 0m – 150m: Soft Clay, Dirt, Coal, Copper.
  * 150m – 400m: Bedrock, Iron, Tin, Silver.
  * 400m – 700m: Granite, Geodes, Gold, Amethyst.
  * 700m – 900m: Volcanic Obsidian, Ruby, Titanium.
  * 900m – 1000m: Voidite & Molten Mantle.
  * 1000m+: **☀️ The Planet Core Chamber**.
* **The Sun Core Boss**: Massive glowing yellow star floating at the deep abyss with 50,000 HP. Depleting it causes a supernova and awards **+1 Planet Core 🌟**.
* **Hard Economy Loop**: Limited backpack space, ores must be sold at the Surface Depot.
* **Tycoon Automation**: Build automated drill rigs around the rim and deploy autonomous mining drones.
* **The Core Forge (Prestige)**: Spend Planet Cores on game-breaking perks like Solar Magnetism and Supernova multipliers.

---

## 🎨 Swapping in Your Own 3D Models (.glb / .gltf)

You can drop in your own 3D models anytime!
1. Press **E** to open the Upgrade Depot.
2. Click on the **3D Models** tab.
3. Select your `.glb` or `.gltf` file for:
   * **Tool / Shovel**
   * **Player Avatar**
   * **The Sun Core**
   * **Auto-Miner Drone**
4. The game will automatically center the pivot, normalize the scale, and update the live 3D scene!
