import type { StatusSnapshot, WorkflowRule } from "../types";

export function parseDictionaryTerm(value: string): string | undefined {
  const term = value.trim();
  if (!term || /[\r\n]/u.test(term)) {
    return undefined;
  }
  return term;
}

export function workflowLabel(workflow: { name?: string; title?: string; display_name?: string }): string {
  return workflow.name ?? workflow.display_name ?? workflow.title ?? "Workflow";
}

export function supportsWorkflowDictation(snapshot: StatusSnapshot): boolean {
  return snapshot.connected && snapshot.app?.supports_workflow_dictation === true;
}

export function enabledWorkflows(snapshot: StatusSnapshot): WorkflowRule[] {
  return snapshot.workflows.filter((workflow) => workflow.enabled);
}

export function nextWorkflow(
  workflows: WorkflowRule[],
  currentId: string | undefined,
  ticks: number
): WorkflowRule | undefined {
  if (workflows.length === 0 || ticks === 0) {
    return undefined;
  }
  const found = workflows.findIndex((workflow) => workflow.id === currentId);
  const current = found >= 0 ? found : 0;
  const direction = ticks > 0 ? 1 : -1;
  return workflows[(current + direction + workflows.length) % workflows.length];
}

export function hasRecorderSource(microphone: boolean, systemAudio: boolean): boolean {
  return microphone || systemAudio;
}
