import type { ArticleEnhancementConfig } from "@/types/config";

export const articleEnhancementConfig: ArticleEnhancementConfig = {
	voiceprint: {
		enable: true,
		samples: 64,
	},
	hermesMarginNotes: {
		enable: true,
		automatic: true,
		maxNotes: 3,
		excludedTags: ["Hermes"],
	},
};
