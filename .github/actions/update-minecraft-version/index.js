import { getInput, setOutput } from "@actions/core";
import { spawn } from "node:child_process";
import { readFile, readdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { createInterface } from "node:readline/promises";
import {
  CARPET_JAR_FILENAME_REGEX,
  downloadCarpetJar,
  fetchCarpetReleases,
  findCarpetAssetForVersion,
} from "../lib/carpet.js";

const minecraftVersionInput = getInput("minecraft-version", { required: true });
/** @type {string} */
const cwdInput = getInput("working-directory", { required: false }) || ".";
/** @type {string} */
let cwd;
if (cwdInput === ".") {
  cwd = process.cwd();
} else {
  cwd = join(process.cwd(), cwdInput);
}

const PACKWIZ_MOD_UPDATE_REGEX = /^([^:]+)\s*:\s*(.+?)\s*->\s*(.+)$/;
const PACKWIZ_LOADER_UPDATE_REGEX = /^Updated (.*) loader to version (.*)$/;
const PACKWIZ_MOD_UPDATE_NO_VERSION =
  /^Failed to check updates for (.*): failed to get latest version: no valid versions found$/;

/**
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
function compareInsensitive(a, b) {
  return a.localeCompare(b, undefined, { sensitivity: "base" });
}

async function getAllModNames() {
  /** @type {string[]} */
  const modNames = [];

  const modsDir = join(cwd, "mods");
  const filenames = await readdir(modsDir);

  for (const filename of filenames) {
    if (!filename.match(/\.pw\.toml$/)) {
      continue;
    }

    const content = await readFile(join(modsDir, filename), {
      encoding: "utf8",
    });
    const modNameMatch = content.match(/^name = "(.*)"$/);
    if (modNameMatch) {
      modNames.push(modNameMatch[1]);
    }
  }

  return modNames;
}

/**
 * @typedef MigrateResult
 * @property {string[]} updated
 * @property {string[]} unchanged
 * @property {string[]} unsupported
 * @property {{ name:string; version:string; } | undefined} loader
 */

/** @type {MigrateResult} */
const {
  updated: updatedMods,
  unchanged: unchangedMods,
  unsupported: unsupportedMods,
  loader: updatedLoader,
} = await new Promise((resolve, reject) => {
  /** @type {string[]} */
  const updatedModNames = [];
  /** @type {string[]} */
  const unsupportedModNames = [];
  /** @type {MigrateResult['loader']} */
  let loaderUpdate;

  const updateProcess = spawn(
    "packwiz",
    ["migrate", "minecraft", minecraftVersionInput, "--yes"],
    { cwd },
  );

  const rl = createInterface(updateProcess.stdout);

  rl.on("line", (line) => {
    const updateMatch = PACKWIZ_MOD_UPDATE_REGEX.exec(line);
    if (updateMatch) {
      const modName = updateMatch[1];
      updatedModNames.push(modName);
      return;
    }

    const loaderMatch = PACKWIZ_LOADER_UPDATE_REGEX.exec(line);
    if (loaderMatch) {
      loaderUpdate = {
        name: loaderMatch[1],
        version: loaderMatch[2],
      };
      return;
    }

    const unsupportedMatch = PACKWIZ_MOD_UPDATE_NO_VERSION.exec(line);
    if (unsupportedMatch) {
      const modName = unsupportedMatch[1];
      unsupportedModNames.push(modName);
    }
  });

  rl.on("close", () => {
    getAllModNames()
      .then((allModNames) => {
        /** @type {string[]} */
        const unchangedModNames = [];

        for (const name of allModNames) {
          if (
            updatedModNames.includes(name) ||
            unsupportedModNames.includes(name)
          ) {
            return;
          }

          unchangedModNames.push(name);
        }

        updatedModNames.sort(compareInsensitive);
        unsupportedModNames.sort(compareInsensitive);
        unchangedModNames.sort(compareInsensitive);

        console.log(
          `Updated mods (${updatedModNames.length} updated, ${unsupportedModNames.length} unsupported, ${unchangedModNames.length} unchanged)`,
        );

        resolve({
          updated: updatedModNames,
          unsupported: unsupportedModNames,
          unchanged: unchangedModNames,
          loader: loaderUpdate,
        });
      })
      .catch((err) => reject(err));
  });
  updateProcess.on("error", (err) => reject(err));
});

