import streamDeck from "@elgato/streamdeck";

import type { GlobalSettings, StatusSnapshot } from "../types";
import { TypeWhisperApiClient } from "./api-client";
import { discoverTypeWhisper } from "./discovery";

type Listener = (snapshot: StatusSnapshot) => void | Promise<void>;

const POLL_INTERVAL_MS = 750;
const RULE_REFRESH_MS = 30_000;

export class StatusCoordinator {
  private readonly listeners = new Map<string, Listener>();
  private settings: GlobalSettings = {};
  private client?: TypeWhisperApiClient;
  private timer?: NodeJS.Timeout;
  private polling?: Promise<void>;
  private lastRulesRefresh = 0;
  private snapshot: StatusSnapshot = { connected: false, workflows: [] };

  async initialize(): Promise<void> {
    this.settings = await streamDeck.settings.getGlobalSettings<GlobalSettings>();
    streamDeck.settings.onDidReceiveGlobalSettings<GlobalSettings>((event) => {
      this.settings = event.settings;
      this.client = undefined;
      this.lastRulesRefresh = 0;
      void this.refreshNow(true);
    });
  }

  subscribe(id: string, listener: Listener): void {
    this.listeners.set(id, listener);
    if (!this.timer) {
      this.timer = setInterval(() => void this.poll(), POLL_INTERVAL_MS);
    }
    void listener(this.snapshot);
    void this.refreshNow(true);
  }

  unsubscribe(id: string): void {
    this.listeners.delete(id);
    if (this.listeners.size === 0 && this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  getSnapshot(): StatusSnapshot {
    return this.snapshot;
  }

  async getClient(): Promise<TypeWhisperApiClient> {
    if (this.client) {
      return this.client;
    }
    const discoveries = await discoverTypeWhisper(this.settings);
    let lastError: unknown;
    for (const discovery of discoveries) {
      const candidate = new TypeWhisperApiClient(discovery);
      try {
        await candidate.getStatus();
        this.client = candidate;
        return candidate;
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError instanceof Error ? lastError : new Error("TypeWhisper is unavailable");
  }

  async refreshNow(forceRules = false): Promise<StatusSnapshot> {
    await this.poll(forceRules);
    return this.snapshot;
  }

  private async poll(forceRules = false): Promise<void> {
    if (this.polling) {
      const previousRulesRefresh = this.lastRulesRefresh;
      await this.polling;
      if (forceRules && this.lastRulesRefresh === previousRulesRefresh) {
        await this.poll(true);
      }
      return;
    }

    const operation = this.performPoll(forceRules);
    this.polling = operation;
    try {
      await operation;
    } finally {
      if (this.polling === operation) {
        this.polling = undefined;
      }
    }
  }

  private async performPoll(forceRules: boolean): Promise<void> {
    try {
      const client = await this.getClient();
      const [app, dictation, recorderResult] = await Promise.all([
        client.getStatus(),
        client.getDictationStatus(),
        client.getRecorderStatus().then(
          (recorder) => ({ recorder }),
          () => ({ recorder: { recording: false } })
        )
      ]);
      const recorder = recorderResult.recorder;
      let workflows = this.snapshot.workflows;
      const now = Date.now();
      if (forceRules || now - this.lastRulesRefresh >= RULE_REFRESH_MS) {
        workflows = (await client.getWorkflows()).rules
          .slice()
          .sort((a, b) => (a.priority ?? a.sort_order ?? 0) - (b.priority ?? b.sort_order ?? 0));
        this.lastRulesRefresh = now;
      }
      this.snapshot = { connected: true, app, dictation, recorder, workflows };
    } catch (error) {
      this.client = undefined;
      this.snapshot = {
        connected: false,
        workflows: this.snapshot.workflows,
        error: error instanceof Error ? error.message : "TypeWhisper is unavailable"
      };
    }
    await Promise.allSettled([...this.listeners.values()].map((listener) => listener(this.snapshot)));
  }
}

export const statusCoordinator = new StatusCoordinator();
