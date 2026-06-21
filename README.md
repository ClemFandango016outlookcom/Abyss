# **Abyss**
𝗧𝗵𝗲 𝗕𝗲𝘀𝘁 𝗠𝗶𝗻𝗲𝗰𝗿𝗮𝗳𝘁 𝗖𝗹𝗶𝗲𝗻𝘁 𝘆𝗼𝘂 𝗰𝗼𝘂𝗹𝗱 𝗲𝘃𝗲𝗿 𝘄𝗮𝗻𝘁

𝗜𝗻𝗰𝗹𝘂𝗱𝗲𝘀 𝗺𝗼𝗱𝘀, 𝘀𝗲𝗹𝗳-𝗵𝗼𝘀𝘁𝗲𝗱 𝘀𝗲𝗿𝘃𝗲𝗿𝘀 𝗮𝗻𝗱 𝗠𝗶𝗻𝗲𝗰𝗿𝗮𝗳𝘁 𝗹𝗮𝘂𝗻𝗰𝗵𝗶𝗻𝗴!

Abyss is a desktop Minecraft launcher with a Modrinth mod browser built in. You can search for
mods and drop them straight into an instance, keep separate instances on different versions and
loaders, sign in with your Microsoft account and launch the game. It's an Electron app written in
React and TypeScript.

**Website:** https://clemfandango016outlookcom.github.io/Abyss/ — **Downloads:** [Releases](https://github.com/ClemFandango016outlookcom/Abyss/releases)

## What works so far

- Launching vanilla, Fabric and Quilt, plus NeoForge and Forge (experimental — they pull the
  official installer and run it on first launch, which can take a few minutes).
- Microsoft login (via msmc). The session refreshes itself so you only sign in once.
- Searching Modrinth for mods, modpacks, resource packs and shaders. Installing a mod pulls in its
  required dependencies automatically, and resource packs and shaders land in the right folders.
- Checking installed mods for newer versions and updating them in a click — one at a time or all at once.
- Installing a whole Modrinth modpack (.mrpack) in one click — Abyss creates a matching instance and
  downloads every mod and config file in the pack.
- A live console that streams the game's log output, which helps when a Forge/NeoForge launch misbehaves.
- Making, duplicating and deleting instances, setting how much RAM each one gets, turning content on/off
  or removing it. Instances sort by most recently played.
- A friends list. Usernames are checked against Mojang, so each friend is a real account with their
  real skin. Stored locally; there's no presence backend yet.
- Discord Rich Presence — shows what you're playing in your Discord status with a timer and a link
  back to Abyss. Needs a free Discord application Client ID, set in Settings → Discord.
- Updates itself — checks GitHub Releases on startup and downloads and installs new versions from
  Settings → Updates, so you don't have to grab each build by hand.

## Running it

You need Node 18+, a Java runtime (21 works fine) and a Microsoft account that owns Java Edition.

```
npm install
npm run dev
```

The first launch pulls down the game files so it takes a minute.

To build the Windows installer:

```
npm run dist
```

That puts `Abyss-0.1.0-setup.exe` and the unpacked app in `release/`.

## How it's put together

```
src/main      main process - auth, launching, the Modrinth client, saved data
src/preload   the bridge that hands a small typed API to the UI
src/renderer  the React front end
src/shared    types and the list of IPC channels used by both sides
```

The UI never touches the network or the disk directly. It all goes through the IPC handlers in
`src/main/ipc.ts`.

## Still on the list

- An actual backend so the friends list shows live presence
- CurseForge modpack imports
- A skin viewer for your account

## Credits

Mod data comes from [Modrinth](https://modrinth.com) and their public API. This isn't affiliated
with Modrinth or Mojang, and you need to own Minecraft to play.

## License

MIT
