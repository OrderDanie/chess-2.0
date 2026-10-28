import type { Context, Config } from "@netlify/functions";
import { apiRouter } from "../../src/server/api";
import express from "express";

const app = express();
app.use(express.json());
app.use("/api", apiRouter);

export default async (req: Request, _context: Context) => {
  return new Response(JSON.stringify({ status: "ok", service: "Chess 2 API (Netlify)" }), {
    headers: { "content-type": "application/json" },
  });
};

export const config: Config = {
  path: "/api/*",
};
