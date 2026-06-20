# **Abyss**

𝗧𝗵𝗲 𝗕𝗲𝘀𝘁 𝗠𝗶𝗻𝗲𝗰𝗿𝗮𝗳𝘁 𝗖𝗹𝗶𝗲𝗻𝘁 𝘆𝗼𝘂 𝗰𝗼𝘂𝗹𝗱 𝗲𝘃𝗲𝗿 𝘄𝗮𝗻𝘁

𝗜𝗻𝗰𝗹𝘂𝗱𝗲𝘀 𝗺𝗼𝗱𝘀, 𝘀𝗲𝗹𝗳-𝗵𝗼𝘀𝘁𝗲𝗱 𝘀𝗲𝗿𝘃𝗲𝗿𝘀 𝗮𝗻𝗱 𝗠𝗶𝗻𝗲𝗰𝗿𝗮𝗳𝘁 𝗹𝗮𝘂𝗻𝗰𝗵𝗶𝗻𝗴!

> 🌀 A modern **Minecraft launcher + mod browser** for the desktop — think Modrinth App, reimagined.
Browse and install mods from Modrinth, manage multiple game instances with different versions and
mod loaders, sign in with your Microsoft account, and launch the game. Built with Electron, React
and TypeScript.

![status](https://img.shields.io/badge/status-v0.1.0%20alpha-6c5ce7) ![platform](https://img.shields.io/badge/platform-win%20%7C%20mac%20%7C%20linux-00d2c6)

## ✨ Features

- **🎮 Launch Minecraft** — vanilla, **Fabric** and **Quilt** (Forge/NeoForge coming soon), any
  version from the official manifest, with per-instance memory allocation.
- **🔐 Microsoft sign-in** — real Xbox/Minecraft authentication via `msmc`; sessions are refreshed
  automatically so you only log in once.
- **🧩 Mod browser** — search the entire Modrinth catalogue (mods, modpacks, resource packs,
  shaders), filter by loader/version, and one-click install into any instance.
- **📦 Instance management** — create, rename, delete instances; enable/disable individual mods;
  open the instance folder; isolated mods/saves per instance with a shared asset cache.
- **👥 Friends** — keep a friends list with statuses (local-first; see roadmap).
- **🎨 Theming** — Abyss, Midnight and Void colour themes; custom frameless window.

## 🚀 Getting started

Requirements: **Node.js 18+**, **Java** (17+ for modern Minecraft — Java 21 recommended), and a
**Microsoft account that owns Minecraft: Java Edition**.

```bash
npm install
npm run dev      # launch in development with hot reload
```

Build / package a distributable:

```bash
npm run build    # type-check-free bundle into ./out
npm run dist     # build installers into ./release (Windows nsis / mac dmg / linux AppImage)
```

## 🏗️ Architecture

```
src/
├── shared/        Types + IPC channel contract shared across processes
├── main/          Electron main process
│   ├── index.ts   Window + app lifecycle
│   ├── ipc.ts     IPC handlers (the bridge between UI and capabilities)
│   ├── auth.ts    Microsoft / Xbox / Minecraft auth (msmc)
│   ├── minecraft.ts  Version manifest, loader install, launch (minecraft-launcher-core)
│   ├── modrinth.ts   Modrinth API v2 client
│   ├── instances.ts  Instance + mod file management
│   ├── friends.ts    Local friends store
│   └── store.ts   Persistent config (electron-store)
├── preload/       Secure contextBridge exposing `window.abyss`
└── renderer/      React UI (pages: Play, Browse, ModDetail, InstanceDetail, Friends, Settings)
```

The renderer never touches Node or the network directly — every privileged action goes through a
typed IPC surface defined in `src/shared/ipc.ts` and exposed via the preload bridge.

## 🗺️ Roadmap

- [ ] Forge & NeoForge installer support
- [ ] Modrinth modpack one-click install (`.mrpack`)
- [ ] Automatic mod dependency resolution
- [ ] Real social backend for live friend presence & invites
- [ ] Mod update checks
- [ ] Custom Java runtime download per Minecraft version

## ⚖️ Notes & credits

- Mod content and metadata are provided by **[Modrinth](https://modrinth.com)** via their public
  API. Abyss is an unofficial client and is not affiliated with Modrinth or Mojang/Microsoft.
- Minecraft is a trademark of Mojang Studios. You must own a legitimate copy to play.

## 📄 License

MIT
