import { getInput, setOutput } from "@actions/core";
import { spawn } from "node:child_process";
import { join } from "node:path";
import { createInterface } from "node:readline/promises";

/** @type {string} */
const cwdInput = getInput("working-directory", { required: false }) || ".";
/** @type {string | undefined} */
let cwd;
if (cwdInput === ".") {
  cwd = undefined;
} else {
  cwd = join(process.cwd(), cwdInput);
}

const PACKWIZ_MOD_UPDATE_REGEX = /^([^:]+)\s*:\s*(.+?)\s*->\s*(.+)$/;
const PACKWIZ_LOADER_UPDATE_REGEX = /^Updated (.*) loader to version (.*)$/;

/** @type {string[]} */
const updatedMods = await new Promise((resolve, reject) => {
  /** @type {string[]} */
  const modNames = [];

  const updateProcess = spawn("packwiz", ["update", "--all", "--yes"], { cwd });

  const rl = createInterface(updateProcess.stdout);

  rl.on("line", (line) => {
    const match = PACKWIZ_MOD_UPDATE_REGEX.exec(line);
    if (match) {
      const modName = match[1];
      modNames.push(modName);
    }
  });

  rl.on("close", () => {
    console.log(`Updated ${modNames.length} mods`);
    resolve(modNames);
  });
  updateProcess.on("error", (err) => reject(err));
});
updatedMods.sort((a, z) =>
  a.localeCompare(z, undefined, { sensitivity: "base" }),
);

/** @type {{ name:string; version:string; } | undefined} */
const updatedLoader = await new Promise((resolve, reject) => {
  /** @type {string | undefined} */
  let loaderName;
  /** @type {string | undefined} */
  let loaderVersion;

  const migrateProcess = spawn(
    "packwiz",
    ["migrate", "loader", "latest", "--yes"],
    { cwd },
  );

  const rl = createInterface(migrateProcess.stdout);

  rl.on("line", (line) => {
    const match = PACKWIZ_LOADER_UPDATE_REGEX.exec(line);
    if (match) {
      loaderName = match[1];
      loaderVersion = match[2];
    }
  });

  rl.on("close", () => {
    if (loaderName && loaderVersion) {
      console.log(`Updated ${loaderName} to ${loaderVersion}`);
      resolve({ name: loaderName, version: loaderVersion });
    } else {
      console.log("No loader update");
      resolve(undefined);
    }
  });
  migrateProcess.on("error", (err) => reject(err));
});

if (updatedMods.length === 0 && updatedLoader === undefined) {
  console.log("No mods to update");
  await setOutput("is-update", "false");

  process.exit(0);
}

/** @type {string[]} */
const changelogContent = ["### Updated", ""];
/** @type {string[]} */
const prContent = [];

if (updatedLoader) {
  changelogContent.push(
    `- Updated ${updatedLoader.name} to ${updatedLoader.version}`,
  );
  prContent.push(
    "### Loader",
    "",
    `Updated ${updatedLoader.name} to ${updatedLoader.version}`,
    "",
  );
}
if (updatedMods.length > 0) {
  changelogContent.push(`- Updated ${updatedMods.length} mods`);
  prContent.push("### Mods", "", `Updated ${updatedMods.length} mods`, "");

  for (const mod of updatedMods) {
    const modMarkdown = mod.replaceAll("[", "\\[");

    changelogContent.push(`  - ${modMarkdown}`);
    prContent.push(`- ${modMarkdown}`);
  }

  prContent.push("");
}

changelogContent.push("");

await setOutput("is-update", "true");
await setOutput("changelog-body", changelogContent.join("\n"));
await setOutput("pr-body", prContent.join("\n"));
