import assert from "node:assert/strict";
import { test } from "node:test";
import { getPortfolioPosts } from "../src/utils/portfolio-utils.ts";

const post = (id, data = {}) => ({
	id,
	data: { category: "技术", published: new Date("2026-10-01"), ...data },
});

test("archive includes only published technical posts, never Hermes or personal essays", () => {
	const posts = [
		post("tech"),
		post("trimmed", { category: " 技术 " }),
		post("draft", { draft: true }),
		post("hermes", { tags: ["Hermes"] }),
		post("essay", { category: "随笔" }),
		post("uncategorized", { category: null }),
	];
	assert.deepEqual(
		getPortfolioPosts(posts).map(({ id }) => id),
		["tech", "trimmed"],
	);
});

test("archive is newest-first without mutating source collection", () => {
	const posts = [
		post("old"),
		post("new", { published: new Date("2026-10-12") }),
	];
	assert.deepEqual(
		getPortfolioPosts(posts).map(({ id }) => id),
		["new", "old"],
	);
	assert.deepEqual(
		posts.map(({ id }) => id),
		["old", "new"],
	);
});
