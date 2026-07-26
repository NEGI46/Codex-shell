# Codex Shell

Codex Shell is a local-first desktop workspace for operating multiple OpenAI Codex sessions from one keyboard-friendly screen. It brings sessions, changes, approvals, terminals, and execution evidence together without automating the official Codex app UI.

## Development status

**Phase 2 — MVP implementation.** The repository now includes a Japanese dark-mode desktop workspace, session tabs, change/approval panels, terminal/log surface, a Tauri native boundary, and Windows CI. The browser preview deliberately uses safe local demo events; the Tauri backend owns real Codex app-server startup.

## Planned platforms

Windows 11 first, then macOS. The chosen Tauri architecture is intended to support both.

## Proposed stack

- Tauri 2, Rust, React, TypeScript, Zustand
- Official `@openai/codex-sdk` behind a local integration broker
- SQLite for local non-secret metadata
- Monaco Editor, xterm.js, Vitest, and Playwright

See [architecture](docs/architecture.md) and [the Codex integration ADR](docs/decisions/0002-codex-integration.md).

## Setup and commands

Prerequisites: Node.js 24 or later; Rust stable and Windows build tools for desktop builds; and a locally authenticated Codex CLI for a real Codex connection.

- npm ci
- npm run dev — browser UI preview
- npm run test
- npm run lint
- npm run build
- npm run tauri:dev — Windows/macOS desktop app
- npm run tauri:build — native debug build

The desktop backend starts Codex app-server over private standard input/output and never opens a network listener. It performs the initialization handshake and forwards event/log lines to the renderer. Install Codex separately and sign in through its supported local flow.

## Security

Authentication remains in Codex's local credential mechanism or OS credential storage. It is never sent to the renderer or committed. Commands, unregistered paths, network use, destructive Git operations, and external tools are approval-gated. See [security](docs/security.md).

## Roadmap

1. Phase 1: design and bootstrap.
2. Phase 2: Tauri MVP with projects, tabs, streaming, approvals, and terminal/logs.
3. Phase 3: Git/diff workflows, monitoring, notifications, templates, and palette.
4. Phase 4: split views, multi-agent tools, Skills/MCP management, and plugins.

## Contributing

Use a branch and pull request; do not push directly to `main`. Follow [AGENTS.md](AGENTS.md), document material decisions as ADRs, and never add secrets or user data.

## License

No open-source license is granted yet. See [license policy](docs/license-policy.md).
