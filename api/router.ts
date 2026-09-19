import type { IncomingMessage, ServerResponse } from "node:http";
import { getRuntimeApp } from "../apps/api/src/runtime.js";

const INTERNAL_PATH_PARAM = "__skillpass_path";
type VercelRequest = IncomingMessage & { url?: string };

export function toExpressUrl(requestUrl: string | undefined): string {
  const url = new URL(requestUrl ?? "/api/router", "http://vercel.internal");
  const routedPath = url.searchParams.get(INTERNAL_PATH_PARAM) ?? "";
  url.searchParams.delete(INTERNAL_PATH_PARAM);

  const path = routedPath
    .split("/")
    .filter(Boolean)
    .map((segment) => {
      try { return encodeURIComponent(decodeURIComponent(segment)); }
      catch { return encodeURIComponent(segment); }
    })
    .join("/");

  const query = url.searchParams.toString();
  return `/${path}${query ? `?${query}` : ""}`;
}

export default function handler(req: VercelRequest, res: ServerResponse) {
  req.url = toExpressUrl(req.url);
  return getRuntimeApp()(req as any, res as any);
}
