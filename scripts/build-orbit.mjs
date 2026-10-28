import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const source = path.join(root, ".orbit-source");
const config = JSON.parse(await readFile(path.join(root, "orbit.config.json"), "utf8"));
if (config.repository !== "https://github.com/zureealLV/ORBIT.git" || !/^[a-f0-9]{40}$/.test(config.revision)) {
	throw new Error("ORBIT source must be the expected repository pinned to a full commit SHA");
}

function run(command, args, cwd = root, capture = false, env = process.env) {
	const result = spawnSync(command, args, {
		cwd, env, encoding: "utf8", stdio: capture ? "pipe" : "inherit",
		shell: process.platform === "win32" && command === "corepack",
	});
	if (result.error || result.status !== 0) throw new Error(`${command} ${args.join(" ")} failed: ${result.error?.message ?? result.stderr ?? result.status}`);
	return result.stdout?.trim();
}

if (!existsSync(path.join(source, ".git"))) {
	if (existsSync(source)) throw new Error("Refusing to overwrite non-repository .orbit-source directory");
	run("git", ["clone", "--depth=1", config.repository, ".orbit-source"]);
}
if (run("git", ["remote", "get-url", "origin"], source, true) !== config.repository) throw new Error("Unexpected ORBIT source remote");
if (run("git", ["status", "--porcelain", "--untracked-files=no"], source, true)) throw new Error("ORBIT source has local changes; refusing to overwrite them");
run("git", ["fetch", "--depth=1", "origin", config.revision], source);
run("git", ["checkout", "--detach", config.revision], source);

// Import the source repository's exact npm lock into pnpm in this ignored checkout.
// The blog itself keeps its existing pnpm lock and dependency tree unchanged.
const pnpm = (...args) => run("corepack", ["pnpm@9.14.4", ...args], source);
pnpm("import");
pnpm("install", "--frozen-lockfile");
pnpm("test");
run("corepack", ["pnpm@9.14.4", "run", "build", `--base=${config.appBase}`], source, false, {
	...process.env, VITE_ORBIT_API_BASE: config.apiBase, VITE_ORBIT_POLL_PROGRESS: "false",
});

const target = path.join(root, "dist", "orbit");
await mkdir(target, { recursive: true });
await cp(path.join(source, "dist"), target, { recursive: true });
await writeFile(path.join(target, "version.json"), JSON.stringify(config, null, 2) + "\n");
console.log(`ORBIT ${config.revision} built at ${config.appBase}`);
