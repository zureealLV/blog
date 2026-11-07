import { getCollection } from "astro:content";
import { createHash } from "node:crypto";
import { marked } from "marked";
import sanitize from "sanitize-html";
import { siteConfig } from "@/config";
import { classify, positionFor, topics } from "./memory-room-topics";
import { getPostUrlBySlug } from "./url-utils";

const digest = (text: string) =>
	createHash("sha256").update(text).digest("hex").slice(0, 24);

interface MemoryPost {
	id: string;
	key: string;
	url: string;
	title: string;
	date: string;
	description: string;
	summary: string;
	category: string;
	author: string;
	tags: string[];
	keywords: string[];
	topic: string;
	confidence: string;
	evidence: string[];
	crossTopics: string[];
	position: number[];
	bodyVersion: string;
}

async function buildSnapshot() {
	// Use the same resolved content IDs as the real article routes, never filenames.
	const entries = await getCollection("posts");
	const bodies = new Map<
		string,
		{ title: string; html: string; version: string }
	>();
	const posts: MemoryPost[] = [];
	const excluded = { draft: 0, encrypted: 0 };
	for (const entry of entries) {
		const data = entry.data;
		if (data.draft) {
			excluded.draft++;
			continue;
		}
		if (data.password) {
			excluded.encrypted++;
			continue;
		}
		const content = entry.body || "";
		const html = marked.parse(content, { async: false });
		const text = sanitize(
			marked.parse(content.replace(/^\s*#{1,6}\s+[^\r\n]+\r?\n/, ""), {
				async: false,
			}),
			{
				allowedTags: [],
				allowedAttributes: {},
			},
		)
			.replace(/\s+/g, " ")
			.trim();
		const description = data.description.trim();
		const summary = Array.from(
			description.length >= 60
				? description
				: description
					? `${description} ${text.startsWith(description) ? text.slice(description.length) : text}`
					: text,
		)
			.slice(0, 100)
			.join("");
		const assignment = classify(
			{ id: entry.id, title: data.title, tags: data.tags, description },
			text,
		);
		const key = digest(entry.id);
		const url = new URL(getPostUrlBySlug(entry.id), siteConfig.site_url).href;
		const bodyVersion = digest(content);
		posts.push({
			id: entry.id,
			key,
			url,
			title: data.title,
			date: data.published.toISOString().slice(0, 10),
			description,
			summary,
			category: data.category || "未分类",
			author: data.author || (data.tags.includes("Hermes") ? "Hermes" : "Lv"),
			tags: data.tags,
			keywords: [...new Set(assignment.scores.flatMap((s) => s.evidence))],
			topic: assignment.topic,
			confidence: assignment.confidence,
			evidence: assignment.evidence,
			crossTopics: assignment.crossTopics,
			position: positionFor(entry.id, assignment.topic),
			bodyVersion,
		});
		bodies.set(key, {
			title: data.title,
			version: bodyVersion,
			html: sanitize(html, {
				allowedTags: sanitize.defaults.allowedTags.filter(
					(t) => !["iframe", "img"].includes(t),
				),
				allowedAttributes: { a: ["href", "rel", "target"], code: ["class"] },
				transformTags: {
					a: (_tag, attrs) => {
						let href = "";
						try {
							const target = new URL(attrs.href || "", url);
							if (/^https?:$/.test(target.protocol)) href = target.href;
						} catch {
							/* Invalid links stay inert. */
						}
						return {
							tagName: "a",
							attribs: { href, rel: "noopener noreferrer", target: "_blank" },
						};
					},
				},
			}),
		});
	}
	posts.sort(
		(a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id),
	);
	return {
		index: {
			version: digest(JSON.stringify(posts)),
			count: posts.length,
			sourceCount: entries.length,
			excluded,
			groups: Object.fromEntries(
				topics.map((t) => [t.id, posts.filter((p) => p.topic === t.id).length]),
			),
			topics: topics.map(({ words: _words, ...topic }) => topic),
			posts,
		},
		bodies,
	};
}

// A single immutable snapshot per production build; dev requests use fresh content.
let buildCache: ReturnType<typeof buildSnapshot> | undefined;
export function getMemoryRoomSnapshot() {
	if (!import.meta.env.PROD) return buildSnapshot();
	buildCache ??= buildSnapshot();
	return buildCache;
}
