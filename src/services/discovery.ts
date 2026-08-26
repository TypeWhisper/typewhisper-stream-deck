import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type { DiscoveryDocument, DiscoveryResult, GlobalSettings, InstancePreference } from "../types";

interface Candidate {
  source: "stable" | "development";
  path: string;
}

export function discoveryCandidates(
  platform: NodeJS.Platform = process.platform,
  env: NodeJS.ProcessEnv = process.env,
  home = os.homedir()
): Candidate[] {
  if (platform === "win32") {
    const localAppData = env.LOCALAPPDATA ?? path.win32.join(home, "AppData", "Local");
    return [
      { source: "stable", path: path.win32.join(localAppData, "TypeWhisper-UserData", "api-discovery.json") },
      { source: "stable", path: path.win32.join(localAppData, "TypeWhisper", "api-discovery.json") },
      {
        source: "stable",
        path: path.win32.join(
          localAppData,
          "Packages",
          "TypeWhisper.TypeWhisper_51tqb5623pxja",
          "LocalCache",
          "Local",
          "TypeWhisper-UserData",
          "api-discovery.json"
        )
      },
      { source: "development", path: path.win32.join(localAppData, "TypeWhisper-DevUserData", "api-discovery.json") },
      { source: "development", path: path.win32.join(localAppData, "TypeWhisper-Dev", "api-discovery.json") }
    ];
  }

  const support = path.posix.join(home, "Library", "Application Support");
  return [
    { source: "stable", path: path.posix.join(support, "TypeWhisper", "api-discovery.json") },
    { source: "development", path: path.posix.join(support, "TypeWhisper-Dev", "api-discovery.json") }
  ];
}

function selectedCandidates(candidates: Candidate[], preference: InstancePreference): Candidate[] {
  if (preference === "auto") {
    return candidates;
  }
  return candidates.filter((candidate) => candidate.source === preference);
}

export async function discoverTypeWhisper(
  settings: GlobalSettings = {},
  candidates = discoveryCandidates()
): Promise<DiscoveryResult[]> {
  const results: DiscoveryResult[] = [];
  const override = Number(settings.portOverride);
  const portOverride = Number.isInteger(override) && override >= 1 && override <= 65535 ? override : undefined;
  for (const candidate of selectedCandidates(candidates, settings.instance ?? "auto")) {
    try {
      const document = JSON.parse(await readFile(candidate.path, "utf8")) as DiscoveryDocument;
      if (!Number.isInteger(document.port) || document.port < 1 || document.port > 65535 || !document.token) {
        continue;
      }
      results.push({
        ...document,
        port: portOverride ?? document.port,
        source: candidate.source,
        path: candidate.path
      });
    } catch {
      // A missing, locked, or incomplete discovery file simply means this instance is unavailable.
    }
  }
  return results;
}
