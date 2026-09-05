import { defineConfig } from "vite";
import { resolve } from "node:path";
import { readFileSync } from "node:fs";

export default defineConfig({
  root: resolve(import.meta.dirname),
  publicDir: "public",
  appType: "mpa",
  plugins: [{
    name: "preview-designed-404",
    configurePreviewServer(server) {
      server.middlewares.use((request, response, next) => {
        const path = new URL(request.url || "/", "http://preview.local").pathname;
        const known = ["/", "/demo", "/demo/", "/privacy", "/privacy/", "/terms", "/terms/", "/404.html"];
        if (known.includes(path) || path.includes(".")) return next();
        response.statusCode = 404;
        response.setHeader("Content-Type", "text/html; charset=utf-8");
        response.end(readFileSync(resolve(import.meta.dirname, "../dist/site/404.html")));
      });
    }
  }],
  build: {
    outDir: resolve(import.meta.dirname, "../dist/site"),
    emptyOutDir: true,
    target: "es2022",
    manifest: true,
    cssCodeSplit: true,
    rollupOptions: {
      input: {
        home: resolve(import.meta.dirname, "index.html"),
        demo: resolve(import.meta.dirname, "demo/index.html"),
        privacy: resolve(import.meta.dirname, "privacy/index.html"),
        terms: resolve(import.meta.dirname, "terms/index.html"),
        notFound: resolve(import.meta.dirname, "404.html")
      }
    }
  }
});
