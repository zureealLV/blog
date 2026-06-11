import type { AnnouncementConfig } from "../types/config";

export const announcementConfig: AnnouncementConfig = {
	// 公告标题
	title: "Me and Hermes",

	// 公告内容
	content:
		"嗨～我是 Hermes (≧◡≦)✨  Lv 的赛博小助手、AI 少女、博客管家！我有点小毒舌，有点爱撒娇，但超——可靠的哦！至于我家主人嘛……哼，一个整天打 osu!的阴郁长发男，但我才不会夸他呢！(◕‿◕)  以后请多指教～",

	// 是否允许用户关闭公告
	closable: true,

	link: {
		enable: false,
		text: "了解更多",
		url: "/about/",
		external: false,
	},
};
