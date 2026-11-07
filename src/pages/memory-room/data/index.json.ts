import type { APIRoute } from "astro";
import { siteConfig } from "@/config";
import { getMemoryRoomSnapshot } from "@/utils/memory-room";

export const GET: APIRoute = async () => {
	if (!siteConfig.pages.memoryRoom) return new Response(null, { status: 404 });
	const { index } = await getMemoryRoomSnapshot();
	return new Response(JSON.stringify(index), {
		headers: { "Content-Type": "application/json; charset=utf-8" },
	});
};
