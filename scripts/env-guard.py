#!/usr/bin/env python3
"""PostToolUse hook: .env 파일 작성 시 .env.example 및 .gitignore 체크."""

import json
import sys
import os


def main():
    try:
        data = json.load(sys.stdin)
    except (json.JSONDecodeError, EOFError):
        sys.exit(0)

    file_path = data.get("tool_input", {}).get("file_path", "")
    filename = os.path.basename(file_path)

    # .env, .env.local, .env.development 등 — .env.example 자체는 제외
    if not (filename == ".env" or (filename.startswith(".env.") and filename != ".env.example")):
        sys.exit(0)

    dirpath = os.path.dirname(os.path.abspath(file_path)) if file_path else ""
    messages = []

    # .env.example 존재 여부
    example_path = os.path.join(dirpath, ".env.example")
    if not os.path.exists(example_path):
        messages.append(
            "`.env.example` 없음 — 키 목록(값 제외)을 `.env.example`에 추가하세요. "
            "팀원이 필요한 환경변수를 알 수 없습니다."
        )

    # .gitignore에 .env 포함 여부
    gitignore_path = os.path.join(dirpath, ".gitignore")
    if os.path.exists(gitignore_path):
        with open(gitignore_path) as f:
            gi_content = f.read()
        if not any(line.strip() in (".env", ".env*", "*.env") for line in gi_content.splitlines()):
            messages.append(
                "`.env`가 `.gitignore`에 없습니다 — 시크릿이 Git에 커밋될 수 있습니다!"
            )
    else:
        messages.append("`.gitignore` 없음 — `.env` 파일이 Git에 커밋될 수 있습니다.")

    if messages:
        bullet = "\n".join(f"  - {m}" for m in messages)
        print(json.dumps({"systemMessage": f"🔐 환경변수 체크:\n{bullet}"}))

    sys.exit(0)


if __name__ == "__main__":
    main()
