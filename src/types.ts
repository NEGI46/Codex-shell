export type SessionStatus =
  | "running"
  | "idle"
  | "needs_input"
  | "needs_approval"
  | "completed"
  | "stopped"
  | "error";

export type ApprovalRisk = "low" | "medium" | "high";

export interface Project {
  id: string;
  name: string;
  path: string;
  active?: boolean;
}

export interface ChatMessage {
  id: string;
  author: "user" | "codex" | "system";
  content: string;
  createdAt: string;
  streaming?: boolean;
}

export interface Session {
  id: string;
  projectId: string;
  title: string;
  status: SessionStatus;
  currentTask: string;
  updatedAt: string;
  unread: number;
  pinned: boolean;
  messages: ChatMessage[];
}

export interface ChangedFile {
  path: string;
  kind: "modified" | "added" | "deleted";
  additions: number;
  deletions: number;
  reason: string;
}

export interface Approval {
  id: string;
  sessionId: string;
  kind: "command" | "network" | "file" | "git" | "mcp";
  risk: ApprovalRisk;
  title: string;
  command: string;
  reason: string;
  impact: string;
  destructive?: boolean;
}

export type BottomTab =
  | "terminal"
  | "log"
  | "tests"
  | "build"
  | "git"
  | "network"
  | "errors"
  | "problems";
