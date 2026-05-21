import { getInput, setOutput } from "@actions/core";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

/** @type {PackSettingsDefinition[]} */
const ALL_PACKS = [
  {
    type: "modpack",
    pack: "secrets-pack",
    modpackTests: [
      { client: "false", server: "modded" },
      { client: "modded", server: "vanilla" },
    ],
  },
  {
    type: "modpack",
    pack: "eths-pack",
    // Forge is being too slow so we're just not testing it :(
    // modpackTests: [{ client: "modded", server: "modded" }],
  },
  {
    type: "modpack",
    pack: "create-little-bit",
    modpackTests: [{ client: "modded", server: "modded" }],
  },
  {
    type: "resourcepack",
    pack: "enor-pearl",
  },
  {
    type: "resourcepack",
    pack: "treehouse-paintings",
  },
  {
    type: "resourcepack",
    pack: "well-known-art",
  },
];

const changedFiles = getInput("changed-files", {
  trimWhitespace: false,
})
  .split(/[\r?\n]+/)
  .filter(Boolean);

const containsRelevantFiles = changedFiles.some((filePath) =>
  filePath.match(/^(?:modpack|resourcepack|datapack)s[\//]/),
);
if (!containsRelevantFiles) {
  console.log("No files related to packs were changed, building all packs");
}

/**
 * @param {PackSettingsDefinition} pack
 * @returns {Promise<ResolvedPack[]>}
 */
async function expandPackDefinition(pack) {
  /** @type {{ name: string; 'modrinth-id': string; 'version-map': { [key: string]: { directory: string; 'game-versions': string, 'should-run-workflows': boolean } } }} */
  const project = JSON.parse(
    await readFile(
      join(process.cwd(), `${pack.type}s`, pack.pack, "project.json"),
      {
        encoding: "utf-8",
      },
    ),
  );

  return Object.values(project["version-map"]).map((version) => ({
    ...pack,
    directory: version.directory,
    shouldRunWorkflows: version["should-run-workflows"],
    name: project.name,
  }));
}

/**
 * @param {ResolvedPack} pack
 * @returns {boolean}
 */
function filterByChangedFiles(pack) {
  if (!containsRelevantFiles) {
    return true;
  }

  const regex = new RegExp(`^${pack.type}s/${pack.pack}/${pack.directory}/`);
  return changedFiles.some((filePath) => filePath.match(regex));
}

const resolvedPacks = (
  await Promise.all(ALL_PACKS.map(expandPackDefinition))
).flatMap((arr) => arr);
const changedPacks = resolvedPacks.filter(filterByChangedFiles);
console.log(
  `Found ${changedPacks.length} packs to build: ${changedPacks.map((pack) => pack.name).join(", ")}`,
);

/** @type {BuildMatrixEntry[]} */
const builds = changedPacks
  .filter((pack) => pack.shouldRunWorkflows)
  .map((pack) => {
    const note = pack.directory === "pack" ? "" : pack.directory;
    const title =
      `Build ${pack.type} ${pack.name} ${note ? `(${note})` : ""}`.trim();

    return {
      title,
      type: pack.type,
      pack: pack.pack,
      directory: pack.directory,
    };
  });

/** @type {BuildMatrixEntry[]} */
const modpackTests = changedPacks
  .filter((pack) => pack.type === "modpack" && pack.shouldRunWorkflows)
  .flatMap((pack) =>
    (pack.modpackTests ?? []).map((test) => {
      /** @type {string[]} */
      const notes = [];
      switch (test.client) {
        case "vanilla":
          notes.push("Vanilla client");
          break;
        case "false":
          notes.push("Server only");
          break;
        default:
      }
      switch (test.server) {
        case "vanilla":
          notes.push("Vanilla server");
          break;
        case "false":
          notes.push("Client only");
          break;
        default:
      }
      if (test.client === "modded" && test.server === "modded") {
        notes.push("Modded");
      }
      const note = notes.join(", ");
      const title =
        `Test ${pack.name} ${pack.directory} ${note ? `(${note})` : ""}`.trim();

      return {
        title,
        type: pack.type,
        pack: pack.pack,
        directory: pack.directory,
        client: test.client,
        server: test.server,
      };
    }),
  );

/** @type {BuildMatrixEntry[]} */
const modpackUpdates = changedPacks
  .filter((pack) => pack.type === "modpack" && pack.shouldRunWorkflows)
  .map((pack) => {
    const note = pack.directory === "pack" ? "" : pack.directory;
    const title =
      `Build ${pack.type} ${pack.name} ${note ? `(${note})` : ""}`.trim();

    return {
      title,
      type: pack.type,
      pack: pack.pack,
      directory: pack.directory,
    };
  });

setOutput("has-builds", (builds.length > 0).toString());
setOutput("build-matrix", JSON.stringify(builds));
setOutput("has-tests", (modpackTests.length > 0).toString());
setOutput("test-modpack-matrix", JSON.stringify(modpackTests));
setOutput("has-updates", (modpackUpdates.length > 0).toString());
setOutput("update-modpack-mods-matrix", JSON.stringify(modpackUpdates));

// Types are down here so they don't take up too much space at the top

/**
 * @typedef PackType
 * @type {'modpack' | 'resourcepack' | 'datapack'}
 */

/**
 * @typedef ModpackTestEntryMode
 * @type {'modded' | 'vanilla' | 'false'}
 */

/**
 * @typedef ModpackTestEntry
 * @property {ModpackTestEntryMode} server
 * @property {ModpackTestEntryMode} client
 */

/**
 * @typedef PackSettingsDefinition
 * @property {PackType} type
 * @property {string} pack
 * @property {ModpackTestEntry[]} [modpackTests]
 */

/**
 * @typedef ResolvedPack
 * @property {string} name
 * @property {PackType} type
 * @property {string} pack
 * @property {string} directory
 * @property {boolean} shouldRunWorkflows
 * @property {ModpackTestEntry[]} [modpackTests]
 */

/**
 * @typedef BuildMatrixEntry
 * @property {string} title
 * @property {PackType} type
 * @property {string} pack
 * @property {string} directory
 */

/**
 * @typedef TestModpackMatrixEntry
 * @property {string} title
 * @property {PackType} type
 * @property {string} pack
 * @property {string} directory
 * @property {ModpackTestEntryMode} client
 * @property {ModpackTestEntryMode} server
 */
