import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bot,
  Check,
  ChevronDown,
  ChevronRight,
  CircleStop,
  Clock3,
  Code2,
  Command,
  FileCode2,
  FolderPlus,
  GitBranch,
  LayoutPanelLeft,
  Maximize2,
  MessageSquarePlus,
  PanelBottomClose,
  PanelLeftClose,
  Pin,
  Plus,
  Search,
  Send,
  ShieldAlert,
  Sparkles,
  TerminalSquare,
  X,
} from "lucide-react";
import { useShellStore } from "./store";
import { listenToCodex } from "./native";
import type { BottomTab, SessionStatus } from "./types";

const statusMeta: Record<SessionStatus, { label: string; className: string }> =
  {
    running: { label: "実行中", className: "running" },
    idle: { label: "待機中", className: "idle" },
    needs_input: { label: "入力待ち", className: "input" },
    needs_approval: { label: "承認待ち", className: "approval" },
    completed: { label: "完了", className: "completed" },
    stopped: { label: "停止", className: "stopped" },
    error: { label: "エラー", className: "error" },
  };

const bottomTabs: Array<{ id: BottomTab; label: string }> = [
  { id: "terminal", label: "Terminal 1" },
  { id: "log", label: "Codexログ" },
  { id: "tests", label: "テスト" },
  { id: "build", label: "ビルド" },
  { id: "git", label: "Git" },
  { id: "network", label: "通信" },
  { id: "errors", label: "Errors" },
  { id: "problems", label: "Problems" },
];

