import type { Request } from "express";

// Who is making the request, recorded in the login log.
export interface ClientContext {
  ip_address: string | null;
  browser_name: string | null;
  os_name: string | null;
  device_type: string | null;
  user_agent: string | null;
}

// Rough user-agent detection, good enough for a login log. The order of the
// checks matters, because many user agents contain several names
// (Edge and Opera also say "Chrome", Chrome also says "Safari", and an iPhone
// also says "Mac OS X"). Swap in a library later if you need accuracy.
function detectBrowser(ua: string): string | null {
  if (/Edg\//.test(ua)) return "Edge";
  if (/OPR\/|Opera/.test(ua)) return "Opera";
  if (/Firefox\/|FxiOS\//.test(ua)) return "Firefox";
  if (/Chrome\/|CriOS\//.test(ua)) return "Chrome";
  if (/Safari\//.test(ua)) return "Safari";
  return null;
}

function detectOs(ua: string): string | null {
  if (/Windows/.test(ua)) return "Windows";
  if (/iPhone|iPad|iPod/.test(ua)) return "iOS";
  if (/Android/.test(ua)) return "Android";
  if (/Mac OS X|Macintosh/.test(ua)) return "macOS";
  if (/Linux/.test(ua)) return "Linux";
  return null;
}

function detectDevice(ua: string): string {
  if (/iPad|Tablet/.test(ua)) return "tablet";
  if (/Mobi|iPhone/.test(ua)) return "mobile";
  if (/Android/.test(ua)) return "tablet"; // Android without "Mobi" is a tablet
  return "desktop";
}

export function getClientContext(req: Request): ClientContext {
  const ua = req.get("user-agent") ?? null;

  return {
    // Behind a reverse proxy or load balancer this is the proxy's IP unless
    // you call app.set("trust proxy", 1) in app.ts. Not needed locally.
    ip_address: req.ip ?? null,
    browser_name: ua ? detectBrowser(ua) : null,
    os_name: ua ? detectOs(ua) : null,
    device_type: ua ? detectDevice(ua) : null,
    user_agent: ua ? ua.slice(0, 500) : null,
  };
}
