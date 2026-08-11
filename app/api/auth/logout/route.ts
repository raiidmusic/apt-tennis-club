import { clearAccessCookie } from "../../../../lib/auth";

export async function POST() {
  return Response.json({ authenticated: false }, { headers: { "Set-Cookie": clearAccessCookie() } });
}
