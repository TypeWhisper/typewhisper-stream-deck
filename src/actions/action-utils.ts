import streamDeck from "@elgato/streamdeck";
import type { DialAction, KeyAction } from "@elgato/streamdeck";

import type { StatusSnapshot } from "../types";

export type VisibleAction = DialAction<any> | KeyAction<any>;

export async function showFailure(action: VisibleAction): Promise<void> {
  streamDeck.logger.warn("TypeWhisper action failed");
  await action.showAlert();
}

export function dictationVisualState(snapshot: StatusSnapshot): number {
  if (!snapshot.connected) {
    return 0;
  }
  if (snapshot.dictation?.is_recording) {
    return 1;
  }
  return snapshot.dictation?.state && snapshot.dictation.state !== "idle" ? 2 : 0;
}

export function shortTitle(value: string, maxLength = 18): string {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength - 1)}…`;
}
