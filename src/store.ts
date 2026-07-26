import { create } from "zustand";
import {
  desktopInvoke,
  isDesktop,
  type NativeProject,
  type NativeSession,
} from "./native";
import type {
  Approval,
  BottomTab,
  ChangedFile,
  Project,
  Session,
  SessionStatus,
} from "./types";

const now = () =>
  new Date().toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  });

const projects: Project[] = [
  { id: "relay", name: "Relay", path: "C:\\Projects\\Relay", active: true },
  { id: "shell", name: "Codex Shell", path: "C:\\Projects\\Codex-shell" },
  { id: "student", name: "Student OS", path: "C:\\Projects\\Student-OS" },
];

const sessions: Session[] = [
  {
    id: "s-architecture",
    projectId: "shell",
    title: "MVPアーキテクチャ",
    status: "running",
    currentTask: "app-serverのイベント設計を確認中",
    updatedAt: now(),
    unread: 0,
    pinned: true,
    messages: [
      {
        id: "m-1",
        author: "user",
        content: "MVPの実装順を確認して、最小の安全な構成を提案して。",
        createdAt: "19:12",
      },
      {
        id: "m-2",
        author: "codex",
        content:
          "まずプロジェクト境界、承認ポリシー、セッション状態を固定し、その後にストリーム表示をつなぐのが安全です。現在は app-server のイベントを整理しています。",
        createdAt: "19:13",
      },
    ],
  },
  {
    id: "s-diff",
    projectId: "relay",
    title: "通信まわりの調査",
    status: "needs_approval",
    currentTask: "テスト実行の承認待ち",
    updatedAt: "19:09",
    unread: 1,
    pinned: false,
    messages: [
      {
        id: "m-3",
        author: "codex",
        content:
          "通信層の確認を進めるため、対象テストの実行許可を求めています。",
        createdAt: "19:09",
      },
    ],
  },
  {
    id: "s-review",
    projectId: "shell",
    title: "差分レビュー",
    status: "completed",
    currentTask: "レビュー完了",
    updatedAt: "18:54",
    unread: 0,
    pinned: false,
    messages: [
      {
        id: "m-4",
        author: "codex",
        content:
          "確認した範囲では、秘密情報のUI露出を防ぐ境界は維持されています。",
        createdAt: "18:54",
      },
    ],
  },
];

const changes: ChangedFile[] = [
  {
    path: "src-tauri/src/app_server.rs",
    kind: "added",
    additions: 168,
    deletions: 0,
    reason: "Codex app-server の標準入出力JSON-RPCを隔離するため",
  },
  {
    path: "src/store.ts",
    kind: "modified",
    additions: 46,
    deletions: 12,
    reason: "セッション状態と未読マークを追加するため",
  },
  {
    path: "docs/security.md",
    kind: "modified",
    additions: 18,
    deletions: 5,
    reason: "プロジェクト外アクセスの承認条件を明確にするため",
  },
];

const approvals: Approval[] = [
  {
    id: "a-test",
    sessionId: "s-diff",
    kind: "command",
    risk: "medium",
    title: "テストを実行",
    command: "gradlew.bat test --tests GatewayStoreTest",
    reason:
      "通信層の変更が既存の永続化処理を壊していないか確認する必要があります。",
    impact:
      "登録済みプロジェクト内でテストを実行します。ファイル変更は想定していません。",
  },
  {
    id: "a-network",
    sessionId: "s-architecture",
    kind: "network",
    risk: "high",
    title: "公式ドキュメントへ接続",
    command: "https://developers.openai.com/codex/app-server",
    reason: "app-serverの現在のイベント仕様を確認する必要があります。",
    impact: "外部ネットワークへアクセスします。認証情報は送信しません。",
  },
];

interface ShellState {
  projects: Project[];
  sessions: Session[];
  openTabIds: string[];
  activeSessionId: string;
  changes: ChangedFile[];
  selectedChange: string;
  approvals: Approval[];
  bottomTab: BottomTab;
  composer: string;
  paletteOpen: boolean;
  leftCollapsed: boolean;
  bottomCollapsed: boolean;
  addProject: () => void;
  createSession: () => void;
  selectSession: (id: string) => void;
  closeTab: (id: string) => void;
  moveTab: (from: number, to: number) => void;
  togglePin: (id: string) => void;
  setComposer: (value: string) => void;
  sendPrompt: () => void;
  stopActive: () => void;
  selectChange: (path: string) => void;
  decideApproval: (
    id: string,
    decision: "allow_once" | "allow_session" | "deny" | "defer",
  ) => void;
  setBottomTab: (tab: BottomTab) => void;
  setPaletteOpen: (open: boolean) => void;
  toggleLeft: () => void;
  toggleBottom: () => void;
  hydrateDesktopState: () => Promise<void>;
  receiveCodexEvent: (event: string) => void;
}

