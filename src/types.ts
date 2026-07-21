import type { JsonObject } from "@elgato/utils";

export type InstancePreference = "auto" | "stable" | "development";

export interface GlobalSettings extends JsonObject {
  instance?: InstancePreference;
  portOverride?: number | string;
}

export interface DiscoveryDocument {
  version?: number;
  port: number;
  token: string;
}

export interface DiscoveryResult extends DiscoveryDocument {
  source: "stable" | "development";
  path: string;
}

export interface AppStatus {
  api_version?: string;
  supports_workflow_dictation?: boolean;
  [key: string]: unknown;
}

export interface DictationStatus {
  state: string;
  is_recording: boolean;
  active_model?: string | null;
  active_workflow?: string | null;
  active_workflow_id?: string | null;
}

export interface RecorderStatus {
  recording: boolean;
}

export interface WorkflowRule {
  id: string;
  name?: string;
  title?: string;
  display_name?: string;
  /** Current TypeWhisper API field. */
  is_enabled?: boolean;
  /** Legacy alias accepted for compatibility with early API drafts. */
  enabled?: boolean;
  priority?: number;
  sort_order?: number;
}

export interface RulesResponse {
  rules: WorkflowRule[];
  count: number;
}

export interface HistoryRecord {
  id: string;
  text: string;
  timestamp?: string;
}

export interface HistoryResponse {
  records?: HistoryRecord[];
  entries?: HistoryRecord[];
}

export interface StartResponse {
  id: string;
  status: string;
  workflow_id?: string | null;
  workflow_name?: string | null;
}

export interface RecorderSession {
  id: string;
  status: string;
  error?: string | null;
}

export interface StatusSnapshot {
  connected: boolean;
  app?: AppStatus;
  dictation?: DictationStatus;
  recorder?: RecorderStatus;
  workflows: WorkflowRule[];
  error?: string;
}
