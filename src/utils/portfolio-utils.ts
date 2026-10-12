interface TechnicalPostData {
	category?: string | null;
	tags?: string[];
	draft?: boolean;
	published: Date;
}

// 即使在开发模式，也不把草稿或 Hermes 内容收入公开作品集。
export function getPortfolioPosts<T extends { data: TechnicalPostData }>(
	posts: T[],
): T[] {
	return posts
		.filter(
			({ data }) =>
				data.draft !== true &&
				data.category?.trim() === "技术" &&
				!data.tags?.includes("Hermes"),
		)
		.sort((a, b) => b.data.published.getTime() - a.data.published.getTime());
}
