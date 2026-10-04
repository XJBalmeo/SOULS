<div align="center">
  <h1>🗡️ SOULS - Roguelike</h1>
  <p><strong>A fast-paced, punishing 2D action platformer built with HTML5 and Phaser 3.</strong></p>
  
  <p>
    <a href="https://github.com/XJBalmeo/SOULS/commits/master">
      <img src="https://img.shields.io/github/last-commit/XJBalmeo/SOULS.svg?style=flat-square&color=orange" alt="last commit">
    </a>
    <img src="https://img.shields.io/badge/Made%20with-Phaser_3-7289da.svg?style=flat-square" alt="Made with Phaser 3">
    <img src="https://img.shields.io/badge/Language-JavaScript-f7df1e.svg?style=flat-square" alt="Language">
  </p>
</div>

---

## 📖 About The Game

**SOULS** is a grueling, 2D platformer roguelike where every movement matters. Manage your stamina carefully as you navigate procedurally randomized levels, face relentless enemies, and overcome treacherous platforming challenges. If you run out of stamina in the middle of a fight, you're dead.

Currently exploring the **FAMINE** depths. Will you survive?

## ✨ Features

- 🎲 **Dynamic Level Generation**: Runs pull from a randomized pool of hand-crafted LDTK rooms (using Fisher-Yates shuffling), ensuring no two playthroughs are exactly the same.
- ⚡ **Stamina-Based Combat**: Attacking and dodge-rolling consume stamina. Mindlessly mashing buttons will leave you defenseless!
- 🐀 **Intelligent Enemies**: Enemies utilize line-of-sight tracking and distinct AI states (Patrol, Pursue, Attack). 
- 🏃 **Tight Platforming Mechanics**: Features double jumping, ledge vaulting, rope climbing, and invincible dodge rolls.

## 🎮 Controls

| Action | Key |
| :--- | :--- |
| **Move Left / Right** | `A` / `D` or `←` / `→` |
| **Crouch / Drop Down** | `S` or `↓` |
| **Jump / Double Jump** | `Space` or `W` / `↑` |
| **Attack** | `Z` |
| **Dodge Roll** | `X` or `Shift` |

## 🚀 How to Run Locally

You can run this game directly from your browser by hosting a local web server.

1. **Clone the repository:**
   ```bash
   git clone https://github.com/XJBalmeo/SOULS.git
   cd SOULS
   ```

2. **Start a local web server:**
   Using Python (recommended):
   ```bash
   python -m http.server 8000
   ```
   *Alternatively, you can just double-click the `play.bat` file on Windows!*

3. **Play:**
   Open your browser and navigate to:
   [http://localhost:8000](http://localhost:8000)

## 🛠️ Built With

* **[Phaser 3](https://phaser.io/)** - The HTML5 game framework used.
* **[LDtk](https://ldtk.io/)** - Level Designer Toolkit used for crafting and exporting the procedural rooms.
* **Vanilla HTML/CSS/JS** - No heavy frontend frameworks to keep the game blazing fast.

<div align="center">
  <i>"Don't get greedy."</i>
</div>
