#!/usr/bin/env python3
"""PostToolUse hook: NestJS best practices guard.
- main.ts: ValidationPipe 전역 등록 누락 체크
- main.ts: await NestFactory.create() 누락 체크
- *.entity.ts 수정: migration 생성 리마인더
"""

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

    messages = []

    # main.ts 체크
    if filename == "main.ts" and os.path.exists(file_path):
        with open(file_path, encoding="utf-8") as f:
            content = f.read()

        if "NestFactory" in content and "ValidationPipe" not in content:
            messages.append(
                "`ValidationPipe` 전역 등록 누락 — "
                "`app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))` "
                "추가 필요. (`nestjs-validation` 스킬 참조)"
            )

        if "NestFactory.create(" in content and "await NestFactory.create(" not in content:
            messages.append(
                "`await NestFactory.create()` 누락 — "
                "await 없으면 Promise가 파이프에 전달되어 ValidationPipe가 동작하지 않습니다."
            )

    # Entity 파일 수정 → migration 리마인더
    if filename.endswith(".entity.ts") and os.path.exists(file_path):
        messages.append(
            f"`{filename}` 수정됨 — TypeORM migration 생성이 필요할 수 있습니다: "
            "`pnpm typeorm migration:generate src/migrations/MigrationName -d src/data-source.ts`"
        )

    if messages:
        bullet = "\n".join(f"  - {m}" for m in messages)
        print(json.dumps({"systemMessage": f"🏗️ NestJS 체크:\n{bullet}"}))

    sys.exit(0)


if __name__ == "__main__":
    main()
