# ADR 0003: Separate UI state from durable local metadata

## Status

Accepted — 2026-07-26.

## Context

The UI needs responsive tab order, streaming messages, panel interaction, and unread badges. It must also recover metadata without persisting credentials or auto-resuming work.

## Decision

Use Zustand for renderer-local ephemeral state and SQLite, accessed only through Rust, for durable non-secret metadata. Rust is source of truth for project roots, approvals, audit, and process/session lifecycle. React uses typed snapshots/events instead of SQLite directly.

## Alternatives

- React context only: insufficient for streaming/cross-panel state and persistence boundaries.
- Redux-only persistence: adds ceremony while still needing secure native persistence.
- SQLite from renderer: bypasses validation and security boundary.

## Consequences

Reducers and migrations require tests. Restore distinguishes a tab snapshot from a live session; restart never restarts commands or grants approvals.

## Review trigger

Revisit if multi-window/split-view synchronization exceeds the event/snapshot contract.
