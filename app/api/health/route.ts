export function GET() {
  return Response.json({ status: "ok", service: "versesoccer", timestamp: new Date().toISOString() });
}
