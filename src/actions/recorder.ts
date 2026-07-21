import {
  action,
  type DidReceiveSettingsEvent,
  type KeyDownEvent,
  SingletonAction,
  type WillAppearEvent,
  type WillDisappearEvent
} from "@elgato/streamdeck";
import type { JsonObject } from "@elgato/utils";

import { statusCoordinator } from "../services/status-coordinator";
import { hasRecorderSource } from "../services/validation";
import type { StatusSnapshot } from "../types";
import { showFailure } from "./action-utils";

interface RecorderSettings extends JsonObject {
  microphone?: boolean;
  systemAudio?: boolean;
}

@action({ UUID: "com.typewhisper.streamdeck.recorder" })
export class Recorder extends SingletonAction<RecorderSettings> {
  private readonly finalizing = new Set<string>();

  override onWillAppear(ev: WillAppearEvent<RecorderSettings>): void {
    statusCoordinator.subscribe(ev.action.id, async (snapshot) => {
      if (ev.action.isKey()) {
        await this.render(ev.action, snapshot);
      }
    });
  }

  override onWillDisappear(ev: WillDisappearEvent<RecorderSettings>): void {
    statusCoordinator.unsubscribe(ev.action.id);
  }

  override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<RecorderSettings>): Promise<void> {
    if (ev.payload.settings.microphone === false && ev.payload.settings.systemAudio !== true) {
      await ev.action.showAlert();
    }
  }

  override async onKeyDown(ev: KeyDownEvent<RecorderSettings>): Promise<void> {
    const microphone = ev.payload.settings.microphone ?? true;
    const systemAudio = ev.payload.settings.systemAudio ?? false;
    if (!hasRecorderSource(microphone, systemAudio)) {
      await showFailure(ev.action);
      return;
    }

    try {
      const snapshot = await statusCoordinator.refreshNow();
      const client = await statusCoordinator.getClient();
      if (snapshot.recorder?.recording) {
        const response = await client.stopRecorder();
        this.finalizing.add(ev.action.id);
        await this.render(ev.action, statusCoordinator.getSnapshot());
        void this.waitForCompletion(ev.action, response.id);
      } else {
        await client.startRecorder(microphone, systemAudio);
        await statusCoordinator.refreshNow();
      }
    } catch {
      await showFailure(ev.action);
    }
  }

  private async waitForCompletion(action: KeyDownEvent<RecorderSettings>["action"], id: string): Promise<void> {
    try {
      const client = await statusCoordinator.getClient();
      for (let attempt = 0; attempt < 160; attempt += 1) {
        const session = await client.getRecorderSession(id);
        if (["completed", "complete", "succeeded"].includes(session.status)) {
          this.finalizing.delete(action.id);
          await action.showOk();
          await statusCoordinator.refreshNow();
          return;
        }
        if (["failed", "error", "cancelled"].includes(session.status)) {
          throw new Error("Recorder finalization failed");
        }
        await new Promise((resolve) => setTimeout(resolve, 750));
      }
      throw new Error("Recorder finalization timed out");
    } catch {
      this.finalizing.delete(action.id);
      await showFailure(action);
      await this.render(action, statusCoordinator.getSnapshot());
    }
  }

  private async render(action: KeyDownEvent<RecorderSettings>["action"], snapshot: StatusSnapshot): Promise<void> {
    const isFinalizing = this.finalizing.has(action.id);
    const state = snapshot.recorder?.recording ? 1 : isFinalizing ? 2 : 0;
    await Promise.all([
      action.setState(state),
      action.setTitle(!snapshot.connected ? "Offline" : state === 1 ? "Recording" : state === 2 ? "Finalizing" : "Recorder")
    ]);
  }
}
