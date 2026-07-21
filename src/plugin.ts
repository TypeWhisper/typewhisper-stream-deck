import streamDeck from "@elgato/streamdeck";

import { AddDictionaryTerm } from "./actions/add-dictionary-term";
import { LastTranscription } from "./actions/last-transcription";
import { Recorder } from "./actions/recorder";
import { ToggleDictation } from "./actions/toggle-dictation";
import { WorkflowDictation } from "./actions/workflow-dictation";
import { statusCoordinator } from "./services/status-coordinator";

streamDeck.logger.setLevel("info");

streamDeck.actions.registerAction(new ToggleDictation());
streamDeck.actions.registerAction(new WorkflowDictation());
streamDeck.actions.registerAction(new Recorder());
streamDeck.actions.registerAction(new LastTranscription());
streamDeck.actions.registerAction(new AddDictionaryTerm());

await streamDeck.connect();
await statusCoordinator.initialize();
