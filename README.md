# Monty Hall Problem &mdash; Interactive Rust + WebAssembly Simulation

[![GitHub Pages](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-success?style=for-the-badge&logo=github)](https://divyesh172.github.io/monty-hall-simulation/)

**🌐 Live Interactive Exhibit:** [https://divyesh172.github.io/monty-hall-simulation/](https://divyesh172.github.io/monty-hall-simulation/)

An interactive, high-performance mathematical simulation of the **Monty Hall Paradox**, powered by **Rust** and **WebAssembly**, designed for math museums, classroom whiteboards, and all mobile/desktop devices.

Based on **Exhibit 10 (Monty Hall Problem)** from `Maths Ideas.pdf` and research from Kalid Azad's *BetterExplained* conditional probability model.

---

## 🌟 Key Features

1. **🎮 Interactive 3D Play Mode:**
   - 3D perspective animated doors with realistic door swings.
   - Dynamic Monty host dialogue: Monty reveals a goat and invites the player to **STAY** or **SWITCH**.
   - Sound synthesis via native Web Audio API (door creak, goat bleat, victory fanfare).
   - Live session tally recording empirical win rates.

2. **⚡ High-Speed Monte Carlo Simulator:**
   - Pure Rust simulation core running in WebAssembly.
   - Simulates 100 to 100,000+ trials in milliseconds.
   - Zero-copy linear memory sharing between Rust and HTML5 Canvas.
   - Dual win-rate comparison bar chart and real-time convergence curve tracking the Law of Large Numbers towards $66.7\%$ (Switch) and $33.3\%$ (Stay).
   - "Monty Fall" uninformed host mode toggle proving that Monty's *knowledge* is what creates the statistical advantage.

3. **🧠 100-Doors Intuition Lab:**
   - Interactive slider scaling from 3 to 100 doors to break the intuitive "50/50" misconception.
   - BetterExplained "Set Grouping" visual bracket showing probability mass condensation.

4. **🎓 Teacher & Classroom Toolkit:**
   - 4 guided teaching questions directly taken from `Maths Ideas.pdf`.
   - 3-scenario permutation truth table.

5. **📱 100% Cross-Device Compatibility:**
   - Mobile phones (iOS Safari, Android Chrome), tablets (iPads), Chromebooks, laptops, and large smartboards.
   - Touch-optimized controls and offline PWA capability.

---

## 🚀 How to Run

### Quick Start (Local Web Server)
Run the included launcher in PowerShell or Terminal:

```powershell
python serve.py
```

This will automatically open `http://localhost:8080` in your default browser and display your local network IP (e.g. `http://192.168.x.x:8080`) so you can open it on your phone or tablet on the same Wi-Fi.

---

## 🦀 Development & Rust Recompilation

### 1. Run Automated Rust Tests
```powershell
cargo test
```
Verifies convergence to $2/3$ and $1/3$, Monty Fall $50/50$, and 100-door $99\%$ win rate.

### 2. Rebuild WebAssembly Module
```powershell
wasm-pack build --target web --release --out-dir ./www/pkg
```
