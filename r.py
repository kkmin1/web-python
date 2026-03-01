#!/usr/bin/env python3
from __future__ import annotations

import argparse
from pathlib import Path


REPLACEMENTS = [
    ("입니다", "이다"),
    ("합니다", "한다"),
    ("냅니다", "낸다"),
    ("있습니다", "있다"),
    ("않습니다", "않는다"),
    ("됩니다", "된다"),
    ("급니다", "크다"),
    ("었습니다", "었다"),
    ("없습니다", "없다"),
]

TARGET_EXTENSIONS = {".html", ".txt", ".md"}


def process_file(path: Path, output_path: Path | None = None) -> bool:
    try:
        original = path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        return False

    updated = original
    for src, dst in REPLACEMENTS:
        updated = updated.replace(src, dst)

    if updated == original and output_path is None:
        return False

    target = output_path if output_path is not None else path
    try:
        target.parent.mkdir(parents=True, exist_ok=True)
        if updated == original and output_path is not None:
            target.write_text(original, encoding="utf-8")
            return True
        target.write_text(updated, encoding="utf-8")
        return True
    except OSError as exc:
        print(f"오류: 파일 쓰기 실패: {target} ({exc})")
        return False


def main() -> None:
    parser = argparse.ArgumentParser(
        description="html/txt/md 파일에서 지정한 문자열 치환"
    )
    parser.add_argument(
        "root",
        nargs="?",
        default=".",
        help="탐색 시작 디렉터리 (기본값: 현재 디렉터리)",
    )
    parser.add_argument(
        "-o",
        "--output",
        help="출력 파일 경로(단일 파일 입력일 때만 사용)",
    )
    args = parser.parse_args()

    root = Path(args.root).resolve()
    output = Path(args.output).resolve() if args.output else None
    changed_count = 0

    if not root.exists():
        print(f"오류: 경로가 존재하지 않음: {root}")
        return

    if root.is_file():
        if output is not None and output.exists() and output.is_dir():
            print(f"오류: --output은 파일 경로여야 함: {output}")
            return
        if root.suffix.lower() not in TARGET_EXTENSIONS:
            print(f"건너뜀: 지원하지 않는 확장자: {root}")
        elif process_file(root, output):
            changed_count = 1
            if output is None:
                print(f"수정됨: {root}")
            else:
                print(f"생성됨: {output}")
        print(f"완료: {changed_count}개 파일 수정")
        return

    if output is not None:
        print("오류: 디렉터리 입력에는 --output을 사용할 수 없음")
        return

    for path in root.rglob("*"):
        if not path.is_file():
            continue
        if path.suffix.lower() not in TARGET_EXTENSIONS:
            continue
        if process_file(path):
            changed_count += 1
            print(f"수정됨: {path}")

    print(f"완료: {changed_count}개 파일 수정")


if __name__ == "__main__":
    main()
