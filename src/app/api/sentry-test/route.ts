export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  throw new Error("Sentry server test error");
}
