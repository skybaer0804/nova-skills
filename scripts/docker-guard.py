#!/usr/bin/env python3
"""PostToolUse hook: Docker best practices guard.
- Dockerfile 작성 시 .dockerignore 없으면 경고
- docker-compose.yml에 depends_on이 있지만 service_healthy 없으면 경고
"""

import json
import sys
import os
import re


def main():
    try:
        data = json.load(sys.stdin)
    except (json.JSONDecodeError, EOFError):
        sys.exit(0)

    file_path = data.get("tool_input", {}).get("file_path", "")
    filename = os.path.basename(file_path)
    dirpath = os.path.dirname(os.path.abspath(file_path)) if file_path else ""

    messages = []

    # Dockerfile → .dockerignore 체크
    if re.match(r"Dockerfile.*", filename) and dirpath:
        dockerignore = os.path.join(dirpath, ".dockerignore")
        if not os.path.exists(dockerignore):
            messages.append(
                "`.dockerignore` 없음 — `node_modules`, `dist`, `.env*`, `.git` 추가 필요. "
                "없으면 build context에 node_modules 전체가 포함됩니다."
            )

    # docker-compose.yml → service_healthy 체크
    if re.match(r"docker-compose.*\.ya?ml$", filename) and os.path.exists(file_path):
        with open(file_path) as f:
            content = f.read()
        if "depends_on" in content and "service_healthy" not in content:
            messages.append(
                "`depends_on`에 `condition: service_healthy` 없음 — "
                "앱이 DB 준비 전에 시작됩니다. `docker-compose` 스킬 참조."
            )

    if messages:
        bullet = "\n".join(f"  - {m}" for m in messages)
        print(json.dumps({"systemMessage": f"🐳 Docker 체크:\n{bullet}"}))

    sys.exit(0)


if __name__ == "__main__":
    main()
