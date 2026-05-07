#!/usr/bin/env python3
"""PostToolUse hook: package.json 변경 후 pnpm install 리마인더."""

import json
import sys
import os


def main():
    try:
        data = json.load(sys.stdin)
    except (json.JSONDecodeError, EOFError):
        sys.exit(0)

    file_path = data.get("tool_input", {}).get("file_path", "")

    if os.path.basename(file_path) != "package.json":
        sys.exit(0)

    if not os.path.exists(file_path):
        sys.exit(0)

    try:
        with open(file_path, encoding="utf-8") as f:
            pkg = json.load(f)
        has_deps = bool(pkg.get("dependencies") or pkg.get("devDependencies"))
    except Exception:
        has_deps = True

    if has_deps:
        print(json.dumps({
            "systemMessage": (
                "📦 `package.json` 변경됨 — `pnpm install`을 실행했나요?\n"
                "  의존성이 변경된 경우 `pnpm-lock.yaml`도 업데이트되어야 합니다."
            )
        }))

    sys.exit(0)


if __name__ == "__main__":
    main()
