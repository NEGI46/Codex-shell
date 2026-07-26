import { beforeEach, describe, expect, it, vi } from "vitest";
import { useShellStore } from "./store";

const initial = useShellStore.getState();

beforeEach(() => {
  useShellStore.setState({
    projects: initial.projects.map((project) => ({ ...project })),
    sessions: initial.sessions.map((session) => ({
      ...session,
      messages: [...session.messages],
    })),
    openTabIds: [...initial.openTabIds],
    activeSessionId: initial.activeSessionId,
    approvals: initial.approvals.map((approval) => ({ ...approval })),
    composer: "",
    paletteOpen: false,
  });
});

describe("Codex Shell session state", () => {
  it("creates and opens a new session in one action", () => {
    const before = useShellStore.getState().sessions.length;
    useShellStore.getState().createSession();
    const state = useShellStore.getState();
    expect(state.sessions).toHaveLength(before + 1);
    expect(state.openTabIds).toContain(state.activeSessionId);
    expect(state.sessions[0].status).toBe("idle");
  });

  it("adds a prompt and streams a completed local preview", () => {
    vi.useFakeTimers();
    useShellStore.getState().setComposer("テストを実行して");
    useShellStore.getState().sendPrompt();
    expect(useShellStore.getState().sessions[0].status).toBe("running");
    vi.advanceTimersByTime(650);
    expect(useShellStore.getState().sessions[0].status).toBe("completed");
    expect(useShellStore.getState().sessions[0].messages.at(-1)?.author).toBe(
      "codex",
    );
    vi.useRealTimers();
  });

  it("removes a decided approval from the queue", () => {
    const id = useShellStore.getState().approvals[0].id;
    useShellStore.getState().decideApproval(id, "allow_once");
    expect(
      useShellStore.getState().approvals.find((approval) => approval.id === id),
    ).toBeUndefined();
  });
});
