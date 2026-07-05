import { getInput, setOutput } from "@actions/core";
import { readdir, rm } from "node:fs/promises";
import { join } from "node:path";
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
const cwd = cwdInput === "." ? process.cwd() : join(process.cwd(), cwdInput);

const modsDir = join(cwd, "mods");
const filenames = await readdir(modsDir);
const currentCarpetJar = filenames.find((f) =>
  CARPET_JAR_FILENAME_REGEX.test(f),
);

const releases = await fetchCarpetReleases();
const carpetAsset = findCarpetAssetForVersion(releases, minecraftVersionInput);
if (!carpetAsset) {
  throw new Error("Failed to find Carpet asset (unexpected null return)");
}

if (currentCarpetJar === carpetAsset.filename) {
  console.log("Carpet mod is already up to date");
  await setOutput("is-update", "false");
  process.exit(0);
}

if (currentCarpetJar) {
  await rm(join(modsDir, currentCarpetJar));
  console.log(`Deleted existing Carpet jar: ${currentCarpetJar}`);
}

await downloadCarpetJar(carpetAsset.url, join(modsDir, carpetAsset.filename));

console.log(
  `Successfully updated Carpet mod to version ${carpetAsset.version}`,
);

const changelogContent = [
  "### Updated",
  "",
  `- Updated Carpet Mod to ${carpetAsset.version}`,
  "",
];
const prContent = [
  "### Carpet Mod",
  "",
  `Updated Carpet Mod to ${carpetAsset.version}`,
  "",
];

await setOutput("is-update", "true");
await setOutput("changelog-body", changelogContent.join("\n"));
await setOutput("pr-body", prContent.join("\n"));
