# ADR 0001: Use Tauri 2 as the desktop framework

## Status

Accepted — 2026-07-26.

## Context

Codex Shell needs Windows-first desktop UX, native process/file controls, React UI, dark panels, future macOS support, and a strong native security boundary.

## Decision

Use Tauri 2 with Rust backend and React/TypeScript renderer. Tauri commands/capabilities are the only renderer-to-native boundary.

## Alternatives

- Electron: mature but larger runtime and weaker Rust-native boundary.
- .NET/WPF: strong Windows fit but weakens planned cross-platform TypeScript UI path.
- Web-only: cannot safely own local Codex processes, project confinement, and terminal integration.

## Consequences

Rust is required for native services and Windows validation is first-class. Native capabilities stay minimal and audited.

## Review trigger

Revisit if required Windows accessibility, terminal, sidecar, or credential capability cannot be delivered safely with Tauri 2.
