import {
  action,
  type KeyDownEvent,
  SingletonAction,
  type WillAppearEvent,
  type WillDisappearEvent
} from "@elgato/streamdeck";

import { statusCoordinator } from "../services/status-coordinator";
import type { StatusSnapshot } from "../types";
import { dictationVisualState, showFailure } from "./action-utils";

@action({ UUID: "com.typewhisper.streamdeck.toggle-dictation" })
export class ToggleDictation extends SingletonAction {
  override onWillAppear(ev: WillAppearEvent): void {
    statusCoordinator.subscribe(ev.action.id, async (snapshot) => {
      if (ev.action.isKey()) {
        await this.render(ev.action, snapshot);
      }
    });
  }

  override onWillDisappear(ev: WillDisappearEvent): void {
    statusCoordinator.unsubscribe(ev.action.id);
  }

  override async onKeyDown(ev: KeyDownEvent): Promise<void> {
    try {
      const snapshot = await statusCoordinator.refreshNow();
      const client = await statusCoordinator.getClient();
      if (snapshot.dictation?.is_recording) {
        await client.stopDictation();
      } else {
        await client.startDictation();
      }
      await statusCoordinator.refreshNow();
    } catch {
      await showFailure(ev.action);
    }
  }

  private async render(action: KeyDownEvent["action"], snapshot: StatusSnapshot): Promise<void> {
    const state = dictationVisualState(snapshot);
    await Promise.all([
      action.setState(state),
      action.setTitle(!snapshot.connected ? "Offline" : state === 1 ? "Recording" : state === 2 ? "Processing" : "Dictate")
    ]);
  }
}
