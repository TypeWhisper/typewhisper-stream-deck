import type {
  AppStatus,
  DictationStatus,
  DiscoveryResult,
  HistoryResponse,
  RecorderSession,
  RecorderStatus,
  RulesResponse,
  StartResponse
} from "../types";

export class TypeWhisperApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number
  ) {
    super(message);
    this.name = "TypeWhisperApiError";
  }
}

export type FetchLike = typeof fetch;

export class TypeWhisperApiClient {
  constructor(
    private readonly discovery: DiscoveryResult,
    private readonly fetcher: FetchLike = fetch
  ) {}

  get source(): DiscoveryResult["source"] {
    return this.discovery.source;
  }

  private async request<T>(
    pathname: string,
    init: RequestInit = {},
    timeoutMs = 5_000
  ): Promise<T> {
    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${this.discovery.token}`);
    headers.set("Accept", "application/json");
    if (init.body !== undefined) {
      headers.set("Content-Type", "application/json");
    }

    let response: Response;
    try {
      response = await this.fetcher(`http://127.0.0.1:${this.discovery.port}${pathname}`, {
        ...init,
        headers,
        signal: AbortSignal.timeout(timeoutMs)
      });
    } catch (error) {
      const message = error instanceof Error && error.name === "TimeoutError"
        ? "TypeWhisper API request timed out"
        : "TypeWhisper is unavailable";
      throw new TypeWhisperApiError(message);
    }

    if (!response.ok) {
      let message = `TypeWhisper API returned ${response.status}`;
      try {
        const body = await response.json() as { error?: string; message?: string };
        message = body.error ?? body.message ?? message;
      } catch {
        // Do not expose response bodies: they may contain user text.
      }
      throw new TypeWhisperApiError(message, response.status);
    }

    if (response.status === 204) {
      return undefined as T;
    }
    return await response.json() as T;
  }

  getStatus(): Promise<AppStatus> {
    return this.request("/v1/status", {}, 2_500);
  }

  getDictationStatus(): Promise<DictationStatus> {
    return this.request("/v1/dictation/status", {}, 2_500);
  }

  startDictation(workflowId?: string): Promise<StartResponse> {
    const init: RequestInit = { method: "POST" };
    if (workflowId !== undefined) {
      init.body = JSON.stringify({ workflow_id: workflowId });
    }
    return this.request("/v1/dictation/start", init, 10_000);
  }

  stopDictation(): Promise<StartResponse> {
    return this.request("/v1/dictation/stop", { method: "POST" }, 10_000);
  }

  getRecorderStatus(): Promise<RecorderStatus> {
    return this.request("/v1/recorder/status", {}, 2_500);
  }

  startRecorder(microphone: boolean, systemAudio: boolean): Promise<StartResponse> {
    const query = new URLSearchParams({
      mic: String(microphone),
      system_audio: String(systemAudio)
    });
    return this.request(`/v1/recorder/start?${query}`, { method: "POST" }, 10_000);
  }

  stopRecorder(): Promise<StartResponse> {
    return this.request("/v1/recorder/stop", { method: "POST" }, 10_000);
  }

  getRecorderSession(id: string): Promise<RecorderSession> {
    return this.request(`/v1/recorder/session?id=${encodeURIComponent(id)}`, {}, 5_000);
  }

  getWorkflows(): Promise<RulesResponse> {
    return this.request("/v1/rules", {}, 5_000);
  }

  getLatestHistory(): Promise<HistoryResponse> {
    return this.request("/v1/history?limit=1&offset=0", {}, 5_000);
  }

  addDictionaryTerm(term: string): Promise<{ count: number }> {
    return this.request("/v1/dictionary/terms", {
      method: "PUT",
      body: JSON.stringify({ terms: [term], replace: false })
    }, 10_000);
  }
}
