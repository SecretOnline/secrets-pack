# [secret's pack](https://modrinth.com/modpack/secrets-pack)

A modpack for technical players on Vanilla servers. This pack is specifically assembled so there are no server-side mods or plugins required.

!["secret's pack" set against 4 different screenshots, showing both technical and aesthetic uses for the pack](https://cdn.modrinth.com/data/1Ahewh4W/images/e49d04f220a4176a0a57c5844a8b660532de2384.png)

## Highlights

- The usual performance mods ([Sodium](https://modrinth.com/mod/sodium) and friends)
- Texture features (similar to Optifine)
- [Iris](https://modrinth.com/mod/iris) for shaders support
- [masa's mods](https://legacy.curseforge.com/members/masady/projects)
- [Carpet](https://modrinth.com/mod/carpet) (only functions when present on the server)
- A selection of utility & QoL mods, including:
  - [Accessible Step](https://modrinth.com/mod/accessible-step), so you can walk up blocks
  - [Voxy](https://modrinth.com/mod/voxy), so you can still have high render distances on servers
  - Xaero's [World Map](https://modrinth.com/mod/xaeros-world-map) and [Minimap](https://modrinth.com/mod/xaeros-minimap) (hidden by default)

There are some lighter configuration changes included, but this pack mostly sticks with defaults as they're generally sensible.

## How the version numbers work

This project uses a three number scheme that isn't quite [semver](https://semver.org/spec/v2.0.0.html). Release names in Modrinth will also contain the Minecraft version for clarity.

```txt
<mc-version>.<update>.<patch>
      ^         ^        ^- Updates to existing mods
      |         ╰ --------- Additions/removals of mods
      ╰ ------------------- Minecraft version, according to the table below
```

| Number                                                             | Compatible versions | Maintenance Status         |
| ------------------------------------------------------------------ | ------------------- | -------------------------- |
| [1](https://modrinth.com/modpack/secrets-pack/versions?g=1.20.1)   | Minecraft 1.20.1    |                            |
| [2](https://modrinth.com/modpack/secrets-pack/versions?g=1.20.2)   | Minecraft 1.20.2    |                            |
| [3](https://modrinth.com/modpack/secrets-pack/versions?g=1.20.4)   | Minecraft 1.20.4    |                            |
| [4](https://modrinth.com/modpack/secrets-pack/versions?g=1.20.6)   | Minecraft 1.20.6    |                            |
| [5](https://modrinth.com/modpack/secrets-pack/versions?g=1.21)     | Minecraft 1.21      |                            |
| [6](https://modrinth.com/modpack/secrets-pack/versions?g=1.21.3)   | Minecraft 1.21.3    |                            |
| [7](https://modrinth.com/modpack/secrets-pack/versions?g=1.21.4)   | Minecraft 1.21.4    |                            |
| [8](https://modrinth.com/modpack/secrets-pack/versions?g=1.21.5)   | Minecraft 1.21.5    |                            |
| [9](https://modrinth.com/modpack/secrets-pack/versions?g=1.21.8)   | Minecraft 1.21.8    |                            |
| [10](https://modrinth.com/modpack/secrets-pack/versions?g=1.21.10) | Minecraft 1.21.10   |                            |
| [11](https://modrinth.com/modpack/secrets-pack/versions?g=1.21.11) | Minecraft 1.21.11   | Active (receiving updates) |
| [12](https://modrinth.com/modpack/secrets-pack/versions?g=26.1.2)  | Minecraft 26.1.2    | Active (receiving updates) |

## Credits

<details>
<summary>External files present in previous versions of this pack</summary>

These files don't show up in Modrinth's versions page, so are listed below.

There's also a `credits.txt` file with more details.

- Complementary Reimagined: <https://modrinth.com/shader/complementary-reimagined>
- Vanilla Tweaks: <https://vanillatweaks.net/>
- Axolotl Bucket Variants: <https://modrinth.com/resourcepack/axolotl-bucket-variants>
- Chat Reporting Helper: <https://modrinth.com/resourcepack/chat-reporting-helper>

</details>

## Source

The files used to manage this pack are shipped as an optional file alongside every release. Just rename `source-code.<version>.zip.mrpack` to remove the `.mrpack` extension, and it's a regular zip file. From here you can use [packwiz](https://packwiz.infra.link/) to build the pack or edit it for yourself.
