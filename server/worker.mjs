import { handleApi } from "./api.mjs";
import { resultPage } from "./result-page.mjs";
const mediaVersion =
  typeof __MEDIA_VERSION__ === "string" ? __MEDIA_VERSION__ : null;
export default {
  async fetch(request, env) {
    if (new URL(request.url).pathname.startsWith("/result/"))
      return resultPage(request, env.DB);
    if (new URL(request.url).pathname.startsWith("/api/"))
      return handleApi(request, env.DB);
    if (env.ASSETS) {
      let assetRequest = request;
      const assetUrl = new URL(request.url);
      // Existing open games can finish lazy audio/image requests after a deploy.
      // Serve the current bytes under legacy URLs without storing a second copy.
      if (
        mediaVersion &&
        assetUrl.pathname.startsWith("/assets/") &&
        !assetUrl.pathname.startsWith("/assets/v-")
      ) {
        assetUrl.pathname =
          "/assets/" + mediaVersion + "/" + assetUrl.pathname.slice(8);
        assetRequest = new Request(assetUrl, request);
      }
      const response = await env.ASSETS.fetch(assetRequest);
      if (
        response.ok &&
        /^(?:\/(?:app|chunk)-[a-z0-9]+\.(js|css)|\/assets\/v-[a-f0-9]{16}\/.+)$/i.test(
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
