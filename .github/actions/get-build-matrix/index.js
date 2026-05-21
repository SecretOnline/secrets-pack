import { getInput, setOutput } from "@actions/core";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

/** @type {ModpackTestEntry[]} */
const MODPACK_TESTS = [
  { client: "false", server: "modded" },
  { client: "modded", server: "vanilla" },
];

const changedFiles = getInput("changed-files", {
  trimWhitespace: false,
})
  .split(/[\r?\n]+/)
  .filter(Boolean);

const containsRelevantFiles = changedFiles.some((filePath) =>
  filePath.match(/^\d[\d.]+\//),
);
if (!containsRelevantFiles) {
  console.log("No files related to packs were changed, building all packs");
}

/** @type {{ name: string; 'modrinth-id': string; 'version-map': { [key: string]: { directory: string; 'game-versions': string; 'should-run-workflows': boolean } } }} */
const project = JSON.parse(
  await readFile(join(process.cwd(), "project.json"), { encoding: "utf-8" }),
);

/** @type {VersionEntry[]} */
const allVersions = Object.values(project["version-map"]).map((version) => ({
  directory: version.directory,
  shouldRunWorkflows: version["should-run-workflows"],
}));

/**
 * @param {VersionEntry} version
 * @returns {boolean}
 */
function filterByChangedFiles(version) {
  if (!containsRelevantFiles) {
    return true;
  }
  const regex = new RegExp(`^${version.directory}/`);
  return changedFiles.some((filePath) => filePath.match(regex));
}

const changedVersions = allVersions.filter(filterByChangedFiles);
console.log(
  `Found ${changedVersions.length} versions to build: ${changedVersions.map((v) => v.directory).join(", ")}`,
);

/** @type {BuildMatrixEntry[]} */
const builds = changedVersions
  .filter((v) => v.shouldRunWorkflows)
  .map((v) => ({
    title: `Build ${project.name} (${v.directory})`,
    directory: v.directory,
  }));

/** @type {TestMatrixEntry[]} */
const modpackTests = changedVersions
  .filter((v) => v.shouldRunWorkflows)
  .flatMap((v) =>
    MODPACK_TESTS.map((test) => {
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
        `Test ${project.name} ${v.directory} ${note ? `(${note})` : ""}`.trim();

      return {
        title,
        directory: v.directory,
        client: test.client,
        server: test.server,
      };
    }),
  );

/** @type {UpdateMatrixEntry[]} */
const modpackUpdates = changedVersions
  .filter((v) => v.shouldRunWorkflows)
  .map((v) => ({
    title: `Update ${project.name} (${v.directory})`,
    directory: v.directory,
  }));

setOutput("has-builds", (builds.length > 0).toString());
setOutput("build-matrix", JSON.stringify(builds));
setOutput("has-tests", (modpackTests.length > 0).toString());
setOutput("test-modpack-matrix", JSON.stringify(modpackTests));
setOutput("has-updates", (modpackUpdates.length > 0).toString());
setOutput("update-modpack-mods-matrix", JSON.stringify(modpackUpdates));

// Types are down here so they don't take up too much space at the top

/**
 * @typedef VersionEntry
 * @property {string} directory
 * @property {boolean} shouldRunWorkflows
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
 * @typedef BuildMatrixEntry
 * @property {string} title
 * @property {string} directory
 */

/**
 * @typedef TestMatrixEntry
 * @property {string} title
 * @property {string} directory
 * @property {ModpackTestEntryMode} client
 * @property {ModpackTestEntryMode} server
 */

/**
 * @typedef UpdateMatrixEntry
 * @property {string} title
 * @property {string} directory
 */
