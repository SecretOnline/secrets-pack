import { warning } from "@actions/core";
import { writeFile } from "node:fs/promises";

export const CARPET_JAR_FILENAME_REGEX = /^fabric-carpet-.+\.jar$/;

/**
 * Fetch Carpet mod releases from GitHub API
 * @returns {Promise<any[]>}
 */
export async function fetchCarpetReleases() {
  try {
    const response = await fetch(
      "https://api.github.com/repos/gnembon/fabric-carpet/releases",
    );
    if (!response.ok) {
      throw new Error(
        `GitHub API returned status ${response.status}: ${response.statusText}`,
      );
    }
    const releases = await response.json();
    console.log(
      `Fetched ${releases.length} Carpet mod releases from GitHub API`,
    );
    return releases;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to fetch Carpet releases from GitHub API: ${errorMessage}`,
    );
  }
}

/**
 * Find Carpet mod asset for a specific Minecraft version
 * @param {any[]} releases
 * @param {string} minecraftVersion
 * @returns {{ url: string; filename: string; version: string } | null}
 */
export function findCarpetAssetForVersion(releases, minecraftVersion) {
  for (const release of releases) {
    if (!release.assets || release.assets.length === 0) {
      continue;
    }

    for (const asset of release.assets) {
      const filename = asset.name;
      // Match: fabric-carpet-{minecraft-version}-*.jar
      if (
        filename.startsWith(`fabric-carpet-${minecraftVersion}-`) &&
        filename.endsWith(".jar")
      ) {
        console.log(
          `Found Carpet mod ${release.tag_name} for Minecraft ${minecraftVersion}: ${filename}`,
        );
        return {
          url: asset.browser_download_url,
          filename: filename,
          version: release.tag_name,
        };
      }
    }
  }

  let minorMatch = minecraftVersion.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (minorMatch) {
    const originalReleaseVersion = `${minorMatch[1]}.${minorMatch[2]}`;
    warning(
      `No Carpet release for ${minecraftVersion}, trying ${originalReleaseVersion}`,
    );

    for (const release of releases) {
      if (!release.assets || release.assets.length === 0) {
        continue;
      }

      for (const asset of release.assets) {
        const filename = asset.name;
        // Match: fabric-carpet-{minecraft-version}-*.jar
        if (
          (filename.startsWith(`fabric-carpet-${originalReleaseVersion}-`) ||
            filename.startsWith(`fabric-carpet-${originalReleaseVersion}+`)) &&
          filename.endsWith(".jar")
        ) {
          console.log(
            `Found Carpet mod ${release.tag_name} for Minecraft ${originalReleaseVersion}: ${filename}`,
          );
          return {
            url: asset.browser_download_url,
            filename: filename,
            version: release.tag_name,
          };
        }
      }
    }
  }

  // No matching version found
  const availableVersions = releases
    .map((r) => r.tag_name)
    .slice(0, 10)
    .join(", ");
  throw new Error(
    `No Carpet mod release found for Minecraft version ${minecraftVersion}. Latest available versions: ${availableVersions}`,
  );
}

/**
 * Download Carpet mod jar from GitHub
 * @param {string} downloadUrl
 * @param {string} outputPath
 * @returns {Promise<void>}
 */
export async function downloadCarpetJar(downloadUrl, outputPath) {
  try {
    console.log(`Downloading Carpet mod from: ${downloadUrl}`);
    const response = await fetch(downloadUrl);
    if (!response.ok) {
      throw new Error(
        `Download failed with status ${response.status}: ${response.statusText}`,
      );
    }

    const buffer = await response.arrayBuffer();
    await writeFile(outputPath, Buffer.from(buffer));
    console.log(`Successfully downloaded Carpet mod to: ${outputPath}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to download Carpet mod from ${downloadUrl}: ${errorMessage}`,
    );
  }
}
