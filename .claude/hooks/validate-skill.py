#!/usr/bin/env python3
"""PostToolUse hook: SKILL.md frontmatter validator.
Fires after Write/Edit. Checks name, description, Use when prefix, char limits.
"""

import json
import sys
import re
import os


def main():
    try:
        data = json.load(sys.stdin)
    except (json.JSONDecodeError, EOFError):
        sys.exit(0)

    file_path = data.get("tool_input", {}).get("file_path", "")

    if not file_path.endswith("SKILL.md"):
        sys.exit(0)

    if not os.path.exists(file_path):
        sys.exit(0)

    with open(file_path, encoding="utf-8") as f:
        content = f.read()

    errors = []

    if not content.startswith("---"):
        errors.append("frontmatter 누락 — 파일이 ---로 시작해야 합니다")
    else:
        end = content.find("\n---", 3)
        if end == -1:
            errors.append("frontmatter 닫는 --- 누락")
        else:
            frontmatter = content[3:end].strip()
            fm_len = end + 4  # 전체 frontmatter 블록 길이

            # name 필드
            name_m = re.search(r"^name:\s*(.+)$", frontmatter, re.MULTILINE)
            if not name_m:
                errors.append("'name:' 필드 누락")
            else:
                name_val = name_m.group(1).strip()
                if not re.match(r"^[a-zA-Z0-9-]+$", name_val):
                    errors.append(
                        f"name '{name_val}' — 영문자·숫자·하이픈만 허용 (괄호·특수문자 불가)"
                    )

            # description 필드
            desc_m = re.search(r"^description:\s*(.+)$", frontmatter, re.MULTILINE)
            if not desc_m:
                errors.append("'description:' 필드 누락")
            else:
                desc_val = desc_m.group(1).strip()
                if not desc_val.lower().startswith("use when"):
                    short = desc_val[:60]
                    errors.append(
                        f"description이 'Use when'으로 시작하지 않음: '{short}...'"
                    )
                if len(desc_val) > 500:
                    errors.append(
                        f"description {len(desc_val)}자 (최대 500자)"
                    )

            # frontmatter 전체 길이
            if fm_len > 1024:
                errors.append(f"frontmatter {fm_len}자 (최대 1024자)")

    if errors:
        skill_dir = os.path.basename(os.path.dirname(file_path))
        bullet_list = "\n".join(f"  - {e}" for e in errors)
        output = {
            "systemMessage": (
                f"⚠️  SKILL.md 검증 실패 ({skill_dir}/SKILL.md):\n"
                f"{bullet_list}\n"
                "위 문제를 수정해 주세요."
            )
        }
        print(json.dumps(output))

    sys.exit(0)


if __name__ == "__main__":
    main()
