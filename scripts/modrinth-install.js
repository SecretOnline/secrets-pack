import { spawn } from "node:child_process";

const API_BASE = "https://api.modrinth.com/v2";
const USER_AGENT =
  "secret_online/secrets-pack (+https://github.com/SecretOnline/secrets-pack)";

const url = process.argv[2];
if (!url) {
  console.error("Usage: node scripts/modrinth-install.js <modrinth-url>");
  process.exit(1);
}

const match =
  /^https?:\/\/(?:www\.)?modrinth\.com\/[^/]+\/([^/]+)(?:\/version\/([^/?#]+))?/.exec(
    url,
  );
if (!match) {
  console.error(`Not a Modrinth project or version URL: ${url}`);
  process.exit(1);
}
const [, project, version] = match;

/**
 * @param {string} path
 * @returns {Promise<{ id: string; project_id?: string }>}
 */
async function fetchModrinth(path) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "User-Agent": USER_AGENT },
  });
  if (!response.ok) {
    throw new Error(`Modrinth API ${path} returned ${response.status}`);
  }
  return response.json();
}

/** @type {string[]} */
const args = ["mr", "install"];
if (version) {
  const versionInfo = await fetchModrinth(
    `/project/${encodeURIComponent(project)}/version/${encodeURIComponent(version)}`,
  );
  args.push(
    "--project-id",
    versionInfo.project_id ?? "",
    "--version-id",
    versionInfo.id,
  );
} else {
  const projectInfo = await fetchModrinth(
    `/project/${encodeURIComponent(project)}`,
  );
  args.push("--project-id", projectInfo.id);
}

console.log(`packwiz ${args.join(" ")}`);
const child = spawn("packwiz", args, { stdio: "inherit" });
child.on("error", (err) => {
  console.error(err.message);
  process.exit(1);
});
child.on("exit", (code) => process.exit(code ?? 1));
