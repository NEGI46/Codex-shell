# Product requirements

## Product goal

Codex Shell is a personal Windows-first desktop application for supervising and operating multiple local Codex coding sessions. Its promise is **situational awareness with deliberate control**: see what every session is doing, inspect a change, and approve or stop work without hopping among windows.

## Users and assumptions

- Primary user: one technical owner working with local Git projects and Codex.
- Local-first: project content and session metadata remain local unless an approved Codex tool uses the network.
- Japanese UI, dark mode, keyboard and mouse operation.
- A registered project is an explicit trust boundary.

## MVP outcomes (Phase 2)

1. Start a Tauri desktop app on Windows 11.
2. Register a local project after canonical-path validation.
3. Create, resume, stop, and retain multiple Codex sessions.
4. Send instructions and render streaming assistant/tool progress.
5. Use reorderable, pinnable tabs; closing a tab keeps its session.
6. Show changed files and a basic diff preview.
7. Queue approvals: once, session, deny, ask, defer.
8. Show an embedded terminal/log area and stop a running task.
9. Persist non-secret layout and session/tab metadata.

## Non-goals for the MVP

- Automating the official Codex app via accessibility, screenshots, OCR, mouse, or browser control.
- Automatically approving arbitrary commands or destructive actions.
- Remote control server, collaboration, account sharing, cloud sync, general terminal replacement, multi-agent orchestration, or split panes.

## Session state model

| State | Meaning | UI treatment |
| --- | --- | --- |
| `running` | Codex is executing a turn/tool | animated indicator and elapsed time |
| `idle` | session can accept a prompt | neutral indicator |
| `needs_input` | Codex asked a question | priority tab badge and notification |
| `needs_approval` | gated action awaits decision | amber badge and approval focus |
| `completed` | last turn completed | completion timestamp |
| `stopped` | user stopped the current run | resumable history |
| `error` | transport/tool/process failure | sanitized diagnostic |

## Key flows

### Create and run

1. Select a registered project and choose **新規セッション**.
2. Backend creates a session with least-privilege sandbox.
3. Send a prompt; normalized stream events update conversation, status, changed files, and logs.
4. A completed background tab becomes unread; sessions can later be reopened/resumed.

### Review approval

1. Broker emits a proposed sensitive operation.
2. Rust policy engine classifies scope/risk and holds it pending a UI decision.
3. Queue shows operation, reason, target, impact, and session.
4. Allow once/session, deny, ask, or defer; destructive actions require second confirmation.
5. Append a redacted audit entry.

### Review changed file

1. Select a file in the right-top panel.
2. Backend reads Git data only below project root.
3. Inline/side-by-side diff; revert creates an approval request.
4. Ask the owning Codex session about the selected change.

## Accessibility requirements

- Primary actions are keyboard reachable with visible focus and labels.
- Approval buttons are large and safely ordered (`拒否`/`詳細` before permissive actions).
- Color never conveys state alone.
- Command palette supports sessions, approvals, terminal, diff, stop, layout, and templates.

## Success measures

- Identify attention-needing sessions without opening all tabs.
- Understand and decide sensitive actions on one screen.
- Restore tabs/layout without silently resuming work.
