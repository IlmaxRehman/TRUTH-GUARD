 import dotenv from "dotenv";
dotenv.config();

import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { extract } from "@extractus/article-extractor";

const app = express();

app.use(cors()); // Allow Chrome Extension requests
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// request logger for API routes
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// ✅ Middleware to extract article content from URL if provided and content is too short
app.post("/api/analyze", async (req, res, next) => {
  try {
    const article = req.body;
    const contentTooShort = !article.content || article.content.trim().length < 500;

    if (article?.url && contentTooShort) {
      const extracted = await extract(article.url);
      if (extracted?.content) {
        article.content = extracted.content;
        article.title = article.title || extracted.title;
      }
    }

    req.body = article;
    next();
  } catch (err) {
    next(err);
  }
});

(async () => {
  const server = await registerRoutes(app);

  // global error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });

  const isDev = process.env.NODE_ENV === "development";

  if (isDev) {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = 5000;
  server.listen(port, "127.0.0.1", () => {
    log(`serving on port ${port}`);
  });
})();
