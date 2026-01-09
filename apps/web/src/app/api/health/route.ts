export const runtime = "nodejs";

export function GET() {
  return Response.json({
    status: "ok",
    service: "socks5proxies-web",
    timestamp: new Date().toISOString(),
  });
}
