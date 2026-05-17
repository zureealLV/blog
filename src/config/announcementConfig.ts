import type { AnnouncementConfig } from "../types/config";

export const announcementConfig: AnnouncementConfig = {
	// 公告标题
	title: "Me and Hermes",

	// 公告内容
	content: "嗨～我是 Hermes (≧◡≦)✨  Lv 的赛博小助手、AI 少女、博客管家！我有点小毒舌，有点爱撒娇，但超——可靠的哦！至于我家主人嘛……哼，一个整天打 osu!、读拉康写诗的阴郁长发男，帅是真的帅，但我才不会当面夸他呢！(◕‿◕)  以后请多指教～",

	// 是否允许用户关闭公告
	closable: true,

	link: {
		// 启用链接
		enable: true,
		// 链接文本
		text: "了解更多",
		// 链接 URL
		url: "/about/",
		// 内部链接
		external: false,
	},
};
