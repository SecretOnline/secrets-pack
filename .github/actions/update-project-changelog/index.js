import { getInput, setOutput } from "@actions/core";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const workingDirectory = getInput("working-directory", { required: true });
const directory = getInput("directory", { required: true });
const changelogBody = getInput("changelog-body", { required: true });

process.chdir(join(process.cwd(), workingDirectory));

const projectFileContent = await readFile("project.json", "utf-8");
/** @type {{ name: string; 'modrinth-id': string; 'version-map': { [key: string]: { directory: string; 'game-versions': string, 'should-run-workflows': boolean } } }} */
const project = JSON.parse(projectFileContent);

const majorVersionKey = Object.keys(project["version-map"]).find(
  (k) => project["version-map"][k].directory === directory,
);

if (!majorVersionKey) {
  throw new Error(
    `Could not find version in project.json for directory ${directory}`,
  );
}
const gameVersion = project["version-map"][majorVersionKey]["game-versions"];

const changelogContent = await readFile(`CHANGELOG.md`, "utf-8");
const changelogLines = changelogContent.split(/\r?\n/);
let latestVersionIndex = changelogLines.findIndex((line) =>
  line.startsWith(`## v${majorVersionKey}.`),
);

/** @type {string} */
let newVersionNumber;
if (latestVersionIndex === -1) {
  latestVersionIndex = changelogLines.findIndex((line) =>
    line.match(/^## v\d+\./),
  );
  newVersionNumber = `${majorVersionKey}.0.0`;
} else {
  const latestVersionLine = changelogLines[latestVersionIndex];
  const lineMatch = latestVersionLine.match(/^## v(\d+)\.(\d+)\.(\d+) -/);
  if (!lineMatch) {
    throw new Error(
      `Changelog had line matching latest version, but it did not match: ${latestVersionLine}`,
    );
  }
  const [, majorString, minorString, patchString] = lineMatch;
  const patchNumber = parseInt(patchString);
  const newPatchNumber = patchNumber + 1;
  newVersionNumber = `${majorString}.${minorString}.${newPatchNumber}`;
}

const dateString = new Date().toISOString().replace(/T.*$/, "");

changelogLines.splice(
  latestVersionIndex,
  0,
  `## v${newVersionNumber} - ${dateString}`,
  "",
  `Minecraft ${gameVersion}`,
  "",
  changelogBody,
  "",
);

const newChangelogContent = changelogLines.join("\n");
await writeFile("CHANGELOG.md", newChangelogContent, "utf-8");
await setOutput("version-number", newVersionNumber);
