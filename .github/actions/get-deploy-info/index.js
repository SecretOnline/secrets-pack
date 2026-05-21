import { getInput, setOutput } from "@actions/core";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const typeAndPack = getInput("pack", { required: true });
const versionNumber = getInput("version", { required: true });

const PACK_INPUT_REGEX = /^([^/]+)\/([^/]+)$/;
const VERSION_REGEX = /^(\d+)\.(\d+)\.(\d+)$/;

const typeAndPackMatch = PACK_INPUT_REGEX.exec(typeAndPack);
if (!typeAndPackMatch) {
  throw new Error(`Pack input (${typeAndPack}) is not valid`);
}

const [, type, pack] = typeAndPackMatch;

const versionMatch = VERSION_REGEX.exec(versionNumber);
if (!versionMatch) {
  throw new Error(`Release version (${versionNumber}) is not valid`);
}

const [, versionMajor] = versionMatch;
/** @type {{ name: string; 'modrinth-id': string; 'version-map': { [key: string]: { directory: string; 'game-versions': string, 'should-run-workflows': boolean } } }} */
const project = JSON.parse(
  await readFile(join(process.cwd(), `${type}s`, pack, "project.json"), {
    encoding: "utf-8",
  }),
);

const projectEntry = project["version-map"][versionMajor]
  ? versionMajor
  : "default";
const versionDirName = project["version-map"][projectEntry].directory;

const gameVersions = project["version-map"][projectEntry]["game-versions"];
const releaseName = `${project.name} v${versionNumber} for Minecraft ${gameVersions}`;

// TODO: Get loader properly
/** @type {string} */
let loaders;
if (type === "modpack") {
  const packToml = await readFile(
    join(process.cwd(), `${type}s`, pack, versionDirName, "pack.toml"),
    "utf-8",
  );

  const loaderKeys = ["fabric", "quilt", "forge", "neoforge"];
  const loaderRegex = new RegExp(
    `\\[versions](?:.|[\\r\\n])+^(${loaderKeys.join("|")}) = .*`,
    "gm",
  );

  const loaderMatch = loaderRegex.exec(packToml);
  if (!loaderMatch) {
    throw new Error(`Could not find loaders in pack.toml`);
  }

  loaders = loaderMatch[1];
} else {
  loaders = "minecraft";
}

/** @type {string[]} */
const files = [];
let includeSource = false;
if (type === "modpack") {
  files.push(`${pack}.${versionNumber}.mrpack`);

  if (pack === "secrets-pack") {
    files.push(`source-code.${pack}.${versionNumber}.zip.mrpack`);
    includeSource = true;
  }
} else {
  files.push(`${pack}.${versionNumber}.zip`);
}

let modrinthId = project["modrinth-id"] ?? "";
if (modrinthId === "null") {
  modrinthId = "";
}
if (modrinthId) {
  const response = await fetch(
    `https://api.modrinth.com/v2/project/${modrinthId}`,
    {
      headers: {
        "user-agent": "secret_online/mod-auto-updater (mc@secretonline.co)",
      },
    },
  );
  const modrinthProject = await response.json();

  setOutput("pack-icon-url", modrinthProject.icon_url);
}

setOutput("artifact-name", `${pack}.${versionDirName}`);
setOutput("type", type);
setOutput("pack", pack);
setOutput("directory", versionDirName);
setOutput("modrinth-id", modrinthId);
setOutput("pack-name", project.name);
setOutput("release-name", releaseName);
setOutput("version-name", `v${versionNumber}`);
setOutput("game-versions", gameVersions);
setOutput("loaders", loaders);
setOutput("files", files.join("\n"));
setOutput("include-source", includeSource.toString());
