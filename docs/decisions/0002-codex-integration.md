# ADR 0002: Use official Codex app-server behind a local integration broker

## Status

Accepted — 2026-07-26; revised after the current official app-server documentation review.

## Context

The product must create/resume sessions and render progressive activity, but must not automate the official Codex UI. Current official documentation identifies Codex app-server as the interface for rich clients needing authentication, conversation history, approvals, and streamed agent events. It supports private stdio JSONL JSON-RPC and can generate version-specific schemas. The SDK remains appropriate for automation and CI.

## Decision

Use official Codex app-server as the primary interactive integration, launched as a private stdio child by Rust. Expose versioned normalized events over the Tauri boundary. Keep the TypeScript SDK and CLI JSONL as separate automation/diagnostic adapters, not the primary conversation path.

## Alternatives

- Official UI automation: brittle, inaccessible, unsafe, and forbidden by product scope.
- General OpenAI API in React: exposes credentials and loses Codex workflow semantics.
- React coupled to direct app-server JSON-RPC: rejected because protocol change spreads into UI and bypasses the Rust policy boundary.
- CLI only: suitable discrete automation but weaker for durable interactive threads.

## Consequences

No custom remote Codex server or TCP listener. app-server protocol changes are isolated and protected by generated-schema contract fixtures. If upstream cannot report an approval before execution, the feature remains unavailable rather than silently granting authority.

## Evidence

Official documentation retrieved 2026-07-26: [App server](https://developers.openai.com/codex/app-server), [Codex SDK](https://developers.openai.com/codex/codex-sdk), and [Non-interactive mode](https://learn.chatgpt.com/docs/non-interactive-mode).

## Review trigger

Re-evaluate when app-server protocol/versioned schemas change, runtime packaging changes, or remote sessions are needed.
