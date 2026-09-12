import { handleApi } from "./api.mjs";
export default {
  async fetch(request, env) {
    if (new URL(request.url).pathname.startsWith("/api/"))
      return handleApi(request, env.DB);
    if (env.ASSETS) {
      const response = await env.ASSETS.fetch(request);
      if (
        response.ok &&
        /^\/(?:app|chunk)-[a-z0-9]+\.(js|css)$/i.test(
          new URL(request.url).pathname,
        )
      ) {
        const cached = new Response(response.body, response);
        cached.headers.set(
          "Cache-Control",
          "public, max-age=31536000, immutable",
        );
        return cached;
      }
      return response;
    }
    return new Response("Not found", { status: 404 });
  },
};
