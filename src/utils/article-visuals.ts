export type ArticleSignal = {
	hash: string;
	points: string;
	area: string;
	pulse: number;
	density: number;
	breath: number;
};

type Paragraph = {
	text: string;
};

function hashText(value: string): number {
	let hash = 2166136261;
	for (const character of value) {
		hash ^= character.codePointAt(0) ?? 0;
		hash = Math.imul(hash, 16777619);
	}
	return hash >>> 0;
}

function normalizeInlineText(value: string): string {
	return value
		.replace(/!\[([^\]]*)\]\([^)]*\)/gu, "$1")
		.replace(/\[([^\]]+)\]\([^)]*\)/gu, "$1")
		.replace(/<[^>]+>/gu, " ")
		.replace(/[`*_~>#|]/gu, "")
		.replace(/\s+/gu, " ")
		.trim();
}

function sanitizeMarkdown(markdown: string): string {
	return markdown
		.replace(/^---[\s\S]*?---\s*/u, "")
		.replace(/```[\s\S]*?```/gu, " ")
		.replace(/~~~[\s\S]*?~~~/gu, " ");
}

function extractParagraphs(markdown: string): Paragraph[] {
	return sanitizeMarkdown(markdown)
		.split(/\r?\n\s*\r?\n/gu)
		.map((block) => ({
			text: normalizeInlineText(block),
		}))
		.filter(
			(paragraph) =>
				paragraph.text.length >= 24 &&
				!/^#{1,6}\s/u.test(paragraph.text) &&
				!/^[-*+]\s/u.test(paragraph.text),
		);
}

export function createArticleSignal(
	markdown: string,
	title: string,
	sampleCount = 64,
): ArticleSignal {
	const paragraphs = extractParagraphs(markdown);
	const plainText = normalizeInlineText(sanitizeMarkdown(markdown));
	const characters = Array.from(plainText || title);
	const count = Math.max(24, Math.min(96, Math.round(sampleCount)));
	const bins = Array.from({ length: count }, () => 0);

	characters.forEach((character, index) => {
		const bin = Math.min(
			count - 1,
			Math.floor((index / Math.max(1, characters.length)) * count),
		);
		const code = character.codePointAt(0) ?? 0;
		const punctuationEnergy = /[，。！？；：,.!?;:—…]/u.test(character)
			? 1.8
			: 0;
		bins[bin] += 0.5 + (code % 19) / 19 + punctuationEnergy;
	});

	const smoothed = bins.map((value, index) => {
		const previous = bins[(index - 1 + count) % count];
		const next = bins[(index + 1) % count];
		return previous * 0.22 + value * 0.56 + next * 0.22;
	});
	const max = Math.max(...smoothed, 1);
	const min = Math.min(...smoothed);
	const range = Math.max(max - min, 0.001);
	const points = smoothed.map((value, index) => {
		const x = (index / (count - 1)) * 720;
		const normalized = (value - min) / range;
		const y = 66 - (10 + normalized * 48);
		return `${x.toFixed(1)},${y.toFixed(1)}`;
	});

	const punctuationCount = (plainText.match(/[，。！？；：,.!?;:—…]/gu) ?? [])
		.length;
	const nonWhitespaceLength = plainText.replace(/\s/gu, "").length;
	const paragraphCount = Math.max(paragraphs.length, 1);

	return {
		hash: hashText(`${title}:${plainText}`).toString(16).padStart(8, "0"),
		points: points.join(" "),
		area: `0,72 ${points.join(" ")} 720,72`,
		pulse: Math.min(
			99,
			Math.max(
				1,
				Math.round((punctuationCount / Math.max(nonWhitespaceLength, 1)) * 520),
			),
		),
		density: Math.min(
			99,
			Math.max(
				1,
				Math.round((nonWhitespaceLength / Math.max(plainText.length, 1)) * 100),
			),
		),
		breath: Math.min(
			99,
			Math.max(1, Math.round(nonWhitespaceLength / paragraphCount / 3)),
		),
	};
}
