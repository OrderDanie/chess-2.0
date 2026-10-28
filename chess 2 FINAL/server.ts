import express, { Request, Response } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { apiRouter } from "./src/server/api";
import { memGames } from "./src/server/db";
import { applyAction } from "./src/lib/game/engine";

const app = express();
const PORT = 3000;

app.use(express.json());

// Mount the modular API routes under /api
app.use("/api", apiRouter);

// Periodic server heartbeat: ticks live games so online clocks advance
setInterval(() => {
  for (const game of memGames.values()) {
    if (game.status === "active" && game.state.winner === null) {
      applyAction(game.state, game.state.current, { type: "tick", seconds: 1 });
    }
  }
}, 1000);

// Vite middleware in dev or static files in production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Chess 2 server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
