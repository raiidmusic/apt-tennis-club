import { getSession } from "../../../../lib/auth";

export async function GET(request: Request) {
  const session = await getSession(request).catch(() => null);
  if (!session) return Response.json({ authenticated: false }, { status: 401 });
  return Response.json({ authenticated: true, user: session });
}
