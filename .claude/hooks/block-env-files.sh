#!/usr/bin/env bash
# Blocks Read/Write/Edit tool calls targeting .env files.
# Claude hooks: exit 2 to block the tool call.

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | grep -o '"file_path"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"file_path"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/')

if echo "$FILE_PATH" | grep -qE '(^|/)\.env(\.[^/]+)?$'; then
  echo "Hook blocked: .env file access is denied ($FILE_PATH)" >&2
  exit 2
fi
