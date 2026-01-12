import { handleRequest } from "./handlers";

export async function installFakeServer() {
  // If we're running on the server (SSR), do nothing.
  if (typeof window === "undefined") return;

  if (window.__fakeServerInstalled) return;
  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input, init) => {
    try {
      const url = typeof input === "string" ? input : input.url;
      if (url.startsWith("/api/")) {
        return handleRequest(url, init);
      }
      return originalFetch(input, init);
    } catch (err) {
      return new Response(JSON.stringify({ error: String(err) }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  };

  window.__fakeServerInstalled = true;
}
