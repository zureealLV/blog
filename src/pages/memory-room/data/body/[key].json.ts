import type { APIRoute, GetStaticPaths } from "astro";
import { siteConfig } from "@/config";
import { getMemoryRoomSnapshot } from "@/utils/memory-room";

export const getStaticPaths = (async () => {
	if (!siteConfig.pages.memoryRoom) return [];
	const { bodies } = await getMemoryRoomSnapshot();
	return [...bodies].map(([key, body]) => ({
		params: { key },
		props: { body },
	}));
}) satisfies GetStaticPaths;

export const GET: APIRoute = ({ props }) =>
	new Response(JSON.stringify(props.body), {
		headers: { "Content-Type": "application/json; charset=utf-8" },
	});
