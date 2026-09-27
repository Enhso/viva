/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Dev server only: serves the `api/*.ts` Vercel functions, so `npm run dev` can run a live viva
 * locally, with provider keys read from this process's environment. Deployed builds use Vercel's
 * own runtime; this adapter covers only the `status().json()` surface the handlers use.
 */
function vercelApiInDev(): Plugin {
  return {
    name: "viva:vercel-api-in-dev",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/api", async (req, res, next) => {
        const name = (req.url ?? "").split("?")[0].replace(/^\//, "");
        if (!/^[a-z-]+$/.test(name)) return next();
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
          json(payload: unknown) {
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(payload));
          },
        };
        try {
          await handler({ method: req.method, body: body || undefined }, response);
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
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});
