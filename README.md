# 🚂 Choo-Choo-Chain!

![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?logo=react&logoColor=black)
![Three.js](https://img.shields.io/badge/Three.js-000000?logo=threedotjs&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?logo=tailwindcss&logoColor=white)

> **An arcade-style 3D train game** — steer your locomotive through an infinite world, collect cargo wagons, grab power-ups, and survive the clock!

🎮 **[Play Now](https://wenzrejas.github.io/choo-choo-chain/)**

![Choo-Choo-Chain screenshot](public/title-screenshot.jpg)

---

## 🎯 Gameplay

Your train charges forward automatically. Guide it left and right to collect cargo wagons while dodging trees, boulders, and — most dangerously — your own tail.

- **Steer** with your mouse cursor (or drag on mobile)
- **Boost** by holding the mouse button (two-finger touch on mobile) — burns energy
- **Collect wagons** to grow your tail and rack up points
- **Grab power-ups** to restore energy, extend your timer, or gain a temporary shield
- Beat the clock before 80 seconds run out!

### Wagons & Power-ups

| Item | Effect |
|---|---|
| 🟤 Copper Wagon | +10 pts |
| ⚪ Silver Wagon | +50 pts |
| 🟡 Gold Wagon | +100 pts |
| ⚡ Energy | +40 energy |
| ⏱ Clock | +10 seconds |
| 🛡 Shield | 6s obstacle invulnerability |

---

## 🛠 Tech Stack

- **[React Three Fiber](https://github.com/pmndrs/react-three-fiber)** — React renderer for Three.js
- **[@react-three/drei](https://github.com/pmndrs/drei)** — R3F utility components
- **[@react-three/rapier](https://github.com/pmndrs/react-three-rapier)** — Physics engine
- **[Zustand](https://github.com/pmndrs/zustand)** — Lightweight game state management
- **[GSAP](https://gsap.com/)** — UI transition animations
- **[Tailwind CSS](https://tailwindcss.com/)** — Utility-first styling
- **[Vite](https://vitejs.dev/)** + **TypeScript** — Build tooling

---

## 🚀 Setup

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## ✨ Highlights

- **Infinite procedural world** via a dynamic zone grid that spawns and despawns content as the player moves
- **InstancedMesh rendering** for wagons, obstacles, and ground tiles — keeps draw calls low even at scale
- **Imperative tail rendering** — the train tail is managed outside React's render cycle to prevent segment flicker on state updates
- **Mobile-ready** — full touch support with two-finger boost detection
- **Audio system** — contextual SFX and background music built on the Web Audio API

---

## 🙏 Credits

### Models

- [Train Kit](https://kenney.nl/assets/train-kit) by [Kenney](https://kenney.nl/)
- [Survival Kit](https://kenney.nl/assets/survival-kit) by [Kenney](https://kenney.nl/)

### Sound Effects & BGM

- [Pavel Bekirov](https://pixabay.com/users/paulyudin-27739282/?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=481904) from [Pixabay](https://pixabay.com//?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=481904)
- [litupsubway](https://pixabay.com/users/litupsubway-55283183/?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=522219) from [Pixabay](https://pixabay.com//?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=522219)
- [Universfield](https://pixabay.com/users/universfield-28281460/?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=291047) from [Pixabay](https://pixabay.com/sound-effects//?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=291047)
- [DRAGON-STUDIO](https://pixabay.com/users/dragon-studio-38165424/?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=376882) from [Pixabay](https://pixabay.com/sound-effects//?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=376882)
- [freesound_community](https://pixabay.com/users/freesound_community-46691455/?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=37399) from [Pixabay](https://pixabay.com//?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=37399)
- [freesound_community](https://pixabay.com/users/freesound_community-46691455/?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=38258) from [Pixabay](https://pixabay.com//?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=38258)
- [EdR](https://pixabay.com/users/edr-1177074/?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=484722) from [Pixabay](https://pixabay.com//?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=484722)

### Others

- [Cursor Pack](https://kenney.nl/assets/cursor-pack) by [Kenney](https://kenney.nl/)

---

## 📄 License

MIT
