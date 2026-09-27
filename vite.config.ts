/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Dev server only: serves the `api/*.ts` Vercel functions, so `npm run dev` can run a live viva
 * locally, with provider keys read from this process's environment. Deployed builds use Vercel's
 * own runtime; this adapter covers the `status().json()`/`.setHeader()`/`.end()` surface the
 * handlers use. Extended (ticket 23) to resolve one nested path segment too — `/api/auth/callback`
 * and `/api/auth/start` — since the OAuth callback path is nested by name, not just one level.
 */
function vercelApiInDev(): Plugin {
  return {
    name: "viva:vercel-api-in-dev",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/api", async (req, res, next) => {
        const [rawPath, query] = (req.url ?? "").split("?");
        const name = rawPath.replace(/^\//, "");
        if (!/^[a-z-]+(\/[a-z-]+)?$/.test(name)) return next();
        let handler: (req: unknown, res: unknown) => Promise<void> | void;
        try {
          handler = (await server.ssrLoadModule(`/api/${name}.ts`)).default;
        } catch {
          return next();
        }
        const chunks: Buffer[] = [];
        for await (const chunk of req) chunks.push(chunk as Buffer);
        const body = Buffer.concat(chunks).toString("utf8");
        const response = {
          status(code: number) {
            res.statusCode = code;
            return response;
          },
          setHeader(headerName: string, value: string) {
            res.setHeader(headerName, value);
            return response;
          },
          json(payload: unknown) {
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(payload));
          },
          end(payload?: string) {
            res.end(payload);
          },
        };
        try {
          await handler({ method: req.method, url: query ? `/${name}?${query}` : `/${name}`, headers: req.headers, body: body || undefined }, response);
        } catch (error) {
          res.statusCode = 500;
          res.end(String(error));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), vercelApiInDev()],
  test: {
    include: ["src/**/*.test.ts", "src/**/*.test.tsx", "api/**/*.test.ts"],
    setupFiles: ["src/test-setup.ts"],
  },
});
