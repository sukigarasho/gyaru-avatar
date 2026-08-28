# Gyaru Avatar (VSCode拡張)

Claude Codeの状態（考え中 / 作業中 / 待機中 / 完了）に合わせて、サイドバーのアバターの表情・キャプションが変わる拡張機能。SalesforceのPiperのような「常駐して反応してくれるアシスタント」をVSCode上に置くことがモチーフ。

## 現在のステータス

- サイドバー常駐・Claude Code Hooks連携・状態に応じたキャプション切り替えは実装済み
- 表情アニメーションは [Rive](https://rive.app) 製 `.riv` ファイルで再生する設計だが、`.riv` はまだ未制作。現在は暫定の静止画（`media/placeholder.png`）を表示している
- `.riv` を `media/avatar.riv` に配置すると、静止画から自動的にRive再生に切り替わる

## ディレクトリ構成

```text
avatar-extension/
├── src/
│   ├── extension.ts          # activate()、状態ファイルのfs.watch
│   └── avatarViewProvider.ts # WebviewViewProvider、HTML生成
├── media/
│   ├── main.js                # webview側スクリプト（Rive制御・状態⇔キャプション）
│   ├── style.css
│   ├── placeholder.png        # 暫定表示用の静止画
│   ├── avatar.riv              # (未配置) Riveで作った本番アバター
│   └── vendor/                 # rive.js / rive.wasm（npm installから自動コピー、.gitignore対象）
├── hooks/
│   └── notify-avatar.sh       # Claude Code hooksから呼ばれ、状態ファイルを更新する
└── out/                        # tscのビルド出力（.gitignore対象）
```

## セットアップ

```bash
cd avatar-extension
npm install
npm run compile
```

VSCodeでこのフォルダを開き `F5` を押すと、Extension Development Host（新しいVSCodeウィンドウ）が起動する。アクティビティバーに顔アイコンが追加され、クリックするとアバターが表示される。

`npm run compile` は `@rive-app/canvas` の `rive.js` / `rive.wasm` を `media/vendor/` にコピーしてからTypeScriptをビルドする（VSCode Webviewは `node_modules` を直接参照できないため）。

## Claude Code Hooksとの連携

`~/.claude/settings.json` に以下を追記する（既存の `hooks` 設定にマージすること。既存の `PreToolUse` の `Bash` matcher エントリは残す）。

```jsonc
{
  "hooks": {
    "PreToolUse": [
      { "matcher": "Bash", "hooks": [{ "type": "command", "command": "/Users/sho.sukigara/.claude/hooks/block-token-paste.sh" }] },
      { "hooks": [{ "type": "command", "command": "/Users/sho.sukigara/Desktop/project_root/avatar-extension/hooks/notify-avatar.sh working" }] }
    ],
    "UserPromptSubmit": [
      { "hooks": [{ "type": "command", "command": "/Users/sho.sukigara/Desktop/project_root/avatar-extension/hooks/notify-avatar.sh thinking" }] }
    ],
    "Notification": [
      { "hooks": [{ "type": "command", "command": "/Users/sho.sukigara/Desktop/project_root/avatar-extension/hooks/notify-avatar.sh waiting" }] }
    ],
    "Stop": [
      { "hooks": [{ "type": "command", "command": "/Users/sho.sukigara/Desktop/project_root/avatar-extension/hooks/notify-avatar.sh idle" }] }
    ]
  }
}
```

設定後は新しく開くClaude Codeセッションから反映される。

## 状態⇔キャプション

`.riv`未配置の現在は `media/placeholder.png` を静止画表示し、下にキャプションだけ状態に応じて切り替える暫定仕様。

| hooksイベント | 状態 | キャプション |
| --- | --- | --- |
| `UserPromptSubmit` | `thinking` | おっ、きた！ちょい待って、考えるわ |
| `PreToolUse` | `working` | 今それやってるとこ！ |
| `Notification` | `waiting` | ねぇ、ちょっと確認していい？ |
| `Stop`（直後2.5秒だけ） | `done` | できたー！見て見て！ |
| `Stop`後（2.5秒経過後）/ 未受信時 | `idle` | よんだらいつでも来るよ〜 |

`done`はhooksから送られてくる状態ではなく、`media/main.js`側で「直前がidle以外→idleに遷移した瞬間」を検知して一時的に表示するローカル演出。

## 動作確認（Claude Codeを介さない単体テスト）

```bash
./hooks/notify-avatar.sh thinking
./hooks/notify-avatar.sh working
./hooks/notify-avatar.sh waiting
./hooks/notify-avatar.sh idle
```

Extension Development Hostを開いた状態でこれを実行すると、数百ms以内にアバターの表情が切り替わる。

## イラスト（Rive）の作り方・配置

表情アニメーションは [Rive](https://rive.app) で作成した `.riv` ファイルを読み込んで再生する。イラスト制作・ボーン付け・State Machine設計はRiveエディタ（無料）上での作業になる。

Riveエディタで作る際、拡張側と以下の仕様で合わせること:

- **State Machine名**: `Avatar`
- **入力**: 数値(Number)型、名前 `state`
  - `0` = idle（通常） / `1` = thinking（考え中） / `2` = working（作業中） / `3` = waiting（待機中）
- 数値の変化に応じて対応する状態にブレンド/遷移するようState Machine内で組む

完成したら `media/avatar.riv` として配置する。配置されていない間は `media/placeholder.png` の静止画がそのまま表示され続ける（`.riv`を置いた瞬間、次回リロードからRive再生に切り替わる）。

> Rive公式ではState Machine Inputsは非推奨（将来的にData Bindingへの移行が推奨されている）が、シンプルさを優先してState Machine Inputsを採用している。将来Rive側でAPIが削除された場合は `media/main.js` の入力取得まわりの移行が必要。

## 常駐インストール（VSIXパッケージ化）

F5のExtension Development Hostは開発用の一時起動。普段使いのVSCodeに常駐させたい場合はVSIX化してインストールする。

```bash
npm run compile
npx vsce package
```

生成された `gyaru-avatar-x.x.x.vsix` を、普段使いのVSCodeの拡張機能ビュー（`Cmd+Shift+X`）→ 右上の「...」→ **VSIXからのインストール...** で読み込む。インストール後、初回だけアクティビティバーのアイコンを一度クリックしてビューを開いておくと、以降はVSCode再起動後も同じ配置（Secondary Side Barに移動していればそこ）で常駐する。

コード変更後に常駐版へ反映したい場合は、`npm run compile && npx vsce package` を再実行し、VSIXから再インストールする（自動リロードはされない）。

## 既知の制約

- `~/.claude/avatar-state.json` を直接fs.watchで監視しているため、ファイルシステムイベントの取りこぼしが極稀に起こりうる（デバウンス80msで簡易対応）。
- `.riv` ファイルの内部構造（State Machine名・入力名）が仕様と一致していないと、canvasは表示されるがアニメーションが状態に追従しない。