// Update Carpet mod jar file
/** @type {{ filename: string; version: string } | null} */
let carpetModUpdate = null;

try {
  console.log("Starting Carpet mod update process...");
  const modsDir = join(cwd, "mods");

  // Fetch releases from GitHub API
  const releases = await fetchCarpetReleases();

  // Find matching asset for this Minecraft version
  // This will throw an error if no matching version is found
  const carpetAsset = findCarpetAssetForVersion(
    releases,
    minecraftVersionInput,
  );
  if (!carpetAsset) {
    throw new Error("Failed to find Carpet asset (unexpected null return)");
  }

  // Delete old jar file if it exists
  const existingFilenames = await readdir(modsDir);
  const previousCarpetJars = existingFilenames.filter((f) =>
    CARPET_JAR_FILENAME_REGEX.test(f),
  );
  for (const jarFile of previousCarpetJars) {
    await rm(join(modsDir, jarFile));
    console.log(`Deleted existing Carpet jar: ${jarFile}`);
  }

  // Download new jar file
  const outputPath = join(modsDir, carpetAsset.filename);
  await downloadCarpetJar(carpetAsset.url, outputPath);

  // Track the update for changelog
  carpetModUpdate = {
    filename: carpetAsset.filename,
    version: carpetAsset.version,
  };

  console.log(
    `Successfully updated Carpet mod to version ${carpetAsset.version}`,
  );
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error(`Error updating Carpet mod: ${errorMessage}`);
  throw error;
}

/** @type {string[]} */
const changelogContent = [];
/** @type {string[]} */
const prContent = [];

if (
  updatedMods.length > 0 ||
  unsupportedMods.length > 0 ||
  unchangedMods.length > 0
) {
  changelogContent.push("### Added", "");
  prContent.push("### Mods", "");
}

if (updatedMods.length > 0) {
  changelogContent.push(`- Added and updated ${updatedMods.length} mods`);
  prContent.push(`Added and updated ${updatedMods.length} mods`, "");

  for (const mod of updatedMods) {
    const modMarkdown = mod.replaceAll("[", "\\[");

    changelogContent.push(`  - ${modMarkdown}`);
    prContent.push(`- ${modMarkdown}`);
  }

  prContent.push("");
}

if (unchangedMods.length > 0) {
  changelogContent.push(`- Added ${unchangedMods.length} mods`);
  prContent.push(`Added ${unchangedMods.length} mods`, "");

  for (const mod of unchangedMods) {
    const modMarkdown = mod.replaceAll("[", "\\[");

    changelogContent.push(`  - ${modMarkdown}`);
    prContent.push(`- ${modMarkdown}`);
  }

  prContent.push("");
}

if (unsupportedMods.length > 0) {
  changelogContent.push(
    `- Added ${unsupportedMods.length} mods from previous version of pack  `,
    "  Note: may have some compatibility issues until they are updated to this version of Minecraft",
  );
  prContent.push(
    `Added ${unsupportedMods.length} mods from previous version of pack`,
    "",
  );

  for (const mod of unsupportedMods) {
    const modMarkdown = mod.replaceAll("[", "\\[");

    changelogContent.push(`  - ${modMarkdown}`);
    prContent.push(`- ${modMarkdown}`);
  }

  prContent.push("");
}

if (
  updatedMods.length > 0 ||
  unsupportedMods.length > 0 ||
  unchangedMods.length > 0
) {
  changelogContent.push("");
}

if (updatedLoader || carpetModUpdate) {
  changelogContent.push("### Updated", "");
}

if (updatedLoader) {
  changelogContent.push(
    `- Updated ${updatedLoader.name} to ${updatedLoader.version}`,
  );
}

if (carpetModUpdate) {
  changelogContent.push(`- Updated Carpet Mod to ${carpetModUpdate.version}`);
}

if (updatedLoader || carpetModUpdate) {
  changelogContent.push("");
}

if (updatedLoader) {
  prContent.unshift(
    "### Loader",
    "",
    `Updated ${updatedLoader.name} to ${updatedLoader.version}`,
    "",
  );
}

if (carpetModUpdate) {
  prContent.unshift(
    "### Carpet Mod",
    "",
    `Updated Carpet Mod to ${carpetModUpdate.version}`,
    "",
  );
}

changelogContent.push("");

await setOutput("is-update", "true");
await setOutput("changelog-body", changelogContent.join("\n"));
await setOutput("pr-body", prContent.join("\n"));
