import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { discoverTypeWhisper, discoveryCandidates } from "../src/services/discovery";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("TypeWhisper discovery", () => {
  it("orders stable before development on Windows", () => {
    const candidates = discoveryCandidates("win32", { LOCALAPPDATA: "C:\\Data" }, "C:\\Users\\Test");
    expect(candidates.map((candidate) => candidate.source)).toEqual([
      "stable",
      "stable",
      "development",
      "development"
    ]);
  });

  it("finds both macOS application support locations", () => {
    const candidates = discoveryCandidates("darwin", {}, "/Users/test");
    expect(candidates.map((candidate) => candidate.path)).toEqual([
      "/Users/test/Library/Application Support/TypeWhisper/api-discovery.json",
      "/Users/test/Library/Application Support/TypeWhisper-Dev/api-discovery.json"
    ]);
  });

  it("filters by instance and applies a valid port override", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "typewhisper-discovery-"));
    temporaryDirectories.push(root);
    const stable = path.join(root, "stable.json");
    const development = path.join(root, "development.json");
    await writeFile(stable, JSON.stringify({ port: 5001, token: "stable-token" }));
    await writeFile(development, JSON.stringify({ port: 5002, token: "development-token" }));

    const results = await discoverTypeWhisper(
      { instance: "development", portOverride: "6123" },
      [
        { source: "stable", path: stable },
        { source: "development", path: development }
      ]
    );

    expect(results).toEqual([{ source: "development", path: development, port: 6123, token: "development-token" }]);
  });

  it("recovers when a discovery file appears later", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "typewhisper-reconnect-"));
    temporaryDirectories.push(root);
    const discoveryPath = path.join(root, "nested", "api-discovery.json");
    const candidates = [{ source: "stable" as const, path: discoveryPath }];
    expect(await discoverTypeWhisper({}, candidates)).toEqual([]);

    await mkdir(path.dirname(discoveryPath));
    await writeFile(discoveryPath, JSON.stringify({ port: 5001, token: "token" }));
    expect(await discoverTypeWhisper({}, candidates)).toHaveLength(1);
  });
});
