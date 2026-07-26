# Security design

## Threat model

Codex Shell operates code and commands on local projects. Primary risks: compromised renderer, prompt-injected output, accidental destructive actions, project-boundary escape, secret disclosure, and remotely exposed local transport.

## Trust boundaries

| Boundary                  | Rule                                                              |
| ------------------------- | ----------------------------------------------------------------- |
| Renderer → Rust           | renderer is untrusted; only typed intent crosses IPC              |
| Rust → broker             | private transport with per-launch capability; no network listener |
| Project root → filesystem | canonicalize/recheck reparse points and enforce containment       |
| Codex output → action     | output is untrusted data; it cannot grant permissions             |
| Logs → UI/database        | redact known secret patterns and bound size                       |

## Mandatory controls

- Default sandbox is read-only; project write access requires per-turn approval.
- Commands use executable plus argument vector and validated cwd; never shell strings built from UI input.
- Registration rejects nonexistent/non-directory/ambiguous paths. Normalize Windows drive/UNC paths and reject unsupported device paths.
- Re-check reparse points at operation time; deny writes outside canonical project root.
- Network, external/MCP tools, unregistered paths, privilege elevation, and destructive Git actions need approval.
- Force push, history rewrite, git reset --hard, recursive deletion, credential access, and system-wide operations always need explicit per-operation confirmation.
- Session permissions are narrowly keyed by session, operation class, root, and expiry.
- Audit entries contain redacted target/classification/decision/outcome only.
- Do not save GitHub tokens; delegate existing Git authentication to the credential manager.
- No administrator privilege in normal operation.

## Credentials and privacy

Codex keeps local authentication where possible. The broker receives no renderer credential. Future direct secrets must use Windows Credential Manager (Keychain later), be available only to the needed process briefly, and never enter SQLite/logs/crash reports.

Logs are bounded local data. Redaction covers environment assignments, common token prefixes, PEM blocks, auth headers, and configured secret names. Telemetry is off by default.

## Validation

- Rust tests: Windows paths, root escape, reparse points, argument validation, policy matches.
- Integration tests: renderer cannot perform privileged action without approval.
- Regression: cancellation/restart never auto-replays sensitive actions.
- Fixtures: terminal/broker/error secret redaction.
- Windows manual checks: multi-drive and UNC behavior.
