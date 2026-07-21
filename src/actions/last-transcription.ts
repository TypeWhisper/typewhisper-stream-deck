import { action, type KeyDownEvent, SingletonAction } from "@elgato/streamdeck";
import clipboard from "clipboardy";

import { statusCoordinator } from "../services/status-coordinator";
import { showFailure } from "./action-utils";

@action({ UUID: "com.typewhisper.streamdeck.last-transcription" })
export class LastTranscription extends SingletonAction {
  override async onKeyDown(ev: KeyDownEvent): Promise<void> {
    try {
      const response = await (await statusCoordinator.getClient()).getLatestHistory();
      const record = (response.records ?? response.entries ?? [])[0];
      if (!record?.text?.trim()) {
        await showFailure(ev.action);
        return;
      }
      await clipboard.write(record.text);
      await ev.action.showOk();
    } catch {
      await showFailure(ev.action);
    }
  }
}
