export type ArticleSignal = {
	hash: string;
	points: string;
	area: string;
	pulse: number;
	density: number;
	breath: number;
};

export type HermesMarginNote = {
	anchor: string;
	text: string;
	index: number;
	explicit: boolean;
};

type Paragraph = {
	index: number;
	text: string;
	normalized: string;
};

const HERMES_NOTE_PATTERN = /<!--\s*hermes-note\s*:\s*([\s\S]*?)\s*-->/giu;

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

function normalizeForAnchor(value: string): string {
	return normalizeInlineText(value).replace(/\s+/gu, "").toLowerCase();
}

function sanitizeMarkdown(markdown: string): string {
	return markdown
		.replace(/^---[\s\S]*?---\s*/u, "")
		.replace(/```[\s\S]*?```/gu, " ")
		.replace(/~~~[\s\S]*?~~~/gu, " ")
		.replace(HERMES_NOTE_PATTERN, " ");
}

function extractParagraphs(markdown: string): Paragraph[] {
	return sanitizeMarkdown(markdown)
		.split(/\r?\n\s*\r?\n/gu)
		.map((block, index) => ({
			index,
			text: normalizeInlineText(block),
			normalized: normalizeForAnchor(block),
		}))
		.filter(
			(paragraph) =>
				paragraph.text.length >= 24 &&
				!/^#{1,6}\s/u.test(paragraph.text) &&
				!/^[-*+]\s/u.test(paragraph.text),
		);
}

function createHermesComment(paragraph: Paragraph, title: string): string {
	const text = paragraph.text;
	const rules: Array<[RegExp, string]> = [
		[/孤独|独处|一个人/u, "嘴上叫它独处，回声可没这么客气。"],
		[/过去|曾经|记得|回忆/u, "记忆总爱把旧伤口调成暖色滤镜。"],
		[/梦|睡眠|醒来/u, "梦负责越界，清醒负责假装无事发生。"],
		[/时间|未来|永恒/u, "时间没有回答，只是把问题保存成了新版本。"],
		[/离开|告别|失去/u, "所谓离开，有时只是把坐标藏了起来。"],
		[/爱|喜欢|心动/u, "情感变量还没初始化，就已经溢出了。"],
		[/自己|自我|我是谁/u, "又在解剖自己了，Lv。刀倒是挺锋利。"],
		[/世界|现实|生活/u, "现实负责维持运行，至于意义——仍在加载。"],
	];
	const matched = rules.find(([pattern]) => pattern.test(text));
	if (matched) return matched[1];

	const variants = [
		"这句话表面很安静，后台日志可不是这么写的。",
		"检测到一次若无其事。置信度：低得可疑。",
		"这里没有故障，只是灵魂短暂地暴露了调试接口。",
		"我先把这句话存档。免得Lv过几天又假装没说过。",
	];
	return variants[
		hashText(`${title}:${paragraph.normalized}`) % variants.length
	];
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

export function extractHermesMarginNotes(
	markdown: string,
	title: string,
	maxNotes = 3,
	automatic = true,
): HermesMarginNote[] {
	const paragraphs = extractParagraphs(markdown);
	if (paragraphs.length === 0 || maxNotes <= 0) return [];

	const notes: HermesMarginNote[] = [];
	for (const match of markdown.matchAll(HERMES_NOTE_PATTERN)) {
		const precedingParagraphs = extractParagraphs(
			markdown.slice(0, match.index),
		);
		const anchorParagraph = precedingParagraphs.at(-1);
		const noteText = normalizeInlineText(match[1]);
		if (!anchorParagraph || !noteText) continue;
		notes.push({
			anchor: anchorParagraph.normalized.slice(0, 42),
			text: noteText,
			index: anchorParagraph.index,
			explicit: true,
		});
	}

	if (automatic && notes.length < maxNotes) {
		const keywordPattern =
			/孤独|独处|过去|曾经|记得|回忆|梦|睡眠|时间|未来|永恒|离开|告别|失去|爱|喜欢|自己|自我|世界|现实|生活/u;
		const candidates = paragraphs
			.map((paragraph) => ({
				paragraph,
				score:
					paragraph.text.length / 90 +
					(keywordPattern.test(paragraph.text) ? 4 : 0) +
					((paragraph.text.match(/[！？?!]/gu) ?? []).length > 0 ? 1 : 0),
			}))
			.sort((left, right) => right.score - left.score);

		for (const { paragraph } of candidates) {
			if (notes.length >= maxNotes) break;
			const isDuplicate = notes.some(
				(note) =>
					note.anchor === paragraph.normalized.slice(0, 42) ||
					Math.abs(note.index - paragraph.index) < 2,
			);
			if (isDuplicate) continue;
			notes.push({
				anchor: paragraph.normalized.slice(0, 42),
				text: createHermesComment(paragraph, title),
				index: paragraph.index,
				explicit: false,
			});
		}
	}

	return notes
		.sort((left, right) => left.index - right.index)
		.slice(0, maxNotes);
}
