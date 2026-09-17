import type { IncomingMessage, ServerResponse } from "node:http";
import { getRuntimeApp } from "../apps/api/src/runtime.js";

const app = getRuntimeApp();

type VercelRequest = IncomingMessage & { url?: string };

export default function handler(req: VercelRequest, res: ServerResponse) {
  const original = req.url ?? "/";
  req.url = original.replace(/^\/api(?=\/|$)/, "") || "/";
  return app(req as any, res as any);
}
