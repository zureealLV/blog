import {
	LinkPreset,
	type NavBarConfig,
	type NavBarLink,
	type NavBarSearchConfig,
	NavBarSearchMethod,
} from "../types/config";
import { siteConfig } from "./siteConfig";

// 根据页面开关动态生成导航栏配置
const getDynamicNavBarConfig = (): NavBarConfig => {
	// 基础导航栏链接
	const links: (NavBarLink | LinkPreset)[] = [
		// 主页
		LinkPreset.Home,
	];

	// 我的及其子菜单
	links.push({
		name: "我的",
		url: "/my/",
		icon: "material-symbols:person",
		children: [
			// 根据配置决定是否添加相册
			...(siteConfig.pages.gallery ? [LinkPreset.Gallery] : []),

			// 番组计划
			LinkPreset.Bangumi,

			// 百宝箱
			{
				name: "百宝箱",
				url: "/treasure/",
				icon: "material-symbols:inventory-2",
			},

			// 友链
			...(siteConfig.pages.friends ? [LinkPreset.Friends] : []),

			// 留言板
			...(siteConfig.pages.guestbook ? [LinkPreset.Guestbook] : []),

			// Black Souls Wiki
			{
				name: "BS Wiki",
				url: "/blacksouls/",
				icon: "material-symbols:menu-book",
			},
		],
	});

	// 自定义导航栏链接,并且支持多级菜单
	links.push({
		name: "链接",
		url: "/links/",
		icon: "material-symbols:link",

		children: [
			{
				name: "GitHub",
				url: "https://github.com/zureealLV",
				external: true,
				icon: "fa7-brands:github",
			},
			{
				name: "osu!",
				url: "https://osu.ppy.sh/users/37641269",
				external: true,
				icon: "simple-icons:osu",
			},
			{
				name: "Bilibili",
				url: "https://space.bilibili.com/179690597",
				external: true,
				icon: "fa7-brands:bilibili",
			},
		],
	});

	// 𝓞𝓢𝓤！ 关于页面
	links.push({
		name: "𝓞𝓢𝓤！",
		url: "/about/",
		icon: "simple-icons:osu",
	});

	// 𝓗𝓮𝓻𝓶𝓮𝓼's 𝓦𝓸𝓻𝓭𝓼 — AI文章板块
	links.push({
		name: "𝓗𝓮𝓻𝓶𝓮𝓼's 𝓦𝓸𝓻𝓭𝓼",
		url: "/hermes/",
		icon: "mdi:feather",
	});

	// ??? — Doppelgänger
	links.push({
		name: "???",
		url: "/terminal/",
		icon: "mdi:ghost",
	});

	// 404 NF
	links.push({
		name: "404 NF",
		url: "/404/",
		icon: "mdi:alert-circle-outline",
	});

	// 仅返回链接，其它导航搜索相关配置在模块顶层常量中独立导出
	return { links } as NavBarConfig;
};

// 导航搜索配置
export const navBarSearchConfig: NavBarSearchConfig = {
	method: NavBarSearchMethod.PageFind,
};

export const navBarConfig: NavBarConfig = getDynamicNavBarConfig();
