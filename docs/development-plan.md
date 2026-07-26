# Development plan, test plan, and GitHub workflow

## Phases

| Phase       | Scope                                                                                 | Exit criteria                          |
| ----------- | ------------------------------------------------------------------------------------- | -------------------------------------- |
| 1: design   | requirements, ADRs, security, wireframes, bootstrap                                   | reviewed design PR; no app code        |
| 2: MVP      | Tauri shell, projects, SDK broker, tabs, stream, approvals, terminal/logs, layout     | Windows build and core tests           |
| 3: evidence | Git/diff, monitoring, notifications, templates, palette, test results, multi-terminal | smoke and Playwright pass              |
| 4: advanced | split panes, multi-agent, Skills/MCP, dashboard, plugins                              | feature threat model and UX validation |

## Phase 2 slices

1. Initialize pinned Tauri/React/Rust workspace and static Japanese dark shell.
2. Add projects, SQLite migrations, canonical paths, layout persistence.
3. Add protocol schemas and mocked adapter; test state transitions.
4. Add official SDK broker and local process lifecycle behind adapter boundary.
5. Add stream UI and durable tabs.
6. Add policy engine and redacted audit log.
7. Add controlled terminal/logging/cancellation/provenance.
8. Add Git status/basic diff under project root.
9. Add CI after actual versions, commands, and timings are measured.

If SDK semantics do not expose a required approval control point, pause and revise the ADR; never simulate safety.

## Test plan

| Layer         | Tool              | Examples                                  |
| ------------- | ----------------- | ----------------------------------------- |
| TypeScript UI | Vitest            | tabs, unread, reducer, status             |
| Rust core     | cargo test        | paths, policy, redaction, migrations      |
| Protocol      | contract fixtures | SDK/CLI normalization, unknown event      |
| UI workflow   | Playwright        | tabs, approval, stop, layout              |
| Desktop       | Tauri/Windows     | launch, project, mock stream, no token UI |
| Security      | fixtures          | injection, root escape, secret redaction  |

## GitHub workflow

- Start from refreshed main; use descriptive feature branch.
- Separate docs/bootstrap/core/UI/tests into logical commits.
- Push each completed phase and create/update a draft PR to main.
- PRs state goal, implementation, design choices, validation, UI check, limits, security, next work, and review focus.
- Never merge/release/tag/force-push/rewrite history without explicit user permission.

## Current Phase 1 validation

Only Markdown/repository settings exist. This phase validates presence, links/structure, secret-pattern review, and Git diff. Tauri/Rust/TypeScript/UI/Windows builds do not exist and are not claimed as executed.
