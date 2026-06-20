# **Abyss**
𝗧𝗵𝗲 𝗕𝗲𝘀𝘁 𝗠𝗶𝗻𝗲𝗰𝗿𝗮𝗳𝘁 𝗖𝗹𝗶𝗲𝗻𝘁 𝘆𝗼𝘂 𝗰𝗼𝘂𝗹𝗱 𝗲𝘃𝗲𝗿 𝘄𝗮𝗻𝘁

𝗜𝗻𝗰𝗹𝘂𝗱𝗲𝘀 𝗺𝗼𝗱𝘀, 𝘀𝗲𝗹𝗳-𝗵𝗼𝘀𝘁𝗲𝗱 𝘀𝗲𝗿𝘃𝗲𝗿𝘀 𝗮𝗻𝗱 𝗠𝗶𝗻𝗲𝗰𝗿𝗮𝗳𝘁 𝗹𝗮𝘂𝗻𝗰𝗵𝗶𝗻𝗴!

Abyss is a desktop Minecraft launcher with a Modrinth mod browser built in. You can search for
mods and drop them straight into an instance, keep separate instances on different versions and
loaders, sign in with your Microsoft account and launch the game. It's an Electron app written in
React and TypeScript.

## What works so far

- Launching vanilla, Fabric and Quilt. Forge and NeoForge are in the UI but not hooked up yet.
- Microsoft login (via msmc). The session refreshes itself so you only sign in once.
- Searching Modrinth for mods, modpacks, resource packs and shaders, and installing into an instance.
- Making and deleting instances, setting how much RAM each one gets, turning mods on/off or removing them.
- A friends list. It's stored on your machine for now, there's no server behind it.

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

- Forge and NeoForge support
- One-click modpack (.mrpack) installs
- Working out mod dependencies automatically
- An actual backend so the friends list does something
- Checking installed mods for updates

## Credits

Mod data comes from [Modrinth](https://modrinth.com) and their public API. This isn't affiliated
with Modrinth or Mojang, and you need to own Minecraft to play.

## License

MIT
