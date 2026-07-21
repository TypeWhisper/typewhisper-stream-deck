import { describe, expect, it, vi } from "vitest";

import { TypeWhisperApiClient, TypeWhisperApiError } from "../src/services/api-client";
import type { DiscoveryResult } from "../src/types";

const discovery: DiscoveryResult = {
  source: "stable",
  path: "api-discovery.json",
  port: 5123,
  token: "secret-token"
};

describe("TypeWhisper API client", () => {
  it("uses loopback and sends the bearer token", async () => {
    const fetcher = vi.fn(async (_input: Parameters<typeof fetch>[0], _init?: RequestInit) => Response.json({ api_version: "1.1" }));
    const client = new TypeWhisperApiClient(discovery, fetcher as typeof fetch);
    await client.getStatus();

    const [url, init] = fetcher.mock.calls[0];
    expect(url).toBe("http://127.0.0.1:5123/v1/status");
    expect((init!.headers as Headers).get("Authorization")).toBe("Bearer secret-token");
  });

  it("keeps bodyless dictation starts compatible", async () => {
    const fetcher = vi.fn(async (_input: Parameters<typeof fetch>[0], _init?: RequestInit) => Response.json({ id: "1", status: "recording" }));
    const client = new TypeWhisperApiClient(discovery, fetcher as typeof fetch);
    await client.startDictation();
    const [, init] = fetcher.mock.calls[0];
    expect(init!.body).toBeUndefined();
    expect((init!.headers as Headers).get("Content-Type")).toBeNull();
  });

  it("sends an explicit workflow without exposing it in the URL", async () => {
    const fetcher = vi.fn(async (_input: Parameters<typeof fetch>[0], _init?: RequestInit) => Response.json({ id: "1", status: "recording" }));
    const client = new TypeWhisperApiClient(discovery, fetcher as typeof fetch);
    await client.startDictation("workflow-id");
    const [url, init] = fetcher.mock.calls[0];
    expect(url).toBe("http://127.0.0.1:5123/v1/dictation/start");
    expect(init!.body).toBe('{"workflow_id":"workflow-id"}');
  });

  it("maps timeouts to a sanitized API error", async () => {
    const fetcher = vi.fn(async (_input: Parameters<typeof fetch>[0], _init?: RequestInit) => {
      throw new DOMException("request details", "TimeoutError");
    });
    const client = new TypeWhisperApiClient(discovery, fetcher as typeof fetch);
    await expect(client.getStatus()).rejects.toEqual(new TypeWhisperApiError("TypeWhisper API request timed out"));
  });

  it("preserves HTTP status for capability and compatibility decisions", async () => {
    const fetcher = vi.fn(async (_input: Parameters<typeof fetch>[0], _init?: RequestInit) => Response.json({ error: "Workflow is disabled" }, { status: 409 }));
    const client = new TypeWhisperApiClient(discovery, fetcher as typeof fetch);
    await expect(client.startDictation("disabled")).rejects.toMatchObject({ status: 409 });
  });

  it("passes recorder source overrides as booleans", async () => {
    const fetcher = vi.fn(async (_input: Parameters<typeof fetch>[0], _init?: RequestInit) => Response.json({ id: "1", status: "recording" }));
    const client = new TypeWhisperApiClient(discovery, fetcher as typeof fetch);
    await client.startRecorder(true, false);
    expect(fetcher.mock.calls[0][0]).toBe("http://127.0.0.1:5123/v1/recorder/start?mic=true&system_audio=false");
  });
});
