# ADR 0002: Use official Codex SDK behind a local integration broker

## Status

Accepted — 2026-07-26; packaging and event details validate in Phase 2.

## Context

The product must create/resume sessions and render progressive activity, but must not automate the official Codex UI. Official documentation describes the TypeScript @openai/codex-sdk for coding threads and codex exec --json for machine-readable events. The Python SDK controls local app-server over JSON-RPC, showing app-server is a local integration surface; direct protocol must not leak to UI.

## Decision

Use official TypeScript SDK as primary integration, inside a short-lived local broker supervised by Rust. Expose versioned normalized events over private process transport. Keep separate CLI JSONL adapter for diagnostics/fallback automation, not primary conversation.

## Alternatives

- Official UI automation: brittle, inaccessible, unsafe, and forbidden by product scope.
- General OpenAI API in React: exposes credentials and loses Codex workflow semantics.
- React coupled to direct app-server JSON-RPC: protocol change spreads into UI and bypasses policy boundary.
- CLI only: suitable discrete automation but weaker for durable interactive threads.

## Consequences

No custom remote Codex server. SDK/app-server changes are isolated and protected by contract fixtures. If upstream cannot report an approval before execution, the feature remains unavailable rather than silently granting authority.

## Evidence

Official documentation retrieved 2026-07-26: [Codex SDK](https://learn.chatgpt.com/docs/codex-sdk), [Non-interactive mode](https://learn.chatgpt.com/docs/non-interactive-mode), [App server](https://learn.chatgpt.com/docs/app-server).

## Review trigger

Re-evaluate when SDK publishes stable event/approval APIs, runtime packaging changes, or remote sessions are needed.
