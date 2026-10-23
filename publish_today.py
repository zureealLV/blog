#!/usr/bin/env python3
"""发布上海日期的 Hermes 草稿。--date 补发；--dry-run 只检查，不写入或联网。"""
import argparse
from datetime import date, datetime, timedelta, timezone
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys

BLOG_DIR = os.path.dirname(os.path.abspath(__file__))
STAGING_POSTS = os.path.join(BLOG_DIR, "staging", "posts")
STAGING_IMAGES = os.path.join(BLOG_DIR, "staging", "images")
BLOG_POSTS = os.path.join(BLOG_DIR, "src", "content", "posts")
BLOG_IMAGES = os.path.join(BLOG_POSTS, "images")


class PublishError(Exception):
    """可向用户直接展示的失败原因。"""


def git(*args):
    result = subprocess.run(
        ["git", *args], cwd=BLOG_DIR, capture_output=True, text=True,
        encoding="utf-8", errors="replace", timeout=120,
    )
    if result.returncode:
        raise PublishError(f"git {' '.join(args)} 失败：\n{result.stderr or result.stdout}")
    return result.stdout.strip()


def field(header, name):
    match = re.search(rf"^{re.escape(name)}:[ \t]*(.*?)[ \t]*$", header, re.MULTILINE)
    if not match:
        raise PublishError(f"草稿 frontmatter 缺少 {name}")
    return match[1].strip().strip("\"'")


def prepare(day):
    directory = Path(STAGING_POSTS)
    if not directory.is_dir():
        raise PublishError(f"草稿目录不存在：{directory}")
    matches = []
    for path in sorted(directory.glob("update-*.md")):
        content = path.read_text(encoding="utf-8-sig")
        parts = content.split("---", 2)
        if len(parts) != 3 or parts[0].strip():
            continue
        header = parts[1]
        if re.search(rf"^published:\s*['\"]?{day.isoformat()}['\"]?\s*$", header, re.MULTILINE):
            matches.append((path, parts))
    if len(matches) != 1:
        raise PublishError(f"{day} 应匹配一篇草稿，实际找到 {len(matches)} 篇")
    source, parts = matches[0]
    header = parts[1]
    if field(header, "tags") != "[Hermes]" or field(header, "category") != "Hermes":
        raise PublishError("Hermes 草稿必须仅使用 tags: [Hermes] 和 category: Hermes")
    image_name = f"hermes-{day:%Y%m%d}.jpg"
    if field(header, "image") != f"./images/{image_name}":
        raise PublishError(f"image 必须与发布日期匹配：./images/{image_name}")
    image = Path(STAGING_IMAGES) / image_name
    if not image.is_file() or not image.stat().st_size:
        raise PublishError(f"封面缺失或为空：{image}")
    if field(header, "draft") not in ("true", "false"):
        raise PublishError("draft 必须为 true 或 false")
    parts[1] = re.sub(r"^draft:[ \t]*(?:true|false)[ \t]*$", "draft: false", header, flags=re.MULTILINE)
    return source, image, "---".join(parts), field(header, "title")


def publish(day, dry_run=False):
    source, image, content, title = prepare(day)
    target = Path(BLOG_POSTS) / source.name
    cover = Path(BLOG_IMAGES) / image.name
    paths = [target.relative_to(BLOG_DIR).as_posix(), cover.relative_to(BLOG_DIR).as_posix()]
    print(f"日期（Asia/Shanghai）：{day}\n文章：{source.name}\n封面：{image.name}")
    if dry_run:
        print("检查通过；dry-run 不复制、不提交、不推送。")
        return

    if git("branch", "--show-current") != "master":
        raise PublishError("请在生产分支 master 上发布；不会自动切换分支")
    staged = git("-c", "core.quotePath=false", "diff", "--cached", "--name-only").splitlines()
    if not set(staged).issubset(paths):
        raise PublishError("暂存区已有修改，请先处理；不会夹带提交")
    git("fetch", "origin", "master")
    ahead, behind = map(int, git("rev-list", "--left-right", "--count", "HEAD...origin/master").split())
    if ahead and behind:
        raise PublishError("本地与远程分支分叉，请先人工同步；不会自动 rebase 或强推")
    if ahead:
        # A retry may push this article's existing commit, never unrelated commits.
        for commit in git("rev-list", "origin/master..HEAD").splitlines():
            changed = git("-c", "core.quotePath=false", "diff-tree", "--no-commit-id",
                          "--name-only", "-r", "--root", commit).splitlines()
            if not changed or not set(changed).issubset(paths):
                raise PublishError("存在与本篇文章无关的待推送提交，请先人工处理")
    elif behind:
        git("merge", "--ff-only", "origin/master")

    # Do not replace edited published content with an older staging draft.
    if target.exists() and target.read_text(encoding="utf-8-sig") != content:
        raise PublishError(f"正式文章与草稿内容不同，不会覆盖：{target}")
    if cover.exists() and cover.read_bytes() != image.read_bytes():
        raise PublishError(f"正式封面与草稿封面不同，不会覆盖：{cover}")
    target.parent.mkdir(parents=True, exist_ok=True)
    cover.parent.mkdir(parents=True, exist_ok=True)
    if not target.exists():
        target.write_text(content, encoding="utf-8", newline="\n")
    if not cover.exists():
        shutil.copy2(image, cover)
    git("add", "--", *paths)
    if git("diff", "--cached", "--name-only", "--", *paths):
        git("commit", "--only", "-m", f"post: {title}", "--", *paths)
    # Even if nothing changed, retry a previously committed but failed push.
    if git("rev-list", "--count", "origin/master..HEAD") != "0":
        git("push", "origin", "master")
    local = git("rev-parse", "HEAD")
    remote = git("ls-remote", "origin", "refs/heads/master").split()
    if not remote or remote[0] != local:
        raise PublishError("远程 master 与本地 HEAD 不一致，尚未确认推送成功")
    print(f"已确认远程收录《{title}》（{local[:8]}）。GitHub Actions 部署结果需另行检查。")


def main(argv=None):
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8", errors="replace")
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--date", type=date.fromisoformat,
                        default=datetime.now(timezone(timedelta(hours=8))).date(),
                        help="补发日期 YYYY-MM-DD，默认上海今天")
    parser.add_argument("--dry-run", action="store_true", help="仅检查草稿和封面，无副作用")
    args = parser.parse_args(argv)
    if args.date > datetime.now(timezone(timedelta(hours=8))).date():
        print("发布失败：不能提前发布未来日期的草稿", file=sys.stderr)
        return 1
    try:
        publish(args.date, args.dry_run)
        return 0
    except (PublishError, OSError, subprocess.TimeoutExpired) as exc:
        print(f"发布失败：{exc}", file=sys.stderr)
        print("已复制的文件/已创建的提交会保留；修复原因后可重试。", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
