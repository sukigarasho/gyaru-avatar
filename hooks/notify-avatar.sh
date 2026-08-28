#!/bin/bash
# Claude Code hooksから呼ばれ、アバターの状態ファイルを更新する
# 使い方: notify-avatar.sh <idle|thinking|working|waiting>
set -euo pipefail

STATE="${1:-idle}"
DIR="$HOME/.claude"
FILE="$DIR/avatar-state.json"
TMP="$FILE.tmp.$$"

mkdir -p "$DIR"
printf '{"state": "%s", "ts": %s}' "$STATE" "$(date +%s000)" > "$TMP"
mv "$TMP" "$FILE"
