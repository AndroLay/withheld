import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

// Content-Security-Policy for the hosted build. GitHub Pages serves static files and
// cannot set response headers, so the policy travels in a meta tag — which is why
// `frame-ancestors`, COOP, and COEP are absent here: a meta-tag CSP cannot express them.
// See SECURITY.md for what that leaves unmitigated.
//
// The app makes no network request of any kind, loads no third-party script, font, or
// analytics, and embeds nothing. `connect-src 'none'` is therefore not a restriction on
// the product; it is a statement about it that the browser will enforce.
const HOSTED_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  // No `data:`. Every glyph on the page is inline SVG drawn in `src/ui/Icon.tsx`, there is no
  // `<img>` element and no `url()` in the stylesheet, so the scheme was permission the page never
  // exercised. Kept at `'self'` rather than `'none'` so a browser's implicit `/favicon.ico`
  // request is a 404 and not a policy violation in the console.
  "img-src 'self'",
  "font-src 'self'",
  "connect-src 'none'",
  "object-src 'none'",
  "form-action 'none'",
  "base-uri 'none'",
].join("; ");

/**
 * Injected only into the production build. The dev server needs a websocket for HMR, and
 * a policy that blocks it would break `pnpm dev` while proving nothing about the artefact
 * that actually gets hosted.
 */
function hostedSecurityPolicy(): Plugin {
  return {
    name: "withheld:hosted-csp",
    apply: "build",
    transformIndexHtml: {
      order: "pre",
      handler: () => [
        {
          tag: "meta",
          attrs: { "http-equiv": "Content-Security-Policy", content: HOSTED_CSP },
          injectTo: "head-prepend",
        },
        {
          tag: "meta",
          attrs: { name: "referrer", content: "no-referrer" },
          injectTo: "head-prepend",
        },
      ],
    },
  };
}

export default defineConfig({
  plugins: [react(), hostedSecurityPolicy()],
  // Relative base so the built bundle works from a project subpath on static hosting.
  base: "./",
  server: { host: "127.0.0.1", port: 4174 },
});
