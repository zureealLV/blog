#!/usr/bin/env python3
"""
一键发布今日博客文章
双击运行：从 staging 找今天的草稿 → 复制到博客 → git push
"""
import os
import subprocess
import shutil
from datetime import datetime

BLOG_DIR = os.path.dirname(os.path.abspath(__file__))
STAGING_POSTS = os.path.join(BLOG_DIR, "staging", "posts")
STAGING_IMAGES = os.path.join(BLOG_DIR, "staging", "images")
BLOG_POSTS = os.path.join(BLOG_DIR, "src", "content", "posts")
BLOG_IMAGES = os.path.join(BLOG_POSTS, "images")

def run(cmd, cwd=BLOG_DIR):
    r = subprocess.run(cmd, shell=True, cwd=cwd, capture_output=True, text=True)
    return r.returncode, r.stdout.strip(), r.stderr.strip()

def main():
    today = datetime.now().strftime("%Y-%m-%d")
    today_compact = datetime.now().strftime("%Y%m%d")
    print(f"📅 今天: {today}")
    print()

    # 1. 在 staging 找今天的草稿
    found_file = None
    for f in os.listdir(STAGING_POSTS):
        if not f.startswith("update-") or not f.endswith(".md"):
            continue
        path = os.path.join(STAGING_POSTS, f)
        with open(path, "r", encoding="utf-8") as fh:
            content = fh.read()
        if f"published: {today}" in content:
            found_file = f
            break

    if not found_file:
        print(f"❌ staging/posts/ 里找不到今天 ({today}) 的文章")
        input("\n按回车退出...")
        return

    title = found_file.replace(".md", "").split("-", 2)[-1]
    print(f"📝 找到: {found_file}")
    print(f"   标题: {title}")

    # 2. 检查是否已经发布过
    blog_target = os.path.join(BLOG_POSTS, found_file)
    if os.path.exists(blog_target):
        print(f"✅ 今天已经发布过了: {found_file}")
        input("\n按回车退出...")
        return

    # 3. 复制文章到博客（改 draft: false）
    src_path = os.path.join(STAGING_POSTS, found_file)
    with open(src_path, "r", encoding="utf-8") as fh:
        content = fh.read()
    content = content.replace("draft: true", "draft: false")
    with open(blog_target, "w", encoding="utf-8") as fh:
        fh.write(content)
    print(f"📄 复制文章 → src/content/posts/{found_file}")
    print(f"   draft: true → false")

    # 4. 复制封面图
    img_name = f"hermes-{today_compact}.jpg"
    img_src = os.path.join(STAGING_IMAGES, img_name)
    img_dst = os.path.join(BLOG_IMAGES, img_name)
    if os.path.exists(img_src):
        shutil.copy2(img_src, img_dst)
        print(f"🖼️  复制封面 → images/{img_name}")
    else:
        print(f"⚠️  封面 {img_name} 不存在，继续...")

    # 5. git pull (sync remote changes first)
    print("\n🔄 git pull...")
    run("git stash")
    code, out, err = run("git pull --rebase")
    if code == 0:
        run("git stash pop")
        print(f"   ✓ 已同步远程")
    else:
        run("git stash pop 2>nul")
        print(f"   ⚠️  pull 失败，继续...")

    # 6. git add + commit + push
    print("📦 git add...")
    run(f'git add "src/content/posts/{found_file}" "src/content/posts/images/{img_name}"')

    print("📦 git commit...")
    code, out, err = run(f'git commit -m "post: {title}"')
    if code != 0:
        if "nothing to commit" in (err + out):
            print("   没有变更")
        else:
            print(f"   ❌ commit 失败: {err}")
        input("\n按回车退出...")
        return
    print(f"   ✓ {out}")

    print("🚀 git push...")
    code, out, err = run("git push")
    if code != 0:
        print(f"   ❌ push 失败: {err}")
        if "403" in err:
            print("   💡 运行: gh auth refresh -h github.com -s repo")
        input("\n按回车退出...")
        return
    print(f"   ✓ push 成功")

    print(f"\n✅ 已发布: 《{title}》 → zureeallv.com")
    input("\n按回车退出...")

if __name__ == "__main__":
    main()
