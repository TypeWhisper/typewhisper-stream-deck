import {
  action,
  type DialDownEvent,
  type DialRotateEvent,
  type DidReceiveSettingsEvent,
  type KeyDownEvent,
  type PropertyInspectorDidAppearEvent,
  type SendToPluginEvent,
  SingletonAction,
  type WillAppearEvent,
  type WillDisappearEvent
} from "@elgato/streamdeck";
import streamDeck from "@elgato/streamdeck";
import type { JsonObject, JsonValue } from "@elgato/utils";

import { statusCoordinator } from "../services/status-coordinator";
import { enabledWorkflows, nextWorkflow, supportsWorkflowDictation, workflowLabel } from "../services/validation";
import type { StatusSnapshot } from "../types";
import { dictationVisualState, shortTitle, showFailure } from "./action-utils";

interface WorkflowSettings extends JsonObject {
  workflowId?: string;
}

@action({ UUID: "com.typewhisper.streamdeck.workflow-dictation" })
export class WorkflowDictation extends SingletonAction<WorkflowSettings> {
  override onWillAppear(ev: WillAppearEvent<WorkflowSettings>): void {
    statusCoordinator.subscribe(ev.action.id, async (snapshot) => {
      const settings = await ev.action.getSettings<WorkflowSettings>();
      await this.render(ev.action, settings, snapshot);
    });
  }

  override onWillDisappear(ev: WillDisappearEvent<WorkflowSettings>): void {
    statusCoordinator.unsubscribe(ev.action.id);
  }

  override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<WorkflowSettings>): Promise<void> {
    await this.render(ev.action, ev.payload.settings, statusCoordinator.getSnapshot());
  }

  override async onPropertyInspectorDidAppear(_ev: PropertyInspectorDidAppearEvent<WorkflowSettings>): Promise<void> {
    await statusCoordinator.refreshNow(true);
    await this.sendWorkflows();
  }

  override async onSendToPlugin(ev: SendToPluginEvent<JsonValue, WorkflowSettings>): Promise<void> {
    if (isInspectorMessage(ev.payload) && ev.payload.event === "getWorkflows") {
      await statusCoordinator.refreshNow(true);
      await this.sendWorkflows();
    }
  }

  override async onKeyDown(ev: KeyDownEvent<WorkflowSettings>): Promise<void> {
    await this.toggle(ev.action, ev.payload.settings);
  }

  override async onDialDown(ev: DialDownEvent<WorkflowSettings>): Promise<void> {
    await this.toggle(ev.action, ev.payload.settings);
  }

  override async onDialRotate(ev: DialRotateEvent<WorkflowSettings>): Promise<void> {
    const workflows = enabledWorkflows(statusCoordinator.getSnapshot());
    if (workflows.length === 0 || ev.payload.ticks === 0) {
      await showFailure(ev.action);
      return;
    }
    const next = nextWorkflow(workflows, ev.payload.settings.workflowId, ev.payload.ticks);
    if (!next) {
      return;
    }
    const settings: WorkflowSettings = { ...ev.payload.settings, workflowId: next.id };
    await ev.action.setSettings(settings);
    await this.render(ev.action, settings, statusCoordinator.getSnapshot());
  }

  private async toggle(action: KeyDownEvent<WorkflowSettings>["action"] | DialDownEvent<WorkflowSettings>["action"], settings: WorkflowSettings): Promise<void> {
    try {
      const snapshot = await statusCoordinator.refreshNow();
      if (!supportsWorkflowDictation(snapshot)) {
        await showFailure(action);
        return;
      }
      if (snapshot.dictation?.is_recording) {
        await (await statusCoordinator.getClient()).stopDictation();
      } else {
        const workflow = enabledWorkflows(snapshot).find((candidate) => candidate.id === settings.workflowId);
        if (!workflow) {
          await showFailure(action);
          return;
        }
        await (await statusCoordinator.getClient()).startDictation(workflow.id);
      }
      await statusCoordinator.refreshNow();
    } catch {
      await showFailure(action);
    }
  }

  private async sendWorkflows(): Promise<void> {
    const workflows = enabledWorkflows(statusCoordinator.getSnapshot()).map((workflow) => ({
      label: workflowLabel(workflow),
      value: workflow.id
    }));
    await streamDeck.ui.sendToPropertyInspector({ event: "getWorkflows", items: workflows });
  }

  private async render(
    action: WillAppearEvent<WorkflowSettings>["action"],
    settings: WorkflowSettings,
    snapshot: StatusSnapshot
  ): Promise<void> {
    const workflow = enabledWorkflows(snapshot).find((candidate) => candidate.id === settings.workflowId);
    const name = workflow ? workflowLabel(workflow) : "Select workflow";
    const state = dictationVisualState(snapshot);
    const active = snapshot.dictation?.active_workflow_id === workflow?.id;

    if (action.isKey()) {
      await Promise.all([
        action.setState(state),
        action.setTitle(!snapshot.connected ? "Offline" : !snapshot.app?.supports_workflow_dictation ? "Update\nTypeWhisper" : shortTitle(name, 16))
      ]);
      return;
    }

    const value = !snapshot.connected
      ? "Offline"
      : state === 1 && active
        ? "Recording"
        : state === 2
          ? "Processing"
          : "Press to dictate";
    await Promise.all([
      action.setFeedbackLayout("$A1"),
      action.setFeedback({ title: shortTitle(name, 28), value }),
      action.setTriggerDescription({ rotate: "Select workflow", push: "Start / stop dictation" })
    ]);
  }
}

function isInspectorMessage(value: JsonValue): value is JsonObject & { event: string } {
  return typeof value === "object" && value !== null && !Array.isArray(value) && typeof value.event === "string";
}
