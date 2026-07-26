# Wireframes and interaction layout

## Default desktop layout

```text
┌───────────────┬───────────────────────────────────────┬─────────────────────────┐
│ プロジェクト    │ [● 調査] [📌 実装中] [⚠ 承認待ち]       │ 変更ファイル              │
│ 最近使ったもの  │───────────────────────────────────────│ M src/app.tsx +24 -7     │
│───────────────│ 会話・ツール状況                         │ A src/policy.rs +88      │
│ セッション      │ Codex メッセージ / ストリーム           │─────────────────────────│
│ ● 調査中       │ 現在の処理                              │ 差分プレビュー             │
│ ⚠ 実装         │                                       │ [inline] [side-by-side]  │
│ □ 完了          │───────────────────────────────────────│─────────────────────────│
│ [+ 新規] [検索] │ 添付 | 指示を入力… [送信] [停止]         │ 承認キュー                 │
│               │                                       │ [拒否] [詳細] [今回許可]  │
├───────────────┴───────────────────────────────────────┴─────────────────────────┤
│ [Terminal 1] [Codexログ] [テスト] [ビルド] [Git] [通信] [Errors] [Problems]      │
│ C:\project > npm test                            exit 0 · Codex · 00:18        │
└─────────────────────────────────────────────────────────────────────────────────┘
```

Conversation receives the largest width. The right column intentionally puts evidence (changes/diff) above decisions (approvals), following top-right → bottom-right eye path. Terminal spans full width.

## Panel behaviors

| Area         | Content           | Controls                                            |
| ------------ | ----------------- | --------------------------------------------------- |
| Left         | projects/sessions | add, search, rename, duplicate, resume, end         |
| Center       | tabs/conversation | drag, pin, close-confirm, send, stop, steer         |
| Right top    | changes/diff      | select, display mode, open editor, request revert   |
| Right bottom | approval queue    | priority, inspect, defer, deny, allow               |
| Bottom       | terminal/evidence | new terminal, stop, rerun, resize/collapse/maximize |

Dividers are draggable. Panels can hide/collapse/maximize/restore, save project presets, and reset. Closed tabs preserve sessions and remain restorable.

## Status and palette

| State          | Mark           | Label    |
| -------------- | -------------- | -------- |
| running        | animated dot   | 実行中   |
| idle           | neutral dot    | 待機中   |
| needs input    | question badge | 入力待ち |
| needs approval | amber shield   | 承認待ち |
| completed      | check          | 完了     |
| stopped        | square         | 停止     |
| error          | error mark     | エラー   |

Unread is a separate badge. Approval detail shows operation, reason, scope, risk, explanation, and related evidence. High risk adds second confirmation; the allow action is never default focus.

Ctrl+K opens commands for sessions, approvals, terminal, diff, stop, layout, and templates. Destructive actions still use the normal approval path.