export const useShellStore = create<ShellState>((set, get) => ({
  projects,
  sessions,
  openTabIds: ["s-architecture", "s-diff", "s-review"],
  activeSessionId: "s-architecture",
  changes,
  selectedChange: changes[0].path,
  approvals,
  bottomTab: "terminal",
  composer: "",
  paletteOpen: false,
  leftCollapsed: false,
  bottomCollapsed: false,
  addProject: () => {
    if (isDesktop()) {
      const path = window.prompt(
        "登録するプロジェクトフォルダを入力してください",
      );
      if (!path?.trim()) return;
      const name = window
        .prompt("プロジェクト名", path.split(/[\\/]/).pop())
        ?.trim();
      if (!name) return;
      void desktopInvoke<NativeProject>("register_project", {
        name,
        path,
      }).then((project) => {
        if (project)
          set((state) => ({ projects: [...state.projects, project] }));
      });
      return;
    }
    const id = "project-" + Date.now();
    set((state) => ({
      projects: [
        ...state.projects,
        { id, name: "新しいプロジェクト", path: "未設定" },
      ],
    }));
  },
  createSession: () => {
    if (isDesktop()) {
      const projectId = get().projects[0]?.id;
      if (!projectId) return;
      void desktopInvoke<NativeSession>("create_session", { projectId }).then(
        (native) => {
          if (!native) return;
          const session = nativeToSession(native);
          set((state) => ({
            sessions: [session, ...state.sessions],
            openTabIds: [...state.openTabIds, session.id],
            activeSessionId: session.id,
          }));
          void desktopInvoke("start_codex_session", { sessionId: session.id });
        },
      );
      return;
    }
    const id = "session-" + Date.now();
    const session: Session = {
      id,
      projectId: "shell",
      title: "新しいCodexセッション",
      status: "idle",
      currentTask: "指示を待機中",
      updatedAt: now(),
      unread: 0,
      pinned: false,
      messages: [],
    };
    set((state) => ({
      sessions: [session, ...state.sessions],
      openTabIds: [...state.openTabIds, id],
      activeSessionId: id,
    }));
  },
  selectSession: (id) =>
    set((state) => ({
      activeSessionId: id,
      openTabIds: state.openTabIds.includes(id)
        ? state.openTabIds
        : [...state.openTabIds, id],
      sessions: state.sessions.map((session) =>
        session.id === id ? { ...session, unread: 0 } : session,
      ),
    })),
  closeTab: (id) =>
    set((state) => {
      const openTabIds = state.openTabIds.filter((tab) => tab !== id);
      return {
        openTabIds,
        activeSessionId:
          state.activeSessionId === id
            ? openTabIds[openTabIds.length - 1] || ""
            : state.activeSessionId,
      };
    }),
  moveTab: (from, to) =>
    set((state) => {
      const openTabIds = [...state.openTabIds];
      const [tab] = openTabIds.splice(from, 1);
      openTabIds.splice(to, 0, tab);
      return { openTabIds };
    }),
  togglePin: (id) =>
    set((state) => ({
      sessions: state.sessions.map((session) =>
        session.id === id ? { ...session, pinned: !session.pinned } : session,
      ),
    })),
  setComposer: (composer) => set({ composer }),
  sendPrompt: () => {
    const { activeSessionId, composer } = get();
    if (!composer.trim() || !activeSessionId) return;
    const prompt = composer.trim();
    const desktop = isDesktop();
    set((state) => ({
      composer: "",
      sessions: state.sessions.map((session) =>
        session.id === activeSessionId
          ? {
              ...session,
              status: "running" as SessionStatus,
              currentTask: "指示を実行中",
              updatedAt: now(),
              messages: [
                ...session.messages,
                {
                  id: "user-" + Date.now(),
                  author: "user",
                  content: prompt,
                  createdAt: now(),
                },
              ],
            }
          : session,
      ),
    }));
    if (desktop) {
      void desktopInvoke("send_codex_turn", {
        sessionId: activeSessionId,
        text: prompt,
      }).catch((error: unknown) =>
        set((state) => ({
          sessions: state.sessions.map((session) =>
            session.id === activeSessionId
              ? {
                  ...session,
                  status: "error" as SessionStatus,
                  currentTask:
                    error instanceof Error
                      ? error.message
                      : "Codexへ送信できません",
                }
              : session,
          ),
        })),
      );
      return;
    }
    window.setTimeout(
      () =>
        set((state) => ({
          sessions: state.sessions.map((session) =>
            session.id === activeSessionId
              ? {
                  ...session,
                  status: "completed" as SessionStatus,
                  currentTask: "応答完了",
                  updatedAt: now(),
                  messages: [
                    ...session.messages,
                    {
                      id: "codex-" + Date.now(),
                      author: "codex",
                      content:
                        "このブラウザー表示では安全なデモ応答を表示しています。デスクトップ版では、Tauriバックエンドがローカルの Codex app-server から受け取るストリームイベントを同じUIへ送ります。",
                      createdAt: now(),
                    },
                  ],
                }
              : session,
          ),
        })),
      650,
    );
  },
  stopActive: () =>
    set((state) => ({
      sessions: state.sessions.map((session) =>
        session.id === state.activeSessionId
          ? {
              ...session,
              status: "stopped",
              currentTask: "ユーザーが停止しました",
              updatedAt: now(),
            }
          : session,
      ),
    })),
  selectChange: (selectedChange) => set({ selectedChange }),
  decideApproval: (id, decision) =>
    set((state) => ({
      approvals:
        decision === "defer"
          ? state.approvals
          : state.approvals.filter((approval) => approval.id !== id),
      sessions: state.sessions.map((session) =>
        state.approvals.find((approval) => approval.id === id)?.sessionId ===
        session.id
          ? {
              ...session,
              status: decision === "deny" ? "idle" : "running",
              currentTask:
                decision === "deny"
                  ? "操作を拒否しました"
                  : "承認済み操作を実行中",
              updatedAt: now(),
            }
          : session,
      ),
    })),
  setBottomTab: (bottomTab) => set({ bottomTab }),
  setPaletteOpen: (paletteOpen) => set({ paletteOpen }),
  toggleLeft: () => set((state) => ({ leftCollapsed: !state.leftCollapsed })),
  toggleBottom: () =>
    set((state) => ({ bottomCollapsed: !state.bottomCollapsed })),
  hydrateDesktopState: async () => {
    if (!isDesktop()) return;
    const [nativeProjects, nativeSessions] = await Promise.all([
      desktopInvoke<NativeProject[]>("list_projects"),
      desktopInvoke<NativeSession[]>("list_sessions"),
    ]);
    if (!nativeProjects || !nativeSessions) return;
    const sessions = nativeSessions.map(nativeToSession);
    set((state) => ({
      projects: nativeProjects,
      sessions,
      openTabIds: sessions.map((session) => session.id),
      activeSessionId: sessions[0]?.id ?? state.activeSessionId,
    }));
  },
  receiveCodexEvent: (event) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(event);
    } catch {
      return;
    }
    const result = parsed as Record<string, unknown>;
    const thread = result.result as Record<string, unknown> | undefined;
    const threadId =
      (typeof thread?.threadId === "string" && thread.threadId) ||
      (typeof thread?.id === "string" && thread.id);
    if (!threadId) return;
    const activeSessionId = get().activeSessionId;
    if (!activeSessionId) return;
    void desktopInvoke("bind_codex_thread", {
      sessionId: activeSessionId,
      threadId,
    });
    set((state) => ({
      sessions: state.sessions.map((session) =>
        session.id === activeSessionId
          ? {
              ...session,
              status: "idle",
              currentTask: "指示を待機中",
            }
          : session,
      ),
    }));
  },
}));

function nativeToSession(native: NativeSession): Session {
  const status: SessionStatus = isSessionStatus(native.status)
    ? native.status
    : "idle";
  return {
    id: native.id,
    projectId: native.projectId,
    title: native.title,
    status,
    currentTask: native.currentTask,
    updatedAt: now(),
    unread: 0,
    pinned: false,
    messages: [],
  };
}

function isSessionStatus(value: string): value is SessionStatus {
  return [
    "running",
    "idle",
    "needs_input",
    "needs_approval",
    "completed",
    "stopped",
    "error",
  ].includes(value);
}
