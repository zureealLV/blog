"""Offline publisher regressions: real Git repositories, no production pushes."""
import importlib.util
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("publisher", ROOT / "publish_today.py")
publisher = importlib.util.module_from_spec(spec)
spec.loader.exec_module(publisher)


class LauncherTests(unittest.TestCase):
    def test_launcher_uses_installed_launcher_not_store_alias(self):
        source = (ROOT / "发布今日文章.bat").read_text(encoding="utf-8-sig")
        self.assertIn("py -3", source)
        self.assertIn('%~dp0', source)

    def test_launcher_has_crlf_line_endings(self):
        data = (ROOT / "发布今日文章.bat").read_bytes()
        self.assertIn(b"\r\n", data)
        self.assertNotIn(b"\n", data.replace(b"\r\n", b""))

    @unittest.skipUnless(os.name == "nt", "Windows batch launcher")
    def test_launcher_forwards_arguments_and_exit_codes_from_other_directory(self):
        with tempfile.TemporaryDirectory() as temporary:
            folder = Path(temporary) / "中文 folder"
            folder.mkdir()
            launcher = folder / "发布今日文章.bat"
            launcher.write_bytes((ROOT / launcher.name).read_bytes())
            (folder / "publish_today.py").write_text(
                "import sys\nprint('fixture-launched')\nsys.exit(int(sys.argv[1]))\n",
                encoding="utf-8")
            for expected in (0, 7):
                result = subprocess.run(
                    f'cmd /d /s /c ""{launcher}" {expected}"',
                    cwd=temporary, env={**os.environ, "PUBLISH_NO_PAUSE": "1"},
                    capture_output=True, text=True, encoding="utf-8", timeout=15)
                self.assertEqual(result.returncode, expected, result.stdout + result.stderr)
                self.assertIn("fixture-launched", result.stdout)


class PublisherTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name) / "博客 with spaces"
        self.root.mkdir()
        self.remote = Path(self.temp.name) / "remote.git"
        self.git("init", "--bare", str(self.remote))
        self.git("init", "-b", "master")
        self.git("config", "user.name", "Test")
        self.git("config", "user.email", "test@example.invalid")
        (self.root / ".gitignore").write_text("staging/\n", encoding="utf-8")
        self.git("add", ".gitignore")
        self.git("commit", "-m", "initial")
        self.git("remote", "add", "origin", str(self.remote))
        self.git("push", "-u", "origin", "master")
        self.posts = self.root / "src/content/posts"
        self.posts.mkdir(parents=True)
        (self.posts / "images").mkdir()
        staging = self.root / "staging/posts"
        staging.mkdir(parents=True)
        images = self.root / "staging/images"
        images.mkdir()
        self.name = "update-001-测试.md"
        self.image = "hermes-20000102.jpg"
        (staging / self.name).write_text(
            '---\ntitle: "测试"\npublished: 2000-01-02\ntags: [Hermes]\n'
            'category: Hermes\ndraft: true\nimage: ./images/hermes-20000102.jpg\n'
            '---\n正文里保留 draft: true，不要全局替换。\n', encoding="utf-8")
        (images / self.image).write_bytes(b"fixture-cover")
        self.patches = [patch.object(publisher, name, str(path)) for name, path in (
            ("BLOG_DIR", self.root), ("STAGING_POSTS", staging),
            ("STAGING_IMAGES", images), ("BLOG_POSTS", self.posts),
            ("BLOG_IMAGES", self.posts / "images"))]
        for item in self.patches:
            item.start()
            self.addCleanup(item.stop)

    def git(self, *args):
        result = subprocess.run(["git", *args], cwd=self.root,
                                capture_output=True, text=True, encoding="utf-8")
        self.assertEqual(result.returncode, 0, result.stderr)
        return result.stdout.strip()

    def publish(self, *extra):
        return publisher.main(["--date", "2000-01-02", *extra])

    def test_dry_run_does_not_write_or_commit(self):
        before = self.git("rev-parse", "HEAD")
        self.assertEqual(self.publish("--dry-run"), 0)
        self.assertFalse((self.posts / self.name).exists())
        self.assertEqual(self.git("rev-parse", "HEAD"), before)

    def test_publish_then_repeat_is_idempotent(self):
        self.assertEqual(self.publish(), 0)
        head = self.git("rev-parse", "HEAD")
        self.assertEqual(head, self.git("rev-parse", "origin/master"))
        content = (self.posts / self.name).read_text(encoding="utf-8")
        self.assertIn("draft: false", content.split("---")[1])
        self.assertIn("正文里保留 draft: true", content)
        self.assertEqual(self.publish(), 0)
        self.assertEqual(self.git("rev-parse", "HEAD"), head)

    def test_retry_pushes_existing_commit_without_new_commit(self):
        hook = self.remote / "hooks/pre-receive"
        hook.write_text("#!/bin/sh\nexit 1\n", encoding="utf-8")
        self.assertNotEqual(self.publish(), 0)
        head = self.git("rev-parse", "HEAD")
        self.assertNotEqual(head, self.git("rev-parse", "origin/master"))
        hook.unlink()
        self.assertEqual(self.publish(), 0)
        self.assertEqual(self.git("rev-parse", "HEAD"), head)
        self.assertEqual(head, self.git("rev-parse", "origin/master"))

    def test_missing_cover_fails_without_copy(self):
        (self.root / "staging/images" / self.image).unlink()
        self.assertNotEqual(self.publish(), 0)
        self.assertFalse((self.posts / self.name).exists())

    def test_unrelated_staged_file_is_not_committed(self):
        (self.root / "private.txt").write_text("do not publish", encoding="utf-8")
        self.git("add", "private.txt")
        self.assertNotEqual(self.publish(), 0)
        self.assertEqual(self.git("diff", "--cached", "--name-only"), "private.txt")
        self.assertFalse((self.posts / self.name).exists())

    def test_fetch_failure_fails_before_copy(self):
        self.git("remote", "set-url", "origin", str(self.root / "missing.git"))
        self.assertNotEqual(self.publish(), 0)
        self.assertFalse((self.posts / self.name).exists())

    def test_retry_after_commit_hook_failure(self):
        hook = self.root / ".git/hooks/pre-commit"
        hook.write_text("#!/bin/sh\nexit 1\n", encoding="utf-8")
        self.assertNotEqual(self.publish(), 0)
        hook.unlink()
        self.assertEqual(self.publish(), 0)
        self.assertEqual(self.git("rev-parse", "HEAD"), self.git("rev-parse", "origin/master"))

    def test_unrelated_unstaged_change_is_preserved(self):
        (self.root / ".gitignore").write_text("staging/\nkeep me\n", encoding="utf-8")
        self.assertEqual(self.publish(), 0)
        self.assertIn("keep me", self.git("diff"))
        self.assertEqual(self.git("show", "HEAD:.gitignore"), "staging/")

    def test_unrelated_local_commit_is_not_pushed(self):
        (self.root / "private.txt").write_text("do not push", encoding="utf-8")
        self.git("add", "private.txt")
        self.git("commit", "-m", "unrelated")
        before = self.git("rev-parse", "origin/master")
        self.assertNotEqual(self.publish(), 0)
        self.assertEqual(self.git("rev-parse", "origin/master"), before)
        self.assertFalse((self.posts / self.name).exists())

    def test_existing_edited_post_is_not_overwritten(self):
        (self.posts / self.name).write_text("do not overwrite", encoding="utf-8")
        self.assertNotEqual(self.publish(), 0)
        self.assertEqual((self.posts / self.name).read_text(encoding="utf-8"), "do not overwrite")

    def test_draft_last_field_keeps_frontmatter_newline(self):
        path = self.root / "staging/posts" / self.name
        content = path.read_text(encoding="utf-8")
        content = content.replace("draft: true\nimage:", "image:")
        content = content.replace("hermes-20000102.jpg\n---", "hermes-20000102.jpg\ndraft: true\n---")
        path.write_text(content, encoding="utf-8")
        self.assertEqual(self.publish(), 0)
        self.assertIn("draft: false\n---", (self.posts / self.name).read_text(encoding="utf-8"))

    def advance_remote(self):
        clone = Path(self.temp.name) / "other"
        commands = [(["clone", str(self.remote), str(clone)], self.root),
                    (["config", "user.name", "Other"], clone),
                    (["config", "user.email", "other@example.invalid"], clone)]
        for args, cwd in commands:
            subprocess.run(["git", *args], cwd=cwd, capture_output=True, check=True)
        (clone / "remote.txt").write_text("remote change", encoding="utf-8")
        for args in (["add", "remote.txt"], ["commit", "-m", "remote change"], ["push"]):
            subprocess.run(["git", *args], cwd=clone, capture_output=True, check=True)

    def test_remote_changes_are_fast_forwarded_before_publication(self):
        self.advance_remote()
        self.assertEqual(self.publish(), 0)
        self.assertEqual((self.root / "remote.txt").read_text(encoding="utf-8"), "remote change")
        self.assertEqual(self.git("rev-parse", "HEAD"), self.git("rev-parse", "origin/master"))

    def test_diverged_branches_fail_without_copy_or_rebase(self):
        self.advance_remote()
        (self.root / "local.txt").write_text("local change", encoding="utf-8")
        self.git("add", "local.txt")
        self.git("commit", "-m", "local change")
        before = self.git("rev-parse", "HEAD")
        self.assertNotEqual(self.publish(), 0)
        self.assertEqual(self.git("rev-parse", "HEAD"), before)
        self.assertFalse((self.posts / self.name).exists())


if __name__ == "__main__":
    unittest.main()
