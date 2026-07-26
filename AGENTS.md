# Codex Shell repository guidance

## Scope and delivery

- Work on branches; never commit or force-push directly to `main`.
- Keep changes small and reviewable. Run documented checks for each affected layer.
- Never claim a platform build/test ran unless its output was observed.
- Record material architecture changes in `docs/decisions/`.

## Security invariants

- The renderer never receives API keys, Codex auth material, OS credential values, or raw secret-bearing logs.
- Never auto-approve commands, network access, external/MCP tools, unregistered paths, or destructive Git operations.
- Validate Windows paths and command arguments in Rust. Do not construct shell strings from UI input.
- Do not add `.env`, keys, local database files, recordings, or user project content to Git.

## Architecture boundaries

- React talks only to typed Tauri commands/events.
- Rust owns process launch, filesystem, Git, credentials, and approval enforcement.
- The broker owns Codex protocol translation and exposes versioned domain events.
- Prefer official Codex SDK interfaces; keep direct app-server use isolated behind an adapter.

## Validation baseline

When application code exists, run formatting, lint, TypeScript types, Rust checks, unit tests, and desktop build where relevant. Use Windows validation or state why it was unavailable.