export function App() {
  const shell = useShellStore();
  const hydrateDesktopState = useShellStore(
    (state) => state.hydrateDesktopState,
  );
  const receiveCodexEvent = useShellStore((state) => state.receiveCodexEvent);
  const [query, setQuery] = useState("");
  const [showClosed, setShowClosed] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const activeSession =
    shell.sessions.find((session) => session.id === shell.activeSessionId) ??
    shell.sessions[0];
  const activeProject = shell.projects.find(
    (project) => project.id === activeSession?.projectId,
  );
  const tabs = shell.openTabIds
    .map((id) => shell.sessions.find((session) => session.id === id))
    .filter(Boolean);
  const selectedChange =
    shell.changes.find((change) => change.path === shell.selectedChange) ??
    shell.changes[0];
  const filteredSessions = shell.sessions.filter((session) =>
    session.title.toLowerCase().includes(query.toLowerCase()),
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        shell.setPaletteOpen(true);
      }
      if (event.key === "Escape") shell.setPaletteOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [shell]);

  useEffect(() => {
    void hydrateDesktopState();
    let unlisten: (() => void)[] = [];
    void listenToCodex(receiveCodexEvent, () => undefined).then((handlers) => {
      unlisten = handlers;
    });
    return () => unlisten.forEach((handler) => handler());
  }, [hydrateDesktopState, receiveCodexEvent]);

  const terminalBody = useMemo(() => {
    if (shell.bottomTab === "terminal")
      return (
        <>
          <span className="terminal-dim">C:\Projects\Codex-shell</span>
          <span className="terminal-prompt"> &gt; </span>npm run test
          <br />
          <span className="terminal-ok">✓ 12 tests passed</span>
          <br />
          <span className="terminal-dim">exit 0 · Codexが開始 · 00:18</span>
        </>
      );
    if (shell.bottomTab === "tests")
      return (
        <>
          <span className="terminal-ok">PASS</span> src/store.test.ts
          <br />
          <span className="terminal-ok">PASS</span> src/protocol.test.ts
          <br />
          <span className="terminal-dim">12 passed / 0 failed</span>
        </>
      );
    if (shell.bottomTab === "errors")
      return (
        <span className="terminal-dim">現在、未解決エラーはありません。</span>
      );
    return (
      <>
        <span className="terminal-dim">19:12:08</span> app-server:
        thread/started
        <br />
        <span className="terminal-dim">19:12:09</span> policy: approval queued
        <br />
        <span className="terminal-dim">19:12:13</span> session: waiting for user
        decision
      </>
    );
  }, [shell.bottomTab]);

  return (
    <main
      className={
        "shell " +
        (shell.leftCollapsed ? "left-collapsed " : "") +
        (shell.bottomCollapsed ? "bottom-collapsed" : "")
      }
    >
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">
            <Code2 size={18} />
          </div>
          <span>Codex Shell</span>
          <span className="beta">LOCAL</span>
        </div>
        <div className="topbar-context">
          <span>{activeProject?.name ?? "プロジェクト未選択"}</span>
          <span className="separator">/</span>
          <span className="muted">{activeProject?.path}</span>
        </div>
        <div className="topbar-actions">
          <button
            className="icon-button"
            onClick={shell.toggleLeft}
            aria-label="左パネルを切り替え"
          >
            <PanelLeftClose size={17} />
          </button>
          <button
            className="icon-button"
            onClick={shell.toggleBottom}
            aria-label="下パネルを切り替え"
          >
            <PanelBottomClose size={17} />
          </button>
          <button
            className="command-button"
            onClick={() => shell.setPaletteOpen(true)}
          >
            <Command size={15} /> コマンド <kbd>Ctrl K</kbd>
          </button>
        </div>
      </header>

      {!shell.leftCollapsed && (
        <aside className="sidebar">
          <section className="sidebar-section">
            <div className="section-heading">
              <span>プロジェクト</span>
              <button
                className="icon-button small"
                onClick={shell.addProject}
                aria-label="プロジェクトを追加"
              >
                <FolderPlus size={16} />
              </button>
            </div>
            <button className="project-row active">
              <span className="project-icon">
                <Code2 size={15} />
              </span>
              <span>Codex Shell</span>
              <span className="project-dot" />
            </button>
            <button className="project-row">
              <span className="project-icon purple">
                <GitBranch size={15} />
              </span>
              <span>Relay</span>
            </button>
            <button className="project-row">
              <span className="project-icon green">
                <LayoutPanelLeft size={15} />
              </span>
              <span>Student OS</span>
            </button>
          </section>
          <section className="sidebar-section sessions-section">
            <div className="section-heading">
              <span>セッション</span>
              <button
                className="icon-button small"
                onClick={shell.createSession}
                aria-label="新規セッション"
              >
                <Plus size={16} />
              </button>
            </div>
            <label className="search-field">
              <Search size={14} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="セッションを検索"
              />
            </label>
            <div className="session-list">
              {filteredSessions.map((session) => (
                <button
                  key={session.id}
                  className={
                    "session-row " +
                    (session.id === shell.activeSessionId ? "selected" : "")
                  }
                  onClick={() => shell.selectSession(session.id)}
                >
                  <span
                    className={
                      "status-dot " + statusMeta[session.status].className
                    }
                  />
                  <span className="session-copy">
                    <strong>{session.title}</strong>
                    <small>{session.currentTask}</small>
                  </span>
                  {session.unread > 0 && (
                    <span className="unread">{session.unread}</span>
                  )}
                </button>
              ))}
            </div>
            <button
              className="subtle-button"
              onClick={() => setShowClosed(!showClosed)}
            >
              {showClosed ? (
                <ChevronDown size={14} />
              ) : (
                <ChevronRight size={14} />
              )}{" "}
              過去のセッションを表示
            </button>
            {showClosed && (
              <div className="closed-row">
                □ 先週のテスト調査 <span>再開</span>
              </div>
            )}
          </section>
          <div className="sidebar-footer">
            <button className="new-session" onClick={shell.createSession}>
              <MessageSquarePlus size={16} /> 新規Codexセッション
            </button>
          </div>
        </aside>
      )}

      <section className="center-panel">
        <div className="tabs" role="tablist">
          {tabs.map(
            (session, index) =>
              session && (
                <button
                  key={session.id}
                  draggable
                  onDragStart={() => setDragIndex(index)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => {
                    if (dragIndex !== null) shell.moveTab(dragIndex, index);
                    setDragIndex(null);
                  }}
                  onClick={() => shell.selectSession(session.id)}
                  className={
                    "tab " + (session.id === activeSession?.id ? "active" : "")
                  }
                  role="tab"
                >
                  <span
                    className={
                      "status-dot " + statusMeta[session.status].className
                    }
                  />
                  <span className="tab-title">{session.title}</span>
                  {session.pinned && <Pin size={12} className="pin-icon" />}
                  {session.unread > 0 && (
                    <span className="unread small-unread">
                      {session.unread}
                    </span>
                  )}
                  <span className="tab-project">
                    {
                      shell.projects.find(
                        (project) => project.id === session.projectId,
                      )?.name
                    }
                  </span>
                  <span
                    onClick={(event) => {
                      event.stopPropagation();
                      shell.closeTab(session.id);
                    }}
                    className="tab-close"
                    role="button"
                    aria-label="タブを閉じる"
                  >
                    <X size={14} />
                  </span>
                </button>
              ),
          )}
          <button
            className="tab-add"
            onClick={shell.createSession}
            aria-label="新規タブ"
          >
            <Plus size={17} />
          </button>
        </div>
        {activeSession && (
          <div className="conversation">
            <div className="conversation-meta">
              <div>
                <span
                  className={
                    "state-pill " + statusMeta[activeSession.status].className
                  }
                >
                  <span className="status-dot" />{" "}
                  {statusMeta[activeSession.status].label}
                </span>
                <span className="muted"> {activeSession.currentTask}</span>
              </div>
              <div className="meta-actions">
                <button
                  className="text-button"
                  onClick={() => shell.togglePin(activeSession.id)}
                >
                  <Pin size={14} />{" "}
                  {activeSession.pinned ? "ピン解除" : "ピン留め"}
                </button>
                <button className="icon-button small">
                  <Maximize2 size={15} />
                </button>
              </div>
            </div>
            <div className="messages">
              {activeSession.messages.length === 0 && (
                <div className="empty-conversation">
                  <Bot size={30} />
                  <h2>新しいセッション</h2>
                  <p>
                    プロジェクト内で行いたいことを入力してください。危険な操作は承認パネルで確認します。
                  </p>
                </div>
              )}
              {activeSession.messages.map((message) => (
                <article
                  className={"message " + message.author}
                  key={message.id}
                >
                  <div className="avatar">
                    {message.author === "user" ? "あなた" : <Bot size={16} />}
                  </div>
                  <div className="message-body">
                    <div className="message-label">
                      {message.author === "user" ? "あなた" : "Codex"}{" "}
                      <time>{message.createdAt}</time>
                    </div>
                    <p>{message.content}</p>
                  </div>
                </article>
              ))}
              {activeSession.status === "running" && (
                <div className="working">
                  <span className="pulse" /> Codexが作業しています…{" "}
                  <span>{activeSession.currentTask}</span>
                </div>
              )}
            </div>
            <div className="composer-wrap">
              <div className="context-bar">
                <Sparkles size={14} /> {activeProject?.name}{" "}
                <span>· workspace-write は承認時のみ</span>
              </div>
              <textarea
                value={shell.composer}
                onChange={(event) => shell.setComposer(event.target.value)}
                onKeyDown={(event) => {
                  if ((event.ctrlKey || event.metaKey) && event.key === "Enter")
                    shell.sendPrompt();
                }}
                placeholder="Codexへ指示を入力…　Ctrl + Enter で送信"
              />
              <div className="composer-actions">
                <button className="text-button">
                  <FileCode2 size={15} /> 添付
                </button>
                <button className="text-button">追加指示</button>
                <span className="grow" />
                <button className="stop-button" onClick={shell.stopActive}>
                  <CircleStop size={15} /> 停止
                </button>
                <button className="send-button" onClick={shell.sendPrompt}>
                  <Send size={15} /> 送信
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      <aside className="right-panel">
        <section className="changes-panel">
          <div className="panel-title">
            <div>
              <FileCode2 size={16} /> 変更ファイル{" "}
              <span className="count">{shell.changes.length}</span>
            </div>
            <button className="icon-button small">
              <Maximize2 size={15} />
            </button>
          </div>
          <div className="git-status">
            <GitBranch size={14} />
            <span>main から 3ファイル変更</span>
            <span className="git-dirty">● 未コミット</span>
          </div>
          <div className="change-list">
            {shell.changes.map((change) => (
              <button
                key={change.path}
                onClick={() => shell.selectChange(change.path)}
                className={
                  "change-row " +
                  (change.path === selectedChange.path ? "selected" : "")
                }
              >
                <span className={"file-kind " + change.kind}>
                  {change.kind === "added"
                    ? "A"
                    : change.kind === "deleted"
                      ? "D"
                      : "M"}
                </span>
                <span className="change-name">{change.path}</span>
                <span className="diff-count">
                  <i>+{change.additions}</i> <b>-{change.deletions}</b>
                </span>
              </button>
            ))}
          </div>
          <div className="diff-toolbar">
            <strong>{selectedChange.path}</strong>
            <span />
            <button className="diff-mode active">インライン</button>
            <button className="diff-mode">左右比較</button>
          </div>
          <div className="diff-preview">
            <div className="diff-line removed">
              <span>42</span>
              <code>- allow_all_commands: true</code>
            </div>
            <div className="diff-line added">
              <span>42</span>
              <code>+ approval_policy: ApprovalPolicy::Prompt</code>
            </div>
            <div className="diff-line added">
              <span>43</span>
              <code>+ validate_project_root(&amp;cwd)?;</code>
            </div>
            <div className="diff-line context">
              <span>44</span>
              <code> audit.write(decision);</code>
            </div>
          </div>
          <div className="change-reason">
            <Sparkles size={14} />
            <span>
              <strong>変更理由</strong>
              {selectedChange.reason}
            </span>
          </div>
          <div className="change-actions">
            <button className="text-button">エディタで開く</button>
            <button className="text-button">Codexへ質問</button>
            <button className="danger-link">元に戻す</button>
          </div>
        </section>

        <section className="approval-panel">
          <div className="panel-title">
            <div>
              <ShieldAlert size={17} /> 承認{" "}
              <span className="count amber">{shell.approvals.length}</span>
            </div>
            <span className="queue">キュー</span>
          </div>
          {shell.approvals.length === 0 ? (
            <div className="approval-empty">
              <Check size={22} />
              <span>承認待ちの操作はありません</span>
            </div>
          ) : (
            shell.approvals.map((approval) => (
              <article
                className={"approval-card " + approval.risk}
                key={approval.id}
              >
                <div className="approval-head">
                  <span className="risk-label">
                    {approval.risk === "high"
                      ? "高リスク"
                      : approval.risk === "medium"
                        ? "要確認"
                        : "低リスク"}
                  </span>
                  <span className="approval-kind">{approval.kind}</span>
                </div>
                <h3>{approval.title}</h3>
                <code className="command-preview">{approval.command}</code>
                <p>{approval.reason}</p>
                <div className="impact">
                  <AlertTriangle size={13} /> {approval.impact}
                </div>
                <div className="approval-actions">
                  <button
                    onClick={() => shell.decideApproval(approval.id, "deny")}
                    className="deny"
                  >
                    拒否
                  </button>
                  <button
                    onClick={() => shell.decideApproval(approval.id, "defer")}
                    className="detail"
                  >
                    保留
                  </button>
                  <button
                    onClick={() =>
                      shell.decideApproval(approval.id, "allow_once")
                    }
                    className="allow"
                  >
                    今回だけ許可
                  </button>
                </div>
                <button
                  onClick={() =>
                    shell.decideApproval(approval.id, "allow_session")
                  }
                  className="allow-session"
                >
                  このセッション中は許可
                </button>
              </article>
            ))
          )}
        </section>
      </aside>

      {!shell.bottomCollapsed && (
        <section className="bottom-panel">
          <div className="bottom-tabs">
            {bottomTabs.map((tab) => (
              <button
                key={tab.id}
                className={shell.bottomTab === tab.id ? "active" : ""}
                onClick={() => shell.setBottomTab(tab.id)}
              >
                {tab.label}
                {tab.id === "errors" && <span className="error-count">0</span>}
              </button>
            ))}
            <span className="grow" />
            <button className="icon-button small">
              <Plus size={15} />
            </button>
          </div>
          <div className="terminal-header">
            <span>
              <TerminalSquare size={14} /> PowerShell
            </span>
            <span>Codex Shell · C:\Projects\Codex-shell</span>
            <span className="grow" />
            <span>
              <Clock3 size={13} /> 00:18
            </span>
            <button className="icon-button small">
              <CircleStop size={15} />
            </button>
          </div>
          <pre className="terminal-output">{terminalBody}</pre>
        </section>
      )}

      {shell.paletteOpen && (
        <div
          className="palette-backdrop"
          onMouseDown={() => shell.setPaletteOpen(false)}
        >
          <section
            className="palette"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="palette-search">
              <Search size={18} />
              <input autoFocus placeholder="コマンドを検索…" />
            </div>
            <p>よく使う操作</p>
            <button
              onClick={() => {
                shell.createSession();
                shell.setPaletteOpen(false);
              }}
            >
              <MessageSquarePlus size={16} /> 新規Codexセッション{" "}
              <kbd>Enter</kbd>
            </button>
            <button
              onClick={() => {
                shell.setBottomTab("terminal");
                shell.setPaletteOpen(false);
              }}
            >
              <TerminalSquare size={16} /> ターミナルを開く
            </button>
            <button
              onClick={() => {
                shell.setPaletteOpen(false);
              }}
            >
              <ShieldAlert size={16} /> 承認パネルを開く
            </button>
            <button
              onClick={() => {
                shell.stopActive();
                shell.setPaletteOpen(false);
              }}
            >
              <CircleStop size={16} /> Codexを停止
            </button>
          </section>
        </div>
      )}
    </main>
  );
}
