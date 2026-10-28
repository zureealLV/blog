import { handleRequest } from "../../../.orbit-source/cloudflare/api.mjs";

export const onRequest = ({ request }) => handleRequest(request);
