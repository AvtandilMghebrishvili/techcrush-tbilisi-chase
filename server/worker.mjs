import { handleApi } from "./api.mjs";
export default {
  async fetch(request, env) {
    if (new URL(request.url).pathname.startsWith("/api/"))
      return handleApi(request, env.DB);
    if (env.ASSETS) return env.ASSETS.fetch(request);
    return new Response("Not found", { status: 404 });
  },
};
