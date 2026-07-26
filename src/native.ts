import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

export interface NativeProject {
  id: string;
  name: string;
  path: string;
}

export interface NativeSession {
  id: string;
  projectId: string;
  externalThreadId?: string;
  title: string;
  status: string;
  currentTask: string;
}

export interface NativeChangedFile {
  path: string;
  kind: "modified" | "added" | "deleted";
  additions: number;
  deletions: number;
  reason: string;
}

export const isDesktop = () =>
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

export async function desktopInvoke<T>(
  command: string,
  args?: Record<string, unknown>,
): Promise<T | undefined> {
  if (!isDesktop()) return undefined;
  return invoke<T>(command, args);
}

export async function listenToCodex(
  onEvent: (event: string) => void,
  onLog: (line: string) => void,
): Promise<UnlistenFn[]> {
  if (!isDesktop()) return [];
  return Promise.all([
    listen<string>("codex-event", ({ payload }) => onEvent(payload)),
    listen<string>("codex-log", ({ payload }) => onLog(payload)),
  ]);
}
