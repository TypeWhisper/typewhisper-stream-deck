import { action, type KeyDownEvent, SingletonAction } from "@elgato/streamdeck";
import clipboard from "clipboardy";

import { statusCoordinator } from "../services/status-coordinator";
import { parseDictionaryTerm } from "../services/validation";
import { showFailure } from "./action-utils";

@action({ UUID: "com.typewhisper.streamdeck.add-dictionary-term" })
export class AddDictionaryTerm extends SingletonAction {
  override async onKeyDown(ev: KeyDownEvent): Promise<void> {
    try {
      const term = parseDictionaryTerm(await clipboard.read());
      if (!term) {
        await showFailure(ev.action);
        return;
      }
      await (await statusCoordinator.getClient()).addDictionaryTerm(term);
      await ev.action.showOk();
    } catch {
      await showFailure(ev.action);
    }
  }
}
