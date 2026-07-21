import { describe, expect, it } from "vitest";

import { dictationVisualState } from "../src/actions/action-utils";
import {
  enabledWorkflows,
  hasRecorderSource,
  nextWorkflow,
  parseDictionaryTerm,
  supportsWorkflowDictation
} from "../src/services/validation";
import type { StatusSnapshot, WorkflowRule } from "../src/types";

const workflows: WorkflowRule[] = [
  { id: "one", name: "One", is_enabled: true },
  { id: "disabled", name: "Disabled", is_enabled: false },
  { id: "two", name: "Two", is_enabled: true }
];

describe("action rules", () => {
  it("rejects empty and multiline clipboard values", () => {
    expect(parseDictionaryTerm("  ")).toBeUndefined();
    expect(parseDictionaryTerm("first\nsecond")).toBeUndefined();
    expect(parseDictionaryTerm("  TypeWhisper  ")).toBe("TypeWhisper");
  });

  it("requires at least one recorder source", () => {
    expect(hasRecorderSource(false, false)).toBe(false);
    expect(hasRecorderSource(true, false)).toBe(true);
    expect(hasRecorderSource(false, true)).toBe(true);
  });

  it("cycles only through enabled workflows and wraps", () => {
    const enabled = enabledWorkflows({ connected: true, workflows });
    expect(nextWorkflow(enabled, "one", 1)?.id).toBe("two");
    expect(nextWorkflow(enabled, "one", -1)?.id).toBe("two");
  });

  it("accepts the legacy enabled field from early API drafts", () => {
    expect(enabledWorkflows({ connected: true, workflows: [{ id: "legacy", enabled: true }] }))
      .toEqual([{ id: "legacy", enabled: true }]);
  });

  it("never starts workflow dictation against an old app", () => {
    expect(supportsWorkflowDictation({ connected: true, app: { api_version: "1.0" }, workflows: [] })).toBe(false);
    expect(supportsWorkflowDictation({ connected: true, app: { supports_workflow_dictation: true }, workflows: [] })).toBe(true);
  });

  it("maps offline, recording, processing, and idle states", () => {
    const snapshot = (values: Partial<StatusSnapshot>): StatusSnapshot => ({ connected: true, workflows: [], ...values });
    expect(dictationVisualState(snapshot({ connected: false }))).toBe(0);
    expect(dictationVisualState(snapshot({ dictation: { state: "recording", is_recording: true } }))).toBe(1);
    expect(dictationVisualState(snapshot({ dictation: { state: "processing", is_recording: false } }))).toBe(2);
    expect(dictationVisualState(snapshot({ dictation: { state: "idle", is_recording: false } }))).toBe(0);
  });
});
