# TypeWhisper for Stream Deck

Control [TypeWhisper](https://typewhisper.com) from Stream Deck on Windows and macOS. The plugin talks only to TypeWhisper's authenticated local API and discovers the current port and token automatically.

## Actions

| Action | What it does |
| --- | --- |
| Toggle Dictation | Starts or stops normal dictation and shows idle, recording, and processing state. |
| Workflow Dictation | Runs a selected enabled workflow. On Stream Deck +, rotate the dial to select a workflow and press it to start or stop. |
| Recorder | Records microphone, system audio, or both and follows the finalization job after stopping. |
| Last Transcription | Copies the newest final history entry to the clipboard. |
| Add Dictionary Term | Adds one non-empty, single-line clipboard term without replacing existing dictionary entries. |

## Requirements

- TypeWhisper with the local API enabled and workflow dictation support for the Workflow Dictation action
- Stream Deck 7.1 or later
- Windows 10 or later, or macOS 12 or later

The plugin uses the Node.js 24 runtime bundled with Stream Deck 7.1+. No separate Node.js installation is needed for users.

## Install

Download the latest `.streamDeckPlugin` file from [Releases](https://github.com/TypeWhisper/typewhisper-stream-deck/releases), open it, and confirm installation in Stream Deck.

TypeWhisper Stable is preferred by default. In an action's Property Inspector, the global connection selection can be changed to Stable or Development, and a port can optionally be overridden. Authentication tokens are always read from TypeWhisper's local `api-discovery.json`; they are never displayed or logged.

## Development

```powershell
npm ci
npm run build
npm run test
npm run validate
streamdeck link com.typewhisper.streamdeck.sdPlugin
npm run watch
```

Useful checks:

```powershell
npm run lint
npm run typecheck
npm run pack:dry-run
```

The Property Inspector bundles SDPI Components v4 locally, so it remains usable without internet access.

## Privacy

The plugin communicates only with `127.0.0.1`. It does not log discovery tokens, dictionary terms, clipboard contents, or transcription text. Clipboard access occurs only when pressing Last Transcription or Add Dictionary Term.

## License

[GPL-3.0-or-later](LICENSE)
